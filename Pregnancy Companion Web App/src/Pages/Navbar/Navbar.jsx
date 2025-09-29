import React, { useEffect, useState, useRef } from "react";
import "./Navbar.css";
import { ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

import { initializeApp, getApps } from "firebase/app";
import { getAuth, onAuthStateChanged, signOut } from "firebase/auth";
import { getFirestore, doc, onSnapshot } from "firebase/firestore";
import { useNavigate, useLocation } from "react-router-dom";

const firebaseConfig = {
  apiKey: "AIzaSyAoRjjijmlodBuN1qmdILxbZI88vuYkH7s",
  authDomain: "pregnancy-companion-web-app.firebaseapp.com",
  projectId: "pregnancy-companion-web-app",
  storageBucket: "pregnancy-companion-web-app.firebasestorage.app",
  messagingSenderId: "265131162037",
  appId: "1:265131162037:web:86710007f91282fe6541fc",
  measurementId: "G-40G11VGE47",
};
// Guard against double-init if you initialize elsewhere too
const app = getApps().length ? getApps()[0] : initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

const Navbar = ({ isSidebarCollapsed }) => {
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [showSearch, setShowSearch] = useState(false);
  const [notifications, setNotifications] = useState([
    { id: 1, title: "Weekly Check-in", message: "Don't forget your week 24 check-up!", time: "2h ago", unread: true },
    { id: 2, title: "Nutrition Tip", message: "Try adding more leafy greens to your diet", time: "1d ago", unread: true },
    { id: 3, title: "Appointment Reminder", message: "Next appointment is tomorrow at 2 PM", time: "2d ago", unread: false }
  ]);
  const [showNotifications, setShowNotifications] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);
  
  const navigate = useNavigate();
  const location = useLocation();
  const searchRef = useRef(null);
  const notificationRef = useRef(null);

  // Floating animation elements
  const floatingElements = [
    { emoji: "🌟", size: "small", delay: 0 },
    { emoji: "✨", size: "small", delay: 1 },
    { emoji: "💫", size: "medium", delay: 2 },
    { emoji: "⭐", size: "small", delay: 0.5 },
    { emoji: "🔮", size: "medium", delay: 1.5 }
  ];

  // 🔴 Realtime: read motherName from Users/{email}/Profile/profile
  useEffect(() => {
    let unsubProfile = null;

    const unsubAuth = onAuthStateChanged(auth, (user) => {
      // cleanup any previous profile listener when user switches
      if (unsubProfile) {
        unsubProfile();
        unsubProfile = null;
      }

      if (!user) {
        setName("");
        setLoading(false);
        return;
      }

      const email = user.email?.trim();
      // seed with fallback quickly
      setName(user.displayName || email || "User");

      if (!email) {
        setLoading(false);
        return;
      }

      const profileRef = doc(db, "Users", email, "Profile", "profile");
      unsubProfile = onSnapshot(
        profileRef,
        (snap) => {
          if (snap.exists()) {
            const motherName = (snap.data()?.motherName ?? user.displayName ?? email)?.toString().trim();
            setName(motherName || "User");
          } else {
            setName(user.displayName || email || "User");
          }
          setLoading(false);
        },
        (err) => {
          console.error("Navbar profile listener error:", err);
          setName(user.displayName || email || "User");
          setLoading(false);
          toast.error("Failed to load profile.");
        }
      );
    });

    return () => {
      unsubAuth && unsubAuth();
      unsubProfile && unsubProfile();
    };
  }, []);

  useEffect(() => {
    const handleScroll = () => setIsScrolled(window.scrollY > 20);
    const handleClickOutside = (event) => {
      if (searchRef.current && !searchRef.current.contains(event.target)) setShowSearch(false);
      if (notificationRef.current && !notificationRef.current.contains(event.target)) setShowNotifications(false);
    };
    window.addEventListener('scroll', handleScroll);
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      window.removeEventListener('scroll', handleScroll);
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const initials =
    name?.split(" ").filter(Boolean).slice(0, 2).map((s) => s[0]?.toUpperCase()).join("") || "U";

  const handleSignOut = async () => {
    try {
      await signOut(auth);
      toast.success("Signed out successfully");
      navigate("/landingpage");
    } catch {
      toast.error("Sign out failed");
    }
  };

  const handleSearch = (e) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      toast.info(`Searching for: ${searchQuery}`);
      setSearchQuery("");
      setShowSearch(false);
    }
  };

  const markNotificationAsRead = (id) => {
    setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, unread: false } : n)));
  };

  const unreadCount = notifications.filter((n) => n.unread).length;

  return (
    <>
      <nav className={`babybloom-navbar ${isScrolled ? 'babybloom-navbar-scrolled' : ''} ${isSidebarCollapsed ? 'babybloom-navbar-sidebar-collapsed' : 'babybloom-navbar-sidebar-expanded'}`}>
        <div className="babybloom-nav-container">
          {/* Animated Brand Section */}
          <div className="babybloom-brand-section">
            <a className="babybloom-navbar-brand" href="/homepage">
              <div className="babybloom-brand-content">
                <div className="babybloom-brand-icon-wrapper">
                  <span className="babybloom-brand-icon">👶</span>
                  {floatingElements.map((element, index) => (
                    <span 
                      key={index}
                      className={`babybloom-floating-element babybloom-floating-${element.size}`}
                      style={{ animationDelay: `${element.delay}s` }}
                    >
                      {element.emoji}
                    </span>
                  ))}
                </div>
                <div className="babybloom-brand-text">
                  <span className="babybloom-brand-title">BabyBloom</span>
                  <span className="babybloom-brand-subtitle">Your Pregnancy Companion</span>
                </div>
              </div>
            </a>
          </div>

          {/* Action Items */}
          <div className="babybloom-nav-actions">
            {/* Search */}
            <div ref={searchRef} className={`babybloom-search-container ${showSearch ? 'babybloom-search-active' : ''}`}>
              <button 
                className="babybloom-search-toggle babybloom-nav-action-btn"
                onClick={() => setShowSearch(!showSearch)}
                aria-label="Search"
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M15.5 14h-.79l-.28-.27C15.41 12.59 16 11.11 16 9.5 16 5.91 13.09 3 9.5 3S3 5.91 3 9.5 5.91 16 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z"/>
                </svg>
              </button>
              <form className="babybloom-search-form" onSubmit={handleSearch}>
                <input
                  type="text"
                  placeholder="Search tips, articles, community..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="babybloom-search-input"
                />
                <button type="submit" className="babybloom-search-submit">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M15.5 14h-.79l-.28-.27C15.41 12.59 16 11.11 16 9.5 16 5.91 13.09 3 9.5 3S3 5.91 3 9.5 5.91 16 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z"/>
                  </svg>
                </button>
              </form>
            </div>

            {/* Notifications */}
            <div ref={notificationRef} className="babybloom-notification-container">
              <button 
                className="babybloom-notification-toggle babybloom-nav-action-btn"
                onClick={() => setShowNotifications(!showNotifications)}
                aria-label="Notifications"
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12 22c1.1 0 2-.9 2-2h-4c0 1.1.9 2 2 2zm6-6v-5c0-3.07-1.64-5.64-4.5-6.32V4c0-.83-.67-1.5-1.5-1.5s-1.5.67-1.5 1.5v.68C7.63 5.36 6 7.92 6 11v5l-2 2v1h16v-1l-2-2z"/>
                </svg>
                {unreadCount > 0 && <span className="babybloom-notification-badge">{unreadCount}</span>}
              </button>
              {showNotifications && (
                <div className="babybloom-notification-dropdown">
                  <div className="babybloom-notification-header">
                    <span className="babybloom-notification-title">Notifications</span>
                    {unreadCount > 0 && <span className="babybloom-notification-count">{unreadCount} new</span>}
                  </div>
                  <div className="babybloom-notification-list">
                    {notifications.map((notif) => (
                      <div 
                        key={notif.id} 
                        className={`babybloom-notification-item ${notif.unread ? 'babybloom-notification-unread' : ''}`}
                        onClick={() => markNotificationAsRead(notif.id)}
                      >
                        <div className="babybloom-notification-content">
                          <div className="babybloom-notification-item-title">{notif.title}</div>
                          <div className="babybloom-notification-message">{notif.message}</div>
                          <div className="babybloom-notification-time">{notif.time}</div>
                        </div>
                        {notif.unread && <div className="babybloom-notification-dot"></div>}
                      </div>
                    ))}
                  </div>
                  <div className="babybloom-notification-footer">
                    <a href="/notifications" className="babybloom-notification-link">View all notifications</a>
                  </div>
                </div>
              )}
            </div>

            {/* Quick Actions */}
            <div className="babybloom-quick-actions">
              <button className="babybloom-quick-action-btn babybloom-nav-action-btn" title="Add Journal Entry">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z"/>
                </svg>
              </button>
            </div>

            {/* User Menu */}
            <div className="babybloom-user-section">
              <div className="babybloom-user-dropdown">
                <button className="babybloom-user-trigger" type="button" aria-expanded="false">
                  <div className="babybloom-user-avatar">{initials}</div>
                  <div className="babybloom-user-info">
                    <span className="babybloom-user-greeting">Welcome back</span>
                    <span className="babybloom-user-name">
                      {loading ? <span className="babybloom-name-loading" /> : name}
                    </span>
                  </div>
                  <svg className="babybloom-dropdown-chevron" width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M7.41 8.84L12 13.42l4.59-4.58L18 10.25l-6 6-6-6z"/>
                  </svg>
                </button>
                
                <ul className="babybloom-user-menu">
                  <li className="babybloom-menu-header"><span className="babybloom-menu-title">Account</span></li>
                  <li>
                    <a className="babybloom-menu-item" href="/profile">
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/>
                      </svg>
                      <span>My Profile</span>
                    </a>
                  </li>
                  <li>
                    <a className="babybloom-menu-item" href="/settings">
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M19.14 12.94c.04-.3.06-.61.06-.94 0-.32-.02-.64-.07-.94l2.03-1.58c.18-.14.23-.41.12-.61l-1.92-3.32c-.12-.22-.37-.29-.59-.22l-2.39.96c-.5-.38-1.03-.7-1.62-.94l-.36-2.54c-.04-.24-.24-.41-.48-.41h-3.84c-.24 0-.43.17-.47.41l-.36 2.54c-.59.24-1.13.57-1.62.94l-2.39-.96c-.22-.08-.47 0-.59.22L2.74 8.87c-.12.21-.08.47.12.61l2.03 1.58c-.05.3-.09.63-.09.94s.02.64.07.94l-2.03 1.58c-.18.14-.23.41-.12.61l1.92 3.32c.12.22.37.29.59.22l2.39-.96c.5.38 1.03.7 1.62.94l.36 2.54c.05.24.24.41.48.41h3.84c.24 0 .44-.17.47-.41l.36-2.54c.59-.24 1.13-.56 1.62-.94l2.39.96c.22.08.47 0 .59-.22l1.92-3.32c.12-.22.07-.47-.12-.61l-2.01-1.58zM12 15.6c-1.98 0-3.6-1.62-3.6-3.6s1.62-3.6 3.6-3.6 3.6 1.62 3.6 3.6-1.62 3.6-3.6 3.6z"/>
                      </svg>
                      <span>Settings</span>
                    </a>
                  </li>
                  <li>
                    <a className="babybloom-menu-item" href="/help">
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 17h-2v-2h2v2zm2.07-7.75l-.9.92C13.45 12.9 13 13.5 13 15h-2v-.5c0-1.1.45-2.1 1.17-2.83l1.24-1.26c.37-.36.59-.86.59-1.41 0-1.1-.9-2-2-2s-2 .9-2 2H8c0-2.21 1.79-4 4-4s4 1.79 4 4c0 .88-.36 1.68-.93 2.25z"/>
                      </svg>
                      <span>Help & Support</span>
                    </a>
                  </li>
                  <li><hr className="babybloom-menu-divider" /></li>
                  <li>
                    <button className="babybloom-menu-item babybloom-sign-out-btn" onClick={handleSignOut}>
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M17 7l-1.41 1.41L18.17 11H8v2h10.17l-2.58 2.58L17 17l5-5zM4 5h8V3H4c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h8v-2H4V5z"/>
                      </svg>
                      <span>Sign Out</span>
                    </button>
                  </li>
                </ul>
              </div>
            </div>
          </div>
        </div>

        {/* Background Glow Effect */}
        <div className="babybloom-nav-glow" aria-hidden="true" />
        {/* Animated Background Elements */}
        <div className="babybloom-nav-background">
          <div className="babybloom-nav-wave"></div>
        </div>
      </nav>

      {/* Spacer - This will also adjust based on sidebar state */}
      <div className={`babybloom-nav-spacer ${isSidebarCollapsed ? 'babybloom-nav-spacer-sidebar-collapsed' : 'babybloom-nav-spacer-sidebar-expanded'}`} />

      <ToastContainer position="top-right" autoClose={2200} hideProgressBar theme="colored" />
    </>
  );
};

export default Navbar;
