import React, { useState } from "react";
import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
import { getAuth, signInWithEmailAndPassword } from "firebase/auth";
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
  const [showPw, setShowPw] = useState(false);
  const [message, setMessage] = useState({ type: "", text: "" });
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e) => {
    e.preventDefault();
    setMessage({ type: "", text: "" });
    setLoading(true);
    try {
      const cred = await signInWithEmailAndPassword(auth, email, password);
      setMessage({ type: "success", text: `Welcome, ${cred.user.email}!` });
    } catch (err) {
      const friendly =
        err?.code === "auth/user-not-found"
          ? "No user with that email."
          : err?.code === "auth/wrong-password"
          ? "Incorrect password."
          : err?.code === "auth/invalid-email"
          ? "Please enter a valid email."
          : "Login failed. Please try again.";
      setMessage({ type: "error", text: friendly });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-root">
      {/* Animated gradient backdrop + floating blobs */}
      <div className="gradient-bg" />
      <div className="blob blob-1" />
      <div className="blob blob-2" />
      <div className="blob blob-3" />

      <main className="card" role="main" aria-labelledby="loginTitle">
        <div className="brand">
          <div className="brand-icon" aria-hidden="true">👶</div>
          <h1 id="loginTitle" className="brand-title">BabyBloom</h1>
          <p className="brand-sub">A gentle companion for mom & baby</p>
        </div>

        <form className="form" onSubmit={handleLogin} aria-describedby="formHelp">
          <label className="label" htmlFor="email">Email</label>
          <input
            id="email"
            className="input"
            type="email"
            autoComplete="email"
            placeholder="you@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />

          <label className="label" htmlFor="password">Password</label>
          <div className="pw-wrap">
            <input
              id="password"
              className="input pw"
              type={showPw ? "text" : "password"}
              autoComplete="current-password"
              placeholder="Your password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
            <button
              type="button"
              className="pw-toggle"
              aria-label={showPw ? "Hide password" : "Show password"}
              onClick={() => setShowPw((s) => !s)}
            >
              {showPw ? "🙈" : "👁️"}
            </button>
          </div>

          <button
            type="submit"
            className={`btn ${loading ? "btn-loading" : ""}`}
            disabled={loading}
            aria-busy={loading}
          >
            {loading ? <span className="spinner" aria-hidden="true" /> : "Sign In"}
          </button>

          <p id="formHelp" className="help">
            Tip: Use the demo email & password you added in Firebase Authentication.
          </p>
        </form>

        {message.text && (
          <div
            role="status"
            className={`toast ${message.type === "success" ? "toast-success" : "toast-error"}`}
          >
            {message.type === "success" ? "✅ " : "❌ "}
            {message.text}
          </div>
        )}

        <footer className="footer">
          <span className="pill">Safe • Caring • Simple</span>
        </footer>
      </main>
    </div>
  );
};

export default LoginPage;
