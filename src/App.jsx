import React, { useState, useEffect } from 'react';
import { supabase } from './supabaseClient';
import bcrypt from 'bcryptjs';
import NepaliDate from 'nepali-date-converter';
import NepaliDatePicker from './NepaliDatePicker';
// Assuming gymLogo.jpg is in your public folder or imported correctly

const App = () => {
  const [loading, setLoading] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [activeTab, setActiveTab] = useState('clients');
  const [clients, setClients] = useState([]);
  const [loginUsername, setLoginUsername] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [stats, setStats] = useState({ total: 0, active: 0, expired: 0, revenue: 0 });
  const [monthlyRevenue, setMonthlyRevenue] = useState(0);
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
const [uploadingPhoto, setUploadingPhoto] = useState(false);
const [photoToUpload, setPhotoToUpload] = useState(null);
const [photoPreview, setPhotoPreview] = useState(null);
const [showCamera, setShowCamera] = useState(false);
const [cameraStream, setCameraStream] = useState(null);
const videoRef = React.useRef(null);
const canvasRef = React.useRef(null);
  const [memberFilter, setMemberFilter] = useState('all');// 'all', 'active', or 'expired'
  const [selectedMember, setSelectedMember] = useState(null); // For viewing member details
const [showMemberDetails, setShowMemberDetails] = useState(false);
  const [searchQuery, setSearchQuery] = useState(''); // Search functionality
  const [showScrollTop, setShowScrollTop] = useState(false);
  const [sortOption, setSortOption] = useState('name'); // 'name', 'newest', 'oldest'
const [customRenewalDate, setCustomRenewalDate] = useState('');
const [isEditingMember, setIsEditingMember] = useState(false);
const [editFormData, setEditFormData] = useState({
  name: '', phone: '', email: '', address: '', age: '', gender: '',
  emergencyContact: '', membership: '', startDate: '', fee: ''
});
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
  const isMobile = window.innerWidth <= 768;
  const isSmallMobile = window.innerWidth <= 480;
  

  const formatDateFriendly = (dateString) => {
  if (!dateString) return 'N/A';
  try {
    return new Date(dateString).toLocaleDateString('en-US', { 
      year: 'numeric', 
      month: 'short', 
      day: 'numeric' 
    });
  } catch (e) {
    return dateString;
  }
};
// New function to show both Nepali and English dates
const formatDateBoth = (dateString) => {
  if (!dateString) return 'N/A';
  try {
    const date = new Date(dateString);
    const nepaliDate = new NepaliDate(date);
    const nepaliFormatted = nepaliDate.format('YYYY MMMM DD'); // e.g., "२०८१ पुष १५"
    const englishFormatted = formatDateFriendly(dateString);
    
    return (
      <span>
        <span style={{ fontWeight: '600' }}>{nepaliFormatted}</span>
        <span style={{ opacity: 0.7, fontSize: '0.9em' }}> ({englishFormatted})</span>
      </span>
    );
  } catch (e) {
    return dateString;
  }
};

const getDaysRemaining = (endDate) => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const end = new Date(endDate);
  end.setHours(0, 0, 0, 0);
  const days = Math.ceil((end - today) / (1000 * 60 * 60 * 24));
  return days;
};

const getExpiryStatus = (endDate) => {
  const days = getDaysRemaining(endDate);
  
  if (days > 7) {
    return { text: `${days} days left`, color: '#10b981', icon: '✅' };
  } else if (days > 0) {
    return { text: `${days} days left`, color: '#f59e0b', icon: '⚠️' };
  } else if (days === 0) {
    return { text: 'Expires today', color: '#ef4444', icon: '🔴' };
  } else {
    return { text: `Expired ${Math.abs(days)} days ago`, color: '#ef4444', icon: '❌' };
  }
};
  // ---------------------------------

useEffect(() => {
  if (isAuthenticated) {
    fetchClients();
  }
}, [isAuthenticated, sortOption]); // Re-fetch when sort changes
useEffect(() => {
  const handleResize = () => {
    // Force re-render on resize
    setLoading(prev => prev);
  };
  
  window.addEventListener('resize', handleResize);
  return () => window.removeEventListener('resize', handleResize);
}, []);
// Detect scroll position
useEffect(() => {
  const handleScroll = () => {
    if (window.scrollY > 400) {
      setShowScrollTop(true);
    } else {
      setShowScrollTop(false);
    }
  };
  
  window.addEventListener('scroll', handleScroll);
  return () => window.removeEventListener('scroll', handleScroll);
}, []);
// Cleanup camera on unmount
useEffect(() => {
  return () => {
    if (cameraStream) {
      cameraStream.getTracks().forEach(track => track.stop());
    }
  };
}, [cameraStream]);

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
      paymentHistory: member.payment_history || [],
      isArchived: member.is_archived || false,
      photoUrl: member.photo_url || null 
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
    calculateMonthlyRevenue(mappedData); 
  } catch (error) {
    console.error('Error fetching clients:', error);
    alert('Error loading members: ' + error.message);
  } finally {
    setLoading(false);
  }
};

  const calculateStats = (list) => {
  const activeList = list.filter(c => !c.isArchived);
  
  // Calculate expiring soon (within 7 days)
  const expiringSoon = activeList.filter(c => {
    if (c.status !== 'active') return false;
    const days = getDaysRemaining(c.endDate);
    return days > 0 && days <= 7;
  }).length;
  
  setStats({
    total: activeList.length,
    active: activeList.filter(c => c.status === 'active').length,
    expiringSoon: expiringSoon,
    expired: activeList.filter(c => c.status === 'expired').length,
    revenue: activeList.reduce((sum, c) => sum + c.fee, 0)
  });
};
const calculateMonthlyRevenue = (list) => {
  const activeList = list.filter(c => !c.isArchived);
  
  // Get current month and year
  const now = new Date();
  const currentMonth = now.getMonth(); // 0-11
  const currentYear = now.getFullYear();
  
  let monthTotal = 0;
  
  activeList.forEach(client => {
    if (client.paymentHistory && client.paymentHistory.length > 0) {
      client.paymentHistory.forEach(payment => {
        const paymentDate = new Date(payment.date);
        const paymentMonth = paymentDate.getMonth();
        const paymentYear = paymentDate.getFullYear();
        
        // Check if payment was made in current month
        if (paymentMonth === currentMonth && paymentYear === currentYear) {
          monthTotal += payment.amount;
        }
      });
    }
  });
  
  setMonthlyRevenue(monthTotal);
};

// Helper: Compress and resize image
const compressImage = async (file) => {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        
        // Max dimensions: 400x400 for efficiency
        const MAX_WIDTH = 400;
        const MAX_HEIGHT = 400;
        let width = img.width;
        let height = img.height;
        
        if (width > height) {
          if (width > MAX_WIDTH) {
            height *= MAX_WIDTH / width;
            width = MAX_WIDTH;
          }
        } else {
          if (height > MAX_HEIGHT) {
            width *= MAX_HEIGHT / height;
            height = MAX_HEIGHT;
          }
        }
        
        canvas.width = width;
        canvas.height = height;
        ctx.drawImage(img, 0, 0, width, height);
        
        canvas.toBlob((blob) => {
          resolve(new File([blob], file.name, { type: 'image/jpeg', lastModified: Date.now() }));
        }, 'image/jpeg', 0.8); // 80% quality
      };
      img.src = e.target.result;
    };
    reader.readAsDataURL(file);
  });
};

