import React, { useState, useEffect } from 'react';
import { supabase } from './supabaseClient';
import bcrypt from 'bcryptjs';
// Assuming gymLogo.jpg is in your public folder or imported correctly

const App = () => {
  const [loading, setLoading] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [activeTab, setActiveTab] = useState('clients');
  const [clients, setClients] = useState([]);
  const [loginUsername, setLoginUsername] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [stats, setStats] = useState({ total: 0, active: 0, expired: 0, revenue: 0 });
  const [showChangePassword, setShowChangePassword] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [currentUser, setCurrentUser] = useState(null);

  // --- NEW STATE: Tracks the member currently in the renewal modal ---
  const [renewalClient, setRenewalClient] = useState(null);
  const [renewalPlan, setRenewalPlan] = useState('basic'); // State for selected renewal plan
  const [renewalStartOption, setRenewalStartOption] = useState('auto');
  // -------------------------------------------------------------------

  const [memberFilter, setMemberFilter] = useState('all');// 'all', 'active', or 'expired'
  const [selectedMember, setSelectedMember] = useState(null); // For viewing member details
const [showMemberDetails, setShowMemberDetails] = useState(false);
  const [searchQuery, setSearchQuery] = useState(''); // Search functionality
  const [sortOption, setSortOption] = useState('name'); // 'name', 'newest', 'oldest'
const [customRenewalDate, setCustomRenewalDate] = useState('');
  // --- 1. MEMBERSHIP DATA ---
  const membershipFees = { basic: 2000, premium: 5000, platinum: 9000, annual: 16000 };
  const membershipMonths = { basic: 1, premium: 3, platinum: 6, annual: 12 };

  const [formData, setFormData] = useState({
    name: '', phone: '', email: '', address: '', age: '', gender: '',
    emergencyContact: '', membership: 'basic', startDate: new Date().toISOString().split('T')[0],
    fee: membershipFees.basic
  });

  // --- DARK THEME COLOR PALETTE ---
  const PRIMARY_COLOR = '#00e1ff'; // Electric Cyan/Blue for accents
  const PRIMARY_GRADIENT = 'linear-gradient(135deg, #00e1ff 0%, #0099ff 100%)';
  const BG_DARK = '#121212'; // Deep Black/Gray background
  const CARD_DARK = '#1e1e1e'; // Slightly lighter dark background for cards
  const TEXT_LIGHT = '#e0e0e0'; // Light text for readability
  const TEXT_SECONDARY = '#a0a0a0'; // Subdued text
  const BORDER_DARK = '#333333';
  const INPUT_DARK = '#282828';
  // ---------------------------------

useEffect(() => {
  if (isAuthenticated) {
    fetchClients();
  }
}, [isAuthenticated, sortOption]); // Re-fetch when sort changes

 const fetchClients = async () => {
  setLoading(true);
  try {
    // Determine sort order based on sortOption
let orderColumn = 'name';
let ascending = true;

if (sortOption === 'newest') {
  orderColumn = 'created_at';
  ascending = false;
} else if (sortOption === 'oldest') {
  orderColumn = 'created_at';
  ascending = true;
}

const { data, error } = await supabase
  .from('members')
  .select('*')
  .order(orderColumn, { ascending });
    
    if (error) throw error;
    
    // Map database column names to your app's field names
    const mappedData = (data || []).map(member => {
  // Auto-calculate status based on end date
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const endDate = new Date(member.end_date);
  endDate.setHours(0, 0, 0, 0);
  
  const calculatedStatus = today <= endDate ? 'active' : 'expired';
  
  return {
    id: member.id,
    name: member.name,
    phone: member.phone,
    email: member.email,
    address: member.address,
    age: member.age,
    gender: member.gender,
    emergencyContact: member.emergency_contact,
    membership: member.membership,
    startDate: member.start_date,
    endDate: member.end_date,
    joinDate: member.join_date || member.start_date,
    fee: member.fee,
    discount: member.discount,
    status: calculatedStatus, // Use calculated status instead of database status
      holdStatus: member.hold_status || 'active',
      holdStartDate: member.hold_start_date,
      holdEndDate: member.hold_end_date,
      paymentHistory: member.payment_history || []
  };
    });
    
  // Update status in database if changed
  const statusUpdates = mappedData
    .filter(member => member.status !== data.find(d => d.id === member.id).status)
    .map(member => 
      supabase
        .from('members')
        .update({ status: member.status })
        .eq('id', member.id)
    );
  
  if (statusUpdates.length > 0) {
    await Promise.all(statusUpdates);
  }
    
    setClients(mappedData);
    calculateStats(mappedData);
  } catch (error) {
    console.error('Error fetching clients:', error);
    alert('Error loading members: ' + error.message);
  } finally {
    setLoading(false);
  }
};

  const calculateStats = (list) => {
    setStats({
      total: list.length,
      active: list.filter(c => c.status === 'active').length,
      expired: list.filter(c => c.status === 'expired').length,
      // Total Revenue is the sum of all fees paid by all members (active and expired)
      revenue: list.reduce((sum, c) => sum + c.fee, 0)
    });
  };

 const handleLogin = async () => {
  
  if (!loginUsername || !loginPassword) {
    alert('Please enter both username and password!');
    return;
  }
  // ... rest of the code

  setLoading(true);
  
  try {
    // Get user by username only
    const { data, error } = await supabase
      .from('admin_users')
      .select('*')
      .eq('username', loginUsername)
      .single();

    if (error || !data) {
      alert('Invalid credentials!');
      setLoading(false);
      return;
    }

    // Compare hashed password
    const passwordMatch = await bcrypt.compare(loginPassword, data.password);

    if (!passwordMatch) {
      alert('Invalid credentials!');
      setLoading(false);
      return;
    }

    setCurrentUser(data);
    setIsAuthenticated(true);
    setMemberFilter('all');
    setLoginPassword('');
  } catch (error) {
    console.error('Login error:', error);
    alert('Login failed. Please try again.');
  } finally {
    setLoading(false);
  }
};

  // --- NEW: Function to open the renewal modal ---
 const openRenewalModal = (client) => {
  setRenewalClient(client);
  setRenewalPlan(client.membership);
  setRenewalStartOption('auto');
  setCustomRenewalDate(''); // Reset custom date
};
  // ------------------------------------------------
  // --- Handle Change Password ---
  const handleChangePassword = async () => {
    if (!currentPassword || !newPassword || !confirmPassword) {
      alert('Please fill all password fields!');
      return;
    }

    if (newPassword !== confirmPassword) {
      alert('New password and confirm password do not match!');
      return;
    }

    if (newPassword.length < 6) {
      alert('New password must be at least 6 characters long!');
      return;
    }

    setLoading(true);
    try {
      // Verify current password using bcrypt
      const passwordMatch = await bcrypt.compare(currentPassword, currentUser.password);
      if (!passwordMatch) {
        alert('Current password is incorrect!');
        setLoading(false);
        return;
      }

      // Hash new password
      const hashedPassword = await bcrypt.hash(newPassword, 10);

      // Update password in database
      const { error: updateError } = await supabase
        .from('admin_users')
        .update({ 
          password: hashedPassword,
          updated_at: new Date().toISOString()
        })
        .eq('id', currentUser.id);

      if (updateError) throw updateError;

      alert('Password changed successfully!');
      setShowChangePassword(false);
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      
      // Update current user data with new hashed password
      setCurrentUser({ ...currentUser, password: hashedPassword });
    } catch (error) {
      console.error('Error changing password:', error);
      alert('Error changing password: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  // --- UPDATED: Function to handle renewal submission ---
  const handleRenewSubscription = async () => {
  if (!renewalClient || !renewalPlan) return;

  setLoading(true);
  try {
    const renewalMonths = membershipMonths[renewalPlan];
    const renewalFee = membershipFees[renewalPlan];
    
    const today = new Date();
    const oldEndDate = new Date(renewalClient.endDate);
    
    // Calculate days since expiry
    const daysSinceExpiry = Math.floor((today - oldEndDate) / (1000 * 60 * 60 * 24));
    
    let newStartDate, renewalType;
    
    // Determine start date based on user selection
    // Determine start date based on user selection
if (renewalStartOption === 'custom') {
  if (!customRenewalDate) {
    alert('Please select a custom start date!');
    setLoading(false);
    return;
  }
  newStartDate = customRenewalDate;
  renewalType = 'Renewal (Custom start date)';
} else if (renewalStartOption === 'from_today') {
  newStartDate = today.toISOString().split('T')[0];
  renewalType = 'Renewal (Started from today)';
} else if (renewalStartOption === 'from_expiry') {
  newStartDate = oldEndDate.toISOString().split('T')[0];
  renewalType = 'Renewal (Continued from expiry)';
} else {
      // Auto mode: If expired for more than 7 days, start from today
      if (daysSinceExpiry > 7) {
        newStartDate = today.toISOString().split('T')[0];
        renewalType = 'Renewal (Started from today)';
      } else {
        newStartDate = oldEndDate.toISOString().split('T')[0];
        renewalType = 'Renewal (Continued from expiry)';
      }
    }
    
    const newEndDate = new Date(newStartDate);
    newEndDate.setMonth(newEndDate.getMonth() + renewalMonths);

    const newTotalFee = (renewalClient.fee || 0) + renewalFee;

    const newPayment = {
      date: new Date().toISOString(),
      amount: renewalFee,
      membership: renewalPlan,
      type: renewalType,
      startDate: newStartDate,
      endDate: newEndDate.toISOString().split('T')[0]
    };

    const updatedPaymentHistory = [...(renewalClient.paymentHistory || []), newPayment];

    const { error } = await supabase
      .from('members')
      .update({
        status: 'active',
        start_date: newStartDate,
        end_date: newEndDate.toISOString().split('T')[0],
        membership: renewalPlan,
        fee: newTotalFee,
        payment_history: updatedPaymentHistory
      })
      .eq('id', renewalClient.id);

    if (error) throw error;

    alert(`Subscription renewed for ${renewalClient.name}!\n\nPlan: ${renewalPlan.toUpperCase()}\nRenewal Fee: Rs ${renewalFee.toLocaleString('en-IN')}\nTotal Revenue: Rs ${newTotalFee.toLocaleString('en-IN')}\nNew Period: ${newStartDate} to ${newEndDate.toISOString().split('T')[0]}`);
    setRenewalClient(null);
    
    fetchClients();
  } catch (error) {
    console.error('Error renewing subscription:', error);
    alert('Error renewing subscription: ' + error.message);
  } finally {
    setLoading(false);
  }
};
//new
const handleHoldMembership = async (client) => {
  if (!window.confirm(`Put ${client.name}'s membership on hold?\n\nTheir membership expiry will be paused.`)) {
    return;
  }

  setLoading(true);
  try {
    const holdStartDate = new Date().toISOString().split('T')[0];

    const { error } = await supabase
      .from('members')
      .update({
        hold_status: 'on_hold',
        hold_start_date: holdStartDate
      })
      .eq('id', client.id);

    if (error) throw error;

    alert(`Membership put on hold for ${client.name}`);
    fetchClients();
  } catch (error) {
    console.error('Error holding membership:', error);
    alert('Error: ' + error.message);
  } finally {
    setLoading(false);
  }
};

const handleContinueMembership = async (client) => {
  if (!window.confirm(`Resume ${client.name}'s membership?\n\nExpiry date will be extended by the hold duration.`)) {
    return;
  }

  setLoading(true);
  try {
    const holdStartDate = new Date(client.holdStartDate);
    const today = new Date();
    const holdDays = Math.floor((today - holdStartDate) / (1000 * 60 * 60 * 24));

    // Extend end date by hold duration
    const currentEndDate = new Date(client.endDate);
    const newEndDate = new Date(currentEndDate);
    newEndDate.setDate(newEndDate.getDate() + holdDays);

    const { error } = await supabase
      .from('members')
      .update({
        hold_status: 'active',
        hold_start_date: null,
        hold_end_date: today.toISOString().split('T')[0],
        end_date: newEndDate.toISOString().split('T')[0]
      })
      .eq('id', client.id);

    if (error) throw error;

    alert(`Membership resumed for ${client.name}\n\nHold Duration: ${holdDays} days\nNew Expiry: ${newEndDate.toISOString().split('T')[0]}`);
    fetchClients();
  } catch (error) {
    console.error('Error continuing membership:', error);
    alert('Error: ' + error.message);
  } finally {
    setLoading(false);
  }
};
//new
const handleViewMemberDetails = (client) => {
  setSelectedMember(client);
  setShowMemberDetails(true);
};
  const updateFee = (membership) => {
    const fee = membershipFees[membership];
    setFormData(prev => ({ ...prev, membership, fee }));
  };

  const handleInputChange = (field, value) => {
    if (field === 'membership') {
      updateFee(value);
    } else {
      setFormData(prev => ({ ...prev, [field]: value }));
    }
  };

 const handleAddClient = async () => {
  if (!formData.name || !formData.phone || !formData.address || !formData.startDate) {
    alert('Please fill required fields!');
    return;
  }

  setLoading(true);
  try {
    const endDate = new Date(formData.startDate);
    endDate.setMonth(endDate.getMonth() + membershipMonths[formData.membership]);
    
    const finalFee = parseInt(formData.fee) || membershipFees[formData.membership];
    const joinDate = formData.startDate; // Store join date

    // Create initial payment history entry
    const initialPayment = {
      date: new Date(formData.startDate).toISOString(), // Use start date as payment date
      amount: finalFee,
      membership: formData.membership,
      type: 'New Membership',
      startDate: formData.startDate,
      endDate: endDate.toISOString().split('T')[0]
    };

    const newMember = {
      name: formData.name,
      phone: formData.phone,
      email: formData.email || null,
      address: formData.address,
      age: formData.age ? parseInt(formData.age) : null,
      gender: formData.gender || null,
      emergency_contact: formData.emergencyContact || null,
      membership: formData.membership,
      start_date: formData.startDate,
      end_date: endDate.toISOString().split('T')[0],
      join_date: joinDate, // Store join date separately
      fee: finalFee,
      discount: 0,
      status: new Date() <= endDate ? 'active' : 'expired',
      hold_status: 'active',
      payment_history: [initialPayment]
    };

    const { error } = await supabase
      .from('members')
      .insert([newMember]);

    if (error) throw error;

    alert('Member added successfully!');
    setFormData({
      name: '', phone: '', email: '', address: '', age: '', gender: '',
      emergencyContact: '', membership: 'basic', startDate: new Date().toISOString().split('T')[0],
      fee: membershipFees.basic
    });
    setActiveTab('clients');
    fetchClients();
  } catch (error) {
    console.error('Error adding member:', error);
    alert('Error adding member: ' + error.message);
  } finally {
    setLoading(false);
  }
};

const handleRemoveClient = async (id) => {
  if (window.confirm('Remove this member?')) {
    setLoading(true);
    try {
      const { error } = await supabase
        .from('members')
        .delete()
        .eq('id', id);

      if (error) throw error;
      
      fetchClients(); // Reload data
    } catch (error) {
      console.error('Error removing member:', error);
      alert('Error removing member: ' + error.message);
    } finally {
      setLoading(false);
    }
  }
};

 const handleExportCSV = () => {
    // 1. Define Headers (Removed 'Discount' column)
    const headers = ['Name', 'Phone', 'Email', 'Address', 'Age', 'Gender', 'Emergency Contact',
                     'Membership', 'Start Date', 'End Date', 'Fee Paid', 'Status'];

    // Function to format a date string to YYYY-MM-DD
    const formatDate = (dateString) => {
        if (!dateString) return '';
        try {
            const date = new Date(dateString);
            if (isNaN(date.getTime())) return dateString; 
            
            return date.getFullYear() + '-' + 
                   String(date.getMonth() + 1).padStart(2, '0') + '-' + 
                   String(date.getDate()).padStart(2, '0');
        } catch (e) {
            return dateString;
        }
    };

    // 2. Format the data for CSV
    const csvData = clients.map(c => {
        // REMOVED: '' prefix. Phone numbers will be exported as pure strings.
        // We still use replace(/"/g, '""') to handle commas/quotes inside the data fields safely.
        const phone = String(c.phone || '').replace(/"/g, '""');
        const emergencyContact = String(c.emergencyContact || '').replace(/"/g, '""');

        return [
          c.name, 
          phone, // No leading apostrophe
          c.email || '', 
          c.address, 
          c.age || '', 
          c.gender || '',
          emergencyContact, // No leading apostrophe
          c.membership.toUpperCase(), 
          formatDate(c.startDate),
          formatDate(c.endDate),
          c.fee, // Fee Paid
          c.status
        ];
    });

    // 3. Combine headers and data
    const csvContent = [
      headers.join(','),
      // Map the data rows, quoting each cell for safety (especially addresses)
      ...csvData.map(row => row.map(cell => `"${cell}"`).join(','))
    ].join('\n');

    // 4. Download logic (no change)
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `gymghar_members_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
};

  const handleForgotPassword = () => {
    alert('Password Recovery:\n\nPlease contact the administrator at:\n📧rahoolmdr1@gmail.com\n📞 9843630842\n\nFor demo purposes, use:\nUsername: admin\nPassword: admin123');
    setShowForgotPassword(false);
  };

  const inputStyle = {
    width: '100%',
    padding: '14px 18px',
    border: `2px solid ${BORDER_DARK}`,
    borderRadius: '12px',
    fontSize: '16px',
    boxSizing: 'border-box',
    fontFamily: 'Arial, sans-serif',
    backgroundColor: INPUT_DARK,
    color: TEXT_LIGHT
  };

  const LogoComponent = ({ size, style = {} }) => (
    <div style={{
      width: `${size}px`,
      height: `${size}px`,
      minWidth: `${size}px`,
      background: PRIMARY_GRADIENT,
      borderRadius: '20px',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      boxShadow: `0 10px 30px rgba(0, 225, 255, 0.4)`,
      overflow: 'hidden',
      padding: '5px',
      ...style
    }}>
      <img
        src="/gymLogo.jpg"
        alt="GymGhar Logo"
        style={{
          width: '100%',
          height: '100%',
          objectFit: 'cover',
          borderRadius: '16px',
          filter: 'none',
        }}
      />
    </div>
  );
  // --------------------------------------------------------

  if (!isAuthenticated) {
    // (Login screen JSX remains unchanged)
    return (
      <div style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        width: '100vw',
        height: '100vh',
        background: `linear-gradient(135deg, ${BG_DARK} 0%, #000000 100%)`,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '20px',
        boxSizing: 'border-box',
        overflow: 'auto'
      }}>
      
        <div style={{
          background: CARD_DARK,
          borderRadius: '24px',
          boxShadow: '0 25px 50px rgba(0,0,0,0.5)',
          padding: '40px',
          width: '100%',
          maxWidth: '450px',
          border: `1px solid ${BORDER_DARK}`
        }}>
          <div style={{
            margin: '0 auto 20px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}>
            <LogoComponent size={120} style={{ borderRadius: '24px' }}/>
          </div>
          <h1 style={{
            fontSize: '38px',
            fontWeight: 'bold',
            textAlign: 'center',
            marginBottom: '10px',
            background: PRIMARY_GRADIENT,
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent'
          }}>
            GymGhar
          </h1>
          <p style={{ textAlign: 'center', color: TEXT_SECONDARY, marginBottom: '32px', fontSize: '16px' }}>
            Complete Gym Management Solution
          </p>

          <div style={{ marginBottom: '16px' }}>
            <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600', color: TEXT_LIGHT, fontSize: '14px' }}>
              Username
            </label>
            <input
              type="text"
              value={loginUsername}
              onChange={(e) => setLoginUsername(e.target.value)}
              style={inputStyle}
              placeholder="Enter your username"
            />
          </div>

          <div style={{ marginBottom: '16px' }}>
            <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600', color: TEXT_LIGHT, fontSize: '14px' }}>
              Password
            </label>
            <input
              type="password"
              value={loginPassword}
              onChange={(e) => setLoginPassword(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleLogin()}
              style={inputStyle}
              placeholder="Enter your password"
            />
          </div>

          <button
            onClick={handleLogin}
            style={{
              width: '100%',
              background: PRIMARY_GRADIENT,
              color: BG_DARK,
              padding: '16px',
              border: 'none',
              borderRadius: '12px',
              fontSize: '16px',
              fontWeight: '600',
              cursor: 'pointer',
              marginTop: '8px',
              boxShadow: `0 4px 12px rgba(0, 225, 255, 0.3)`
            }}
          >
            Login to Dashboard
          </button>

          <div style={{ textAlign: 'center', marginTop: '16px' }}>
            <button
              onClick={() => setShowForgotPassword(true)}
              style={{
                background: 'none',
                border: 'none',
                color: PRIMARY_COLOR,
                cursor: 'pointer',
                fontSize: '14px',
                textDecoration: 'underline',
                fontWeight: '500'
              }}
            >
              Forgot Password?
            </button>
          </div>

          <div style={{
            background: INPUT_DARK,
            padding: '18px',
            borderRadius: '12px',
            marginTop: '24px',
            borderLeft: `4px solid ${PRIMARY_COLOR}`
          }}>
            <p style={{ fontWeight: 'bold', margin: '0 0 10px 0', color: TEXT_LIGHT, fontSize: '14px' }}>
              ℹ️ Need Help?
            </p>
            <p style={{ margin: '6px 0', color: TEXT_SECONDARY, fontSize: '14px' }}>
              Contact administrator for login assistance
            </p>
            <p style={{ margin: '6px 0', color: TEXT_SECONDARY, fontSize: '14px' }}>
              📧 rahoolmdr1@gmail.com
            </p>
            <p style={{ margin: '6px 0', color: TEXT_SECONDARY, fontSize: '14px' }}>
              📞 9843630842
            </p>
          </div>

        {showForgotPassword && (
          <div style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(0,0,0,0.8)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
            padding: '20px'
          }}>
            <div style={{
              background: CARD_DARK,
              borderRadius: '20px',
              padding: '30px',
              maxWidth: '400px',
              width: '100%',
              border: `1px solid ${BORDER_DARK}`
            }}>
              <h3 style={{ marginBottom: '15px', color: TEXT_LIGHT }}>🔐 Forgot Password?</h3>
              <p style={{ color: TEXT_SECONDARY, marginBottom: '20px', lineHeight: '1.6' }}>
                Please contact the administrator for password recovery:
              </p>
              <div style={{
                background: INPUT_DARK,
                padding: '15px',
                borderRadius: '10px',
                marginBottom: '20px'
              }}>
                <p style={{ margin: '8px 0', color: TEXT_LIGHT }}>📧 rahoolmdr1@gmail.com</p>
                <p style={{ margin: '8px 0', color: TEXT_LIGHT }}>📞 9843630842</p>
              </div>
              <button
                onClick={() => setShowForgotPassword(false)}
                style={{
                  width: '100%',
                  background: PRIMARY_GRADIENT,
                  color: BG_DARK,
                  padding: '12px',
                  border: 'none',
                  borderRadius: '10px',
                  cursor: 'pointer',
                  fontWeight: '600'
                }}
              >
                Close
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

  // --- MEMBER FILTERING LOGIC ---
const filteredClients = clients.filter(client => {
  const matchesFilter = memberFilter === 'all' || client.status === memberFilter;
  const matchesSearch = searchQuery === '' || 
    client.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    client.phone.includes(searchQuery);

  return matchesFilter && matchesSearch;
});

  // --- DASHBOARD LAYOUT (AUTHENTICATED) ---
  return (
    <div style={{
      minHeight: '100vh',
      background: BG_DARK,
      padding: '20px',
      fontFamily: 'Arial, sans-serif',
      boxSizing: 'border-box'
    }}>
      <div style={{
        maxWidth: '1400px',
        margin: '0 auto'
      }}>
      <div style={{
        background: CARD_DARK,
        borderRadius: '20px',
        padding: '24px',
        marginBottom: '24px',
        boxShadow: `0 10px 30px rgba(0,0,0,0.5)`,
        border: `1px solid ${BORDER_DARK}`
      }}>
        {/* Header content... (remains unchanged) */}
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '16px'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <LogoComponent size={50} style={{ borderRadius: '12px' }}/>
            <div>
              <h1 style={{ fontSize: '32px', fontWeight: 'bold', color: TEXT_LIGHT, margin: '0 0 6px 0' }}>
                GymGhar Dashboard
              </h1>
              <p style={{ color: TEXT_SECONDARY, margin: 0, fontSize: '15px' }}>
                Manage your gym members efficiently
              </p>
            </div>
          </div>
          <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
            <button
              onClick={() => setShowChangePassword(true)}
              style={{
                background: 'linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%)',
                color: 'white',
                padding: '12px 24px',
                border: 'none',
                borderRadius: '12px',
                cursor: 'pointer',
                fontWeight: '600',
                fontSize: '15px',
                boxShadow: '0 4px 12px rgba(139,92,246,0.3)',
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
              }}
            >
              🔐 Change Password
            </button>
            <button
              onClick={handleExportCSV}
              style={{
                background: 'linear-gradient(135deg, #059669 0%, #10b981 100%)',
                color: 'white',
                padding: '12px 24px',
                border: 'none',
                borderRadius: '12px',
                cursor: 'pointer',
                fontWeight: '600',
                fontSize: '15px',
                boxShadow: '0 4px 12px rgba(16,185,129,0.3)',
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
              }}
            >
              📥 Export CSV
            </button>
            <button
              onClick={() => setIsAuthenticated(false)}
              style={{
                background: 'linear-gradient(135deg, #dc2626 0%, #ef4444 100%)',
                color: 'white',
                padding: '12px 28px',
                border: 'none',
                borderRadius: '12px',
                cursor: 'pointer',
                fontWeight: '600',
                fontSize: '15px',
                boxShadow: '0 4px 12px rgba(220, 38, 38, 0.3)'
              }}
            >
              Logout
            </button>
          </div>
        </div>
      </div>

      {/* STATS CARDS - CLICKABLE FOR FILTERING */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
        gap: '20px',
        marginBottom: '24px'
      }}>
        {[
          { num: stats.total, label: 'Total Members', color: PRIMARY_COLOR, icon: '👥', filter: 'all' },
          { num: stats.active, label: 'Active Members', color: '#10b981', icon: '✅', filter: 'active' },
          { num: stats.expired, label: 'Expired Members', color: '#ef4444', icon: '⚠️', filter: 'expired' },
          { num: `Rs ${stats.revenue.toLocaleString('en-IN')}`, label: 'Total Revenue', color: '#f59e0b', icon: '💰', filter: null }
        ].map((stat, i) => (
          <div
            key={i}
            onClick={() => stat.filter && setMemberFilter(stat.filter)}
            style={{
              background: CARD_DARK,
              borderRadius: '18px',
              padding: '28px',
              textAlign: 'center',
              boxShadow: '0 10px 30px rgba(0,0,0,0.3)',
              border: `1px solid ${BORDER_DARK}`,
              borderBottom: stat.filter && stat.filter === memberFilter ? `4px solid ${stat.color}` : `1px solid ${BORDER_DARK}`,
              cursor: stat.filter ? 'pointer' : 'default',
              transform: stat.filter ? 'scale(1)' : 'none',
              transition: 'transform 0.15s ease-in-out',
              opacity: stat.filter && memberFilter !== stat.filter && memberFilter !== 'all' ? 0.7 : 1,
            }}
          >
            <div style={{ fontSize: '36px', marginBottom: '12px' }}>{stat.icon}</div>
            <div style={{ fontSize: '42px', fontWeight: '800', color: stat.color, marginBottom: '8px' }}>
              {stat.num}
            </div>
            <div style={{ color: TEXT_SECONDARY, fontWeight: '600', fontSize: '15px' }}>{stat.label}</div>
          </div>
        ))}
      </div>

      {/* TABS */}
      <div style={{
        background: CARD_DARK,
        borderRadius: '16px',
        padding: '10px',
        marginBottom: '24px',
        display: 'flex',
        gap: '10px',
        boxShadow: '0 8px 20px rgba(0,0,0,0.3)'
      }}>
        {['clients', 'add'].map(tab => (
          <button
            key={tab}
            onClick={() => { setActiveTab(tab); if (tab === 'clients') setMemberFilter('all'); }}
            style={{
              flex: 1,
              padding: '14px 24px',
              border: 'none',
              borderRadius: '12px',
              cursor: 'pointer',
              fontWeight: '600',
              fontSize: '15px',
              background: activeTab === tab ? PRIMARY_GRADIENT : 'transparent',
              color: activeTab === tab ? BG_DARK : TEXT_SECONDARY,
              boxShadow: activeTab === tab ? '0 6px 20px rgba(0, 225, 255, 0.4)' : 'none'
            }}
          >
            {tab === 'clients' ? '📋 View Members' : '➕ Add New Member'}
          </button>
        ))}
      </div>

      {/* CONTENT */}
{activeTab === 'clients' ? (
  <>
    {/* SEARCH BAR */}
    <div style={{
  background: CARD_DARK,
  borderRadius: '16px',
  padding: '20px',
  marginBottom: '24px',
  boxShadow: '0 8px 20px rgba(0,0,0,0.3)',
  border: `1px solid ${BORDER_DARK}`
}}>
  <div style={{ display: 'flex', gap: '15px', marginBottom: '15px', flexWrap: 'wrap' }}>
    <div style={{ flex: 1, minWidth: '200px' }}>
      <label style={{ display: 'block', marginBottom: '10px', fontWeight: '600', color: TEXT_LIGHT, fontSize: '15px' }}>
        🔍 Search Members
      </label>
      <input
        type="text"
        value={searchQuery}
        onChange={(e) => setSearchQuery(e.target.value)}
        placeholder="Search by name or phone number..."
        style={{
          ...inputStyle,
          fontSize: '15px',
          padding: '16px 20px'
        }}
      />
    </div>
    <div style={{ minWidth: '200px' }}>
      <label style={{ display: 'block', marginBottom: '10px', fontWeight: '600', color: TEXT_LIGHT, fontSize: '15px' }}>
        📊 Sort By
      </label>
      <select
        value={sortOption}
        onChange={(e) => setSortOption(e.target.value)}
        style={{
          ...inputStyle,
          fontSize: '15px',
          padding: '16px 20px'
        }}
      >
        <option value="name" style={{ backgroundColor: INPUT_DARK }}>A-Z (Name)</option>
        <option value="newest" style={{ backgroundColor: INPUT_DARK }}>Newest First</option>
        <option value="oldest" style={{ backgroundColor: INPUT_DARK }}>Oldest First</option>
      </select>
    </div>
  </div>
  {searchQuery && (
    <p style={{ marginTop: '10px', color: TEXT_SECONDARY, fontSize: '14px' }}>
      Found {filteredClients.length} member{filteredClients.length !== 1 ? 's' : ''}
    </p>
  )}
</div>

    <div style={{
      display: 'grid',
      gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))',
      gap: '24px'
    }}>
          {/* MAPPING OVER FILTERED CLIENTS */}
          {filteredClients.length > 0 ? filteredClients.map(c => (
            <div key={c.id} style={{
  background: CARD_DARK,
  borderRadius: '18px',
  padding: '26px',
  boxShadow: '0 10px 30px rgba(0,0,0,0.3)',
  borderLeft: `6px solid ${c.status === 'active' ? (c.holdStatus === 'on_hold' ? '#f59e0b' : PRIMARY_COLOR) : '#ef4444'}`,
  border: `1px solid ${BORDER_DARK}`,
  opacity: c.holdStatus === 'on_hold' ? 0.8 : 1
}}>
  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: '18px' }}>
    <h3 style={{ fontSize: '22px', fontWeight: '700', color: TEXT_LIGHT, margin: 0 }}>
      {c.name}
    </h3>
    <button
      onClick={() => handleViewMemberDetails(c)}
      style={{
        background: 'transparent',
        border: `1px solid ${PRIMARY_COLOR}`,
        color: PRIMARY_COLOR,
        padding: '6px 12px',
        borderRadius: '8px',
        cursor: 'pointer',
        fontSize: '12px',
        fontWeight: '600'
      }}
    >
      View Details
    </button>
  </div>

  {c.holdStatus === 'on_hold' && (
    <div style={{
      background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
      color: 'white',
      padding: '8px 12px',
      borderRadius: '8px',
      marginBottom: '12px',
      fontSize: '13px',
      fontWeight: '600'
    }}>
      ⏸️ ON HOLD since {new Date(c.holdStartDate).toLocaleDateString()}
    </div>
  )}

  <div style={{ fontSize: '14px', color: TEXT_SECONDARY, marginBottom: '10px' }}>📞 {c.phone}</div>
  <div style={{ fontSize: '14px', color: TEXT_SECONDARY, marginBottom: '10px' }}>📧 {c.email || 'Not provided'}</div>
  <div style={{ fontSize: '14px', color: TEXT_SECONDARY, marginBottom: '10px' }}>🏠 {c.address}</div>
  {c.age && <div style={{ fontSize: '14px', color: TEXT_SECONDARY, marginBottom: '10px' }}>👤 {c.age} years, {c.gender}</div>}
  {c.emergencyContact && <div style={{ fontSize: '14px', color: TEXT_SECONDARY, marginBottom: '10px' }}>🚨 {c.emergencyContact}</div>}
  <div style={{ fontSize: '14px', color: TEXT_SECONDARY, marginBottom: '10px' }}>💳 {c.membership.toUpperCase()} Plan</div>
  <div style={{ fontSize: '14px', color: TEXT_SECONDARY, marginBottom: '10px' }}>📅 {c.startDate} to {c.endDate}</div>
  <div style={{ fontSize: '14px', color: TEXT_SECONDARY, marginBottom: '10px' }}>
    🗓️ Joined: {new Date(c.joinDate).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })}
  </div>
  <div style={{ 
    fontSize: '15px', 
    color: PRIMARY_COLOR, 
    marginBottom: '16px', 
    fontWeight: '700',
    background: INPUT_DARK,
    padding: '10px 14px',
    borderRadius: '10px',
    border: `1px solid ${BORDER_DARK}`
  }}>
    💰 Total Revenue: Rs {c.fee.toLocaleString('en-IN')}
  </div>

  <div style={{
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: '16px',
    paddingTop: '16px',
    borderTop: `1px solid ${BORDER_DARK}`,
    flexWrap: 'wrap',
    gap: '10px'
  }}>
    <span style={{
      padding: '8px 18px',
      borderRadius: '25px',
      fontSize: '12px',
      fontWeight: '700',
      background: c.status === 'active' ? 'linear-gradient(135deg, #10b981 0%, #059669 100%)' : 'linear-gradient(135deg, #dc2626 0%, #ef4444 100%)',
      color: 'white'
    }}>
      {c.status.toUpperCase()}
    </span>

    <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
      {c.status === 'active' && c.holdStatus === 'active' && (
        <button
          onClick={() => handleHoldMembership(c)}
          disabled={loading}
          style={{
            background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
            color: 'white',
            padding: '8px 16px',
            border: 'none',
            borderRadius: '10px',
            cursor: loading ? 'not-allowed' : 'pointer',
            fontWeight: '600',
            fontSize: '12px',
            opacity: loading ? 0.6 : 1
          }}
        >
          ⏸️ Hold
        </button>
      )}

      {c.holdStatus === 'on_hold' && (
        <button
          onClick={() => handleContinueMembership(c)}
          disabled={loading}
          style={{
            background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
            color: 'white',
            padding: '8px 16px',
            border: 'none',
            borderRadius: '10px',
            cursor: loading ? 'not-allowed' : 'pointer',
            fontWeight: '600',
            fontSize: '12px',
            opacity: loading ? 0.6 : 1
          }}
        >
          ▶️ Continue
        </button>
      )}

      {c.status === 'expired' ? (
        <button
          onClick={() => openRenewalModal(c)}
          disabled={loading}
          style={{
            background: PRIMARY_GRADIENT,
            color: BG_DARK,
            padding: '8px 16px',
            border: 'none',
            borderRadius: '10px',
            cursor: loading ? 'not-allowed' : 'pointer',
            fontWeight: '600',
            fontSize: '12px',
            boxShadow: '0 2px 8px rgba(0, 225, 255, 0.4)',
            opacity: loading ? 0.6 : 1
          }}
        >
          🔄 RENEW
        </button>
      ) : (
        <button
          onClick={() => handleRemoveClient(c.id)}
          disabled={loading}
          style={{
            background: 'linear-gradient(135deg, #dc2626 0%, #ef4444 100%)',
            color: 'white',
            padding: '8px 16px',
            border: 'none',
            borderRadius: '10px',
            cursor: loading ? 'not-allowed' : 'pointer',
            fontWeight: '600',
            fontSize: '12px',
            opacity: loading ? 0.6 : 1
          }}
        >
          ❌ Remove
        </button>
      )}
    </div>
  </div>
</div>
          )) : (
          
  <div style={{ gridColumn: '1 / -1', textAlign: 'center', padding: '40px', background: CARD_DARK, borderRadius: '18px', color: TEXT_SECONDARY }}>
    {searchQuery ? `No members found matching "${searchQuery}"` : (
      <>
        {memberFilter === 'all' && 'No members found.'}
        {memberFilter === 'active' && 'No active members match the filter.'}
        {memberFilter === 'expired' && 'No expired members match the filter.'}
      </>
    )}
  </div>
)}
</div>
</>
      ) : (
        <div style={{
          background: CARD_DARK,
          borderRadius: '18px',
          padding: '36px',
          boxShadow: '0 10px 30px rgba(0,0,0,0.3)',
          maxWidth: '1200px',
          margin: '0 auto',
          border: `1px solid ${BORDER_DARK}`
        }}>
          {/* Add New Member form... (remains unchanged) */}
          <h2 style={{ fontSize: '26px', fontWeight: 'bold', marginBottom: '28px', color: TEXT_LIGHT }}>
            ➕ Add New Member
          </h2>
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
            gap: '20px'
          }}>
            {[
              { label: 'Full Name *', field: 'name', type: 'text', placeholder: 'Enter full name' },
              { label: 'Phone Number *', field: 'phone', type: 'tel', placeholder: 'Enter phone number' }
            ].map(item => (
              <div key={item.field}>
                <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600', color: TEXT_LIGHT, fontSize: '14px' }}>
                  {item.label}
                </label>
                <input
                  type={item.type}
                  value={formData[item.field]}
                  onChange={(e) => handleInputChange(item.field, e.target.value)}
                  placeholder={item.placeholder}
                  style={inputStyle}
                />
              </div>
            ))}

            <div style={{ gridColumn: '1 / -1' }}>
              <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600', color: TEXT_LIGHT, fontSize: '14px' }}>
                Email Address
              </label>
              <input type="email" value={formData.email} onChange={(e) => handleInputChange('email', e.target.value)}
                placeholder="Enter email address" style={inputStyle} />
            </div>

            <div style={{ gridColumn: '1 / -1' }}>
              <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600', color: TEXT_LIGHT, fontSize: '14px' }}>
                Address *
              </label>
              <textarea value={formData.address} onChange={(e) => handleInputChange('address', e.target.value)}
                placeholder="Enter complete address" style={{ ...inputStyle, minHeight: '90px', resize: 'vertical' }} />
            </div>

            <div>
              <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600', color: TEXT_LIGHT, fontSize: '14px' }}>Age</label>
              <input type="number" value={formData.age} onChange={(e) => handleInputChange('age', e.target.value)}
                placeholder="Enter age" style={inputStyle} min="16" max="80" />
            </div>

            <div>
              <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600', color: TEXT_LIGHT, fontSize: '14px' }}>Gender</label>
              <select value={formData.gender} onChange={(e) => handleInputChange('gender', e.target.value)} style={inputStyle}>
                <option value="" style={{ backgroundColor: INPUT_DARK }}>Select Gender</option>
                <option value="male" style={{ backgroundColor: INPUT_DARK }}>Male</option>
                <option value="female" style={{ backgroundColor: INPUT_DARK }}>Female</option>
                <option value="other" style={{ backgroundColor: INPUT_DARK }}>Other</option>
              </select>
            </div>

            <div>
              <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600', color: TEXT_LIGHT, fontSize: '14px' }}>
                Emergency Contact
              </label>
              <input type="tel" value={formData.emergencyContact} onChange={(e) => handleInputChange('emergencyContact', e.target.value)}
                placeholder="Emergency contact" style={inputStyle} />
            </div>

            <div>
              <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600', color: TEXT_LIGHT, fontSize: '14px' }}>
                Membership Plan *
              </label>
              <select value={formData.membership} onChange={(e) => handleInputChange('membership', e.target.value)} style={inputStyle}>
                <option value="basic" style={{ backgroundColor: INPUT_DARK }}>Basic (1 Month) - Rs 2,000</option>
                <option value="premium" style={{ backgroundColor: INPUT_DARK }}>Premium (3 Months) - Rs 5,000</option>
                <option value="platinum" style={{ backgroundColor: INPUT_DARK }}>Platinum (6 Months) - Rs 9,000</option>
                <option value="annual" style={{ backgroundColor: INPUT_DARK }}>Annual (12 Months) - Rs 16,000</option>
              </select>
            </div>

            <div>
              <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600', color: TEXT_LIGHT, fontSize: '14px' }}>
                Start Date *
              </label>
              <input type="date" value={formData.startDate} onChange={(e) => handleInputChange('startDate', e.target.value)}
                style={inputStyle} />
            </div>

            <div>
              <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600', color: TEXT_LIGHT, fontSize: '14px' }}>
                Fee Amount (Rs) *
              </label>
              <input
                type="number"
                value={formData.fee}
                onChange={(e) => handleInputChange('fee', e.target.value)}
                placeholder="Enter fee amount"
                style={inputStyle}
              />
            </div>
          </div>
          <button onClick={handleAddClient} style={{
            width: '100%',
            background: PRIMARY_GRADIENT,
            color: BG_DARK,
            padding: '18px',
            border: 'none',
            borderRadius: '12px',
            fontSize: '17px',
            fontWeight: '600',
            cursor: 'pointer',
            marginTop: '28px',
            boxShadow: `0 4px 12px rgba(0, 225, 255, 0.3)`
          }}>
            ✨ Add Member to GymGhar
          </button>
        </div>
      )}
    </div>

    {/* --- NEW: RENEWAL MODAL COMPONENT --- */}
    {renewalClient && (() => {
  const today = new Date();
  const expiredDate = new Date(renewalClient.endDate);
  const daysSinceExpiry = Math.floor((today - expiredDate) / (1000 * 60 * 60 * 24));
  
  return (
  <div style={{
    position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
    background: 'rgba(0,0,0,0.9)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '20px',
    overflowY: 'auto'
  }}>
    <div style={{
      background: CARD_DARK, borderRadius: '20px', padding: '30px', maxWidth: '500px', width: '100%', border: `1px solid ${BORDER_DARK}`,
      maxHeight: '90vh', overflowY: 'auto'
    }}>
      <h3 style={{ marginBottom: '15px', color: TEXT_LIGHT, fontSize: '20px' }}>
        🔄 Renew Membership for {renewalClient.name}
      </h3>
      
      <div style={{ 
        background: INPUT_DARK, 
        padding: '15px', 
        borderRadius: '10px', 
        marginBottom: '20px',
        border: `1px solid ${daysSinceExpiry > 7 ? '#ef4444' : '#f59e0b'}`
      }}>
        <p style={{ color: TEXT_SECONDARY, margin: '0 0 8px 0' }}>
          <strong style={{color: '#ef4444'}}>Expired on:</strong> {renewalClient.endDate}
        </p>
        <p style={{ color: TEXT_SECONDARY, margin: '0' }}>
          <strong style={{color: daysSinceExpiry > 7 ? '#ef4444' : '#f59e0b'}}>
            {daysSinceExpiry} day{daysSinceExpiry !== 1 ? 's' : ''} ago
          </strong>
        </p>
      </div>

      {daysSinceExpiry > 7 && (
        <div style={{
          background: 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)',
          color: 'white',
          padding: '12px',
          borderRadius: '10px',
          marginBottom: '20px',
          fontSize: '13px',
          fontWeight: '600'
        }}>
          ⚠️ Membership expired {daysSinceExpiry} days ago
        </div>
      )}

      <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600', color: TEXT_LIGHT, fontSize: '14px' }}>
        Select New Membership Plan
      </label>
      <select 
        value={renewalPlan} 
        onChange={(e) => setRenewalPlan(e.target.value)} 
        style={{...inputStyle, marginBottom: '20px'}}
      >
        <option value="basic" style={{ backgroundColor: INPUT_DARK }}>Basic (1 Month) - Rs {membershipFees.basic.toLocaleString('en-IN')}</option>
        <option value="premium" style={{ backgroundColor: INPUT_DARK }}>Premium (3 Months) - Rs {membershipFees.premium.toLocaleString('en-IN')}</option>
        <option value="platinum" style={{ backgroundColor: INPUT_DARK }}>Platinum (6 Months) - Rs {membershipFees.platinum.toLocaleString('en-IN')}</option>
        <option value="annual" style={{ backgroundColor: INPUT_DARK }}>Annual (12 Months) - Rs {membershipFees.annual.toLocaleString('en-IN')}</option>
      </select>

      <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600', color: TEXT_LIGHT, fontSize: '14px' }}>
        When to Start New Membership?
      </label>
      <select 
  value={renewalStartOption} 
  onChange={(e) => setRenewalStartOption(e.target.value)} 
  style={{...inputStyle, marginBottom: '20px'}}
>
  <option value="auto" style={{ backgroundColor: INPUT_DARK }}>
    Auto (Start from {daysSinceExpiry > 7 ? 'today' : 'expiry date'})
  </option>
  <option value="from_expiry" style={{ backgroundColor: INPUT_DARK }}>
    Continue from expiry date ({renewalClient.endDate})
  </option>
  <option value="from_today" style={{ backgroundColor: INPUT_DARK }}>
    Start from today ({today.toISOString().split('T')[0]})
  </option>
  <option value="custom" style={{ backgroundColor: INPUT_DARK }}>
    📅 Custom Date (Select below)
  </option>
</select>

{renewalStartOption === 'custom' && (
  <>
    <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600', color: TEXT_LIGHT, fontSize: '14px' }}>
      Select Custom Start Date
    </label>
    <input
      type="date"
      value={customRenewalDate}
      onChange={(e) => setCustomRenewalDate(e.target.value)}
      min={today.toISOString().split('T')[0]}
      style={{...inputStyle, marginBottom: '20px'}}
    />
  </>
)}

      <p style={{ color: TEXT_LIGHT, marginBottom: '25px', fontSize: '16px' }}>
        <strong>Fee Payable:</strong> <strong style={{color: PRIMARY_COLOR}}>Rs {membershipFees[renewalPlan].toLocaleString('en-IN')}</strong>
      </p>

      <div style={{ display: 'flex', gap: '15px' }}>
        <button
          onClick={() => setRenewalClient(null)}
          style={{
            flex: 1, background: INPUT_DARK, color: TEXT_SECONDARY, padding: '12px', border: `1px solid ${BORDER_DARK}`,
            borderRadius: '10px', cursor: 'pointer', fontWeight: '600'
          }}
        >
          Cancel
        </button>
        <button
          onClick={handleRenewSubscription}
          disabled={loading}
          style={{
            flex: 1, 
            background: PRIMARY_GRADIENT, 
            color: BG_DARK, 
            padding: '12px', 
            border: 'none',
            borderRadius: '10px', 
            cursor: loading ? 'not-allowed' : 'pointer', 
            fontWeight: '600', 
            boxShadow: '0 4px 10px rgba(0, 225, 255, 0.3)',
            opacity: loading ? 0.6 : 1
          }}
        >
          {loading ? 'Processing...' : 'Confirm Renewal'}
        </button>
      </div>
    </div>
  </div>
  );
})()}
{/* --- CHANGE PASSWORD MODAL --- */}
    {showChangePassword && (
      <div style={{
        position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
        background: 'rgba(0,0,0,0.9)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '20px',
        overflowY: 'auto'
      }}>
        <div style={{
          background: CARD_DARK, borderRadius: '20px', padding: '30px', maxWidth: '500px', width: '100%', border: `1px solid ${BORDER_DARK}`,
          maxHeight: '90vh', overflowY: 'auto'
        }}>
          <h3 style={{ marginBottom: '20px', color: TEXT_LIGHT, fontSize: '20px' }}>
            🔐 Change Password
          </h3>

          <div style={{ marginBottom: '16px' }}>
            <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600', color: TEXT_LIGHT, fontSize: '14px' }}>
              Current Password
            </label>
            <input
              type="password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              placeholder="Enter current password"
              style={inputStyle}
            />
          </div>

          <div style={{ marginBottom: '16px' }}>
            <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600', color: TEXT_LIGHT, fontSize: '14px' }}>
              New Password
            </label>
            <input
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="Enter new password (min 6 characters)"
              style={inputStyle}
            />
          </div>

          <div style={{ marginBottom: '20px' }}>
            <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600', color: TEXT_LIGHT, fontSize: '14px' }}>
              Confirm New Password
            </label>
            <input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Re-enter new password"
              style={inputStyle}
            />
          </div>

          <div style={{
            background: INPUT_DARK,
            padding: '12px',
            borderRadius: '10px',
            marginBottom: '20px',
            borderLeft: `4px solid #f59e0b`
          }}>
            <p style={{ color: TEXT_SECONDARY, margin: 0, fontSize: '13px' }}>
              ⚠️ Make sure to remember your new password. You'll need it for future logins.
            </p>
          </div>

          <div style={{ display: 'flex', gap: '15px' }}>
            <button
              onClick={() => {
                setShowChangePassword(false);
                setCurrentPassword('');
                setNewPassword('');
                setConfirmPassword('');
              }}
              style={{
                flex: 1, background: INPUT_DARK, color: TEXT_SECONDARY, padding: '12px', border: `1px solid ${BORDER_DARK}`,
                borderRadius: '10px', cursor: 'pointer', fontWeight: '600'
              }}
            >
              Cancel
            </button>
            <button
              onClick={handleChangePassword}
              disabled={loading}
              style={{
                flex: 1,
                background: 'linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%)',
                color: 'white',
                padding: '12px',
                border: 'none',
                borderRadius: '10px',
                cursor: loading ? 'not-allowed' : 'pointer',
                fontWeight: '600',
                boxShadow: '0 4px 10px rgba(139,92,246,0.3)',
                opacity: loading ? 0.6 : 1
              }}
            >
              {loading ? 'Changing...' : 'Change Password'}
            </button>
          </div>
        </div>
      </div>
    )}

    {/* ------------------------------------------- */}
    {/* ------------------------------------------- */}
    {/* --- MEMBER DETAILS MODAL --- */}
{showMemberDetails && selectedMember && (
  <div style={{
    position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
    background: 'rgba(0,0,0,0.9)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '20px',
    overflowY: 'auto'
  }}>
    <div style={{
      background: CARD_DARK, borderRadius: '20px', padding: '30px', maxWidth: '600px', width: '100%', border: `1px solid ${BORDER_DARK}`,
      maxHeight: '90vh', overflowY: 'auto'
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: '20px' }}>
        <h2 style={{ color: TEXT_LIGHT, margin: 0 }}>👤 {selectedMember.name}</h2>
        <button
          onClick={() => setShowMemberDetails(false)}
          style={{
            background: 'transparent',
            border: 'none',
            color: TEXT_SECONDARY,
            fontSize: '24px',
            cursor: 'pointer',
            padding: '0',
            lineHeight: '1'
          }}
        >
          ×
        </button>
      </div>

      <div style={{ marginBottom: '30px' }}>
        <h3 style={{ color: PRIMARY_COLOR, marginBottom: '15px', fontSize: '18px' }}>📋 Member Information</h3>
        <div style={{ background: INPUT_DARK, padding: '15px', borderRadius: '10px', marginBottom: '10px' }}>
          <p style={{ color: TEXT_SECONDARY, margin: '8px 0' }}>📞 Phone: <strong style={{ color: TEXT_LIGHT }}>{selectedMember.phone}</strong></p>
          <p style={{ color: TEXT_SECONDARY, margin: '8px 0' }}>📧 Email: <strong style={{ color: TEXT_LIGHT }}>{selectedMember.email || 'Not provided'}</strong></p>
          <p style={{ color: TEXT_SECONDARY, margin: '8px 0' }}>🏠 Address: <strong style={{ color: TEXT_LIGHT }}>{selectedMember.address}</strong></p>
          {selectedMember.age && <p style={{ color: TEXT_SECONDARY, margin: '8px 0' }}>👤 Age: <strong style={{ color: TEXT_LIGHT }}>{selectedMember.age} years, {selectedMember.gender}</strong></p>}
          {selectedMember.emergencyContact && <p style={{ color: TEXT_SECONDARY, margin: '8px 0' }}>🚨 Emergency: <strong style={{ color: TEXT_LIGHT }}>{selectedMember.emergencyContact}</strong></p>}
        </div>
      </div>

      <div style={{ marginBottom: '30px' }}>
        <h3 style={{ color: PRIMARY_COLOR, marginBottom: '15px', fontSize: '18px' }}>💳 Current Membership</h3>
        <div style={{ background: INPUT_DARK, padding: '15px', borderRadius: '10px' }}>
          <p style={{ color: TEXT_SECONDARY, margin: '8px 0' }}>Plan: <strong style={{ color: TEXT_LIGHT }}>{selectedMember.membership.toUpperCase()}</strong></p>
          <p style={{ color: TEXT_SECONDARY, margin: '8px 0' }}>Status: <strong style={{ color: selectedMember.status === 'active' ? '#10b981' : '#ef4444' }}>{selectedMember.status.toUpperCase()}</strong></p>
          <p style={{ color: TEXT_SECONDARY, margin: '8px 0' }}>Joined: <strong style={{ color: TEXT_LIGHT }}>{new Date(selectedMember.joinDate).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</strong></p>
          <p style={{ color: TEXT_SECONDARY, margin: '8px 0' }}>Current Period: <strong style={{ color: TEXT_LIGHT }}>{selectedMember.startDate} to {selectedMember.endDate}</strong></p>
          <p style={{ color: PRIMARY_COLOR, margin: '8px 0', fontSize: '16px' }}>💰 Total Revenue: <strong>Rs {selectedMember.fee.toLocaleString('en-IN')}</strong></p>
        </div>
      </div>

      <div>
        <h3 style={{ color: PRIMARY_COLOR, marginBottom: '15px', fontSize: '18px' }}>💵 Payment History</h3>
        {selectedMember.paymentHistory && selectedMember.paymentHistory.length > 0 ? (
          <div style={{ maxHeight: '300px', overflowY: 'auto' }}>
            {selectedMember.paymentHistory.map((payment, index) => (
              <div key={index} style={{
                background: INPUT_DARK,
                padding: '15px',
                borderRadius: '10px',
                marginBottom: '10px',
                border: `1px solid ${BORDER_DARK}`
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                  <span style={{ color: TEXT_LIGHT, fontWeight: '600' }}>
                    {payment.type === 'New Membership' ? '🆕' : '🔄'} {payment.type}
                  </span>
                  <span style={{ color: PRIMARY_COLOR, fontWeight: '700' }}>
                    Rs {payment.amount.toLocaleString('en-IN')}
                  </span>
                </div>
                <p style={{ color: TEXT_SECONDARY, margin: '4px 0', fontSize: '13px' }}>
                  📅 Paid: {new Date(payment.date).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })}
                </p>
                <p style={{ color: TEXT_SECONDARY, margin: '4px 0', fontSize: '13px' }}>
                  💳 Plan: {payment.membership.toUpperCase()}
                </p>
                <p style={{ color: TEXT_SECONDARY, margin: '4px 0', fontSize: '13px' }}>
                  📆 Period: {payment.startDate} to {payment.endDate}
                </p>
              </div>
            ))}
          </div>
        ) : (
          <p style={{ color: TEXT_SECONDARY, textAlign: 'center', padding: '20px' }}>No payment history available</p>
        )}
      </div>

      <button
        onClick={() => setShowMemberDetails(false)}
        style={{
          width: '100%',
          background: PRIMARY_GRADIENT,
          color: BG_DARK,
          padding: '14px',
          border: 'none',
          borderRadius: '12px',
          cursor: 'pointer',
          fontWeight: '600',
          fontSize: '15px',
          marginTop: '20px'
        }}
      >
        Close
      </button>
    </div>
  </div>
)}
    </div>
  );
};

export default App;