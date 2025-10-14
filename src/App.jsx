import React, { useState, useEffect } from 'react';
import { supabase } from './supabaseClient';


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

  // --- NEW STATE: Tracks the member currently in the renewal modal ---
  const [renewalClient, setRenewalClient] = useState(null);
  const [renewalPlan, setRenewalPlan] = useState('basic'); // State for selected renewal plan
  // -------------------------------------------------------------------

  const [memberFilter, setMemberFilter] = useState('all'); // 'all', 'active', or 'expired'

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
    fetchClients(); // Changed from loadDemoData
  }
}, [isAuthenticated]);

 const fetchClients = async () => {
  setLoading(true);
  try {
    const { data, error } = await supabase
      .from('members')
      .select('*')
      .order('created_at', { ascending: false });
    
    if (error) throw error;
    
    // Map database column names to your app's field names
    const mappedData = (data || []).map(member => ({
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
      fee: member.fee,
      discount: member.discount,
      status: member.status
    }));
    
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

  const handleLogin = () => {
    if (loginUsername === 'admin' && loginPassword === 'admin123') {
      setIsAuthenticated(true);
      setMemberFilter('all');
    } else {
      alert('Invalid credentials!');
    }
  };

  // --- NEW: Function to open the renewal modal ---
  const openRenewalModal = (client) => {
    setRenewalClient(client);
    setRenewalPlan(client.membership); // Pre-select their previous plan
  };
  // ------------------------------------------------

  // --- UPDATED: Function to handle renewal submission ---
  const handleRenewSubscription = async () => {
  if (!renewalClient || !renewalPlan) return;

  setLoading(true);
  try {
    const renewalMonths = membershipMonths[renewalPlan];
    const renewalFee = membershipFees[renewalPlan];
    const newStartDate = new Date().toISOString().split('T')[0];
    const newEndDate = new Date();
    newEndDate.setMonth(newEndDate.getMonth() + renewalMonths);

    // Update in Supabase
    const { error } = await supabase
      .from('members')
      .update({
        status: 'active',
        start_date: newStartDate,
        end_date: newEndDate.toISOString().split('T')[0],
        membership: renewalPlan,
        fee: renewalFee
      })
      .eq('id', renewalClient.id);

    if (error) throw error;

    // Close modal and notify user
    alert(`Subscription renewed for ${renewalClient.name} with the ${renewalPlan.toUpperCase()} plan! (Rs ${renewalFee.toLocaleString('en-IN')})`);
    setRenewalClient(null);
    
    // Reload data from Supabase
    fetchClients();
  } catch (error) {
    console.error('Error renewing subscription:', error);
    alert('Error renewing subscription: ' + error.message);
  } finally {
    setLoading(false);
  }
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
      fee: finalFee,
      discount: 0,
      status: new Date() <= endDate ? 'active' : 'expired'
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
    fetchClients(); // Reload data
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
              🔐 Demo Credentials:
            </p>
            <p style={{ margin: '6px 0', color: TEXT_SECONDARY, fontSize: '14px' }}>
              <strong>Username:</strong> admin
            </p>
            <p style={{ margin: '6px 0', color: TEXT_SECONDARY, fontSize: '14px' }}>
              <strong>Password:</strong> admin123
            </p>
          </div>
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
    );
  }

  // --- MEMBER FILTERING LOGIC ---
  const filteredClients = clients.filter(client => {
    if (memberFilter === 'all') {
      return true;
    }
    return client.status === memberFilter;
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
              borderLeft: `6px solid ${c.status === 'active' ? PRIMARY_COLOR : '#ef4444'}`,
              border: `1px solid ${BORDER_DARK}`
            }}>
              <h3 style={{ fontSize: '22px', fontWeight: '700', marginBottom: '18px', color: TEXT_LIGHT }}>
                {c.name}
              </h3>
              <div style={{ fontSize: '14px', color: TEXT_SECONDARY, marginBottom: '10px' }}>📞 {c.phone}</div>
              <div style={{ fontSize: '14px', color: TEXT_SECONDARY, marginBottom: '10px' }}>📧 {c.email || 'Not provided'}</div>
              <div style={{ fontSize: '14px', color: TEXT_SECONDARY, marginBottom: '10px' }}>🏠 {c.address}</div>
              {c.age && <div style={{ fontSize: '14px', color: TEXT_SECONDARY, marginBottom: '10px' }}>👤 {c.age} years, {c.gender}</div>}
              {c.emergencyContact && <div style={{ fontSize: '14px', color: TEXT_SECONDARY, marginBottom: '10px' }}>🚨 {c.emergencyContact}</div>}
              <div style={{ fontSize: '14px', color: TEXT_SECONDARY, marginBottom: '10px' }}>💳 {c.membership.toUpperCase()} Plan</div>
              <div style={{ fontSize: '14px', color: TEXT_SECONDARY, marginBottom: '10px' }}>📅 {c.startDate} to {c.endDate}</div>
              <div style={{ fontSize: '14px', color: PRIMARY_COLOR, marginBottom: '16px', fontWeight: '600' }}>
                💰 Rs {c.fee} {c.discount > 0 ? `(${c.discount}% discount)` : ''}
              </div>
              <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                marginTop: '16px',
                paddingTop: '16px',
                borderTop: `1px solid ${BORDER_DARK}`
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

                {/* --- RENEWAL BUTTON CALLS OPEN MODAL --- */}
                {c.status === 'expired' ? (
               <button
  onClick={() => openRenewalModal(c)}
  disabled={loading}
  style={{
    background: PRIMARY_GRADIENT,
    color: BG_DARK,
    padding: '8px 20px',
    border: 'none',
    borderRadius: '10px',
    cursor: loading ? 'not-allowed' : 'pointer',
    fontWeight: '600',
    fontSize: '13px',
    boxShadow: '0 2px 8px rgba(0, 225, 255, 0.4)',
    opacity: loading ? 0.6 : 1
  }}
>
  RENEW PLAN
</button>
                ) : (
                  <button
                    onClick={() => handleRemoveClient(c.id)}
                    style={{
                      background: 'linear-gradient(135deg, #dc2626 0%, #ef4444 100%)',
                      color: 'white',
                      padding: '8px 20px',
                      border: 'none',
                      borderRadius: '10px',
                      cursor: 'pointer',
                      fontWeight: '600',
                      fontSize: '13px'
                    }}
                  >
                    Remove
                  </button>
                )}
                {/* -------------------------------------- */}
              </div>
            </div>
          )) : (
            <div style={{ gridColumn: '1 / -1', textAlign: 'center', padding: '40px', background: CARD_DARK, borderRadius: '18px', color: TEXT_SECONDARY }}>
              {memberFilter === 'all' && 'No members found.'}
              {memberFilter === 'active' && 'No active members match the filter.'}
              {memberFilter === 'expired' && 'No expired members match the filter.'}
            </div>
          )}
        </div>
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
    {renewalClient && (
      <div style={{
        position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
        background: 'rgba(0,0,0,0.8)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '20px'
      }}>
        <div style={{
          background: CARD_DARK, borderRadius: '20px', padding: '30px', maxWidth: '450px', width: '100%', border: `1px solid ${BORDER_DARK}`
        }}>
          <h3 style={{ marginBottom: '15px', color: TEXT_LIGHT }}>🔄 Renew Membership for {renewalClient.name}</h3>
          <p style={{ color: TEXT_SECONDARY, marginBottom: '20px' }}>
            Current Status: <strong style={{color: '#ef4444'}}>EXPIRED</strong> on {renewalClient.endDate}
          </p>

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

          <p style={{ color: TEXT_LIGHT, marginBottom: '25px', fontSize: '16px' }}>
            **New Fee Payable:** <strong style={{color: PRIMARY_COLOR}}>Rs {membershipFees[renewalPlan].toLocaleString('en-IN')}</strong>
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
  {loading ? 'Processing...' : `Confirm Renewal (Rs ${membershipFees[renewalPlan].toLocaleString('en-IN')})`}
</button>
          </div>
        </div>
      </div>
    )}
    {/* ------------------------------------------- */}
    </div>
  );
};

export default App;