// Helper: Upload photo to Supabase Storage
const uploadPhotoToStorage = async (file, memberId) => {
  try {
    const compressedFile = await compressImage(file);
    const fileExt = 'jpg'; // Always use jpg after compression
    const fileName = `${memberId}_${Date.now()}.${fileExt}`;
    const filePath = `${fileName}`;

    const { data, error } = await supabase.storage
      .from('member-photos')
      .upload(filePath, compressedFile, {
        cacheControl: '3600',
        upsert: false
      });

    if (error) throw error;

    // Get public URL
    const { data: urlData } = supabase.storage
      .from('member-photos')
      .getPublicUrl(filePath);

    return urlData.publicUrl;
  } catch (error) {
    console.error('Error uploading photo:', error);
    throw error;
  }
};

// Helper: Delete old photo from storage
const deletePhotoFromStorage = async (photoUrl) => {
  if (!photoUrl) return;
  
  try {
    // Extract filename from URL
    const urlParts = photoUrl.split('/');
    const fileName = urlParts[urlParts.length - 1];
    
    const { error } = await supabase.storage
      .from('member-photos')
      .remove([fileName]);
    
    if (error) throw error;
  } catch (error) {
    console.error('Error deleting photo:', error);
  }
};

// Handle photo selection for new member
const handlePhotoSelect = (e) => {
  const file = e.target.files[0];
  if (file) {
    if (file.size > 5000000) { // 5MB limit
      alert('Photo size should be less than 5MB');
      return;
    }
    setPhotoToUpload(file);
    setPhotoPreview(URL.createObjectURL(file));
  }
};
// Start camera
const startCamera = async () => {
  try {
    const stream = await navigator.mediaDevices.getUserMedia({ 
      video: { facingMode: 'user', width: 640, height: 480 } 
    });
    setCameraStream(stream);
    setShowCamera(true);
    setTimeout(() => {
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
    }, 100);
  } catch (error) {
    console.error('Camera access error:', error);
    alert('Unable to access camera. Please check permissions or use file upload instead.');
  }
};

// Stop camera
const stopCamera = () => {
  if (cameraStream) {
    cameraStream.getTracks().forEach(track => track.stop());
    setCameraStream(null);
  }
  setShowCamera(false);
};

// Capture photo from camera
const capturePhoto = () => {
  if (videoRef.current && canvasRef.current) {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    const context = canvas.getContext('2d');
    
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    context.drawImage(video, 0, 0, canvas.width, canvas.height);
    
    canvas.toBlob((blob) => {
      const file = new File([blob], `camera_${Date.now()}.jpg`, { type: 'image/jpeg' });
      setPhotoToUpload(file);
      setPhotoPreview(URL.createObjectURL(file));
      stopCamera();
    }, 'image/jpeg', 0.9);
  }
};
// Save captured/uploaded photo for existing member
const savePhotoForExistingMember = async () => {
  if (!selectedMemberForPhoto || !photoToUpload) return;
  
  setUploadingPhoto(true);
  try {
    // Delete old photo if exists
    if (selectedMemberForPhoto.photoUrl) {
      await deletePhotoFromStorage(selectedMemberForPhoto.photoUrl);
    }
    
    // Upload new photo
    const photoUrl = await uploadPhotoToStorage(photoToUpload, selectedMemberForPhoto.id);
    
    // Update database
    const { error } = await supabase
      .from('members')
      .update({ photo_url: photoUrl })
      .eq('id', selectedMemberForPhoto.id);
    
    if (error) throw error;
    
    alert('Photo updated successfully!');
    setShowPhotoUpdateModal(false);
    setSelectedMemberForPhoto(null);
    setPhotoToUpload(null);
    setPhotoPreview(null);
    fetchClients();
  } catch (error) {
    console.error('Error updating photo:', error);
    alert('Error updating photo: ' + error.message);
  } finally {
    setUploadingPhoto(false);
  }
};
// Handle photo update for existing member
const handleUpdateMemberPhoto = async (memberId, currentPhotoUrl) => {
  setSelectedMemberForPhoto({ id: memberId, photoUrl: currentPhotoUrl });
  setShowPhotoUpdateModal(true);
};
const [showPhotoUpdateModal, setShowPhotoUpdateModal] = useState(false);
const [selectedMemberForPhoto, setSelectedMemberForPhoto] = useState(null);

