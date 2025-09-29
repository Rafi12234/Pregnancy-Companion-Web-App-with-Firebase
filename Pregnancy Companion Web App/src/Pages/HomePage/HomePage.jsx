// src/Pages/Homepage/Homepage.jsx
import React, { useEffect, useMemo, useState } from "react";
import "./Homepage.css";

import { initializeApp, getApps } from "firebase/app";
import { getAuth, onAuthStateChanged } from "firebase/auth";
import { getFirestore, doc, onSnapshot } from "firebase/firestore";
import Sidebar from "../Sidebar/Sidebar";
import Navbar from "../Navbar/Navbar";

/* ============== Firebase init (guarded) ============== */
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

/* =================== Helpers =================== */
const MS_PER_DAY = 24 * 60 * 60 * 1000;

function toDateSafe(eddValue) {
  if (!eddValue) return null;
  if (typeof eddValue === "object" && typeof eddValue.toDate === "function") {
    return eddValue.toDate();
  }
  const d = new Date(eddValue);
  return isNaN(d.getTime()) ? null : d;
}
const clamp = (n, min, max) => Math.max(min, Math.min(n, max));

/** Cute baby size by month (1..10) via if/else as requested */
function getBabySizeByMonth(month) {
  let label = "—", emoji = "👶";
  if (month <= 1) { label = "Blueberry"; emoji = "🫐"; }
  else if (month === 2) { label = "Raspberry"; emoji = "🍇"; }
  else if (month === 3) { label = "Lime"; emoji = "🍋"; }
  else if (month === 4) { label = "Avocado"; emoji = "🥑"; }
  else if (month === 5) { label = "Banana"; emoji = "🍌"; }
  else if (month === 6) { label = "Papaya"; emoji = "🫑"; }
  else if (month === 7) { label = "Eggplant"; emoji = "🍆"; }
  else if (month === 8) { label = "Pineapple"; emoji = "🍍"; }
  else if (month === 9) { label = "Small Pumpkin"; emoji = "🎃"; }
  else if (month >= 10) { label = "Watermelon"; emoji = "🍉"; }
  return { label, emoji };
}

