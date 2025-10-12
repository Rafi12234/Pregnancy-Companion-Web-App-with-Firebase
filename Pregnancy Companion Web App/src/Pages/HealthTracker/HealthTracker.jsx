// src/Pages/HealthTracker/HealthTracker.jsx
import React, { useEffect, useMemo, useState } from "react";
import "./HealthTracker.css";

import { initializeApp, getApps } from "firebase/app";
import { getAuth, onAuthStateChanged } from "firebase/auth";
import {
  getFirestore,
  doc,
  onSnapshot,
  runTransaction,
  serverTimestamp,
} from "firebase/firestore";
import Navbar from "../Navbar/Navbar";
import Sidebar from "../Sidebar/Sidebar";


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
const TZ = "Asia/Dhaka";
const clamp = (n, lo, hi) => Math.max(lo, Math.min(n, hi));

/** Local date keys (Asia/Dhaka) */
function todayKey() {
  const d = new Date();
  const y = new Intl.DateTimeFormat("en-CA", { timeZone: TZ, year: "numeric" }).format(d);
  const m = new Intl.DateTimeFormat("en-CA", { timeZone: TZ, month: "2-digit" }).format(d);
  const day = new Intl.DateTimeFormat("en-CA", { timeZone: TZ, day: "2-digit" }).format(d);
  return `${y}-${m}-${day}`;
}
function weekKeyDhaka(d = new Date()) {
  const fmt = (opt) => new Intl.DateTimeFormat("en-CA", { timeZone: TZ, ...opt }).format(d);
  const y = Number(fmt({ year: "numeric" }));
  const m = Number(fmt({ month: "2-digit" }));
  const day = Number(fmt({ day: "2-digit" }));
  const dt = new Date(Date.UTC(y, m - 1, day));
  const wkThu = new Date(dt);
  wkThu.setUTCDate(dt.getUTCDate() + 4 - (dt.getUTCDay() || 7));
  const yearStart = new Date(Date.UTC(wkThu.getUTCFullYear(), 0, 1));
  const week = Math.ceil((((wkThu - yearStart) / 86400000) + 1) / 7);
  const ww = String(week).padStart(2, "0");
  return `${wkThu.getUTCFullYear()}-W${ww}`;
}
function monthKey(d = new Date()) {
  const y = new Intl.DateTimeFormat("en-CA", { timeZone: TZ, year: "numeric" }).format(d);
  const m = new Intl.DateTimeFormat("en-CA", { timeZone: TZ, month: "2-digit" }).format(d);
  return `${y}-${m}`;
}

/** Today's 4 DAILY keys (exact names used by Homepage) */
function todayDailyKeys() {
  const d = todayKey();
  return {
    hb: `${d}_mother's_heartbeat`,
    bp: `${d}_mother's_bloodpressure`,
    kc: `${d}_baby's_kickcount`,
    mv: `${d}_baby's_movement`,
  };
}

/** Enhanced SVG LineChart with gradient fills */
function LineChart({ title, series, height = 200, padding = 40, yLabel = "" }) {
  const width = 700;
  const vb = `0 0 ${width} ${height}`;

  const all = series.flatMap(s => s.data || []);
  const ys = all.map(p => p.y).filter(Number.isFinite);
  const minY = ys.length ? Math.min(...ys) : 0;
  const maxY = ys.length ? Math.max(...ys) : 1;

  const px = (x, i, len) => {
    const innerW = width - padding * 2;
    const xi = typeof x === "number" ? x : i;
    const maxX = typeof x === "number" ? Math.max(...(series[0]?.data || []).map(p => p.x)) : Math.max(1, len - 1);
    return padding + (maxX === 0 ? 0 : (xi / maxX) * innerW);
  };
  const py = (y) => {
    const innerH = height - padding * 2;
    if (maxY === minY) return padding + innerH / 2;
    return padding + (1 - (y - minY) / (maxY - minY)) * innerH;
  };

  const has2 = series.some(s => (s.data || []).length >= 2);
  const gridY = [];
  for (let i = 0; i <= 4; i++) {
    const gv = minY + ((maxY - minY) * i) / 4;
    gridY.push({ y: py(gv), v: Math.round(gv) });
  }

  return (
    <div className="chart-container">
      {title ? <div className="chart-header">{title}</div> : null}
      <svg viewBox={vb} className="chart-svg">
        <defs>
          <linearGradient id="grad1" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#FF9ECD" stopOpacity="0.3"/>
            <stop offset="100%" stopColor="#FF9ECD" stopOpacity="0.05"/>
          </linearGradient>
          <linearGradient id="grad2" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#A78BFA" stopOpacity="0.3"/>
            <stop offset="100%" stopColor="#A78BFA" stopOpacity="0.05"/>
          </linearGradient>
          <filter id="shadow">
            <feDropShadow dx="0" dy="2" stdDeviation="3" floodOpacity="0.15"/>
          </filter>
        </defs>

        {/* Grid */}
        {gridY.map((g, idx) => (
          <g key={idx}>
            <line x1={padding} x2={width - padding} y1={g.y} y2={g.y} stroke="#F0E7FF" strokeWidth="1" strokeDasharray="4 4"/>
            <text x={padding - 8} y={g.y + 4} fontSize="11" fill="#9CA3AF" textAnchor="end">{g.v}</text>
          </g>
        ))}

        {/* Axes */}
        <line x1={padding} x2={padding} y1={padding} y2={height - padding} stroke="#D1D5DB" strokeWidth="2"/>
        <line x1={padding} x2={width - padding} y1={height - padding} y2={height - padding} stroke="#D1D5DB" strokeWidth="2"/>
        
        {yLabel ? (
          <text transform={`rotate(-90 ${16} ${height / 2})`} x={16} y={height / 2} fontSize="12" fill="#6B7280" textAnchor="middle" fontWeight="500">
            {yLabel}
          </text>
        ) : null}

        {/* Series */}
        {series.map((s, si) => {
          const data = s.data || [];
          if (data.length === 0) return null;
          const gradId = si === 0 ? "grad1" : "grad2";
          const color = s.color || (si === 0 ? "#FF6B9D" : "#A78BFA");

          if (has2 && data.length >= 2) {
            const pathD = data
              .map((p, i) => `${i === 0 ? "M" : "L"} ${px(p.x, i, data.length)} ${py(p.y)}`)
              .join(" ");
            
            const areaD = `${pathD} L ${px(data[data.length-1].x, data.length-1, data.length)} ${height - padding} L ${padding} ${height - padding} Z`;

            return (
              <g key={si}>
                <path d={areaD} fill={`url(#${gradId})`} opacity="0.8"/>
                <path d={pathD} fill="none" stroke={color} strokeWidth="3" strokeDasharray={s.dash} filter="url(#shadow)"/>
                {data.map((p, i) => (
                  <g key={i}>
                    <circle cx={px(p.x, i, data.length)} cy={py(p.y)} r="6" fill="white" stroke={color} strokeWidth="2.5"/>
                    <circle cx={px(p.x, i, data.length)} cy={py(p.y)} r="3" fill={color}/>
                  </g>
                ))}
              </g>
            );
          }

          // Single point
          const p = data[0];
          return (
            <g key={si}>
              <circle cx={px(p.x, 0, 1)} cy={py(p.y)} r="8" fill="white" stroke={color} strokeWidth="2.5"/>
              <circle cx={px(p.x, 0, 1)} cy={py(p.y)} r="5" fill={color}/>
              <text x={px(p.x, 0, 1) + 14} y={py(p.y) - 12} fontSize="13" fill="#374151" fontWeight="600">{p.y}</text>
              <text x={width / 2} y={padding + 20} fontSize="12" fill="#9CA3AF" textAnchor="middle" fontStyle="italic">
                Log at least 2 entries to see trend
              </text>
            </g>
          );
        })}

        {/* X labels */}
        {(series[0]?.data || []).map((p, i, arr) =>
          typeof p.x === "string" ? (
            <text key={i} x={px(p.x, i, arr.length)} y={height - 8} fontSize="10" textAnchor="middle" fill="#6B7280" fontWeight="500">
              {(p.x.length === 10 ? p.x.slice(5) : p.x)}
            </text>
          ) : null
        )}
      </svg>
    </div>
  );
}

