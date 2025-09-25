import React, { useState } from "react";
import "./SignupPage.css";

import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
import { getAuth, createUserWithEmailAndPassword, updateProfile } from "firebase/auth";
import { getFirestore, doc, setDoc, serverTimestamp } from "firebase/firestore";

// TODO: replace with your own config OR import from a central firebase.js
const firebaseConfig = {
  apiKey: "AIzaSyAoRjjijmlodBuN1qmdILxbZI88vuYkH7s",
  authDomain: "pregnancy-companion-web-app.firebaseapp.com",
  projectId: "pregnancy-companion-web-app",
  storageBucket: "pregnancy-companion-web-app.firebasestorage.app",
  messagingSenderId: "265131162037",
  appId: "1:265131162037:web:86710007f91282fe6541fc",
  measurementId: "G-40G11VGE47",
};

// Init once (safe in Vite CRA single mount)
const app = initializeApp(firebaseConfig);
try { getAnalytics(app); } catch (_) {}
const auth = getAuth(app);
const db = getFirestore(app);

const initialForm = {
  // mother
  motherName: "",
  email: "",
  password: "",
  confirmPassword: "",
  phone: "",
  address: "",
  bloodGroup: "",
  occupation: "",
  dob: "",           // recommended extra
  lmp: "",           // last menstrual period (optional)
  allergies: "",     // optional free text

  // spouse/partner
  spouseName: "",
  spousePhone: "",
  spouseBloodGroup: "",
  spouseOccupation: "",

  // emergency
  emergencyName: "",
  emergencyRelation: "",
  emergencyPhone: "",

  // consent
  agree: false,
};