// Handle photo removal
const handleRemoveMemberPhoto = async (memberId, photoUrl) => {
  if (!window.confirm('Remove member photo?')) return;
  
  setUploadingPhoto(true);
  try {
    // Delete from storage
    await deletePhotoFromStorage(photoUrl);
    
    // Update database
    const { error } = await supabase
      .from('members')
      .update({ photo_url: null })
      .eq('id', memberId);
    
    if (error) throw error;
    
    alert('Photo removed successfully!');
    fetchClients();
  } catch (error) {
    console.error('Error removing photo:', error);
    alert('Error removing photo: ' + error.message);
  } finally {
    setUploadingPhoto(false);
  }
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

    // Determine the payment date based on renewal option
let paymentDate;
if (renewalStartOption === 'custom') {
  // For custom date, payment date is the custom start date
  paymentDate = new Date(customRenewalDate).toISOString();
} else if (renewalStartOption === 'from_expiry') {
  // For continuing from expiry, payment date is the old end date
  paymentDate = oldEndDate.toISOString();
} else {
  // For 'from_today' or 'auto' starting from today, use today's date
  paymentDate = new Date().toISOString();
}

const newPayment = {
  date: paymentDate,  // ✅ FIXED: Uses the appropriate date based on renewal option
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
      payment_history: [initialPayment],
       photo_url: null
    };

    const { error } = await supabase
      .from('members')
      .insert([newMember]);

    if (error) throw error;
     // Upload photo if selected
    let photoUrl = null;
    if (photoToUpload) {
      try {
        photoUrl = await uploadPhotoToStorage(photoToUpload, insertedMember.id);
        
        // Update member with photo URL
        const { error: updateError } = await supabase
          .from('members')
          .update({ photo_url: photoUrl })
          .eq('id', insertedMember.id);
        
        if (updateError) throw updateError;
      } catch (photoError) {
        console.error('Error uploading photo:', photoError);
        alert('Member added but photo upload failed. You can add it later.');
      }
    }

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
const handleEditMember = (member) => {
  setIsEditingMember(true);
  setEditFormData({
    name: member.name,
    phone: member.phone,
    email: member.email || '',
    address: member.address,
    age: member.age || '',
    gender: member.gender || '',
    emergencyContact: member.emergencyContact || '',
    membership: member.membership,
    startDate: member.startDate,
    fee: member.fee
  });
};

const handleCancelEdit = () => {
  setIsEditingMember(false);
  setEditFormData({
    name: '', phone: '', email: '', address: '', age: '', gender: '',
    emergencyContact: '', membership: '', startDate: '', fee: ''
  });
};

const handleEditInputChange = (field, value) => {
  if (field === 'membership') {
    const newFee = membershipFees[value];
    setEditFormData(prev => ({ ...prev, membership: value, fee: newFee }));
  } else {
    setEditFormData(prev => ({ ...prev, [field]: value }));
  }
};

const handleSaveMemberEdit = async () => {
  if (!selectedMember || !editFormData.name || !editFormData.phone || !editFormData.address) {
    alert('Please fill all required fields!');
    return;
  }

  setLoading(true);
  try {
    // Calculate new end date if start date or membership changed
    const newEndDate = new Date(editFormData.startDate);
    newEndDate.setMonth(newEndDate.getMonth() + membershipMonths[editFormData.membership]);

    const updatedData = {
      name: editFormData.name,
      phone: editFormData.phone,
      email: editFormData.email || null,
      address: editFormData.address,
      age: editFormData.age ? parseInt(editFormData.age) : null,
      gender: editFormData.gender || null,
      emergency_contact: editFormData.emergencyContact || null,
      membership: editFormData.membership,
      start_date: editFormData.startDate,
      end_date: newEndDate.toISOString().split('T')[0],
      fee: parseInt(editFormData.fee) || membershipFees[editFormData.membership]
    };

    const { error } = await supabase
      .from('members')
      .update(updatedData)
      .eq('id', selectedMember.id);

    if (error) throw error;

    alert('Member details updated successfully!');
    setIsEditingMember(false);
    setShowMemberDetails(false);
    fetchClients();
  } catch (error) {
    console.error('Error updating member:', error);
    alert('Error updating member: ' + error.message);
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
const scrollToTop = () => {
  window.scrollTo({
    top: 0,
    behavior: 'smooth'
  });
};
const handleMoveToArchive = async (client) => {
  if (!window.confirm(`Move ${client.name} to archive?\n\nThey will be hidden from the main view but can be restored later.`)) {
    return;
  }

  setLoading(true);
  try {
    const { error } = await supabase
      .from('members')
      .update({ is_archived: true })
      .eq('id', client.id);

    if (error) throw error;

    alert(`${client.name} moved to archive successfully!`);
    fetchClients();
  } catch (error) {
    console.error('Error archiving member:', error);
    alert('Error: ' + error.message);
  } finally {
    setLoading(false);
  }
};

const handleRestoreFromArchive = async (client) => {
  if (!window.confirm(`Restore ${client.name} from archive?`)) {
    return;
  }

  setLoading(true);
  try {
    const { error } = await supabase
      .from('members')
      .update({ is_archived: false })
      .eq('id', client.id);

    if (error) throw error;

    alert(`${client.name} restored from archive!`);
    fetchClients();
  } catch (error) {
    console.error('Error restoring member:', error);
    alert('Error: ' + error.message);
  } finally {
    setLoading(false);
  }
};

 const handleExportCSV = () => {
  // Headers now include payment history details
  const headers = ['Name', 'Phone', 'Email', 'Address', 'Age', 'Gender', 'Emergency Contact',
                   'Membership', 'Start Date', 'End Date', 'Total Revenue', 'Status', 'Payment History'];

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

  // Function to format payment history into readable string
  const formatPaymentHistory = (paymentHistory) => {
    if (!paymentHistory || paymentHistory.length === 0) {
      return 'No payment history';
    }
    
    return paymentHistory.map((payment, idx) => {
      const paymentDate = new Date(payment.date).toLocaleDateString('en-IN');
      return `[${idx + 1}] ${payment.type} | Rs ${payment.amount} | ${payment.membership.toUpperCase()} | Paid: ${paymentDate} | Period: ${payment.startDate} to ${payment.endDate}`;
    }).join(' | ');
  };

  const csvData = clients.map(c => {
    const phone = String(c.phone || '').replace(/"/g, '""');
    const emergencyContact = String(c.emergencyContact || '').replace(/"/g, '""');
    const paymentHistoryText = formatPaymentHistory(c.paymentHistory);

    return [
      c.name,
      phone,
      c.email || '',
      c.address,
      c.age || '',
      c.gender || '',
      emergencyContact,
      c.membership.toUpperCase(),
      formatDate(c.startDate),
      formatDate(c.endDate),
      c.fee,
      c.status,
      paymentHistoryText
    ];
  });

  const csvContent = [
    headers.join(','),
    ...csvData.map(row => row.map(cell => `"${cell}"`).join(','))
  ].join('\n');

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
  <div style={{ position: 'relative' }}>
    <input
      type={showPassword ? 'text' : 'password'}
      value={loginPassword}
      onChange={(e) => setLoginPassword(e.target.value)}
      onKeyPress={(e) => e.key === 'Enter' && handleLogin()}
      style={inputStyle}
      placeholder="Enter your password"
    />
    <button
      onClick={() => setShowPassword(!showPassword)}
      style={{
        position: 'absolute',
        right: '12px',
        top: '50%',
        transform: 'translateY(-50%)',
        background: 'none',
        border: 'none',
        color: PRIMARY_COLOR,
        cursor: 'pointer',
        fontSize: '18px',
        padding: '0'
      }}
    >
      {showPassword ? '👁️' : '👁️‍🗨️'}
    </button>
  </div>
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
  if (activeTab === 'bin') {
    return client.isArchived === true;
  }
  
  if (client.isArchived === true) return false;
  
  // Handle expiring soon filter
  let matchesFilter;
  if (memberFilter === 'expiring') {
    const days = getDaysRemaining(client.endDate);
    matchesFilter = client.status === 'active' && days > 0 && days <= 7;
  } else {
    matchesFilter = memberFilter === 'all' || client.status === memberFilter;
  }
  
  const matchesSearch = searchQuery === '' || 
    client.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    client.phone.includes(searchQuery);

  return matchesFilter && matchesSearch;
});
  // --- DASHBOARD LAYOUT (AUTHENTICATED) ---
  return (
  <>
    <style>
      {`
        @keyframes fadeIn {
          from {
            opacity: 0;
            transform: translateY(20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
           @keyframes pulse {
          0%, 100% {
            transform: scale(1);
            box-shadow: 0 8px 20px rgba(0, 225, 255, 0.4);
          }
          50% {
            transform: scale(1.05);
            box-shadow: 0 12px 30px rgba(0, 225, 255, 0.6);
          }
        }
      `}
    </style>
    <div style={{
      minHeight: '100vh',
      background: BG_DARK,
      padding: isMobile ? '10px' : '20px',
      fontFamily: 'Arial, sans-serif',
      boxSizing: 'border-box'
    }}>
      <div style={{
        maxWidth: '1400px',
        margin: '0 auto'
      }}>
      <div style={{
  background: CARD_DARK,
  borderRadius: isMobile ? '12px' : '20px',  // CHANGED
  padding: isMobile ? '12px' : '24px',  // CHANGED
  marginBottom: isMobile ? '12px' : '24px',  // CHANGED
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
          <div style={{ display: 'flex', alignItems: 'center', gap: isMobile ? '8px' : '16px' }}>
  <LogoComponent size={isMobile ? 35 : 50} style={{ borderRadius: isMobile ? '8px' : '12px' }}/>
  <div>
    <h1 style={{ 
      fontSize: isMobile ? '18px' : '32px',  // CHANGED
      fontWeight: 'bold', 
      color: TEXT_LIGHT, 
      margin: '0 0 4px 0' 
    }}>
      GymGhar Dashboard
    </h1>
    <p style={{ 
      color: TEXT_SECONDARY, 
      margin: 0, 
      fontSize: isMobile ? '11px' : '15px',  // CHANGED
      display: isSmallMobile ? 'none' : 'block'  // CHANGED: Hide on very small screens
    }}>
      Manage your gym members efficiently
    </p>
  </div>
</div>
          <div style={{ 
  display: 'flex', 
  gap: isMobile ? '6px' : '12px',  // CHANGED
  flexWrap: 'wrap',
  width: isMobile ? '100%' : 'auto',  // CHANGED
  justifyContent: isMobile ? 'stretch' : 'flex-start'  // CHANGED
}}>
           <button
  onClick={() => setShowChangePassword(true)}
  style={{
    background: 'linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%)',
    color: 'white',
    padding: isMobile ? '10px 8px' : '12px 24px',  // CHANGED: More vertical padding
    border: 'none',
    borderRadius: isMobile ? '8px' : '12px',
    cursor: 'pointer',
    fontWeight: '600',
    fontSize: isMobile ? '10px' : '15px',  // CHANGED: Slightly smaller but visible
    boxShadow: '0 4px 12px rgba(139,92,246,0.3)',
    display: 'flex',
    alignItems: 'center',
    gap: '4px',
    flex: isMobile ? '1' : 'none',
    justifyContent: 'center',
    whiteSpace: isMobile ? 'normal' : 'nowrap',  // CHANGED: Allow wrapping on mobile
    lineHeight: '1.2',  // CHANGED: Better line spacing
    textAlign: 'center'  // CHANGED: Center text
  }}
>
  {isMobile ? (
    <>
      🔐<br/>Password
    </>
  ) : (
    '🔐 Change Password'
  )}
</button>
           <button
  onClick={handleExportCSV}
  style={{
    background: 'linear-gradient(135deg, #059669 0%, #10b981 100%)',
    color: 'white',
    padding: isMobile ? '10px 8px' : '12px 24px',  // CHANGED
    border: 'none',
    borderRadius: isMobile ? '8px' : '12px',
    cursor: 'pointer',
    fontWeight: '600',
    fontSize: isMobile ? '10px' : '15px',  // CHANGED
    boxShadow: '0 4px 12px rgba(16,185,129,0.3)',
    display: 'flex',
    alignItems: 'center',
    gap: '4px',
    flex: isMobile ? '1' : 'none',
    justifyContent: 'center',
    whiteSpace: isMobile ? 'normal' : 'nowrap',  // CHANGED
    lineHeight: '1.2',  // CHANGED
    textAlign: 'center'  // CHANGED
  }}
>
  {isMobile ? (
    <>
      📥<br/>Export
    </>
  ) : (
    '📥 Export CSV'
  )}
</button>
           <button
  onClick={() => setIsAuthenticated(false)}
  style={{
    background: 'linear-gradient(135deg, #dc2626 0%, #ef4444 100%)',
    color: 'white',
    padding: isMobile ? '10px 8px' : '12px 28px',  // CHANGED
    border: 'none',
    borderRadius: isMobile ? '8px' : '12px',
    cursor: 'pointer',
    fontWeight: '600',
    fontSize: isMobile ? '10px' : '15px',  // CHANGED
    boxShadow: '0 4px 12px rgba(220, 38, 38, 0.3)',
    flex: isMobile ? '1' : 'none',
    justifyContent: 'center',
    whiteSpace: isMobile ? 'normal' : 'nowrap',  // CHANGED
    lineHeight: '1.2',  // CHANGED
    textAlign: 'center',  // CHANGED
    display: 'flex',  // CHANGED
    alignItems: 'center'  // CHANGED
  }}
>
  {isMobile ? (
    <>
      🚪<br/>Logout
    </>
  ) : (
    'Logout'
  )}
</button>
          </div>
        </div>
      </div>

      {/* STATS CARDS - CLICKABLE FOR FILTERING */}
      <div style={{
  display: 'grid',
  gridTemplateColumns: isMobile ? 'repeat(2, 1fr)' : 'repeat(auto-fit, minmax(250px, 1fr))',  // CHANGED: 2 columns on mobile
  gap: isMobile ? '8px' : '20px',  // CHANGED
  marginBottom: isMobile ? '12px' : '24px'  // CHANGED
}}>
        {[
  { num: stats.total, label: 'Total Members', color: PRIMARY_COLOR, icon: '👥', filter: 'all' },
  { num: stats.active, label: 'Active Members', color: '#10b981', icon: '✅', filter: 'active' },
  { num: stats.expiringSoon || 0, label: 'Expiring Soon', color: '#f59e0b', icon: '⏰', filter: 'expiring' },
  { num: stats.expired, label: 'Expired Members', color: '#ef4444', icon: '⚠️', filter: 'expired' },
  { num: `Rs ${monthlyRevenue.toLocaleString('en-IN')}`, label: 'This Month Revenue', color: '#10b981', icon: '📅', filter: null },
  { num: `Rs ${stats.revenue.toLocaleString('en-IN')}`, label: 'Total Revenue', color: '#f59e0b', icon: '💰', filter: null }
].map((stat, i) => (
          <div
  key={i}
  onClick={() => stat.filter && setMemberFilter(stat.filter)}
  style={{
    background: CARD_DARK,
    borderRadius: isMobile ? '10px' : '18px',  // CHANGED
    padding: isMobile ? '12px 8px' : '28px',  // CHANGED
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
  <div style={{ fontSize: isMobile ? '24px' : '36px', marginBottom: isMobile ? '6px' : '12px' }}>{stat.icon}</div>  {/* CHANGED */}
  <div style={{ 
    fontSize: isMobile ? '20px' : '42px',  // CHANGED
    fontWeight: '800', 
    color: stat.color, 
    marginBottom: isMobile ? '4px' : '8px',  // CHANGED
    wordBreak: 'break-word'  // CHANGED: Prevent overflow
  }}>
    {stat.num}
  </div>
  <div style={{ 
    color: TEXT_SECONDARY, 
    fontWeight: '600', 
    fontSize: isMobile ? '9px' : '15px',  // CHANGED
    lineHeight: '1.2'  // CHANGED
  }}>{stat.label}</div>
</div>
        ))}
      </div>

      {/* TABS */}
      <div style={{
  background: CARD_DARK,
  borderRadius: isMobile ? '10px' : '16px',  // CHANGED
  padding: isMobile ? '6px' : '10px',  // CHANGED
  marginBottom: isMobile ? '12px' : '24px',  // CHANGED
  display: 'flex',
  gap: isMobile ? '4px' : '10px',  // CHANGED
  boxShadow: '0 8px 20px rgba(0,0,0,0.3)'
}}>
        {['clients', 'bin', 'add'].map(tab => (
    <button
  key={tab}
  onClick={() => { setActiveTab(tab); if (tab === 'clients') setMemberFilter('all'); }}
  style={{
    flex: 1,
    padding: isMobile ? '8px 4px' : '14px 24px',  // CHANGED
    border: 'none',
    borderRadius: isMobile ? '8px' : '12px',  // CHANGED
    cursor: 'pointer',
    fontWeight: '600',
    fontSize: isMobile ? '10px' : '15px',  // CHANGED
    background: activeTab === tab ? PRIMARY_GRADIENT : 'transparent',
    color: activeTab === tab ? BG_DARK : TEXT_SECONDARY,
    boxShadow: activeTab === tab ? '0 6px 20px rgba(0, 225, 255, 0.4)' : 'none',
    whiteSpace: isMobile ? 'normal' : 'nowrap',  // CHANGED: Allow wrapping on mobile
    lineHeight: '1.2'  // CHANGED
  }}
>
  {isMobile ? 
    (tab === 'clients' ? '📋 Members' : tab === 'bin' ? '🗑️ Archive' : '➕ Add') :  // CHANGED: Shorter text on mobile
    (tab === 'clients' ? '📋 View Members' : tab === 'bin' ? '🗑️ Archive' : '➕ Add New Member')
  }
</button>
  ))}
</div>

      {/* CONTENT */}
{activeTab === 'clients' ? (
  <>
    {/* SEARCH BAR */}
   <div style={{
  background: CARD_DARK,
  borderRadius: isMobile ? '10px' : '16px',  // CHANGED
  padding: isMobile ? '12px' : '20px',  // CHANGED
  marginBottom: isMobile ? '12px' : '24px',  // CHANGED
  boxShadow: '0 8px 20px rgba(0,0,0,0.3)',
  border: `1px solid ${BORDER_DARK}`
}}>
  <div style={{ 
  display: 'flex', 
  gap: isMobile ? '10px' : '15px',  // CHANGED
  marginBottom: isMobile ? '10px' : '15px',  // CHANGED
  flexWrap: 'wrap',
  flexDirection: isMobile ? 'column' : 'row'  // CHANGED: Stack vertically on mobile
}}>
  <div style={{ flex: 1, minWidth: isMobile ? '100%' : '200px' }}>  {/* CHANGED */}
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
  gridTemplateColumns: isMobile ? '1fr' : 'repeat(auto-fill, minmax(340px, 1fr))',  // CHANGED: Single column on mobile
  gap: isMobile ? '12px' : '24px'  // CHANGED
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
  {/* NEW: Photo + Name Section */}
<div style={{ display: 'flex', gap: '16px', alignItems: 'start', marginBottom: '18px' }}>
  
  {/* LEFT SIDE: Member Photo Circle */}
  <div style={{ position: 'relative' }}>
    {/* The circular photo */}
    <div style={{
      width: '70px',
      height: '70px',
      borderRadius: '50%',
      background: c.photoUrl ? 'transparent' : CARD_DARK,
      border: `3px solid ${c.status === 'active' ? (c.holdStatus === 'on_hold' ? '#f59e0b' : PRIMARY_COLOR) : '#ef4444'}`,
      overflow: 'hidden',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      fontSize: '32px',
      flexShrink: 0
    }}>
      {c.photoUrl ? (
        <img 
          src={c.photoUrl} 
          alt={c.name}
          style={{
            width: '100%',
            height: '100%',
            objectFit: 'cover'
          }}
        />
      ) : (
        '👤'
      )}
    </div>
    
    {/* Small action buttons on bottom-right of photo */}
    <div style={{
      position: 'absolute',
      bottom: '-5px',
      right: '-5px',
      display: 'flex',
      gap: '4px'
    }}>
      {/* Camera button - Add/Change photo */}
      <button
        onClick={() => handleUpdateMemberPhoto(c.id, c.photoUrl)}
        disabled={uploadingPhoto}
        style={{
          background: PRIMARY_GRADIENT,
          color: BG_DARK,
          border: 'none',
          borderRadius: '50%',
          width: '24px',
          height: '24px',
          cursor: uploadingPhoto ? 'not-allowed' : 'pointer',
          fontSize: '12px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          boxShadow: '0 2px 8px rgba(0,0,0,0.3)'
        }}
        title={c.photoUrl ? "Change photo" : "Add photo"}
      >
        📷
      </button>
      
      {/* X button - Remove photo (only shows if photo exists) */}
      {c.photoUrl && (
        <button
          onClick={() => handleRemoveMemberPhoto(c.id, c.photoUrl)}
          disabled={uploadingPhoto}
          style={{
            background: '#ef4444',
            color: 'white',
            border: 'none',
            borderRadius: '50%',
            width: '24px',
            height: '24px',
            cursor: uploadingPhoto ? 'not-allowed' : 'pointer',
            fontSize: '12px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 2px 8px rgba(0,0,0,0.3)'
          }}
          title="Remove photo"
        >
          ×
        </button>
      )}
    </div>
  </div>
  
  {/* RIGHT SIDE: Name and View Details button */}
  <div style={{ flex: 1 }}>
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start' }}>
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
  </div>
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
  ⏸️ ON HOLD since {formatDateBoth(c.holdStartDate)}
</div>
  )}

  <div style={{ fontSize: '14px', color: TEXT_SECONDARY, marginBottom: '10px' }}>📞 {c.phone}</div>
  <div style={{ fontSize: '14px', color: TEXT_SECONDARY, marginBottom: '10px' }}>📧 {c.email || 'Not provided'}</div>
  <div style={{ fontSize: '14px', color: TEXT_SECONDARY, marginBottom: '10px' }}>🏠 {c.address}</div>
  {c.age && <div style={{ fontSize: '14px', color: TEXT_SECONDARY, marginBottom: '10px' }}>👤 {c.age} years, {c.gender}</div>}
  {c.emergencyContact && <div style={{ fontSize: '14px', color: TEXT_SECONDARY, marginBottom: '10px' }}>🚨 {c.emergencyContact}</div>}
  <div style={{ fontSize: '14px', color: TEXT_SECONDARY, marginBottom: '10px' }}>💳 {c.membership.toUpperCase()} Plan</div>
 <div style={{ fontSize: '14px', color: TEXT_SECONDARY, marginBottom: '10px' }}>
  📅 {formatDateBoth(c.startDate)} to {formatDateBoth(c.endDate)}
</div>

{/* ADD THIS NEW SECTION - Expiry Status */}
{c.status === 'active' && c.holdStatus !== 'on_hold' && (
  <div style={{
    fontSize: '13px',
    fontWeight: '600',
    marginBottom: '10px',
    padding: '8px 12px',
    borderRadius: '8px',
    background: INPUT_DARK,
    border: `1px solid ${getExpiryStatus(c.endDate).color}`,
    color: getExpiryStatus(c.endDate).color,
    display: 'flex',
    alignItems: 'center',
    gap: '6px'
  }}>
    {getExpiryStatus(c.endDate).icon} {getExpiryStatus(c.endDate).text}
  </div>
)}
  <div style={{ fontSize: '14px', color: TEXT_SECONDARY, marginBottom: '10px' }}>
  🗓️ Joined: {formatDateBoth(c.joinDate)}
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
  {c.status === 'expired' ? (
    <>
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
      <button
      onClick={() => handleMoveToArchive(c)}
      disabled={loading}
      style={{
        background: 'linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%)',
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
      📦 Archive
    </button>
      
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
    </>
  ) : (
    <>
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
    </>
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
      ) : activeTab === 'bin' ? (
        <>
          {/* BIN/ARCHIVE VIEW */}
          <div style={{
            background: CARD_DARK,
            borderRadius: '16px',
            padding: '20px',
            marginBottom: '24px',
            boxShadow: '0 8px 20px rgba(0,0,0,0.3)',
            border: `1px solid ${BORDER_DARK}`
          }}>
            <h3 style={{ color: TEXT_LIGHT, marginBottom: '10px' }}>🗑️ Archived Members</h3>
            <p style={{ color: TEXT_SECONDARY, fontSize: '14px' }}>
              Members who haven't renewed for a long time. You can restore or permanently delete them.
            </p>
          </div>

          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))',
            gap: '24px'
          }}>
            {filteredClients.length > 0 ? filteredClients.map(c => (
              <div key={c.id} style={{
                background: CARD_DARK,
                borderRadius: '18px',
                padding: '26px',
                boxShadow: '0 10px 30px rgba(0,0,0,0.3)',
                borderLeft: `6px solid #8b5cf6`,
                border: `1px solid ${BORDER_DARK}`,
                opacity: 0.8
              }}>
                <h3 style={{ fontSize: '22px', fontWeight: '700', color: TEXT_LIGHT, margin: '0 0 15px 0' }}>
                  {c.name}
                </h3>
                <div style={{ fontSize: '14px', color: TEXT_SECONDARY, marginBottom: '10px' }}>📞 {c.phone}</div>
                <div style={{ fontSize: '14px', color: TEXT_SECONDARY, marginBottom: '10px' }}>📧 {c.email || 'Not provided'}</div>
                <div style={{ fontSize: '14px', color: TEXT_SECONDARY, marginBottom: '10px' }}>💳 {c.membership.toUpperCase()} Plan</div>
                <div style={{ fontSize: '14px', color: TEXT_SECONDARY, marginBottom: '15px' }}>
  📅 Expired: {formatDateBoth(c.endDate)} ({getExpiryStatus(c.endDate).text})
</div>
                
                <div style={{ display: 'flex', gap: '8px', marginTop: '15px' }}>
                  <button
                    onClick={() => handleRestoreFromArchive(c)}
                    disabled={loading}
                    style={{
                      flex: 1,
                      background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                      color: 'white',
                      padding: '10px 16px',
                      border: 'none',
                      borderRadius: '10px',
                      cursor: loading ? 'not-allowed' : 'pointer',
                      fontWeight: '600',
                      fontSize: '12px',
                      opacity: loading ? 0.6 : 1
                    }}
                  >
                    ↩️ Restore
                  </button>
                  <button
                    onClick={() => handleRemoveClient(c.id)}
                    disabled={loading}
                    style={{
                      flex: 1,
                      background: 'linear-gradient(135deg, #dc2626 0%, #ef4444 100%)',
                      color: 'white',
                      padding: '10px 16px',
                      border: 'none',
                      borderRadius: '10px',
                      cursor: loading ? 'not-allowed' : 'pointer',
                      fontWeight: '600',
                      fontSize: '12px',
                      opacity: loading ? 0.6 : 1
                    }}
                  >
                    🗑️ Delete Forever
                  </button>
                </div>
              </div>
            )) : (
              <div style={{ gridColumn: '1 / -1', textAlign: 'center', padding: '40px', background: CARD_DARK, borderRadius: '18px', color: TEXT_SECONDARY }}>
                No archived members
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
          <h2 style={{ 
  fontSize: isMobile ? '20px' : '26px',  // CHANGED
  fontWeight: 'bold', 
  marginBottom: isMobile ? '16px' : '28px',  // CHANGED
  color: TEXT_LIGHT 
}}>
  ➕ Add New Member
</h2>
{/* Photo Upload Section */}
{/* Photo Upload Section */}
<div style={{
  marginBottom: '24px',
  textAlign: 'center',
  padding: '20px',
  background: INPUT_DARK,
  borderRadius: '12px',
  border: `2px dashed ${BORDER_DARK}`
}}>
  <label style={{ display: 'block', marginBottom: '12px', fontWeight: '600', color: TEXT_LIGHT, fontSize: '15px' }}>
    📷 Member Photo (Optional)
  </label>
  
  {showCamera ? (
    // Camera view
    <div>
      <video 
        ref={videoRef}
        autoPlay
        playsInline
        style={{
          width: '100%',
          maxWidth: '400px',
          borderRadius: '12px',
          marginBottom: '12px',
          background: '#000'
        }}
      />
      <canvas ref={canvasRef} style={{ display: 'none' }} />
      <div style={{ display: 'flex', gap: '10px', justifyContent: 'center' }}>
        <button
          type="button"
          onClick={capturePhoto}
          style={{
            background: PRIMARY_GRADIENT,
            color: BG_DARK,
            padding: '10px 20px',
            borderRadius: '8px',
            border: 'none',
            cursor: 'pointer',
            fontWeight: '600',
            fontSize: '14px'
          }}
        >
          📸 Capture Photo
        </button>
        <button
          type="button"
          onClick={stopCamera}
          style={{
            background: '#ef4444',
            color: 'white',
            padding: '10px 20px',
            borderRadius: '8px',
            border: 'none',
            cursor: 'pointer',
            fontWeight: '600',
            fontSize: '14px'
          }}
        >
          ❌ Cancel
        </button>
      </div>
    </div>
  ) : photoPreview ? (
    // Photo preview
    <div style={{ position: 'relative', display: 'inline-block' }}>
      <img 
        src={photoPreview} 
        alt="Preview" 
        style={{
          width: '150px',
          height: '150px',
          borderRadius: '50%',
          objectFit: 'cover',
          border: `3px solid ${PRIMARY_COLOR}`
        }}
      />
      <button
        type="button"
        onClick={() => {
          setPhotoToUpload(null);
          setPhotoPreview(null);
        }}
        style={{
          position: 'absolute',
          top: '0',
          right: '0',
          background: '#ef4444',
          color: 'white',
          border: 'none',
          borderRadius: '50%',
          width: '30px',
          height: '30px',
          cursor: 'pointer',
          fontSize: '18px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center'
        }}
      >
        ×
      </button>
    </div>
  ) : (
    // Initial state - show options
    <div>
      <div style={{
        width: '150px',
        height: '150px',
        borderRadius: '50%',
        background: CARD_DARK,
        margin: '0 auto 12px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: '48px',
        border: `2px solid ${BORDER_DARK}`
      }}>
        👤
      </div>
      <div style={{ display: 'flex', gap: '10px', justifyContent: 'center', flexWrap: 'wrap' }}>
        <button
          type="button"
          onClick={startCamera}
          style={{
            background: PRIMARY_GRADIENT,
            color: BG_DARK,
            padding: '10px 20px',
            borderRadius: '8px',
            border: 'none',
            cursor: 'pointer',
            fontWeight: '600',
            fontSize: '14px'
          }}
        >
          📷 Take Photo
        </button>
        <label style={{
          background: 'linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%)',
          color: 'white',
          padding: '10px 20px',
          borderRadius: '8px',
          cursor: 'pointer',
          fontWeight: '600',
          fontSize: '14px',
          display: 'inline-block'
        }}>
          📁 Upload Photo
          <input
            type="file"
            accept="image/*"
            onChange={handlePhotoSelect}
            style={{ display: 'none' }}
          />
        </label>
      </div>
      <p style={{ color: TEXT_SECONDARY, fontSize: '12px', marginTop: '8px' }}>
        Max 5MB • JPG, PNG • Auto-compressed to 400x400px
      </p>
    </div>
  )}
</div>
          <div style={{
  display: 'grid',
  gridTemplateColumns: isMobile ? '1fr' : 'repeat(auto-fit, minmax(280px, 1fr))',  // CHANGED: Single column on mobile
  gap: isMobile ? '12px' : '20px'  // CHANGED
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
  <NepaliDatePicker
    value={formData.startDate}
    onChange={(date) => handleInputChange('startDate', date)}
    placeholder="Select start date"
  />
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
  <strong style={{color: '#ef4444'}}>Expired on:</strong> {formatDateBoth(renewalClient.endDate)}
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
 Continue from expiry date ({formatDateBoth(renewalClient.endDate)})
</option>
<option value="from_today" style={{ backgroundColor: INPUT_DARK }}>
  Start from today ({formatDateBoth(today.toISOString().split('T')[0])})
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
    <div style={{ marginBottom: '20px' }}>
      <NepaliDatePicker
        value={customRenewalDate}
        onChange={(date) => setCustomRenewalDate(date)}
        placeholder="Select custom start date"
      />
    </div>
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
    {/* --- PHOTO UPDATE MODAL FOR EXISTING MEMBERS --- */}
{showPhotoUpdateModal && selectedMemberForPhoto && (
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
        📷 Update Member Photo
      </h3>

      {showCamera ? (
        // Camera view
        <div style={{ textAlign: 'center' }}>
          <video 
            ref={videoRef}
            autoPlay
            playsInline
            style={{
              width: '100%',
              maxWidth: '400px',
              borderRadius: '12px',
              marginBottom: '12px',
              background: '#000'
            }}
          />
          <canvas ref={canvasRef} style={{ display: 'none' }} />
          <div style={{ display: 'flex', gap: '10px', justifyContent: 'center', marginTop: '15px' }}>
            <button
              onClick={capturePhoto}
              style={{
                background: PRIMARY_GRADIENT,
                color: BG_DARK,
                padding: '12px 24px',
                borderRadius: '10px',
                border: 'none',
                cursor: 'pointer',
                fontWeight: '600',
                fontSize: '14px'
              }}
            >
              📸 Capture Photo
            </button>
            <button
              onClick={stopCamera}
              style={{
                background: '#ef4444',
                color: 'white',
                padding: '12px 24px',
                borderRadius: '10px',
                border: 'none',
                cursor: 'pointer',
                fontWeight: '600',
                fontSize: '14px'
              }}
            >
              ❌ Cancel
            </button>
          </div>
        </div>
      ) : photoPreview ? (
        // Photo preview
        <div style={{ textAlign: 'center' }}>
          <img 
            src={photoPreview} 
            alt="Preview" 
            style={{
              width: '200px',
              height: '200px',
              borderRadius: '50%',
              objectFit: 'cover',
              border: `3px solid ${PRIMARY_COLOR}`,
              marginBottom: '20px'
            }}
          />
          <div style={{ display: 'flex', gap: '10px', justifyContent: 'center' }}>
            <button
              onClick={savePhotoForExistingMember}
              disabled={uploadingPhoto}
              style={{
                flex: 1,
                background: PRIMARY_GRADIENT,
                color: BG_DARK,
                padding: '12px',
                border: 'none',
                borderRadius: '10px',
                cursor: uploadingPhoto ? 'not-allowed' : 'pointer',
                fontWeight: '600',
                opacity: uploadingPhoto ? 0.6 : 1
              }}
            >
              {uploadingPhoto ? 'Saving...' : '💾 Save Photo'}
            </button>
            <button
              onClick={() => {
                setPhotoToUpload(null);
                setPhotoPreview(null);
              }}
              disabled={uploadingPhoto}
              style={{
                flex: 1,
                background: INPUT_DARK,
                color: TEXT_SECONDARY,
                padding: '12px',
                border: `1px solid ${BORDER_DARK}`,
                borderRadius: '10px',
                cursor: uploadingPhoto ? 'not-allowed' : 'pointer',
                fontWeight: '600'
              }}
            >
              🔄 Retake
            </button>
          </div>
        </div>
      ) : (
        // Initial options
        <div style={{ textAlign: 'center' }}>
          <div style={{
            width: '150px',
            height: '150px',
            borderRadius: '50%',
            background: CARD_DARK,
            margin: '0 auto 20px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '48px',
            border: `2px solid ${BORDER_DARK}`
          }}>
            👤
          </div>
          <div style={{ display: 'flex', gap: '10px', justifyContent: 'center', flexWrap: 'wrap', marginBottom: '15px' }}>
            <button
              onClick={startCamera}
              style={{
                background: PRIMARY_GRADIENT,
                color: BG_DARK,
                padding: '12px 20px',
                borderRadius: '10px',
                border: 'none',
                cursor: 'pointer',
                fontWeight: '600',
                fontSize: '14px'
              }}
            >
              📷 Take Photo
            </button>
            <label style={{
              background: 'linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%)',
              color: 'white',
              padding: '12px 20px',
              borderRadius: '10px',
              cursor: 'pointer',
              fontWeight: '600',
              fontSize: '14px',
              display: 'inline-block'
            }}>
              📁 Upload Photo
              <input
                type="file"
                accept="image/*"
                onChange={handlePhotoSelect}
                style={{ display: 'none' }}
              />
            </label>
          </div>
          <p style={{ color: TEXT_SECONDARY, fontSize: '12px', marginBottom: '20px' }}>
            Max 5MB • JPG, PNG • Auto-compressed to 400x400px
          </p>
        </div>
      )}

      <button
        onClick={() => {
          setShowPhotoUpdateModal(false);
          setSelectedMemberForPhoto(null);
          setPhotoToUpload(null);
          setPhotoPreview(null);
          stopCamera();
        }}
        disabled={uploadingPhoto}
        style={{
          width: '100%',
          background: INPUT_DARK,
          color: TEXT_SECONDARY,
          padding: '12px',
          border: `1px solid ${BORDER_DARK}`,
          borderRadius: '10px',
          cursor: uploadingPhoto ? 'not-allowed' : 'pointer',
          fontWeight: '600',
          marginTop: '15px'
        }}
      >
        Close
      </button>
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
      background: CARD_DARK, borderRadius: '20px', padding: '30px', maxWidth: '700px', width: '100%', border: `1px solid ${BORDER_DARK}`,
      maxHeight: '90vh', overflowY: 'auto'
    }}>
      
      {/* Photo + Name Header Section */}
      <div style={{ display: 'flex', gap: '20px', alignItems: 'start', marginBottom: '20px' }}>
        
        {/* LEFT SIDE: Large Photo (100x100) */}
        <div style={{
          width: '100px',
          height: '100px',
          borderRadius: '50%',
          background: selectedMember.photoUrl ? 'transparent' : CARD_DARK,
          border: `3px solid ${PRIMARY_COLOR}`,
          overflow: 'hidden',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: '48px',
          flexShrink: 0
        }}>
          {selectedMember.photoUrl ? (
            <img 
              src={selectedMember.photoUrl} 
              alt={selectedMember.name}
              style={{
                width: '100%',
                height: '100%',
                objectFit: 'cover'
              }}
            />
          ) : (
            '👤'
          )}
        </div>
        
        {/* RIGHT SIDE: Name and Buttons */}
        <div style={{ flex: 1 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: '10px' }}>
            <h2 style={{ color: TEXT_LIGHT, margin: 0 }}>
              {selectedMember.name}
            </h2>
            <button
              onClick={() => {
                setShowMemberDetails(false);
                setIsEditingMember(false);
              }}
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
          {!isEditingMember && (
            <button
              onClick={() => handleEditMember(selectedMember)}
              style={{
                background: PRIMARY_GRADIENT,
                color: BG_DARK,
                padding: '8px 16px',
                border: 'none',
                borderRadius: '8px',
                cursor: 'pointer',
                fontWeight: '600',
                fontSize: '13px',
                boxShadow: '0 2px 8px rgba(0, 225, 255, 0.3)'
              }}
            >
              ✏️ Edit Details
            </button>
          )}
        </div>
      </div>

      {/* CONDITIONAL RENDERING: Edit Mode vs View Mode */}
      {isEditingMember ? (
        // ========== EDIT MODE ==========
        <>
          <h3 style={{ color: PRIMARY_COLOR, marginBottom: '20px', fontSize: '18px' }}>✏️ Edit Member Information</h3>
          
          <div style={{
            display: 'grid',
            gridTemplateColumns: isMobile ? '1fr' : 'repeat(2, 1fr)',
            gap: '15px',
            marginBottom: '20px'
          }}>
            {/* Full Name */}
            <div>
              <label style={{ display: 'block', marginBottom: '6px', fontWeight: '600', color: TEXT_LIGHT, fontSize: '13px' }}>
                Full Name *
              </label>
              <input
                type="text"
                value={editFormData.name}
                onChange={(e) => handleEditInputChange('name', e.target.value)}
                style={{...inputStyle, padding: '10px 12px', fontSize: '14px'}}
              />
            </div>

            {/* Phone */}
            <div>
              <label style={{ display: 'block', marginBottom: '6px', fontWeight: '600', color: TEXT_LIGHT, fontSize: '13px' }}>
                Phone Number *
              </label>
              <input
                type="tel"
                value={editFormData.phone}
                onChange={(e) => handleEditInputChange('phone', e.target.value)}
                style={{...inputStyle, padding: '10px 12px', fontSize: '14px'}}
              />
            </div>

            {/* Email */}
            <div style={{ gridColumn: isMobile ? '1' : '1 / -1' }}>
              <label style={{ display: 'block', marginBottom: '6px', fontWeight: '600', color: TEXT_LIGHT, fontSize: '13px' }}>
                Email Address
              </label>
              <input
                type="email"
                value={editFormData.email}
                onChange={(e) => handleEditInputChange('email', e.target.value)}
                style={{...inputStyle, padding: '10px 12px', fontSize: '14px'}}
              />
            </div>

            {/* Address */}
            <div style={{ gridColumn: isMobile ? '1' : '1 / -1' }}>
              <label style={{ display: 'block', marginBottom: '6px', fontWeight: '600', color: TEXT_LIGHT, fontSize: '13px' }}>
                Address *
              </label>
              <textarea
                value={editFormData.address}
                onChange={(e) => handleEditInputChange('address', e.target.value)}
                style={{...inputStyle, padding: '10px 12px', fontSize: '14px', minHeight: '70px', resize: 'vertical'}}
              />
            </div>

            {/* Age */}
            <div>
              <label style={{ display: 'block', marginBottom: '6px', fontWeight: '600', color: TEXT_LIGHT, fontSize: '13px' }}>
                Age
              </label>
              <input
                type="number"
                value={editFormData.age}
                onChange={(e) => handleEditInputChange('age', e.target.value)}
                min="16"
                max="80"
                style={{...inputStyle, padding: '10px 12px', fontSize: '14px'}}
              />
            </div>

            {/* Gender */}
            <div>
              <label style={{ display: 'block', marginBottom: '6px', fontWeight: '600', color: TEXT_LIGHT, fontSize: '13px' }}>
                Gender
              </label>
              <select
                value={editFormData.gender}
                onChange={(e) => handleEditInputChange('gender', e.target.value)}
                style={{...inputStyle, padding: '10px 12px', fontSize: '14px'}}
              >
                <option value="" style={{ backgroundColor: INPUT_DARK }}>Select Gender</option>
                <option value="male" style={{ backgroundColor: INPUT_DARK }}>Male</option>
                <option value="female" style={{ backgroundColor: INPUT_DARK }}>Female</option>
                <option value="other" style={{ backgroundColor: INPUT_DARK }}>Other</option>
              </select>
            </div>

            {/* Emergency Contact */}
            <div style={{ gridColumn: isMobile ? '1' : '1 / -1' }}>
              <label style={{ display: 'block', marginBottom: '6px', fontWeight: '600', color: TEXT_LIGHT, fontSize: '13px' }}>
                Emergency Contact
              </label>
              <input
                type="tel"
                value={editFormData.emergencyContact}
                onChange={(e) => handleEditInputChange('emergencyContact', e.target.value)}
                style={{...inputStyle, padding: '10px 12px', fontSize: '14px'}}
              />
            </div>

            {/* Membership Plan */}
            <div>
              <label style={{ display: 'block', marginBottom: '6px', fontWeight: '600', color: TEXT_LIGHT, fontSize: '13px' }}>
                Membership Plan *
              </label>
              <select
                value={editFormData.membership}
                onChange={(e) => handleEditInputChange('membership', e.target.value)}
                style={{...inputStyle, padding: '10px 12px', fontSize: '14px'}}
              >
                <option value="basic" style={{ backgroundColor: INPUT_DARK }}>Basic (1 Month) - Rs 2,000</option>
                <option value="premium" style={{ backgroundColor: INPUT_DARK }}>Premium (3 Months) - Rs 5,000</option>
                <option value="platinum" style={{ backgroundColor: INPUT_DARK }}>Platinum (6 Months) - Rs 9,000</option>
                <option value="annual" style={{ backgroundColor: INPUT_DARK }}>Annual (12 Months) - Rs 16,000</option>
              </select>
            </div>

            {/* Start Date */}
<div>
  <label style={{ display: 'block', marginBottom: '6px', fontWeight: '600', color: TEXT_LIGHT, fontSize: '13px' }}>
    Start Date *
  </label>
  <NepaliDatePicker
    value={editFormData.startDate}
    onChange={(date) => handleEditInputChange('startDate', date)}
    placeholder="Select start date"
  />
</div>

            {/* Fee Amount */}
            <div style={{ gridColumn: isMobile ? '1' : '1 / -1' }}>
              <label style={{ display: 'block', marginBottom: '6px', fontWeight: '600', color: TEXT_LIGHT, fontSize: '13px' }}>
                Fee Amount (Rs) *
              </label>
              <input
                type="number"
                value={editFormData.fee}
                onChange={(e) => handleEditInputChange('fee', e.target.value)}
                style={{...inputStyle, padding: '10px 12px', fontSize: '14px'}}
              />
            </div>
          </div>

          {/* Action Buttons for Edit Mode */}
          <div style={{ display: 'flex', gap: '10px', marginTop: '20px' }}>
            <button
              onClick={handleCancelEdit}
              disabled={loading}
              style={{
                flex: 1,
                background: INPUT_DARK,
                color: TEXT_SECONDARY,
                padding: '12px',
                border: `1px solid ${BORDER_DARK}`,
                borderRadius: '10px',
                cursor: loading ? 'not-allowed' : 'pointer',
                fontWeight: '600',
                fontSize: '14px'
              }}
            >
              Cancel
            </button>
            <button
              onClick={handleSaveMemberEdit}
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
                fontSize: '14px',
                boxShadow: '0 4px 10px rgba(0, 225, 255, 0.3)',
                opacity: loading ? 0.6 : 1
              }}
            >
              {loading ? 'Saving...' : '💾 Save Changes'}
            </button>
          </div>
        </>
      ) : (
        // ========== VIEW MODE (Original) ==========
        <>
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
              <p style={{ color: TEXT_SECONDARY, margin: '8px 0' }}>Joined: <strong style={{ color: TEXT_LIGHT }}>{formatDateBoth(selectedMember.joinDate)}</strong></p>
              <p style={{ color: TEXT_SECONDARY, margin: '8px 0' }}>Current Period: <strong style={{ color: TEXT_LIGHT }}>{formatDateBoth(selectedMember.startDate)} to {formatDateBoth(selectedMember.endDate)}</strong></p>

              {selectedMember.status === 'active' && (
                <p style={{ 
                  color: getExpiryStatus(selectedMember.endDate).color, 
                  margin: '8px 0',
                  fontWeight: '600',
                  fontSize: '14px'
                }}>
                  {getExpiryStatus(selectedMember.endDate).icon} Status: {getExpiryStatus(selectedMember.endDate).text}
                </p>
              )}
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
                      📅 Paid: {formatDateBoth(payment.date)}
                    </p>
                    <p style={{ color: TEXT_SECONDARY, margin: '4px 0', fontSize: '13px' }}>
                      💳 Plan: {payment.membership.toUpperCase()}
                    </p>
                    <p style={{ color: TEXT_SECONDARY, margin: '4px 0', fontSize: '13px' }}>
                      📆 Period: {formatDateBoth(payment.startDate)} to {formatDateBoth(payment.endDate)}
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
        </>
      )}
    </div>
  </div>
)}
{/* BACK TO TOP BUTTON */}
{showScrollTop && (
  <button
    onClick={scrollToTop}
    style={{
      position: 'fixed',
      bottom: isMobile ? '24px' : '30px',
      right: isMobile ? '24px' : '30px',
      width: isMobile ? '100px' : '60px',
      height: isMobile ? '100px' : '60px',
      borderRadius: '50%',
      background: PRIMARY_GRADIENT,
      color: BG_DARK,
      border: 'none',
      cursor: 'pointer',
      fontSize: isMobile ? '24px' : '28px',
      boxShadow: '0 8px 25px rgba(0, 225, 255, 0.5), 0 0 20px rgba(0, 225, 255, 0.3)',
      zIndex: 999,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      transition: 'all 0.3s ease',
      animation: showScrollTop ? 'fadeIn 0.3s ease, pulse 2s ease-in-out infinite' : 'none',
    }}
    onMouseEnter={(e) => {
  if (!isMobile) {
    e.currentTarget.style.transform = 'scale(1.1) translateY(-3px)';
    e.currentTarget.style.boxShadow = '0 12px 30px rgba(0, 225, 255, 0.6)';
  }
}}
onMouseLeave={(e) => {
  if (!isMobile) {
    e.currentTarget.style.transform = 'scale(1) translateY(0)';
    e.currentTarget.style.boxShadow = '0 8px 20px rgba(0, 225, 255, 0.4)';
  }
}}
  >
    ⇧
  </button>
)}
    </div>
    </>
  );
};

export default App;