/* =================== Component =================== */
const Homepage = () => {
  const [email, setEmail] = useState("");
  const [motherName, setMotherName] = useState("");
  const [currentMonth, setCurrentMonth] = useState(null);
  const [eddDate, setEddDate] = useState(null);
  const [tick, setTick] = useState(0);

  // Auth + realtime profile listener
  useEffect(() => {
    let unsubProfile = null;

    const unsubAuth = onAuthStateChanged(auth, (user) => {
      if (unsubProfile) { unsubProfile(); unsubProfile = null; }

      if (!user) {
        setEmail(""); setMotherName(""); setCurrentMonth(null); setEddDate(null);
        return;
      }

      const mail = (user.email || "").trim();
      setEmail(mail);

      const profileRef = doc(db, "Users", mail, "Profile", "profile");
      unsubProfile = onSnapshot(
        profileRef,
        (snap) => {
          if (!snap.exists()) {
            setMotherName(user.displayName || mail);
            setCurrentMonth(null);
            setEddDate(null);
            return;
          }
          const data = snap.data() || {};

          const name = (data.motherName ?? user.displayName ?? mail)?.toString().trim();
          setMotherName(name);

          const cm = typeof data.currentMonth === "string"
            ? parseInt(data.currentMonth, 10)
            : data.currentMonth;
          setCurrentMonth(Number.isFinite(cm) ? cm : null);

          const eddVal = data.edd ?? data["edd."] ?? data.EDD;
          setEddDate(toDateSafe(eddVal));
        },
        (err) => {
          console.error("Profile listener error:", err);
          setMotherName(user.displayName || mail);
        }
      );
    });

    return () => { unsubAuth && unsubAuth(); unsubProfile && unsubProfile(); };
  }, []);

  // Recompute countdown each minute so "days left" stays accurate
  useEffect(() => {
    const id = setInterval(() => setTick((t) => t + 1), 60 * 1000);
    return () => clearInterval(id);
  }, []);

  // Derived values based on EDD
  const { daysLeft, weeksRemaining, weeksPregnantFromEDD, monthFromEDD } = useMemo(() => {
    if (!eddDate) {
      return { daysLeft: null, weeksRemaining: null, weeksPregnantFromEDD: null, monthFromEDD: null };
    }
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const edd0 = new Date(eddDate.getFullYear(), eddDate.getMonth(), eddDate.getDate());

    const diffDays = Math.ceil((edd0.getTime() - today.getTime()) / MS_PER_DAY); // can be negative if past due
    const weeksRem = Math.ceil(diffDays / 7);
    const weeksPreg = clamp(40 - weeksRem, 0, 40);
    const monthByEDD = clamp(Math.ceil(weeksPreg / 4), 1, 10);

    return {
      daysLeft: diffDays,
      weeksRemaining: weeksRem,
      weeksPregnantFromEDD: weeksPreg,
      monthFromEDD: monthByEDD
    };
  }, [eddDate, tick]);

  // Prefer explicit currentMonth for display; else estimate from EDD
  const displayMonth = currentMonth || monthFromEDD || 1;
  const babySize = getBabySizeByMonth(displayMonth);

  // ✅ NEW: derive weeks from month (month * 4), then take max with EDD-based weeks
  const weeksFromMonth = Number.isFinite(currentMonth) ? clamp(currentMonth * 4, 0, 40) : null;
  const weeksPregnant =
    weeksPregnantFromEDD != null
      ? Math.max(weeksPregnantFromEDD, weeksFromMonth ?? 0)
      : (weeksFromMonth ?? null);

  return (
    <div className="home-root">
      <Navbar />
      <Sidebar />
      <section className="welcome-card">
        <div className="wc-bg-orb orb-1" />
        <div className="wc-bg-orb orb-2" />

        <div className="wc-head">
          <div className="wc-hello">
            <span className="wc-emoji" role="img" aria-label="sparkles">✨</span>
            <h2 className="wc-title">
              Welcome back, <span className="wc-name">{motherName || "Mama"}</span>
            </h2>
          </div>
          <p className="wc-sub">Here’s a gentle snapshot of your pregnancy journey today.</p>
        </div>

        <div className="wc-grid">
          {/* Current stage */}
          <div className="wc-card">
            <div className="wc-card-title">
              <span className="wc-icon" aria-hidden>📅</span>
              Current Stage
            </div>

            <div className="wc-metric">
              <div className="wc-big">
                Month <span className="accent">{displayMonth}</span>
              </div>
              <div className="wc-small">
                Total weeks since start: <strong>{weeksPregnant ?? "—"}</strong> / 40
              </div>
            </div>

            <div className="wc-progress">
              <div
                className="wc-progress-bar"
                style={{ width: `${((weeksPregnant || 0) / 40) * 100}%` }}
              />
            </div>
            <div className="wc-progress-label">Progress to 40 weeks</div>
          </div>

          {/* EDD & days left */}
          <div className="wc-card">
            <div className="wc-card-title">
              <span className="wc-icon" aria-hidden>⏳</span>
              Estimated Delivery
            </div>
            <div className="wc-metric">
              <div className="wc-big">
                {eddDate ? eddDate.toLocaleDateString() : "EDD not set"}
              </div>
              <div className="wc-small">
                {daysLeft != null
                  ? daysLeft >= 0
                    ? <><strong>{daysLeft}</strong> days left • <strong>{weeksRemaining}</strong> weeks to go</>
                    : <>Past due by <strong>{Math.abs(daysLeft)}</strong> days</>
                  : "—"}
              </div>
            </div>
          </div>

          {/* Baby size (fun) */}
          <div className="wc-card">
            <div className="wc-card-title">
              <span className="wc-icon" aria-hidden>🍼</span>
              Baby’s Size (fun)
            </div>
            <div className="wc-baby">
              <div className="wc-baby-emoji" aria-hidden>{babySize.emoji}</div>
              <div className="wc-baby-text">
                <div className="wc-big">{babySize.label}</div>
                <div className="wc-small">Based on month {displayMonth}</div>
              </div>
            </div>
          </div>
        </div>

        <div className="wc-foot">
          <span>Tip: Keep logging your vitals and symptoms—small changes help us personalize guidance for you 💖</span>
        </div>
      </section>
    </div>
  );
};

export default Homepage;
