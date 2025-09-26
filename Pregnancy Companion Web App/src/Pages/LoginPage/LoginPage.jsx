import React, { useState, useEffect } from "react";
import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
import { getAuth, signInWithEmailAndPassword } from "firebase/auth";
import { useNavigate } from "react-router-dom";
import "./LoginPage.css";

const firebaseConfig = {
  apiKey: "AIzaSyAoRjjijmlodBuN1qmdILxbZI88vuYkH7s",
  authDomain: "pregnancy-companion-web-app.firebaseapp.com",
  projectId: "pregnancy-companion-web-app",
  storageBucket: "pregnancy-companion-web-app.firebasestorage.app",
  messagingSenderId: "265131162037",
  appId: "1:265131162037:web:86710007f91282fe6541fc",
  measurementId: "G-40G11VGE47",
};

// Initialize Firebase (only once)
const app = initializeApp(firebaseConfig);
try { getAnalytics(app); } catch { /* analytics requires browser env */ }
const auth = getAuth(app);

const LoginPage = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [message, setMessage] = useState({ type: "", text: "" });
  const [loading, setLoading] = useState(false);
  const [isAnimating, setIsAnimating] = useState(false);
  const navigate = useNavigate();

  // Add entrance animation on mount
  useEffect(() => {
    setTimeout(() => setIsAnimating(true), 100);
  }, []);

  const handleLogin = async (e) => {
    e.preventDefault();
    setMessage({ type: "", text: "" });
    
    if (!email.trim() || !password.trim()) {
      setMessage({ type: "error", text: "Please fill in all fields." });
      return;
    }

    setLoading(true);
    
    try {
      const cred = await signInWithEmailAndPassword(auth, email, password);
      
      // Show success message
      setMessage({ 
        type: "success", 
        text: `Welcome back, ${cred.user.displayName || cred.user.email}!` 
      });
      
      // Navigate to HomePage after a short delay to show success message
      setTimeout(() => {
        navigate('/homepage', { replace: true });
      }, 1500);
      
    } catch (err) {
      let friendly = "Login failed. Please try again.";
      
      switch (err?.code) {
        case "auth/user-not-found":
          friendly = "No account found with this email address.";
          break;
        case "auth/wrong-password":
          friendly = "Incorrect password. Please try again.";
          break;
        case "auth/invalid-email":
          friendly = "Please enter a valid email address.";
          break;
        case "auth/user-disabled":
          friendly = "This account has been disabled.";
          break;
        case "auth/too-many-requests":
          friendly = "Too many failed attempts. Please try again later.";
          break;
        case "auth/invalid-credential":
          friendly = "Invalid email or password.";
          break;
      }
      
      setMessage({ type: "error", text: friendly });
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = () => {
    // You can implement forgot password functionality here
    console.log("Forgot password clicked");
  };

  const handleSignUp = () => {
    navigate('/signup');
  };

  return (
    <div className="login-root">
      {/* Animated Background Elements */}
      <div className="background-elements">
        <div className="gradient-orb orb-1"></div>
        <div className="gradient-orb orb-2"></div>
        <div className="gradient-orb orb-3"></div>
        <div className="floating-particles">
          {[...Array(12)].map((_, i) => (
            <div key={i} className={`particle particle-${i + 1}`}></div>
          ))}
        </div>
      </div>

      {/* Main Content */}
      <div className={`login-container ${isAnimating ? 'animate-in' : ''}`}>
        
        {/* Left Side - Welcome Section */}
        <div className="welcome-panel">
          <div className="welcome-content">
            <div className="logo-section">
              <div className="logo-container">
                <div className="logo-icon">
                  <span className="icon-heart">💖</span>
                  <span className="icon-baby">👶</span>
                </div>
                <div className="logo-text">
                  <h1 className="brand-name">BabyJourney</h1>
                  <p className="brand-tagline">Your pregnancy companion</p>
                </div>
              </div>
            </div>

            <div className="welcome-message">
              <h2 className="welcome-title">
                Welcome Back to Your
                <span className="highlight-text"> Pregnancy Journey</span>
              </h2>
              <p className="welcome-description">
                Continue tracking your beautiful pregnancy journey with personalized insights, 
                expert guidance, and a supportive community of mothers.
              </p>
            </div>

            <div className="feature-highlights">
              <div className="feature-item">
                <div className="feature-icon">📊</div>
                <div className="feature-content">
                  <h3>Track Progress</h3>
                  <p>Monitor your baby's development</p>
                </div>
              </div>
              <div className="feature-item">
                <div className="feature-icon">💡</div>
                <div className="feature-content">
                  <h3>Expert Tips</h3>
                  <p>Daily guidance from specialists</p>
                </div>
              </div>
              <div className="feature-item">
                <div className="feature-icon">🤱</div>
                <div className="feature-content">
                  <h3>Community</h3>
                  <p>Connect with other mothers</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Right Side - Login Form */}
        <div className="login-panel">
          <div className="login-form-container">
            <div className="form-header">
              <h2 className="form-title">Sign In</h2>
              <p className="form-subtitle">Welcome back! Please sign in to your account</p>
            </div>

            <form className="login-form" onSubmit={handleLogin}>
              <div className="form-group">
                <label className="form-label" htmlFor="email">
                  <span className="label-text">Email Address</span>
                  <span className="label-required">*</span>
                </label>
                <div className="input-container">
                  <div className="input-icon">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <path d="M21 8L12 13L3 8M3 6H21C21.5523 6 22 6.44772 22 7V17C22 17.5523 21.5523 18 21 18H3C2.44772 18 2 17.5523 2 17V7C2 6.44772 2.44772 6 3 6Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  </div>
                  <input
                    id="email"
                    className="form-input"
                    type="email"
                    autoComplete="email"
                    placeholder="Enter your email address"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                  />
                </div>
              </div>

              <div className="form-group">
                <label className="form-label" htmlFor="password">
                  <span className="label-text">Password</span>
                  <span className="label-required">*</span>
                </label>
                <div className="input-container">
                  <div className="input-icon">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <path d="M6 10V8C6 5.79086 7.79086 4 10 4H14C16.2091 4 18 5.79086 18 8V10M6 10H18M6 10C4.89543 10 4 10.8954 4 12V18C4 19.1046 4.89543 20 6 20H18C19.1046 20 20 19.1046 20 18V12C20 10.8954 19.1046 10 18 10" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  </div>
                  <input
                    id="password"
                    className="form-input"
                    type={showPassword ? "text" : "password"}
                    autoComplete="current-password"
                    placeholder="Enter your password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                  />
                  <button
                    type="button"
                    className="password-toggle"
                    onClick={() => setShowPassword(!showPassword)}
                    aria-label={showPassword ? "Hide password" : "Show password"}
                  >
                    {showPassword ? (
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M17.94 17.94C16.2306 19.243 14.1491 19.9649 12 20C5 20 1 12 1 12C2.24389 9.68192 4.23086 7.78069 6.06 6.06M9.9 4.24C10.5883 4.0789 11.2931 3.99836 12 4C19 4 23 12 23 12C22.393 13.1356 21.6691 14.2048 20.84 15.19M14.12 14.12C13.8454 14.4148 13.5141 14.6512 13.1462 14.8151C12.7782 14.9791 12.3809 15.0673 11.9781 15.0744C11.5753 15.0815 11.1749 15.0074 10.8016 14.8565C10.4283 14.7056 10.0887 14.481 9.80385 14.1962C9.51897 13.9113 9.29439 13.5717 9.14351 13.1984C8.99262 12.8251 8.91853 12.4247 8.92563 12.0219C8.93274 11.6191 9.02091 11.2218 9.18488 10.8538C9.34884 10.4858 9.58525 10.1546 9.88 9.88" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                        <path d="M1 1L23 23" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                    ) : (
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M1 12C1 12 5 4 12 4C19 4 23 12 23 12C23 12 19 20 12 20C5 20 1 12 1 12Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                        <circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                    )}
                  </button>
                </div>
              </div>

              <div className="form-options">
                <label className="remember-me">
                  <input type="checkbox" className="checkbox" />
                  <span className="checkmark"></span>
                  <span className="checkbox-label">Remember me</span>
                </label>
                <button 
                  type="button" 
                  className="forgot-password"
                  onClick={handleForgotPassword}
                >
                  Forgot Password?
                </button>
              </div>

              <button 
                type="submit" 
                className={`submit-button ${loading ? 'loading' : ''}`}
                disabled={loading}
              >
                {loading ? (
                  <>
                    <div className="loading-spinner"></div>
                    Signing In...
                  </>
                ) : (
                  <>
                    <span>Sign In</span>
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <path d="M5 12H19M19 12L12 5M19 12L12 19" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  </>
                )}
              </button>
            </form>

            {/* Message Display */}
            {message.text && (
              <div className={`message-container ${message.type}`}>
                <div className="message-icon">
                  {message.type === "success" ? "✅" : "⚠️"}
                </div>
                <div className="message-text">{message.text}</div>
              </div>
            )}

            {/* Sign Up Link */}
            <div className="signup-prompt">
              <p className="signup-text">
                Don't have an account?{" "}
                <button 
                  type="button" 
                  className="signup-link"
                  onClick={handleSignUp}
                >
                  Create Account
                </button>
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;