/* =================== Component =================== */
const HealthTracker = () => {
  const [email, setEmail] = useState("");
  const [healthData, setHealthData] = useState({});

  const [tab, setTab] = useState("mother");
  const [subTab, setSubTab] = useState("daily");
  const [msg, setMsg] = useState("");

  const [already, setAlready] = useState({ hb:false, bp:false, kc:false, mv:false });

  const [mHeartRate, setMHeartRate] = useState("");
  const [mBloodPressure, setMBloodPressure] = useState("");
  const [mSymptoms, setMSymptoms] = useState([]);
  const [mMoodScore, setMMoodScore] = useState(3);
  const [mSleepHours, setMSleepHours] = useState("");
  const [mHydration, setMHydration] = useState("");
  const [mSteps, setMSteps] = useState("");
  const [mNotes, setMNotes] = useState("");

  const [bKickCount, setBKickCount] = useState("");
  const [bMovement, setBMovement] = useState("normal");
  const [bContractions, setBContractions] = useState([]);
  const [contracting, setContracting] = useState(null);

  const [mwWeightKg, setMwWeightKg] = useState("");
  const [mwExercise, setMwExercise] = useState("");
  const [mwPrenatal, setMwPrenatal] = useState(false);
  const [mwIron, setMwIron] = useState(false);
  const [mwCalcium, setMwCalcium] = useState(false);
  const [mwReflection, setMwReflection] = useState("");

  const [mmFundal, setMmFundal] = useState("");
  const [mmHb, setMmHb] = useState("");
  const [mmUrineProtein, setMmUrineProtein] = useState("");
  const [mmFbs, setMmFbs] = useState("");
  const [mmTsh, setMmTsh] = useState("");
  const [mmVacTT, setMmVacTT] = useState("");
  const [mmVacFlu, setMmVacFlu] = useState("");
  const [mmAdvice, setMmAdvice] = useState("");

  const [bmBpd, setBmBpd] = useState("");
  const [bmHc, setBmHc] = useState("");
  const [bmAc, setBmAc] = useState("");
  const [bmFl, setBmFl] = useState("");
  const [bmEfw, setBmEfw] = useState("");
  const [bmPlacenta, setBmPlacenta] = useState("");
  const [bmAfi, setBmAfi] = useState("");
  const [bmPresentation, setBmPresentation] = useState("unknown");

  const symptomOpts = ["nausea","vomiting","headache","swelling","dizziness","cramps","back pain","acid reflux","spotting","none"];
  const moodEmojis = ["😢", "😟", "😐", "😊", "😄"];

  useEffect(() => {
    let unsubAuth = null, unsubDoc = null;
    unsubAuth = onAuthStateChanged(auth, (user) => {
      if (unsubDoc) { unsubDoc(); unsubDoc = null; }
      if (!user) { setEmail(""); setHealthData({}); return; }
      const mail = (user.email || "").trim();
      setEmail(mail);
      const ref = doc(db, "Users", mail, "Health_Track", "health_track");
      unsubDoc = onSnapshot(ref, (snap) => {
        setHealthData(snap.exists() ? (snap.data() || {}) : {});
      }, (err) => console.error("Health_Track snapshot error:", err));
    });
    return () => { unsubAuth && unsubAuth(); unsubDoc && unsubDoc(); };
  }, []);

  useEffect(() => {
    const { hb, bp, kc, mv } = todayDailyKeys();
    setAlready({
      hb: healthData && healthData[hb] != null,
      bp: healthData && healthData[bp] != null,
      kc: healthData && healthData[kc] != null,
      mv: healthData && healthData[mv] != null,
    });
  }, [healthData]);

  const ensurePath = () => {
    if (!email) throw new Error("Sign in required");
    return doc(db, "Users", email, "Health_Track", "health_track");
  };
  
  async function saveOnce(fieldName, value) {
    const ref = ensurePath();
    await runTransaction(db, async (tx) => {
      const snap = await tx.get(ref);
      const data = snap.exists() ? snap.data() : {};
      if (data[fieldName] !== undefined && data[fieldName] !== null) {
        throw new Error("Already logged for this period.");
      }
      const updates = { [fieldName]: value, lastUpdated: serverTimestamp() };
      if (snap.exists()) tx.update(ref, updates);
      else tx.set(ref, updates);
    });
  }

  const saveMotherDaily = async (kind) => {
    try {
      setMsg("");
      const K = todayDailyKeys();

      if (kind === "hr") {
        if (already.hb) throw new Error("Already logged for today.");
        const n = Number(mHeartRate);
        if (!Number.isFinite(n) || n < 40 || n > 220) throw new Error("Enter heart rate 40–220.");
        await saveOnce(K.hb, n);
        setMHeartRate("");
      }

      if (kind === "bp") {
        if (already.bp) throw new Error("Already logged for today.");
        const s = String(mBloodPressure).trim();
        const m = s.match(/^\s*(\d{2,3})\s*\/\s*(\d{2,3})\s*$/);
        if (!m) throw new Error("Enter BP like 118/76.");
        const sys = Number(m[1]), dia = Number(m[2]);
        if (sys < 70 || sys > 230 || dia < 40 || dia > 140) throw new Error("Unusual BP; try again.");
        await saveOnce(K.bp, `${sys}/${dia}`);
        setMBloodPressure("");
      }

      if (kind === "sym") {
        const dkey = todayKey();
        await saveOnce(`${dkey}_mother_symptoms`, mSymptoms);
        setMSymptoms([]);
      }
      if (kind === "mood") {
        const dkey = todayKey();
        await saveOnce(`${dkey}_mother_moodScore`, clamp(Number(mMoodScore), 1, 5));
      }
      if (kind === "sleep") {
        const dkey = todayKey();
        const h = Number(mSleepHours);
        if (!Number.isFinite(h) || h < 0 || h > 14) throw new Error("Enter sleep 0–14 h.");
        await saveOnce(`${dkey}_mother_sleepHours`, h);
        setMSleepHours("");
      }
      if (kind === "hydr") {
        const dkey = todayKey();
        const g = Number(mHydration);
        if (!Number.isFinite(g) || g < 0 || g > 20) throw new Error("Enter glasses 0–20.");
        await saveOnce(`${dkey}_mother_hydrationGlasses`, g);
        setMHydration("");
      }
      if (kind === "steps") {
        const dkey = todayKey();
        const st = Number(mSteps);
        if (!Number.isFinite(st) || st < 0 || st > 100000) throw new Error("Enter steps 0–100000.");
        await saveOnce(`${dkey}_mother_steps`, st);
        setMSteps("");
      }
      if (kind === "notes") {
        const dkey = todayKey();
        await saveOnce(`${dkey}_mother_notes`, String(mNotes || ""));
        setMNotes("");
      }

      setMsg("✨ Saved successfully!");
      setTimeout(() => setMsg(""), 3000);
    } catch (e) {
      setMsg("⚠️ " + (e.message || "Could not save."));
      setTimeout(() => setMsg(""), 4000);
    }
  };

  const saveBabyDaily = async (kind) => {
    try {
      setMsg("");
      const K = todayDailyKeys();

      if (kind === "kick") {
        if (already.kc) throw new Error("Already logged for today.");
        const n = Number(bKickCount);
        if (!Number.isInteger(n) || n < 0 || n > 300) throw new Error("Kick count 0–300.");
        await saveOnce(K.kc, n);
        setBKickCount("");
      }

      if (kind === "move") {
        if (already.mv) throw new Error("Already logged for today.");
        await saveOnce(K.mv, bMovement);
      }

      if (kind === "contractions") {
        const dkey = todayKey();
        await saveOnce(`${dkey}_baby_contractions`, bContractions);
        setBContractions([]);
        setContracting(null);
      }

      setMsg("✨ Saved successfully!");
      setTimeout(() => setMsg(""), 3000);
    } catch (e) {
      setMsg("⚠️ " + (e.message || "Could not save."));
      setTimeout(() => setMsg(""), 4000);
    }
  };

  const saveMotherWeekly = async (kind) => {
    try {
      setMsg("");
      const wkey = weekKeyDhaka();

      if (kind === "weight") {
        const kg = Number(mwWeightKg);
        if (!Number.isFinite(kg) || kg < 30 || kg > 200) throw new Error("Enter weight 30–200 kg.");
        await saveOnce(`${wkey}_mother_weightKg`, Number(kg.toFixed(1)));
        setMwWeightKg("");
      }
      if (kind === "exercise") {
        const n = Number(mwExercise);
        if (!Number.isFinite(n) || n < 0 || n > 2000) throw new Error("Minutes 0–2000.");
        await saveOnce(`${wkey}_mother_exerciseMinutes`, n);
        setMwExercise("");
      }
      if (kind === "adherence") {
        await saveOnce(`${wkey}_mother_prenatalvitamin`, !!mwPrenatal);
        await saveOnce(`${wkey}_mother_iron`, !!mwIron);
        await saveOnce(`${wkey}_mother_calcium`, !!mwCalcium);
      }
      if (kind === "reflection") {
        await saveOnce(`${wkey}_mother_weeklyReflection`, String(mwReflection || ""));
        setMwReflection("");
      }

      setMsg("✨ Saved successfully!");
      setTimeout(() => setMsg(""), 3000);
    } catch (e) {
      setMsg("⚠️ " + (e.message || "Could not save."));
      setTimeout(() => setMsg(""), 4000);
    }
  };

  const saveMotherMonthly = async (kind) => {
    try {
      setMsg("");
      const mkey = monthKey();

      if (kind === "fundal") {
        const n = Number(mmFundal);
        if (!Number.isFinite(n) || n < 0 || n > 60) throw new Error("Fundal height (cm) 0–60.");
        await saveOnce(`${mkey}_mother_fundalHeightCm`, n);
        setMmFundal("");
      }
      if (kind === "labs") {
        if (mmHb) await saveOnce(`${mkey}_mother_lab_hb`, Number(mmHb));
        if (mmUrineProtein) await saveOnce(`${mkey}_mother_lab_urineProtein`, String(mmUrineProtein));
        if (mmFbs) await saveOnce(`${mkey}_mother_lab_fbs`, Number(mmFbs));
        if (mmTsh) await saveOnce(`${mkey}_mother_lab_tsh`, Number(mmTsh));
        setMmHb(""); setMmUrineProtein(""); setMmFbs(""); setMmTsh("");
      }
      if (kind === "vaccines") {
        if (mmVacTT) await saveOnce(`${mkey}_mother_vaccine_TT`, String(mmVacTT));
        if (mmVacFlu) await saveOnce(`${mkey}_mother_vaccine_flu`, String(mmVacFlu));
        setMmVacTT(""); setMmVacFlu("");
      }
      if (kind === "advice") {
        await saveOnce(`${mkey}_mother_doctorAdvice`, String(mmAdvice || ""));
        setMmAdvice("");
      }

      setMsg("✨ Saved successfully!");
      setTimeout(() => setMsg(""), 3000);
    } catch (e) {
      setMsg("⚠️ " + (e.message || "Could not save."));
      setTimeout(() => setMsg(""), 4000);
    }
  };

  const saveBabyMonthly = async () => {
    try {
      setMsg("");
      const mkey = monthKey();
      const toNum = (v) => (v === "" ? null : Number(v));

      if (bmBpd !== "") await saveOnce(`${mkey}_baby_usg_bpd`, toNum(bmBpd));
      if (bmHc !== "") await saveOnce(`${mkey}_baby_usg_hc`, toNum(bmHc));
      if (bmAc !== "") await saveOnce(`${mkey}_baby_usg_ac`, toNum(bmAc));
      if (bmFl !== "") await saveOnce(`${mkey}_baby_usg_fl`, toNum(bmFl));
      if (bmEfw !== "") await saveOnce(`${mkey}_baby_usg_efw`, toNum(bmEfw));
      if (bmPlacenta) await saveOnce(`${mkey}_baby_placentaPosition`, String(bmPlacenta));
      if (bmAfi !== "") await saveOnce(`${mkey}_baby_afi`, toNum(bmAfi));
      if (bmPresentation) await saveOnce(`${mkey}_baby_presentation`, String(bmPresentation));

      setBmBpd(""); setBmHc(""); setBmAc(""); setBmFl(""); setBmEfw("");
      setBmPlacenta(""); setBmAfi(""); setBmPresentation("unknown");

      setMsg("✨ Saved successfully!");
      setTimeout(() => setMsg(""), 3000);
    } catch (e) {
      setMsg("⚠️ " + (e.message || "Could not save."));
      setTimeout(() => setMsg(""), 4000);
    }
  };

  const startContraction = () => { if (!contracting) setContracting(Date.now()); };
  const stopContraction = () => {
    if (!contracting) return;
    const end = Date.now();
    const duration = Math.round((end - contracting) / 1000);
    setBContractions(prev => [...prev, { start: contracting, end, duration }]);
    setContracting(null);
  };

  const charts = useMemo(() => {
    const dailyKeys = Object.keys(healthData || {}).filter(k => /^\d{4}-\d{2}-\d{2}_/.test(k)).sort();
    const weeklyKeys = Object.keys(healthData || {}).filter(k => /^\d{4}-W\d{2}_/.test(k)).sort();
    const monthlyKeys = Object.keys(healthData || {}).filter(k => /^\d{4}-\d{2}_/.test(k)).sort();

    const motherHR = [];
    const bpSys = [], bpDia = [];
    const motherWTweekly = [];
    const babyKick = [], babyMove = [];
    const fundal = [];
    const efw = [];

    const mapMove = (s) => s === "low" ? 1 : s === "active" ? 3 : 2;

    dailyKeys.forEach(k => {
      const date = k.slice(0, 10);
      if (k.endsWith(`_mother's_heartbeat`)) motherHR.push({ x: date, y: Number(healthData[k]) });
      else if (k.endsWith(`_mother's_bloodpressure`)) {
        const m = String(healthData[k] || "").match(/^(\d{2,3})\/(\d{2,3})$/);
        if (m) { bpSys.push({ x: date, y: Number(m[1]) }); bpDia.push({ x: date, y: Number(m[2]) }); }
      } else if (k.endsWith(`_baby's_kickcount`)) babyKick.push({ x: date, y: Number(healthData[k]) });
      else if (k.endsWith(`_baby's_movement`)) babyMove.push({ x: date, y: mapMove(String(healthData[k])) });
    });

    weeklyKeys.forEach(k => {
      const wk = k.slice(0, 8);
      if (k.endsWith(`_mother_weightKg`)) motherWTweekly.push({ x: wk, y: Number(healthData[k]) });
    });

    monthlyKeys.forEach(k => {
      const mk = k.slice(0, 7);
      if (k.endsWith(`_mother_fundalHeightCm`)) fundal.push({ x: mk, y: Number(healthData[k]) });
      if (k.endsWith(`_baby_usg_efw`)) efw.push({ x: mk, y: Number(healthData[k]) });
    });

    return { motherHR, bpSys, bpDia, motherWTweekly, babyKick, babyMove, fundal, efw };
  }, [healthData]);

  const SymptomChip = ({ label }) => {
    const active = mSymptoms.includes(label);
    return (
      <button
        type="button"
        className={`symptom-chip ${active ? "active" : ""}`}
        onClick={() => setMSymptoms(prev => active ? prev.filter(x => x !== label) : [...prev, label])}
      >
        {label}
      </button>
    );
  };

  return (
    
    <div className="main">
        <Navbar />
        <Sidebar />
        <div className="ht-wrapper">
      <div className="ht-background-gradient"></div>
      
      <div className="ht-container">
        <header className="ht-header">
          <div className="header-content">
            <h1 className="main-title">Health Tracker</h1>
            
            <p className="subtitle">Monitor your journey with care and confidence</p>
          </div>
          
          <div className="primary-tabs">
            <button 
              className={`primary-tab ${tab === "mother" ? "active" : ""}`} 
              onClick={() => setTab("mother")}
            >
              <span className="tab-icon">👩</span>
              <span className="tab-label">Mother</span>
            </button>
            <button 
              className={`primary-tab ${tab === "baby" ? "active" : ""}`} 
              onClick={() => setTab("baby")}
            >
              <span className="tab-icon">👶</span>
              <span className="tab-label">Baby</span>
            </button>
          </div>
        </header>

        <div className="secondary-tabs">
          <button 
            className={`secondary-tab ${subTab === "daily" ? "active" : ""}`} 
            onClick={() => setSubTab("daily")}
          >
            <span className="tab-icon-sm">📅</span>
            Daily
          </button>
          <button 
            className={`secondary-tab ${subTab === "weekly" ? "active" : ""}`} 
            onClick={() => setSubTab("weekly")}
          >
            <span className="tab-icon-sm">📊</span>
            Weekly
          </button>
          <button 
            className={`secondary-tab ${subTab === "monthly" ? "active" : ""}`} 
            onClick={() => setSubTab("monthly")}
          >
            <span className="tab-icon-sm">📈</span>
            Monthly
          </button>
        </div>

        {msg && (
          <div className={`notification ${msg.includes("⚠️") ? "error" : "success"}`}>
            {msg}
          </div>
        )}

        {/* Mother - Daily */}
        {tab === "mother" && subTab === "daily" && (
          <div className="content-grid">
            <div className="card vitals-card">
              <div className="card-header">
                <div className="card-icon heart">❤️</div>
                <div>
                  <h3 className="card-title">Heart Rate</h3>
                  <p className="card-subtitle">Beats per minute</p>
                </div>
              </div>
              <div className="card-body">
                <div className="input-group">
                  <input
                    type="number"
                    className="modern-input"
                    placeholder="e.g., 82"
                    value={mHeartRate}
                    onChange={e => setMHeartRate(e.target.value)}
                    disabled={already.hb}
                  />
                  <button 
                    className={`modern-btn ${already.hb ? "disabled" : "primary"}`}
                    onClick={() => saveMotherDaily("hr")} 
                    disabled={already.hb}
                  >
                    {already.hb ? "✓ Logged" : "Save"}
                  </button>
                </div>
                <LineChart title="Heart Rate Trend" yLabel="bpm" series={[{ label: "HR", data: charts.motherHR }]} />
              </div>
            </div>

            <div className="card vitals-card">
              <div className="card-header">
                <div className="card-icon pressure">🩺</div>
                <div>
                  <h3 className="card-title">Blood Pressure</h3>
                  <p className="card-subtitle">Systolic / Diastolic</p>
                </div>
              </div>
              <div className="card-body">
                <div className="input-group">
                  <input
                    type="text"
                    className="modern-input"
                    placeholder="118/76"
                    value={mBloodPressure}
                    onChange={e => setMBloodPressure(e.target.value)}
                    disabled={already.bp}
                  />
                  <button 
                    className={`modern-btn ${already.bp ? "disabled" : "primary"}`}
                    onClick={() => saveMotherDaily("bp")} 
                    disabled={already.bp}
                  >
                    {already.bp ? "✓ Logged" : "Save"}
                  </button>
                </div>
                <LineChart
                  title="Blood Pressure Trend"
                  yLabel="mmHg"
                  series={[
                    { label: "Systolic", data: charts.bpSys },
                    { label: "Diastolic", data: charts.bpDia, dash: "4 3", color: "#A78BFA" },
                  ]}
                />
              </div>
            </div>

            <div className="card">
              <div className="card-header">
                <div className="card-icon symptoms">🏥</div>
                <div>
                  <h3 className="card-title">Symptoms</h3>
                  <p className="card-subtitle">Track how you're feeling</p>
                </div>
              </div>
              <div className="card-body">
                <div className="symptoms-grid">
                  {symptomOpts.map(s => <SymptomChip key={s} label={s} />)}
                </div>
                <button className="modern-btn primary full-width" onClick={() => saveMotherDaily("sym")}>
                  Save Symptoms
                </button>
              </div>
            </div>

            <div className="card">
              <div className="card-header">
                <div className="card-icon mood">😊</div>
                <div>
                  <h3 className="card-title">Mood & Stress</h3>
                  <p className="card-subtitle">How are you feeling today?</p>
                </div>
              </div>
              <div className="card-body">
                <div className="mood-slider">
                  <div className="mood-emojis">
                    {moodEmojis.map((emoji, idx) => (
                      <span 
                        key={idx} 
                        className={`mood-emoji ${mMoodScore == idx + 1 ? "active" : ""}`}
                      >
                        {emoji}
                      </span>
                    ))}
                  </div>
                  <input 
                    type="range" 
                    min="1" 
                    max="5" 
                    value={mMoodScore} 
                    onChange={e => setMMoodScore(e.target.value)}
                    className="mood-range"
                  />
                  <div className="mood-labels">
                    <span>Very Low</span>
                    <span>Excellent</span>
                  </div>
                </div>
                <button className="modern-btn primary full-width" onClick={() => saveMotherDaily("mood")}>
                  Save Mood
                </button>
              </div>
            </div>

            <div className="card">
              <div className="card-header">
                <div className="card-icon sleep">😴</div>
                <div>
                  <h3 className="card-title">Sleep</h3>
                  <p className="card-subtitle">Hours of rest</p>
                </div>
              </div>
              <div className="card-body">
                <div className="input-group">
                  <input 
                    type="number" 
                    step="0.1" 
                    className="modern-input"
                    placeholder="e.g., 7.5" 
                    value={mSleepHours} 
                    onChange={e => setMSleepHours(e.target.value)} 
                  />
                  <button className="modern-btn primary" onClick={() => saveMotherDaily("sleep")}>
                    Save
                  </button>
                </div>
              </div>
            </div>

            <div className="card">
              <div className="card-header">
                <div className="card-icon hydration">💧</div>
                <div>
                  <h3 className="card-title">Hydration</h3>
                  <p className="card-subtitle">Glasses of water</p>
                </div>
              </div>
              <div className="card-body">
                <div className="input-group">
                  <input 
                    type="number" 
                    className="modern-input"
                    placeholder="e.g., 8" 
                    value={mHydration} 
                    onChange={e => setMHydration(e.target.value)} 
                  />
                  <button className="modern-btn primary" onClick={() => saveMotherDaily("hydr")}>
                    Save
                  </button>
                </div>
              </div>
            </div>

            <div className="card">
              <div className="card-header">
                <div className="card-icon steps">👟</div>
                <div>
                  <h3 className="card-title">Activity</h3>
                  <p className="card-subtitle">Daily steps</p>
                </div>
              </div>
              <div className="card-body">
                <div className="input-group">
                  <input 
                    type="number" 
                    className="modern-input"
                    placeholder="e.g., 6500" 
                    value={mSteps} 
                    onChange={e => setMSteps(e.target.value)} 
                  />
                  <button className="modern-btn primary" onClick={() => saveMotherDaily("steps")}>
                    Save
                  </button>
                </div>
              </div>
            </div>

            <div className="card full-width">
              <div className="card-header">
                <div className="card-icon notes">📝</div>
                <div>
                  <h3 className="card-title">Daily Notes</h3>
                  <p className="card-subtitle">Anything to remember?</p>
                </div>
              </div>
              <div className="card-body">
                <textarea 
                  rows="4" 
                  className="modern-textarea"
                  value={mNotes} 
                  onChange={e => setMNotes(e.target.value)} 
                  placeholder="Write about your day, how you're feeling, or anything important..."
                />
                <button className="modern-btn primary" onClick={() => saveMotherDaily("notes")}>
                  Save Notes
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Mother - Weekly */}
        {tab === "mother" && subTab === "weekly" && (
          <div className="content-grid">
            <div className="card">
              <div className="card-header">
                <div className="card-icon weight">⚖️</div>
                <div>
                  <h3 className="card-title">Weight This Week</h3>
                  <p className="card-subtitle">Track your progress</p>
                </div>
              </div>
              <div className="card-body">
                <div className="input-group">
                  <input
                    type="number"
                    step="0.1"
                    className="modern-input"
                    placeholder="e.g., 65.2 kg"
                    value={mwWeightKg}
                    onChange={e => setMwWeightKg(e.target.value)}
                  />
                  <button className="modern-btn primary" onClick={() => saveMotherWeekly("weight")}>
                    Save
                  </button>
                </div>
                <LineChart title="Weekly Weight Trend" yLabel="kg" series={[{ label: "Weight", data: charts.motherWTweekly }]} />
              </div>
            </div>

            <div className="card">
              <div className="card-header">
                <div className="card-icon exercise">🏃‍♀️</div>
                <div>
                  <h3 className="card-title">Exercise</h3>
                  <p className="card-subtitle">Total minutes this week</p>
                </div>
              </div>
              <div className="card-body">
                <div className="input-group">
                  <input 
                    type="number" 
                    className="modern-input"
                    placeholder="e.g., 140" 
                    value={mwExercise} 
                    onChange={e => setMwExercise(e.target.value)} 
                  />
                  <button className="modern-btn primary" onClick={() => saveMotherWeekly("exercise")}>
                    Save
                  </button>
                </div>
              </div>
            </div>

            <div className="card">
              <div className="card-header">
                <div className="card-icon supplements">💊</div>
                <div>
                  <h3 className="card-title">Supplement Adherence</h3>
                  <p className="card-subtitle">Weekly vitamins & minerals</p>
                </div>
              </div>
              <div className="card-body">
                <div className="toggle-list">
                  <label className="toggle-item">
                    <input 
                      type="checkbox" 
                      checked={mwPrenatal} 
                      onChange={e => setMwPrenatal(e.target.checked)} 
                    />
                    <span className="toggle-checkmark"></span>
                    <span className="toggle-label">Prenatal Vitamin</span>
                  </label>
                  <label className="toggle-item">
                    <input 
                      type="checkbox" 
                      checked={mwIron} 
                      onChange={e => setMwIron(e.target.checked)} 
                    />
                    <span className="toggle-checkmark"></span>
                    <span className="toggle-label">Iron Supplement</span>
                  </label>
                  <label className="toggle-item">
                    <input 
                      type="checkbox" 
                      checked={mwCalcium} 
                      onChange={e => setMwCalcium(e.target.checked)} 
                    />
                    <span className="toggle-checkmark"></span>
                    <span className="toggle-label">Calcium Supplement</span>
                  </label>
                </div>
                <button className="modern-btn primary full-width" onClick={() => saveMotherWeekly("adherence")}>
                  Save Adherence
                </button>
              </div>
            </div>

            <div className="card full-width">
              <div className="card-header">
                <div className="card-icon reflection">✨</div>
                <div>
                  <h3 className="card-title">Weekly Reflection</h3>
                  <p className="card-subtitle">How did you feel this week?</p>
                </div>
              </div>
              <div className="card-body">
                <textarea 
                  rows="5" 
                  className="modern-textarea"
                  value={mwReflection} 
                  onChange={e => setMwReflection(e.target.value)} 
                  placeholder="Reflect on your week: achievements, challenges, feelings..."
                />
                <button className="modern-btn primary" onClick={() => saveMotherWeekly("reflection")}>
                  Save Reflection
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Mother - Monthly */}
        {tab === "mother" && subTab === "monthly" && (
          <div className="content-grid">
            <div className="card">
              <div className="card-header">
                <div className="card-icon fundal">📏</div>
                <div>
                  <h3 className="card-title">Fundal Height</h3>
                  <p className="card-subtitle">Measurement in cm</p>
                </div>
              </div>
              <div className="card-body">
                <div className="input-group">
                  <input 
                    type="number" 
                    className="modern-input"
                    placeholder="e.g., 30" 
                    value={mmFundal} 
                    onChange={e => setMmFundal(e.target.value)} 
                  />
                  <button className="modern-btn primary" onClick={() => saveMotherMonthly("fundal")}>
                    Save
                  </button>
                </div>
                <LineChart title="Fundal Height Progress" yLabel="cm" series={[{ label: "Fundal", data: charts.fundal }]} />
              </div>
            </div>

            <div className="card">
              <div className="card-header">
                <div className="card-icon labs">🔬</div>
                <div>
                  <h3 className="card-title">Lab Results</h3>
                  <p className="card-subtitle">Monthly test results</p>
                </div>
              </div>
              <div className="card-body">
                <div className="form-grid">
                  <div className="form-field">
                    <label className="field-label">Hemoglobin (g/dL)</label>
                    <input 
                      type="number" 
                      step="0.1" 
                      className="modern-input"
                      value={mmHb} 
                      onChange={e => setMmHb(e.target.value)} 
                    />
                  </div>
                  <div className="form-field">
                    <label className="field-label">Urine Protein</label>
                    <input 
                      type="text" 
                      className="modern-input"
                      value={mmUrineProtein} 
                      onChange={e => setMmUrineProtein(e.target.value)} 
                      placeholder="trace / + / ++" 
                    />
                  </div>
                  <div className="form-field">
                    <label className="field-label">FBS (mg/dL)</label>
                    <input 
                      type="number" 
                      className="modern-input"
                      value={mmFbs} 
                      onChange={e => setMmFbs(e.target.value)} 
                    />
                  </div>
                  <div className="form-field">
                    <label className="field-label">TSH</label>
                    <input 
                      type="number" 
                      step="0.01" 
                      className="modern-input"
                      value={mmTsh} 
                      onChange={e => setMmTsh(e.target.value)} 
                    />
                  </div>
                </div>
                <button className="modern-btn primary full-width" onClick={() => saveMotherMonthly("labs")}>
                  Save Lab Results
                </button>
              </div>
            </div>

            <div className="card">
              <div className="card-header">
                <div className="card-icon vaccine">💉</div>
                <div>
                  <h3 className="card-title">Vaccinations</h3>
                  <p className="card-subtitle">Immunization records</p>
                </div>
              </div>
              <div className="card-body">
                <div className="form-grid">
                  <div className="form-field">
                    <label className="field-label">TT Vaccine Date</label>
                    <input 
                      type="date" 
                      className="modern-input"
                      value={mmVacTT} 
                      onChange={e => setMmVacTT(e.target.value)} 
                    />
                  </div>
                  <div className="form-field">
                    <label className="field-label">Flu Vaccine Date</label>
                    <input 
                      type="date" 
                      className="modern-input"
                      value={mmVacFlu} 
                      onChange={e => setMmVacFlu(e.target.value)} 
                    />
                  </div>
                </div>
                <button className="modern-btn primary full-width" onClick={() => saveMotherMonthly("vaccines")}>
                  Save Vaccination Records
                </button>
              </div>
            </div>

            <div className="card full-width">
              <div className="card-header">
                <div className="card-icon advice">👨‍⚕️</div>
                <div>
                  <h3 className="card-title">Doctor's Advice</h3>
                  <p className="card-subtitle">Summary from your appointment</p>
                </div>
              </div>
              <div className="card-body">
                <textarea 
                  rows="5" 
                  className="modern-textarea"
                  value={mmAdvice} 
                  onChange={e => setMmAdvice(e.target.value)} 
                  placeholder="Record important advice and recommendations from your healthcare provider..."
                />
                <button className="modern-btn primary" onClick={() => saveMotherMonthly("advice")}>
                  Save Advice
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Baby - Daily */}
        {tab === "baby" && subTab === "daily" && (
          <div className="content-grid">
            <div className="card">
              <div className="card-header">
                <div className="card-icon kicks">🦶</div>
                <div>
                  <h3 className="card-title">Kick Count</h3>
                  <p className="card-subtitle">Baby's movements</p>
                </div>
              </div>
              <div className="card-body">
                <div className="input-group">
                  <input
                    type="number"
                    className="modern-input"
                    placeholder="e.g., 14"
                    value={bKickCount}
                    onChange={e => setBKickCount(e.target.value)}
                    disabled={already.kc}
                  />
                  <button 
                    className={`modern-btn ${already.kc ? "disabled" : "primary"}`}
                    onClick={() => saveBabyDaily("kick")} 
                    disabled={already.kc}
                  >
                    {already.kc ? "✓ Logged" : "Save"}
                  </button>
                </div>
                <LineChart title="Daily Kick Trend" yLabel="kicks" series={[{ label: "Kicks", data: charts.babyKick }]} />
              </div>
            </div>

            <div className="card">
              <div className="card-header">
                <div className="card-icon movement">🤸</div>
                <div>
                  <h3 className="card-title">Movement Level</h3>
                  <p className="card-subtitle">Activity intensity</p>
                </div>
              </div>
              <div className="card-body">
                <div className="input-group">
                  <select 
                    className="modern-select"
                    value={bMovement} 
                    onChange={e => setBMovement(e.target.value)} 
                    disabled={already.mv}
                  >
                    <option value="low">Low Activity</option>
                    <option value="normal">Normal Activity</option>
                    <option value="active">Very Active</option>
                  </select>
                  <button 
                    className={`modern-btn ${already.mv ? "disabled" : "primary"}`}
                    onClick={() => saveBabyDaily("move")} 
                    disabled={already.mv}
                  >
                    {already.mv ? "✓ Logged" : "Save"}
                  </button>
                </div>
                <LineChart 
                  title="Movement Pattern" 
                  yLabel="level" 
                  series={[{ label: "Activity", data: charts.babyMove }]} 
                />
              </div>
            </div>

            <div className="card full-width">
              <div className="card-header">
                <div className="card-icon contractions">⏱️</div>
                <div>
                  <h3 className="card-title">Contraction Timer</h3>
                  <p className="card-subtitle">Track contractions (3rd trimester)</p>
                </div>
              </div>
              <div className="card-body">
                <div className="contraction-controls">
                  <button 
                    className={`modern-btn ${contracting ? "disabled" : "success"}`}
                    onClick={startContraction} 
                    disabled={!!contracting}
                  >
                    {contracting ? "⏺ Recording..." : "▶ Start"}
                  </button>
                  <button 
                    className={`modern-btn ${!contracting ? "disabled" : "danger"}`}
                    onClick={stopContraction} 
                    disabled={!contracting}
                  >
                    ⏹ Stop
                  </button>
                  <button 
                    className="modern-btn secondary" 
                    onClick={() => setBContractions([])}
                  >
                    🔄 Reset
                  </button>
                  <button 
                    className="modern-btn primary" 
                    onClick={() => saveBabyDaily("contractions")}
                  >
                    💾 Save Session
                  </button>
                </div>
                <div className="contraction-list">
                  {bContractions.length === 0 ? (
                    <div className="empty-state">
                      <p>No contractions recorded yet</p>
                      <span className="empty-icon">⏱️</span>
                    </div>
                  ) : (
                    bContractions.map((c, i) => (
                      <div key={i} className="contraction-item">
                        <span className="contraction-number">#{i + 1}</span>
                        <span className="contraction-duration">
                          {Math.floor(c.duration / 60)}m {c.duration % 60}s
                        </span>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Baby - Weekly */}
        {tab === "baby" && subTab === "weekly" && (
          <div className="content-grid">
            <div className="card">
              <div className="card-header">
                <div className="card-icon">🍊</div>
                <div>
                  <h3 className="card-title">Baby Size Comparison</h3>
                  <p className="card-subtitle">Auto-calculated from gestational week</p>
                </div>
              </div>
              <div className="card-body">
                <div className="info-box">
                  <p>Size comparison is automatically derived from your gestational week.</p>
                  <p className="hint-text">Optional: Store weekly snapshots as <code>{weekKeyDhaka()}_baby_sizeLabel</code></p>
                </div>
              </div>
            </div>

            <div className="card">
              <div className="card-header">
                <div className="card-icon">👶</div>
                <div>
                  <h3 className="card-title">Hiccups Noted</h3>
                  <p className="card-subtitle">Optional tracking</p>
                </div>
              </div>
              <div className="card-body">
                <div className="info-box">
                  <p>Track if your baby has hiccups this week.</p>
                  <p className="hint-text">Store as <code>{weekKeyDhaka()}_baby_hiccups</code> = true/false</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Baby - Monthly */}
        {tab === "baby" && subTab === "monthly" && (
          <div className="content-grid">
            <div className="card full-width">
              <div className="card-header">
                <div className="card-icon ultrasound">🔊</div>
                <div>
                  <h3 className="card-title">Ultrasound Measurements</h3>
                  <p className="card-subtitle">Monthly scan results</p>
                </div>
              </div>
              <div className="card-body">
                <div className="form-grid">
                  <div className="form-field">
                    <label className="field-label">BPD (mm)</label>
                    <input 
                      type="number" 
                      className="modern-input"
                      value={bmBpd} 
                      onChange={e => setBmBpd(e.target.value)} 
                      placeholder="Biparietal diameter"
                    />
                  </div>
                  <div className="form-field">
                    <label className="field-label">HC (mm)</label>
                    <input 
                      type="number" 
                      className="modern-input"
                      value={bmHc} 
                      onChange={e => setBmHc(e.target.value)} 
                      placeholder="Head circumference"
                    />
                  </div>
                  <div className="form-field">
                    <label className="field-label">AC (mm)</label>
                    <input 
                      type="number" 
                      className="modern-input"
                      value={bmAc} 
                      onChange={e => setBmAc(e.target.value)} 
                      placeholder="Abdominal circumference"
                    />
                  </div>
                  <div className="form-field">
                    <label className="field-label">FL (mm)</label>
                    <input 
                      type="number" 
                      className="modern-input"
                      value={bmFl} 
                      onChange={e => setBmFl(e.target.value)} 
                      placeholder="Femur length"
                    />
                  </div>
                  <div className="form-field">
                    <label className="field-label">EFW (g)</label>
                    <input 
                      type="number" 
                      className="modern-input"
                      value={bmEfw} 
                      onChange={e => setBmEfw(e.target.value)} 
                      placeholder="Estimated fetal weight"
                    />
                  </div>
                </div>
                <button className="modern-btn primary full-width" onClick={saveBabyMonthly}>
                  Save Ultrasound Data
                </button>
                <LineChart title="Estimated Fetal Weight" yLabel="grams" series={[{ label: "EFW", data: charts.efw }]} />
              </div>
            </div>

            <div className="card">
              <div className="card-header">
                <div className="card-icon placenta">🏥</div>
                <div>
                  <h3 className="card-title">Placenta & Position</h3>
                  <p className="card-subtitle">Additional scan details</p>
                </div>
              </div>
              <div className="card-body">
                <div className="form-grid">
                  <div className="form-field">
                    <label className="field-label">Placenta Position</label>
                    <input 
                      type="text" 
                      className="modern-input"
                      value={bmPlacenta} 
                      onChange={e => setBmPlacenta(e.target.value)} 
                      placeholder="anterior / posterior..."
                    />
                  </div>
                  <div className="form-field">
                    <label className="field-label">AFI (cm)</label>
                    <input 
                      type="number" 
                      step="0.1" 
                      className="modern-input"
                      value={bmAfi} 
                      onChange={e => setBmAfi(e.target.value)} 
                      placeholder="Amniotic fluid index"
                    />
                  </div>
                  <div className="form-field">
                    <label className="field-label">Presentation</label>
                    <select 
                      className="modern-select"
                      value={bmPresentation} 
                      onChange={e => setBmPresentation(e.target.value)}
                    >
                      <option value="cephalic">Cephalic (Head down)</option>
                      <option value="breech">Breech</option>
                      <option value="transverse">Transverse</option>
                      <option value="unknown">Unknown</option>
                    </select>
                  </div>
                </div>
                <button className="modern-btn primary full-width" onClick={saveBabyMonthly}>
                  Save Position Data
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
    </div>
  );
};

export default HealthTracker;