import React, { useEffect, useRef, useState } from "react";
import "./Sidebar.css";
import { ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

// ---------- Cloudinary CONFIG ----------
const CLOUDINARY_CLOUD_NAME = "dnzjg9lq8";
const CLOUDINARY_UNSIGNED_PRESET = "pregnancyAppUploads";

// ---------- Firebase ----------
import { initializeApp, getApps } from "firebase/app";
import { getAuth, onAuthStateChanged } from "firebase/auth";
import {
  getFirestore,
  doc,
  getDoc,
  setDoc,
  serverTimestamp,
  onSnapshot, // ⬅️ realtime
} from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyAoRjjijmlodBuN1qmdILxbZI88vuYkH7s",
  authDomain: "pregnancy-companion-web-app.firebaseapp.com",
  projectId: "pregnancy-companion-web-app",
  storageBucket: "pregnancy-companion-web-app.firebasestorage.app",
  messagingSenderId: "265131162037",
  appId: "1:265131162037:web:86710007f91282fe6541fc",
  measurementId: "G-40G11VGE47",
};

const app = getApps().length ? getApps()[0] : initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

const Sidebar = ({ isCollapsed, onToggle }) => {
  const [authEmail, setAuthEmail] = useState("");   // authenticated email (doc id)
  const [email, setEmail] = useState("");           // from Profile.profile.email (realtime)
  const [name, setName] = useState("User");         // from Profile.profile.motherName (realtime)
  const [photoUrl, setPhotoUrl] = useState("");
  const [uploading, setUploading] = useState(false);
  const [activeItem, setActiveItem] = useState("dashboard");
  const fileInputRef = useRef(null);

  // Navigation items with modern icons
  const navItems = [
    { id: "dashboard", label: "Dashboard", icon: "📊", color: "#FF6B8B" },
    { id: "profile", label: "Profile", icon: "👤", color: "#9D4EDD" },
    { id: "health", label: "Health Tracker", icon: "❤️", color: "#FF6B8B" },
    { id: "progress", label: "Pregnancy Progress", icon: "🤰", color: "#9D4EDD" },
    { id: "appointments", label: "Appointments", icon: "📅", color: "#FF6B8B" },
    { id: "community", label: "Community", icon: "👥", color: "#9D4EDD" },
    { id: "resources", label: "Resources", icon: "📚", color: "#FF6B8B" },
    { id: "settings", label: "Settings", icon: "⚙️", color: "#9D4EDD" }
  ];

  // Calculate initials for avatar fallback
  const initials =
    name
      .split(" ")
      .filter(Boolean)
      .slice(0, 2)
      .map((s) => s[0]?.toUpperCase())
      .join("") || "U";

  // Auth + realtime profile listener + photo (now sourced from Profile/profile.Image)
  useEffect(() => {
    let unsubProfile = null;

    const unsubAuth = onAuthStateChanged(auth, async (user) => {
      // cleanup previous profile listener if user switches
      if (unsubProfile) {
        unsubProfile();
        unsubProfile = null;
      }

      if (!user) {
        setAuthEmail("");
        setName("User");
        setEmail("");
        setPhotoUrl("");
        return;
      }

      const userEmail = user.email?.trim() || "";
      setAuthEmail(userEmail);

      // 🔴 REALTIME: Users/{authEmail}/Profile/profile
      const profileRef = doc(db, "Users", userEmail, "Profile", "profile");
      unsubProfile = onSnapshot(
        profileRef,
        (snap) => {
          if (snap.exists()) {
            const data = snap.data() || {};
            const motherName = (data.motherName ?? user.displayName ?? userEmail)?.toString().trim();
            const profileEmail = (data.email ?? userEmail)?.toString().trim();

            setName(motherName || "User");
            setEmail(profileEmail || "");

            // NEW: read profile photo from the same doc field "Image"
            const img = (data.Image ?? "").toString();
            if (img) setPhotoUrl(img);
            else setPhotoUrl("");
          } else {
            // fallback to auth information if profile doc missing
            setName(user.displayName || userEmail.split("@")[0] || "User");
            setEmail(userEmail);
            setPhotoUrl("");
          }
        },
        (err) => {
          console.error("Profile listener error:", err);
          setName(user.displayName || userEmail.split("@")[0] || "User");
          setEmail(userEmail);
          setPhotoUrl("");
        }
      );

      // One-time fetch to hydrate (same doc; consistent with realtime)
      try {
        const snap = await getDoc(profileRef);
        if (snap.exists()) {
          const data = snap.data() || {};
          const url = (data.Image ?? "").toString();
          if (url) setPhotoUrl(url);
        }
      } catch (err) {
        console.error("Failed to load profile photo:", err);
        toast.error("Failed to load profile photo.");
      }
    });

    return () => {
      unsubAuth && unsubAuth();
      unsubProfile && unsubProfile();
    };
  }, []);

  const triggerFilePick = () => {
    if (!uploading) {
      fileInputRef.current?.click();
    }
  };

  const handleFileChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validation checks
    if (!CLOUDINARY_CLOUD_NAME || !CLOUDINARY_UNSIGNED_PRESET) {
      toast.error("Cloudinary configuration missing.");
      return;
    }

    if (!authEmail) {
      toast.error("No authenticated user found.");
      return;
    }

    if (!file.type.startsWith("image/")) {
      toast.error("Please select an image file.");
      return;
    }

    if (file.size > 6 * 1024 * 1024) {
      toast.error("Image too large (max 6MB).");
      return;
    }

    setUploading(true);

    try {
      // Upload to Cloudinary
      const formData = new FormData();
      formData.append("file", file);
      formData.append("upload_preset", CLOUDINARY_UNSIGNED_PRESET);

      const response = await fetch(
        `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/image/upload`,
        { method: "POST", body: formData }
      );

      const data = await response.json();

      if (!response.ok || !data?.secure_url) {
        throw new Error(data?.error?.message || "Upload failed");
      }

      // Save to Firestore (SAME PROFILE DOC, FIELD: Image)
      const profileRef = doc(db, "Users", authEmail, "Profile", "profile");
      await setDoc(
        profileRef,
        { 
          Image: data.secure_url,            // <-- direct link here
          updatedAt: serverTimestamp(),
          fileName: file.name,
          fileSize: file.size
        },
        { merge: true }
      );

      // Update UI
      setPhotoUrl(data.secure_url);
      toast.success("Profile photo updated successfully!");
    } catch (error) {
      console.error("Upload error:", error);
      toast.error("Failed to upload photo. Please try again.");
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handleNavClick = (itemId) => {
    setActiveItem(itemId);
    // Here you can add navigation logic
    toast.info(`Navigating to ${navItems.find(item => item.id === itemId)?.label}`);
  };

  const handleToggle = () => {
    if (onToggle) {
      onToggle(!isCollapsed);
    }
  };

  return (
    <>
      <aside className={`babybloom-sidebar ${isCollapsed ? 'babybloom-sidebar--collapsed' : ''}`}>
        {/* Profile Section */}
        <div className="babybloom-sidebar__profile">
          <div className="babybloom-profile__avatar-container">
            <div className="babybloom-profile__avatar-wrapper">
              {photoUrl ? (
                <img 
                  src={photoUrl} 
                  alt="Profile" 
                  className="babybloom-profile__avatar"
                  onError={(e) => {
                    e.target.style.display = 'none';
                    e.target.nextSibling.style.display = 'flex';
                  }}
                />
              ) : null}
              
              <div className={`babybloom-profile__avatar-fallback ${photoUrl ? 'babybloom-profile__avatar-fallback--hidden' : ''}`}>
                {initials}
              </div>

              {/* Upload Overlay */}
              <div className="babybloom-profile__avatar-overlay">
                <button 
                  className="babybloom-profile__upload-trigger"
                  onClick={triggerFilePick}
                  disabled={uploading}
                >
                  {uploading ? (
                    <div className="babybloom-profile__upload-spinner"></div>
                  ) : (
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M14.06 9.02l.92.92L5.92 19H5v-.92l9.06-9.06M17.66 3c-.25 0-.51.1-.7.29l-1.83 1.83 3.75 3.75 1.83-1.83c.39-.39.39-1.02 0-1.41l-2.34-2.34c-.2-.2-.45-.29-.71-.29zm-3.6 3.19L3 17.25V21h3.75L17.81 9.94l-3.75-3.75z"/>
                    </svg>
                  )}
                </button>
              </div>

              {/* Online Status Indicator */}
              <div className="babybloom-profile__status-indicator"></div>
            </div>
          </div>

          {!isCollapsed && (
            <div className="babybloom-profile__info">
              <h3 className="babybloom-profile__name" title={name}>
                {name}
              </h3>
              <p className="babybloom-profile__email" title={email}>
                {email}
              </p>
              <button 
                className="babybloom-profile__upload-btn"
                onClick={triggerFilePick}
                disabled={uploading}
              >
                <span>{photoUrl ? "Change Photo" : "Upload Photo"}</span>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M14.06 9.02l.92.92L5.92 19H5v-.92l9.06-9.06M17.66 3c-.25 0-.51.1-.7.29l-1.83 1.83 3.75 3.75 1.83-1.83c.39-.39.39-1.02 0-1.41l-2.34-2.34c-.2-.2-.45-.29-.71-.29zm-3.6 3.19L3 17.25V21h3.75L17.81 9.94l-3.75-3.75z"/>
                </svg>
              </button>
            </div>
          )}
        </div>

        {/* Navigation */}
        <nav className="babybloom-sidebar__nav">
          {navItems.map((item) => (
            <button
              key={item.id}
              className={`babybloom-nav__item ${activeItem === item.id ? 'babybloom-nav__item--active' : ''}`}
              onClick={() => handleNavClick(item.id)}
              style={{ '--item-color': item.color }}
            >
              <span className="babybloom-nav__item-icon">{item.icon}</span>
              {!isCollapsed && (
                <>
                  <span className="babybloom-nav__item-label">{item.label}</span>
                  <div className="babybloom-nav__item-indicator"></div>
                </>
              )}
            </button>
          ))}
        </nav>

        {/* Progress Section */}
        {/* {!isCollapsed && (
          <div className="babybloom-sidebar__progress">
            <div className="babybloom-progress__header">
              <span className="babybloom-progress__title">Pregnancy Progress</span>
              <span className="babybloom-progress__percentage">24%</span>
            </div>
            <div className="babybloom-progress__bar">
              <div 
                className="babybloom-progress__fill"
                style={{ width: '24%' }}
              ></div>
            </div>
            <div className="babybloom-progress__details">
              <span className="babybloom-progress__text">Week 12 of 40</span>
              <span className="babybloom-progress__time">28 weeks to go</span>
            </div>
          </div>
        )} */}

        {/* Hidden File Input */}
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          className="babybloom-hidden-input"
          onChange={handleFileChange}
        />
      </aside>

      {/* Spacer for main content */}
      <div className={`babybloom-sidebar-spacer ${isCollapsed ? 'babybloom-sidebar-spacer--collapsed' : ''}`} />

      <ToastContainer 
        position="top-right" 
        autoClose={3000} 
        hideProgressBar={false}
        theme="colored" 
      />
    </>
  );
};

export default Sidebar;
