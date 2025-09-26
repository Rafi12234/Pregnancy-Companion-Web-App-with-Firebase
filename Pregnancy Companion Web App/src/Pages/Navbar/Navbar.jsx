import React, { useEffect, useState } from "react";
import "./Navbar.css";
import { ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

import { initializeApp } from "firebase/app";
import { getAuth, onAuthStateChanged, signOut } from "firebase/auth";
import { getFirestore, doc, getDoc } from "firebase/firestore";
import { useNavigate } from "react-router-dom";

const firebaseConfig = {
  apiKey: "AIzaSyAoRjjijmlodBuN1qmdILxbZI88vuYkH7s",
  authDomain: "pregnancy-companion-web-app.firebaseapp.com",
  projectId: "pregnancy-companion-web-app",
  storageBucket: "pregnancy-companion-web-app.firebasestorage.app",
  messagingSenderId: "265131162037",
  appId: "1:265131162037:web:86710007f91282fe6541fc",
  measurementId: "G-40G11VGE47",
};
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

const Navbar = () => {
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (user) => {
      try {
        if (!user) {
          setName("");
          setLoading(false);
          return;
        }
        const email = user.email?.trim();
        setName(user.displayName || email || "User");

        if (!email) {
          setLoading(false);
          return;
        }
        const ref = doc(db, "Users", email);
        const snap = await getDoc(ref);
        if (snap.exists()) {
          const n = snap.data()?.motherName;
          if (n) setName(n);
        }
      } catch (e) {
        toast.error("Failed to load profile.");
      } finally {
        setLoading(false);
      }
    });
    return () => unsub();
  }, []);

  const initials =
    name
      ?.split(" ")
      .filter(Boolean)
      .slice(0, 2)
      .map((s) => s[0]?.toUpperCase())
      .join("") || "U";

const handleSignOut = async () => {
  try {
    await signOut(auth);
    toast.success("Signed out successfully");
    navigate("/landingpage");               // <-- Landing page route
  } catch {
    toast.error("Sign out failed");
  }
};


  return (
    <>
      <nav className="navbar navbar-expand-lg modern-navbar fixed-top">
        <div className="container-fluid nav-container">
          {/* Brand */}
          <a className="navbar-brand brand-wrapper" href="/homepage">
            <div className="brand-content">
              <span className="brand-icon" aria-hidden="true">👶</span>
              <span className="brand-title">BabyBloom</span>
            </div>
          </a>

          {/* User Menu */}
          <div className="user-section">
            <div className="dropdown user-dropdown">
              <button
                className="user-trigger"
                type="button"
                id="userMenu"
                data-bs-toggle="dropdown"
                aria-expanded="false"
              >
                <div className="user-avatar">
                  {initials}
                </div>
                <div className="user-info">
                  <span className="user-greeting">Welcome back</span>
                  <span className="user-name">
                    {loading ? <span className="name-loading" /> : name}
                  </span>
                </div>
                <svg className="dropdown-chevron" width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M7.41 8.84L12 13.42l4.59-4.58L18 10.25l-6 6-6-6z"/>
                </svg>
              </button>
              
              <ul className="dropdown-menu user-menu" aria-labelledby="userMenu">
                <li className="menu-header">
                  <span className="menu-title">Account</span>
                </li>
                <li>
                  <a className="dropdown-item menu-item" href="/profile">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/>
                    </svg>
                    <span>My Profile</span>
                  </a>
                </li>
                <li>
                  <a className="dropdown-item menu-item" href="/settings">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M19.14 12.94c.04-.3.06-.61.06-.94 0-.32-.02-.64-.07-.94l2.03-1.58c.18-.14.23-.41.12-.61l-1.92-3.32c-.12-.22-.37-.29-.59-.22l-2.39.96c-.5-.38-1.03-.7-1.62-.94l-.36-2.54c-.04-.24-.24-.41-.48-.41h-3.84c-.24 0-.43.17-.47.41l-.36 2.54c-.59.24-1.13.57-1.62.94l-2.39-.96c-.22-.08-.47 0-.59.22L2.74 8.87c-.12.21-.08.47.12.61l2.03 1.58c-.05.3-.09.63-.09.94s.02.64.07.94l-2.03 1.58c-.18.14-.23.41-.12.61l1.92 3.32c.12.22.37.29.59.22l2.39-.96c.5.38 1.03.7 1.62.94l.36 2.54c.05.24.24.41.48.41h3.84c.24 0 .44-.17.47-.41l.36-2.54c.59-.24 1.13-.56 1.62-.94l2.39.96c.22.08.47 0 .59-.22l1.92-3.32c.12-.22.07-.47-.12-.61l-2.01-1.58zM12 15.6c-1.98 0-3.6-1.62-3.6-3.6s1.62-3.6 3.6-3.6 3.6 1.62 3.6 3.6-1.62 3.6-3.6 3.6z"/>
                    </svg>
                    <span>Settings</span>
                  </a>
                </li>
                <li><hr className="menu-divider" /></li>
                <li>
                  <button className="dropdown-item menu-item sign-out-btn" onClick={handleSignOut}>
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

        {/* Navigation Glow Effect */}
        <div className="nav-glow" aria-hidden="true" />
      </nav>

      {/* Spacer */}
      <div className="nav-spacer" />

      <ToastContainer position="top-right" autoClose={2200} hideProgressBar theme="colored" />
    </>
  );
};

export default Navbar;