const SignUpPage = () => {
  const [form, setForm] = useState(initialForm);
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState({ type: "", text: "" });
  const [activeStep, setActiveStep] = useState(0);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setForm((f) => ({ ...f, [name]: type === "checkbox" ? checked : value }));
  };

  const validate = () => {
    const required = [
      "motherName","email","password","confirmPassword",
      "phone","address","bloodGroup","occupation",
      "spouseName","spousePhone","spouseBloodGroup","spouseOccupation",
      "emergencyName","emergencyRelation","emergencyPhone"
    ];

    for (const key of required) {
      if (!String(form[key]).trim()) {
        return `Please fill the "${key}" field.`;
      }
    }
    if (form.password.length < 6) return "Password must be at least 6 characters.";
    if (form.password !== form.confirmPassword) return "Passwords do not match.";
    if (!form.agree) return "Please agree to the terms and data consent.";
    return null;
    // (You can add more validation patterns for phone/email if you want)
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMsg({ type: "", text: "" });
    const errorText = validate();
    if (errorText) {
      setMsg({ type: "error", text: errorText });
      return;
    }

    setLoading(true);
    try {
      // 1) Create user in Firebase Auth
      const cred = await createUserWithEmailAndPassword(auth, form.email, form.password);
      // optional: set displayName from motherName
      await updateProfile(cred.user, { displayName: form.motherName });

      // 2) Save profile in Firestore
      const emailDocId = form.email.trim(); // as requested: Users/{email}
      const userDocRef = doc(db, "Users", emailDocId);

      // Prepare data object (exclude password fields)
      const {
        password, confirmPassword, agree, ...profileFields
      } = form;

      await setDoc(userDocRef, {
        ...profileFields,
        uid: cred.user.uid,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        // Basic calculated fields (empty now; you can fill later in app flows)
        edd: "", // estimated due date (can be derived from LMP later)
        riskLevel: "unknown",
      }, { merge: true });

      setMsg({ type: "success", text: "Account created successfully. You can sign in now!" });
      setForm(initialForm);
    } catch (err) {
      let friendly = "Sign up failed. Please try again.";
      if (err?.code === "auth/email-already-in-use") friendly = "This email is already in use.";
      if (err?.code === "auth/invalid-email") friendly = "Please enter a valid email.";
      if (err?.code === "auth/weak-password") friendly = "Password is too weak.";
      setMsg({ type: "error", text: friendly });
    } finally {
      setLoading(false);
    }
  };

  const steps = [
    { title: "Mother Information", icon: "👤" },
    { title: "Partner Details", icon: "👫" },
    { title: "Emergency Contact", icon: "📞" },
    { title: "Login Credentials", icon: "🔐" }
  ];

  return (
    <div className="signup-root">
      {/* Animated Background */}
      <div className="background-animation">
        <div className="floating-shape shape-1"></div>
        <div className="floating-shape shape-2"></div>
        <div className="floating-shape shape-3"></div>
        <div className="floating-shape shape-4"></div>
        <div className="floating-shape shape-5"></div>
      </div>

      <div className="signup-container">
        {/* Left Side - Welcome Section */}
        <div className="welcome-section">
          <div className="welcome-content">
            <div className="logo-container">
              <div className="logo">
                <span className="logo-icon">🤱</span>
                <span className="logo-text">BabyJourney</span>
              </div>
            </div>
            <h1 className="welcome-title">
              Welcome to Your
              <span className="gradient-text"> Pregnancy Journey</span>
            </h1>
            <p className="welcome-description">
              Join thousands of mothers who trust us to guide them through their beautiful pregnancy journey with personalized care and support.
            </p>
            <div className="features-list">
              <div className="feature-item">
                <span className="feature-icon">✨</span>
                <span>Personalized pregnancy tracking</span>
              </div>
              <div className="feature-item">
                <span className="feature-icon">📱</span>
                <span>24/7 health monitoring</span>
              </div>
              <div className="feature-item">
                <span className="feature-icon">👩‍⚕️</span>
                <span>Expert medical guidance</span>
              </div>
              <div className="feature-item">
                <span className="feature-icon">🤝</span>
                <span>Community support</span>
              </div>
            </div>
          </div>
        </div>

        {/* Right Side - Form Section */}
        <div className="form-section">
          <div className="form-container">
            <div className="form-header">
              <h2 className="form-title">Create Your Account</h2>
              <p className="form-subtitle">Start your personalized pregnancy journey today</p>
            </div>

            {/* Progress Steps */}
            <div className="progress-steps">
              {steps.map((step, index) => (
                <div
                  key={index}
                  className={`progress-step ${index <= activeStep ? 'active' : ''}`}
                  onClick={() => setActiveStep(index)}
                >
                  <div className="step-icon">{step.icon}</div>
                  <span className="step-title">{step.title}</span>
                </div>
              ))}
            </div>

            <form className="signup-form" onSubmit={handleSubmit}>
              {/* Step 1: Mother Information */}
              <div className={`form-step ${activeStep === 0 ? 'active' : ''}`}>
                <div className="step-header">
                  <h3>👤 Mother Information</h3>
                  <p>Tell us about yourself</p>
                </div>
                <div className="form-grid">
                  <div className="form-group">
                    <label className="form-label">Full Name*</label>
                    <input
                      className="form-input"
                      name="motherName"
                      value={form.motherName}
                      onChange={handleChange}
                      placeholder="Enter your full name"
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Phone Number*</label>
                    <input
                      className="form-input"
                      name="phone"
                      value={form.phone}
                      onChange={handleChange}
                      placeholder="Enter your phone number"
                    />
                  </div>
                  <div className="form-group full-width">
                    <label className="form-label">Address*</label>
                    <input
                      className="form-input"
                      name="address"
                      value={form.address}
                      onChange={handleChange}
                      placeholder="Enter your complete address"
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Blood Group*</label>
                    <select className="form-select" name="bloodGroup" value={form.bloodGroup} onChange={handleChange}>
                      <option value="">Select Blood Group</option>
                      <option>O+</option><option>O-</option>
                      <option>A+</option><option>A-</option>
                      <option>B+</option><option>B-</option>
                      <option>AB+</option><option>AB-</option>
                    </select>
                  </div>
                  <div className="form-group">
                    <label className="form-label">Occupation*</label>
                    <input
                      className="form-input"
                      name="occupation"
                      value={form.occupation}
                      onChange={handleChange}
                      placeholder="Your occupation"
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Date of Birth</label>
                    <input
                      className="form-input"
                      type="date"
                      name="dob"
                      value={form.dob}
                      onChange={handleChange}
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Last Menstrual Period</label>
                    <input
                      className="form-input"
                      type="date"
                      name="lmp"
                      value={form.lmp}
                      onChange={handleChange}
                    />
                  </div>
                  <div className="form-group full-width">
                    <label className="form-label">Allergies (if any)</label>
                    <input
                      className="form-input"
                      name="allergies"
                      value={form.allergies}
                      onChange={handleChange}
                      placeholder="e.g., penicillin, nuts, etc."
                    />
                  </div>
                </div>
              </div>

              {/* Step 2: Partner Information */}
              <div className={`form-step ${activeStep === 1 ? 'active' : ''}`}>
                <div className="step-header">
                  <h3>👫 Partner Details</h3>
                  <p>Information about your partner</p>
                </div>
                <div className="form-grid">
                  <div className="form-group">
                    <label className="form-label">Partner's Name*</label>
                    <input
                      className="form-input"
                      name="spouseName"
                      value={form.spouseName}
                      onChange={handleChange}
                      placeholder="Partner's full name"
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Partner's Phone*</label>
                    <input
                      className="form-input"
                      name="spousePhone"
                      value={form.spousePhone}
                      onChange={handleChange}
                      placeholder="Partner's phone number"
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Partner's Blood Group*</label>
                    <select className="form-select" name="spouseBloodGroup" value={form.spouseBloodGroup} onChange={handleChange}>
                      <option value="">Select Blood Group</option>
                      <option>O+</option><option>O-</option>
                      <option>A+</option><option>A-</option>
                      <option>B+</option><option>B-</option>
                      <option>AB+</option><option>AB-</option>
                    </select>
                  </div>
                  <div className="form-group">
                    <label className="form-label">Partner's Occupation*</label>
                    <input
                      className="form-input"
                      name="spouseOccupation"
                      value={form.spouseOccupation}
                      onChange={handleChange}
                      placeholder="Partner's occupation"
                    />
                  </div>
                </div>
              </div>

              {/* Step 3: Emergency Contact */}
              <div className={`form-step ${activeStep === 2 ? 'active' : ''}`}>
                <div className="step-header">
                  <h3>📞 Emergency Contact</h3>
                  <p>Someone we can reach in case of emergency</p>
                </div>
                <div className="form-grid">
                  <div className="form-group">
                    <label className="form-label">Contact Name*</label>
                    <input
                      className="form-input"
                      name="emergencyName"
                      value={form.emergencyName}
                      onChange={handleChange}
                      placeholder="Emergency contact name"
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Relationship*</label>
                    <input
                      className="form-input"
                      name="emergencyRelation"
                      value={form.emergencyRelation}
                      onChange={handleChange}
                      placeholder="e.g., sister, mother, friend"
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Contact Phone*</label>
                    <input
                      className="form-input"
                      name="emergencyPhone"
                      value={form.emergencyPhone}
                      onChange={handleChange}
                      placeholder="Emergency contact phone"
                    />
                  </div>
                </div>
              </div>

              {/* Step 4: Login Credentials */}
              <div className={`form-step ${activeStep === 3 ? 'active' : ''}`}>
                <div className="step-header">
                  <h3>🔐 Login Credentials</h3>
                  <p>Create your account credentials</p>
                </div>
                <div className="form-grid">
                  <div className="form-group full-width">
                    <label className="form-label">Email Address*</label>
                    <input
                      className="form-input"
                      type="email"
                      name="email"
                      value={form.email}
                      onChange={handleChange}
                      placeholder="Enter your email address"
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Password* (min 6 chars)</label>
                    <input
                      className="form-input"
                      type="password"
                      name="password"
                      value={form.password}
                      onChange={handleChange}
                      placeholder="Create a strong password"
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Confirm Password*</label>
                    <input
                      className="form-input"
                      type="password"
                      name="confirmPassword"
                      value={form.confirmPassword}
                      onChange={handleChange}
                      placeholder="Confirm your password"
                    />
                  </div>
                </div>

                <div className="consent-section">
                  <label className="consent-checkbox">
                    <input
                      type="checkbox"
                      name="agree"
                      checked={form.agree}
                      onChange={handleChange}
                    />
                    <span className="checkmark"></span>
                    <span className="consent-text">
                      I agree to the <a href="#" className="link">Terms of Service</a> and consent to the secure storage of my health data for providing personalized pregnancy care.
                    </span>
                  </label>
                </div>
              </div>

              {/* Navigation Buttons */}
              <div className="form-navigation">
                {activeStep > 0 && (
                  <button
                    type="button"
                    className="nav-btn prev-btn"
                    onClick={() => setActiveStep(activeStep - 1)}
                  >
                    ← Previous
                  </button>
                )}
                {activeStep < 3 ? (
                  <button
                    type="button"
                    className="nav-btn next-btn"
                    onClick={() => setActiveStep(activeStep + 1)}
                  >
                    Next →
                  </button>
                ) : (
                  <button type="submit" className="submit-btn" disabled={loading}>
                    {loading ? (
                      <>
                        <span className="loading-spinner"></span>
                        Creating Account...
                      </>
                    ) : (
                      <>
                        <span>🚀</span>
                        Create Account
                      </>
                    )}
                  </button>
                )}
              </div>
            </form>

            {msg.text && (
              <div className={`message ${msg.type === "success" ? "message-success" : "message-error"}`}>
                <span className="message-icon">
                  {msg.type === "success" ? "✅" : "⚠️"}
                </span>
                {msg.text}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default SignUpPage;