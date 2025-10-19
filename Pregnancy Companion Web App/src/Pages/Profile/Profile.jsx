import React, { useState, useEffect } from 'react';
import { initializeApp } from 'firebase/app';
import { getFirestore, doc, getDoc, updateDoc } from 'firebase/firestore';
import { getAuth, onAuthStateChanged } from 'firebase/auth';
import './Profile.css';
import Navbar from '../Navbar/Navbar';
import Sidebar from '../Sidebar/Sidebar';

// Firebase Configuration
const firebaseConfig = {
  apiKey: "AIzaSyAoRjjijmlodBuN1qmdILxbZI88vuYkH7s",
  authDomain: "pregnancy-companion-web-app.firebaseapp.com",
  projectId: "pregnancy-companion-web-app",
  storageBucket: "pregnancy-companion-web-app.firebasestorage.app",
  messagingSenderId: "265131162037",
  appId: "1:265131162037:web:86710007f91282fe6541fc",
  measurementId: "G-40G11VGE47",
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);

const Profile = () => {
  const [profileData, setProfileData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [editingField, setEditingField] = useState(null);
  const [editValue, setEditValue] = useState('');
  const [saving, setSaving] = useState(false);
  const [userEmail, setUserEmail] = useState('');
  const [notification, setNotification] = useState({ show: false, message: '', type: '' });

  // Show notification
  const showNotification = (message, type = 'success') => {
    setNotification({ show: true, message, type });
    setTimeout(() => {
      setNotification({ show: false, message: '', type: '' });
    }, 3500);
  };

  // Get authenticated user
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        setUserEmail(user.email);
      } else {
        // Fallback to localStorage if auth not available
        const storedEmail = localStorage.getItem('userEmail');
        if (storedEmail) {
          setUserEmail(storedEmail);
        } else {
          setLoading(false);
          showNotification('Please log in to view your profile', 'error');
        }
      }
    });

    return () => unsubscribe();
  }, []);

  // Fetch profile data
  useEffect(() => {
    const fetchProfile = async () => {
      if (!userEmail) return;

      try {
        const profileRef = doc(db, 'Users', userEmail, 'Profile', 'profile');
        const profileSnap = await getDoc(profileRef);

        if (profileSnap.exists()) {
          setProfileData(profileSnap.data());
        } else {
          showNotification('Profile not found. Please complete your registration.', 'error');
        }
      } catch (error) {
        console.error('Error fetching profile:', error);
        showNotification('Failed to load profile data', 'error');
      } finally {
        setLoading(false);
      }
    };

    fetchProfile();
  }, [userEmail]);

  // Handle edit field
  const handleEdit = (field, currentValue) => {
    setEditingField(field);
    setEditValue(currentValue || '');
  };

  // Handle save
  const handleSave = async (field) => {
    if (!userEmail || editValue === profileData[field]) {
      setEditingField(null);
      return;
    }

    setSaving(true);
    try {
      const profileRef = doc(db, 'Users', userEmail, 'Profile', 'profile');
      await updateDoc(profileRef, {
        [field]: editValue,
        updatedAt: new Date().toISOString()
      });

      setProfileData(prev => ({
        ...prev,
        [field]: editValue
      }));

      setEditingField(null);
      showNotification('✨ Profile updated successfully!', 'success');
    } catch (error) {
      console.error('Error updating profile:', error);
      showNotification('❌ Failed to update. Please try again.', 'error');
    } finally {
      setSaving(false);
    }
  };

  // Handle cancel
  const handleCancel = () => {
    setEditingField(null);
    setEditValue('');
  };

  // Handle key press
  const handleKeyPress = (e, field) => {
    if (e.key === 'Enter') {
      handleSave(field);
    } else if (e.key === 'Escape') {
      handleCancel();
    }
  };

  // Format date for display
  const formatDate = (dateString) => {
    if (!dateString) return 'Not provided';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
  };

  // Field configuration with icons and enhanced styling
  const fields = [
    { key: 'motherName', label: 'Mother Name', type: 'text', icon: '👤', section: 'personal' },
    { key: 'phone', label: 'Phone Number', type: 'tel', icon: '📱', section: 'personal' },
    { key: 'address', label: 'Address', type: 'text', icon: '🏠', section: 'personal' },
    { key: 'occupation', label: 'Occupation', type: 'text', icon: '💼', section: 'personal' },
    { key: 'email', label: 'Email', type: 'email', icon: '✉️', disabled: true, section: 'personal' },
    { key: 'dob', label: 'Date of Birth', type: 'date', icon: '🎂', section: 'personal', format: true },
    { key: 'bloodGroup', label: 'Blood Group', type: 'text', icon: '🩸', section: 'medical' },
    { key: 'allergies', label: 'Allergies', type: 'text', icon: '⚠️', section: 'medical' },
    { key: 'riskLevel', label: 'Risk Level', type: 'text', icon: '📊', section: 'medical' },
    { key: 'emergencyName', label: 'Emergency Contact Name', type: 'text', icon: '🚨', section: 'emergency' },
    { key: 'emergencyPhone', label: 'Emergency Phone', type: 'tel', icon: '☎️', section: 'emergency' },
    { key: 'emergencyRelation', label: 'Relationship', type: 'text', icon: '👥', section: 'emergency' },
    { key: 'spouseName', label: 'Spouse Name', type: 'text', icon: '💑', section: 'spouse' },
    { key: 'spouseBloodGroup', label: 'Spouse Blood Group', type: 'text', icon: '🩸', section: 'spouse' },
    { key: 'spouseOccupation', label: 'Spouse Occupation', type: 'text', icon: '💼', section: 'spouse' },
    { key: 'spousePhone', label: 'Spouse Phone', type: 'tel', icon: '📱', section: 'spouse' },
    { key: 'lmp', label: 'Last Menstrual Period', type: 'date', icon: '📅', section: 'pregnancy', format: true },
    { key: 'edd', label: 'Expected Delivery Date', type: 'date', icon: '🍼', section: 'pregnancy', format: true },
    { key: 'currentMonth', label: 'Current Month', type: 'text', icon: '📆', section: 'pregnancy' }
  ];

  // Group fields by section
  const sections = [
    { id: 'personal', title: 'Personal Information', icon: '👤', color: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' },
    { id: 'medical', title: 'Medical Information', icon: '🏥', color: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)' },
    { id: 'emergency', title: 'Emergency Contact', icon: '🚨', color: 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)' },
    { id: 'spouse', title: 'Spouse Information', icon: '💑', color: 'linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)' },
    { id: 'pregnancy', title: 'Pregnancy Details', icon: '🤰', color: 'linear-gradient(135deg, #fa709a 0%, #fee140 100%)' }
  ];

  if (loading) {
    return (
      <div className="profile-container">
        <div className="loading-spinner">
          <div className="spinner-circle">
            <div className="spinner-inner"></div>
          </div>
          <p className="loading-text">Loading your profile...</p>
          <div className="loading-dots">
            <span></span>
            <span></span>
            <span></span>
          </div>
        </div>
      </div>
    );
  }

  if (!profileData) {
    return (
      <div className="profile-container">
        <div className="error-card">
          <div className="error-icon">😔</div>
          <h2>Profile Not Found</h2>
          <p>We couldn't find your profile. Please complete your registration.</p>
          <button className="btn-primary">Complete Profile</button>
        </div>
      </div>
    );
  }

  return (
    <div className="profile-main-container">
        <Navbar />
        <Sidebar />
        <div className="profile-page profile-container">
        
      {/* Notification Toast */}
      {notification.show && (
        <div className={`notification-toast ${notification.type}`}>
          <div className="toast-content">
            <span className="toast-icon">
              {notification.type === 'success' ? '✅' : '❌'}
            </span>
            <span className="toast-message">{notification.message}</span>
          </div>
          <div className="toast-progress"></div>
        </div>
      )}

      {/* Profile Header Card */}
      <div className="profile-header-card">
        <div className="header-background"></div>
        <div className="header-content">
          <div className="profile-avatar-wrapper">
            <div className="profile-avatar-large">
              {profileData.Image ? (
                <img src={profileData.Image} alt="Profile" className="avatar-img" />
              ) : (
                <span className="avatar-initial">
                  {profileData.motherName ? profileData.motherName.charAt(0).toUpperCase() : 'M'}
                </span>
              )}
            </div>
            <div className="avatar-status"></div>
          </div>
          <div className="header-info">
            <h1 className="profile-name">{profileData.motherName || 'Welcome'}</h1>
            <p className="profile-subtitle">{profileData.occupation || 'Mother Profile'}</p>
            <div className="profile-meta">
              <div className="meta-item">
                <span className="meta-icon">📧</span>
                <span className="meta-text">{profileData.email}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Profile Content Sections */}
      <div className="profile-content">
        {sections.map((section, sectionIndex) => {
          const sectionFields = fields.filter(f => f.section === section.id);
          if (sectionFields.length === 0) return null;

          return (
            <div 
              key={section.id} 
              className="section-card"
              style={{ animationDelay: `${sectionIndex * 0.1}s` }}
            >
              <div className="section-header" style={{ background: section.color }}>
                <span className="section-icon">{section.icon}</span>
                <h2 className="section-title-text">{section.title}</h2>
              </div>
              
              <div className="section-body">
                {sectionFields.map((field, fieldIndex) => {
                  const value = field.format ? formatDate(profileData[field.key]) : profileData[field.key];
                  
                  return (
                    <div 
                      key={field.key} 
                      className="field-row"
                      style={{ animationDelay: `${(sectionIndex * 0.1) + (fieldIndex * 0.05)}s` }}
                    >
                      <div className="field-label-wrapper">
                        <span className="field-icon">{field.icon}</span>
                        <label className="field-label-text">{field.label}</label>
                      </div>
                      
                      {editingField === field.key ? (
                        <div className="field-edit-container">
                          <input
                            type={field.type}
                            value={editValue}
                            onChange={(e) => setEditValue(e.target.value)}
                            onKeyPress={(e) => handleKeyPress(e, field.key)}
                            className="field-input-edit"
                            autoFocus
                            placeholder={`Enter ${field.label.toLowerCase()}`}
                          />
                          <div className="edit-buttons">
                            <button 
                              onClick={() => handleSave(field.key)}
                              className="btn-save-mini"
                              disabled={saving}
                              title="Save (Enter)"
                            >
                              {saving ? (
                                <span className="btn-spinner"></span>
                              ) : (
                                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                                  <polyline points="20 6 9 17 4 12"></polyline>
                                </svg>
                              )}
                            </button>
                            <button 
                              onClick={handleCancel}
                              className="btn-cancel-mini"
                              disabled={saving}
                              title="Cancel (Esc)"
                            >
                              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                                <line x1="18" y1="6" x2="6" y2="18"></line>
                                <line x1="6" y1="6" x2="18" y2="18"></line>
                              </svg>
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div className="field-view-container">
                          <span className="field-value-text">
                            {value || <span className="value-empty">Not provided</span>}
                          </span>
                          {!field.disabled && (
                            <button
                              onClick={() => handleEdit(field.key, profileData[field.key])}
                              className="btn-edit-icon"
                              title="Edit this field"
                            >
                              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                                <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
                              </svg>
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
    </div>
  );
};

export default Profile;