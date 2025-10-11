// src/Pages/Homepage/Homepage.jsx
import React, { useEffect, useMemo, useState } from "react";
import "./Homepage.css";

import { initializeApp, getApps } from "firebase/app";
import { getAuth, onAuthStateChanged } from "firebase/auth";
import {
  getFirestore,
  doc,
  onSnapshot,
  runTransaction,
  serverTimestamp,
  collection, // needed for appointments listener
} from "firebase/firestore";
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
const TZ = "Asia/Dhaka";
const MS_PER_DAY = 24 * 60 * 60 * 1000;

function toDateSafe(v) {
  if (!v) return null;
  if (typeof v === "object" && typeof v.toDate === "function") return v.toDate();
  const d = new Date(v);
  return isNaN(d.getTime()) ? null : d;
}
const clamp = (n, min, max) => Math.max(min, Math.min(n, max));

/** Cute baby size by month (1..10) via if/else */
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

/* ---- Daily key helpers (Asia/Dhaka) ---- */
const todayKey = () => {
  const d = new Date();
  const y = new Intl.DateTimeFormat("en-CA", { timeZone: TZ, year: "numeric" }).format(d);
  const m = new Intl.DateTimeFormat("en-CA", { timeZone: TZ, month: "2-digit" }).format(d);
  const day = new Intl.DateTimeFormat("en-CA", { timeZone: TZ, day: "2-digit" }).format(d);
  return `${y}-${m}-${day}`; // 2025-10-09
};
const keysForDate = (dateStr) => ({
  hb: `${dateStr}_mother's_heartbeat`,
  bp: `${dateStr}_mother's_bloodpressure`,
  kc: `${dateStr}_baby's_kickcount`,
  mv: `${dateStr}_baby's_movement`,
});

/* =================== Simple SVG chart =================== */
function LineChart({ title, series, height = 160, padding = 28, yLabel = "" }) {
  // series: [{label, data: [{x: string|number, y: number}], strokeDasharray? }]
  const width = 560;
  const vb = `0 0 ${width} ${height}`;

  const all = series.flatMap(s => s.data);
  const xs = all.map((p, i) => (typeof p.x === "string" ? i : p.x));
  const ys = all.map(p => p.y).filter(Number.isFinite);
  const minY = ys.length ? Math.min(...ys) : 0;
  const maxY = ys.length ? Math.max(...ys) : 1;
  const minX = 0;
  const maxX = Math.max(0, Math.max(...xs, all.length - 1));

  const px = (x) => {
    const innerW = width - padding * 2;
    if (maxX === minX) return padding + innerW / 2;
    return padding + ((x - minX) / (maxX - minX)) * innerW;
  };
  const py = (y) => {
    const innerH = height - padding * 2;
    if (maxY === minY) return padding + innerH / 2;
    return padding + (1 - (y - minY) / (maxY - minY)) * innerH;
  };

  const seriesHas2Plus = series.some(s => s.data.length >= 2);
  const singlePoints = series.flatMap(s => (s.data.length === 1 ? [{ s, p: s.data[0] }] : []));

  const gridY = [];
  for (let i = 0; i <= 4; i++) {
    const gv = minY + ((maxY - minY) * i) / 4;
    gridY.push({ y: py(gv), v: Math.round(gv) });
  }

  return (
    <div className="chart-card">
      {title ? <div className="chart-title">{title}</div> : null}
      <svg viewBox={vb} className="chart-svg">
        {/* Y grid */}
        {gridY.map((g, idx) => (
          <g key={idx}>
            <line x1={padding} x2={width - padding} y1={g.y} y2={g.y} stroke="#e5e7eb" strokeWidth="1" />
            <text x={8} y={g.y + 4} fontSize="10" fill="#6b7280">{g.v}</text>
          </g>
        ))}

        {/* Lines (>= 2 points) */}
        {seriesHas2Plus &&
          series.map((s, i) => {
            if (s.data.length < 2) return null;
            const path = s.data
              .map((p, j) => `${j === 0 ? "M" : "L"} ${px(typeof p.x === "string" ? j : p.x)} ${py(p.y)}`)
              .join(" ");
            return (
              <g key={i}>
                <path d={path} fill="none" stroke={s.color || "#2563eb"} strokeWidth="2" strokeDasharray={s.strokeDasharray} />
                {s.data.map((p, j) => (
                  <circle key={j} cx={px(typeof p.x === "string" ? j : p.x)} cy={py(p.y)} r="3.5" fill={s.color || "#2563eb"} />
                ))}
              </g>
            );
          })}

        {/* Single-point: big dot + value label */}
        {!seriesHas2Plus &&
          singlePoints.map(({ s, p }, idx) => {
            const cx = px(typeof p.x === "string" ? 0 : p.x);
            const cy = py(p.y);
            return (
              <g key={idx}>
                <circle cx={cx} cy={cy} r="6" fill={s.color || "#2563eb"} />
                <text x={cx + 8} y={cy - 8} fontSize="11" fill="#374151">{p.y}</text>
              </g>
            );
          })}

        {/* X labels (dates) */}
        {series[0]?.data?.map((p, i) =>
          typeof p.x === "string" ? (
            <text key={i} x={px(i)} y={height - 6} fontSize="9" textAnchor="middle" fill="#6b7280">
              {p.x.slice(5)}{/* MM-DD */}
            </text>
          ) : null
        )}

        {/* Axes */}
        <line x1={padding} x2={padding} y1={padding} y2={height - padding} stroke="#9ca3af" strokeWidth="1" />
        <line x1={padding} x2={width - padding} y1={height - padding} y2={height - padding} stroke="#9ca3af" strokeWidth="1" />

        {/* y label */}
        {yLabel ? (
          <text transform={`rotate(-90 ${12} ${height / 2})`} x={12} y={height / 2} fontSize="10" fill="#6b7280" textAnchor="middle">
            {yLabel}
          </text>
        ) : null}

        {/* Hint when only one or zero points */}
        {!seriesHas2Plus && (
          <text x={width / 2} y={padding + 12} fontSize="11" fill="#6b7280" textAnchor="middle">
            Log at least 2 days to see a trend line
          </text>
        )}
      </svg>
    </div>
  );
}

/* ---- Appointment helpers (uses same TZ) ---- */
function buildDhakaDate(dateStr, timeStr) {
  // Date: "YYYY-MM-DD", Time: "HH:mm" (24h)
  if (!dateStr || !timeStr) return null;
  const m = dateStr.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  const t = timeStr.match(/^(\d{2}):(\d{2})$/);
  if (!m || !t) return null;
  const y = Number(m[1]), mo = Number(m[2]), d = Number(m[3]);
  const hh = Number(t[1]), mm = Number(t[2]);

  // Dhaka is UTC+6 (no DST). Convert local to UTC for a stable Date object.
  const utcMillis = Date.UTC(y, mo - 1, d, hh - 6, mm);
  return new Date(utcMillis);
}

function timeUntil(target) {
  const now = new Date();
  const diff = target.getTime() - now.getTime();
  if (diff <= 0) return "now";
  const mins = Math.floor(diff / (60 * 1000));
  const dd = Math.floor(mins / (60 * 24));
  const hh = Math.floor((mins % (60 * 24)) / 60);
  const mm = mins % 60;
  if (dd > 0) return `${dd}d ${hh}h ${mm}m`;
  if (hh > 0) return `${hh}h ${mm}m`;
  return `${mm}m`;
}

/* =================== Component =================== */
const Homepage = () => {
  const [email, setEmail] = useState("");
  const [motherName, setMotherName] = useState("");
  const [currentMonth, setCurrentMonth] = useState(null);
  const [eddDate, setEddDate] = useState(null);
  const [tick, setTick] = useState(0);

  // Health track state
  const [healthData, setHealthData] = useState({});
  const [todayLogged, setTodayLogged] = useState({ hb: false, bp: false, kc: false, mv: false });

  // Inputs
  const [heartRate, setHeartRate] = useState("");
  const [bloodPressure, setBloodPressure] = useState(""); // "118/76"
  const [kickCount, setKickCount] = useState("");
  const [movement, setMovement] = useState("normal");
  const [saving, setSaving] = useState({ hb: false, bp: false, kc: false, mv: false });
  const [msg, setMsg] = useState("");

  // Chart slider
  const [chartIndex, setChartIndex] = useState(0);

  // Next appointment state
  const [nextAppt, setNextAppt] = useState(null); // { id, data, start: Date }

  // Auth + realtime listeners
  useEffect(() => {
    let unsubProfile = null;
    let unsubHealth = null;

    const unsubAuth = onAuthStateChanged(auth, (user) => {
      if (unsubProfile) { unsubProfile(); unsubProfile = null; }
      if (unsubHealth) { unsubHealth(); unsubHealth = null; }

      if (!user) {
        setEmail(""); setMotherName(""); setCurrentMonth(null); setEddDate(null);
        setHealthData({});
        setTodayLogged({ hb: false, bp: false, kc: false, mv: false });
        return;
      }

      const mail = (user.email || "").trim();
      setEmail(mail);

      // Profile snapshot
      const profileRef = doc(db, "Users", mail, "Profile", "profile");
      unsubProfile = onSnapshot(
        profileRef,
        (snap) => {
          const data = snap.exists() ? (snap.data() || {}) : {};
          const name = (data.motherName ?? user.displayName ?? mail)?.toString().trim();
          setMotherName(name);

          const cm = typeof data.currentMonth === "string" ? parseInt(data.currentMonth, 10) : data.currentMonth;
          setCurrentMonth(Number.isFinite(cm) ? cm : null);

          const eddVal = data.edd ?? data["edd."] ?? data.EDD;
          setEddDate(toDateSafe(eddVal));
        },
        (err) => console.error("Profile listener error:", err)
      );

      // Health track snapshot
      const htRef = doc(db, "Users", mail, "Health_Track", "health_track");
      unsubHealth = onSnapshot(
        htRef,
        (snap) => {
          const data = snap.exists() ? snap.data() : {};
          setHealthData(data);

          const dkey = todayKey();
          const { hb, bp, kc, mv } = keysForDate(dkey);
          setTodayLogged({
            hb: data[hb] != null,
            bp: data[bp] != null,
            kc: data[kc] != null,
            mv: data[mv] != null,
          });
        },
        (err) => console.error("Health_Track listener error:", err)
      );
    });

    return () => { unsubAuth && unsubAuth(); unsubProfile && unsubProfile(); };
  }, []);

  // Recompute countdown every minute
  useEffect(() => {
    const id = setInterval(() => setTick((t) => t + 1), 60 * 1000);
    return () => clearInterval(id);
  }, []);

  // Keyboard arrows for slider
  useEffect(() => {
    const onKey = (e) => {
      if (e.key === "ArrowLeft") setChartIndex(i => (i - 1 + 4) % 4);
      if (e.key === "ArrowRight") setChartIndex(i => (i + 1) % 4);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  // Derived values based on EDD  (FIXED: removed stray 'thead')
  const { daysLeft, weeksRemaining, weeksPregnantFromEDD, monthFromEDD } = useMemo(() => {
    if (!eddDate) {
      return { daysLeft: null, weeksRemaining: null, weeksPregnantFromEDD: null, monthFromEDD: null };
    }
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const edd0 = new Date(eddDate.getFullYear(), eddDate.getMonth(), eddDate.getDate());

    const diffDays = Math.ceil((edd0.getTime() - today.getTime()) / MS_PER_DAY);
    const weeksRem = Math.ceil(diffDays / 7);
    const weeksPreg = clamp(40 - weeksRem, 0, 40);
    const monthByEDD = clamp(Math.ceil(weeksPreg / 4), 1, 10);

    return { daysLeft: diffDays, weeksRemaining: weeksRem, weeksPregnantFromEDD: weeksPreg, monthFromEDD: monthByEDD };
  }, [eddDate, tick]);

  const displayMonth = currentMonth || monthFromEDD || 1;
  const babySize = getBabySizeByMonth(displayMonth);

  const weeksFromMonth = Number.isFinite(currentMonth) ? clamp(currentMonth * 4, 0, 40) : null;
  const weeksPregnant =
    weeksPregnantFromEDD != null
      ? Math.max(weeksPregnantFromEDD, weeksFromMonth ?? 0)
      : (weeksFromMonth ?? null);

  /* ------------------ Save handlers (one per metric) ------------------ */
  const ensureAuthedPath = () => {
    if (!email) throw new Error("User not signed in");
    return doc(db, "Users", email, "Health_Track", "health_track");
  };

  const saveOncePerDay = async (fieldName, value) => {
    const ref = ensureAuthedPath();
    await runTransaction(db, async (tx) => {
      const snap = await tx.get(ref);
      const data = snap.exists() ? snap.data() : {};
      if (data[fieldName] != null) throw new Error("Already logged for today.");
      const updates = { [fieldName]: value, lastUpdated: serverTimestamp() };
      if (snap.exists()) tx.update(ref, updates);
      else tx.set(ref, updates);
    });
  };

  const onSaveHeartRate = async () => {
    const dkey = todayKey();
    const { hb } = keysForDate(dkey);
    const n = Number(heartRate);
    if (!Number.isFinite(n) || n < 40 || n > 220) {
      setMsg("Enter a valid heart rate between 40 and 220.");
      return;
    }
    try {
      setSaving(s => ({ ...s, hb: true }));
      await saveOncePerDay(hb, n);
      setMsg("Heart rate saved for today ✅");
      setHeartRate("");
    } catch (e) {
      setMsg(e.message || "Could not save heart rate.");
    } finally {
      setSaving(s => ({ ...s, hb: false }));
    }
  };

  const onSaveBloodPressure = async () => {
    const dkey = todayKey();
    const { bp } = keysForDate(dkey);
    const m = String(bloodPressure).trim();
    const match = m.match(/^\s*(\d{2,3})\s*\/\s*(\d{2,3})\s*$/);
    if (!match) {
      setMsg("Enter BP like 118/76.");
      return;
    }
    const sys = Number(match[1]), dia = Number(match[2]);
    if (sys < 70 || sys > 230 || dia < 40 || dia > 140) {
      setMsg("Enter a reasonable BP (e.g., 90–200 / 50–120).");
      return;
    }
    try {
      setSaving(s => ({ ...s, bp: true }));
      await saveOncePerDay(bp, `${sys}/${dia}`);
      setMsg("Blood pressure saved for today ✅");
      setBloodPressure("");
    } catch (e) {
      setMsg(e.message || "Could not save blood pressure.");
    } finally {
      setSaving(s => ({ ...s, bp: false }));
    }
  };

  const onSaveKickCount = async () => {
    const dkey = todayKey();
    const { kc } = keysForDate(dkey);
    const n = Number(kickCount);
    if (!Number.isInteger(n) || n < 0 || n > 300) {
      setMsg("Enter a valid kick count (0–300).");
      return;
    }
    try {
      setSaving(s => ({ ...s, kc: true }));
      await saveOncePerDay(kc, n);
      setMsg("Kick count saved for today ✅");
      setKickCount("");
    } catch (e) {
      setMsg(e.message || "Could not save kick count.");
    } finally {
      setSaving(s => ({ ...s, kc: false }));
    }
  };

  const onSaveMovement = async () => {
    const dkey = todayKey();
    const { mv } = keysForDate(dkey);
    const val = String(movement || "normal");
    try {
      setSaving(s => ({ ...s, mv: true }));
      await saveOncePerDay(mv, val);
      setMsg("Baby movement saved for today ✅");
    } catch (e) {
      setMsg(e.message || "Could not save movement.");
    } finally {
      setSaving(s => ({ ...s, mv: false }));
    }
  };

  /* ------------------ Transform data for charts ------------------ */
  const chartData = useMemo(() => {
    const hb = [], kc = [], bpSys = [], bpDia = [], mv = [];
    const mapMv = (s) => s === "low" ? 1 : s === "active" ? 3 : 2;

    const entries = [];
    Object.keys(healthData || {}).forEach((k) => {
      if (k === "lastUpdated" || k === "latestDateKey" || k === "timezone") return;
      const datePart = k.slice(0, 10);
      if (!/\d{4}-\d{2}-\d{2}/.test(datePart)) return;

      if (k.endsWith("_mother's_heartbeat")) {
        entries.push({ date: datePart, type: "hb", value: Number(healthData[k]) });
      } else if (k.endsWith("_baby's_kickcount")) {
        entries.push({ date: datePart, type: "kc", value: Number(healthData[k]) });
      } else if (k.endsWith("_mother's_bloodpressure")) {
        const str = String(healthData[k] || "");
        const m = str.match(/^(\d{2,3})\/(\d{2,3})$/);
        if (m) entries.push({ date: datePart, type: "bp", sys: Number(m[1]), dia: Number(m[2]) });
      } else if (k.endsWith("_baby's_movement")) {
        const s = String(healthData[k] || "normal").toLowerCase();
        entries.push({ date: datePart, type: "mv", score: mapMv(s) });
      }
    });

    const dates = Array.from(new Set(entries.map(e => e.date))).sort();
    dates.forEach((d) => {
      const byDate = entries.filter(e => e.date === d);
      const eHB = byDate.find(e => e.type === "hb");
      const eKC = byDate.find(e => e.type === "kc");
      const eBP = byDate.find(e => e.type === "bp");
      const eMV = byDate.find(e => e.type === "mv");

      if (eHB) hb.push({ x: d, y: eHB.value });
      if (eKC) kc.push({ x: d, y: eKC.value });
      if (eBP) { bpSys.push({ x: d, y: eBP.sys }); bpDia.push({ x: d, y: eBP.dia }); }
      if (eMV) mv.push({ x: d, y: eMV.score });
    });

    return { hb, kc, bpSys, bpDia, mv };
  }, [healthData]);

  const chartsMeta = useMemo(() => ([
    { key: "hr", title: "Heart Rate (bpm)", yLabel: "bpm", series: [{ label: "HR", data: chartData.hb }] },
    { key: "bp", title: "Blood Pressure (mmHg)", yLabel: "mmHg", series: [
      { label: "Systolic", data: chartData.bpSys },
      { label: "Diastolic", data: chartData.bpDia, strokeDasharray: "4 3" },
    ]},
    { key: "kc", title: "Kick Count", yLabel: "kicks", series: [{ label: "Kicks", data: chartData.kc }] },
    { key: "mv", title: "Movement (1=Low, 2=Normal, 3=Active)", yLabel: "lvl", series: [{ label: "Movement", data: chartData.mv }] },
  ]), [chartData]);

  const nextChart = () => setChartIndex((i) => (i + 1) % chartsMeta.length);
  const prevChart = () => setChartIndex((i) => (i - 1 + chartsMeta.length) % chartsMeta.length);

  /* ------------------ Next Appointment listener ------------------ */
  useEffect(() => {
    if (!email) {
      setNextAppt(null);
      return;
    }
    const colRef = collection(db, "Users", email, "Appointments");
    const unsub = onSnapshot(
      colRef,
      (snap) => {
        const upcoming = [];
        snap.forEach((d) => {
          const data = d.data() || {};
          const start = buildDhakaDate(String(data.Date || ""), String(data.Time || ""));
          if (start && start.getTime() >= Date.now()) {
            upcoming.push({ id: d.id, data, start });
          }
        });
        upcoming.sort((a, b) => a.start.getTime() - b.start.getTime());
        setNextAppt(upcoming[0] || null);
      },
      (err) => {
        console.error("Appointments listener error:", err);
        setNextAppt(null);
      }
    );
    return () => unsub && unsub();
  }, [email]);

  return (
    <div className="home-root">
      <Navbar />
      <Sidebar />

      {/* ===================== Welcome Card ===================== */}
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
            <div className="wc-card-title"><span className="wc-icon" aria-hidden>📅</span>Current Stage</div>
            <div className="wc-metric">
              <div className="wc-big">Month <span className="accent">{displayMonth}</span></div>
              <div className="wc-small">Total weeks since start: <strong>{weeksPregnant ?? "—"}</strong> / 40</div>
            </div>
            <div className="wc-progress"><div className="wc-progress-bar" style={{ width: `${((weeksPregnant || 0) / 40) * 100}%` }} /></div>
            <div className="wc-progress-label">Progress to 40 weeks</div>
          </div>

          {/* EDD & days left */}
          <div className="wc-card">
            <div className="wc-card-title"><span className="wc-icon" aria-hidden>⏳</span>Estimated Delivery</div>
            <div className="wc-metric">
              <div className="wc-big">{eddDate ? eddDate.toLocaleDateString() : "EDD not set"}</div>
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
            <div className="wc-card-title"><span className="wc-icon" aria-hidden>🍼</span>Baby’s Size (fun)</div>
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

      {/* ===================== Next Appointment Card ===================== */}
      
<section className="appt-card">
  <div className="appt-head">
    <div className="appt-title">
      <span className="wc-icon" aria-hidden="true">📅</span> Next Appointment
    </div>
    {nextAppt ? (
      <div className="appt-countdown">in {timeUntil(nextAppt.start)}</div>
    ) : (
      <div className="appt-countdown none">No upcoming appointment</div>
    )}
  </div>

  {nextAppt ? (
    <div className="appt-body">
      <div className="appt-left">
        {nextAppt.data.Image ? (
          <img
            className="appt-avatar"
            src={nextAppt.data.Image}
            alt={nextAppt.data.Name || "Doctor"}
          />
        ) : (
          <div className="appt-avatar appt-placeholder">👩‍⚕️</div>
        )}
      </div>
      <div className="appt-right">
        <div className="appt-name">{nextAppt.data.Name || "Doctor"}</div>
        {nextAppt.data.Qualifications && (
          <div className="appt-qual">{nextAppt.data.Qualifications}</div>
        )}
        {nextAppt.data.Hospital && (
          <div className="appt-info-row">
            <span className="appt-info-icon">🏥</span>
            <span>{nextAppt.data.Hospital}</span>
          </div>
        )}
        <div className="appt-info-row">
          <span className="appt-info-icon">📅</span>
          <span>{nextAppt.data.Date}</span>
        </div>
        <div className="appt-info-row">
          <span className="appt-info-icon">🕒</span>
          <span>{nextAppt.data.Time} <span className="tz">({TZ})</span></span>
        </div>
      </div>
    </div>
  ) : (
    <div className="appt-empty">
      You don't have any future appointments. Book one from the Appointments page.
    </div>
  )}
</section>

      {/* ===================== Health Track Card ===================== */}
      {/* (left EXACTLY as you wrote it) */}
      <section className="health-card">
        {/* Background orbs matching welcome card */}
        <div className="hc-bg-orb"></div>
        <div className="hc-bg-orb orb-2"></div>

        <div className="hc-header">
          <div className="hc-hello">
            <span className="hc-emoji" aria-hidden>❤️</span>
            <h2 className="hc-title">Daily Health Track</h2>
          </div>
          <div className="hc-sub">Log once per day • Timezone: Asia/Dhaka</div>
        </div>

        <div className="hc-grid">
          {/* Heart Rate */}
          <div className={`hc-tile ${saving.hb ? "is-saving" : ""} ${todayLogged.hb ? "is-logged" : ""}`}>
            <div className="hc-tile-header">
              <span className="hc-icon">💗</span>
              <div className="hc-label">Heart Rate</div>
            </div>
            
            <div className="hc-input-wrap">
              <input
                type="number" min="40" max="220" step="1"
                value={heartRate} 
                onChange={(e) => setHeartRate(e.target.value)}
                className="hc-input" 
                placeholder="e.g., 82"
                disabled={!email || todayLogged.hb || saving.hb}
              />
              <span className="hc-unit">bpm</span>
            </div>

            <button 
              className={`hc-btn ${todayLogged.hb ? "logged" : ""}`} 
              onClick={onSaveHeartRate}
              disabled={!email || todayLogged.hb || saving.hb}
            >
              {todayLogged.hb ? "Logged ✓" : saving.hb ? "Saving..." : "Save"}
            </button>
            
            <div className="hc-help">Valid range: 40–220 bpm</div>
          </div>

          {/* Blood Pressure */}
          <div className={`hc-tile ${saving.bp ? "is-saving" : ""} ${todayLogged.bp ? "is-logged" : ""}`}>
            <div className="hc-tile-header">
              <span className="hc-icon">🩺</span>
              <div className="hc-label">Blood Pressure</div>
            </div>
            
            <div className="hc-input-wrap">
              <input
                type="text" 
                value={bloodPressure} 
                onChange={(e) => setBloodPressure(e.target.value)}
                className="hc-input" 
                placeholder="118/76"
                disabled={!email || todayLogged.bp || saving.bp}
              />
              <span className="hc-unit">mmHg</span>
            </div>

            <button 
              className={`hc-btn ${todayLogged.bp ? "logged" : ""}`} 
              onClick={onSaveBloodPressure}
              disabled={!email || todayLogged.bp || saving.bp}
            >
              {todayLogged.bp ? "Logged ✓" : saving.bp ? "Saving..." : "Save"}
            </button>
            
            <div className="hc-help">Format: systolic/diastolic</div>
          </div>

          {/* Kick Count */}
          <div className={`hc-tile ${saving.kc ? "is-saving" : ""} ${todayLogged.kc ? "is-logged" : ""}`}>
            <div className="hc-tile-header">
              <span className="hc-icon">👶</span>
              <div className="hc-label">Kick Count</div>
            </div>
            
            <div className="hc-input-wrap">
              <input
                type="number" min="0" max="300" step="1"
                value={kickCount} 
                onChange={(e) => setKickCount(e.target.value)}
                className="hc-input" 
                placeholder="e.g., 12"
                disabled={!email || todayLogged.kc || saving.kc}
              />
              <span className="hc-unit">kicks</span>
            </div>

            <button 
              className={`hc-btn ${todayLogged.kc ? "logged" : ""}`} 
              onClick={onSaveKickCount}
              disabled={!email || todayLogged.kc || saving.kc}
            >
              {todayLogged.kc ? "Logged ✓" : saving.kc ? "Saving..." : "Save"}
            </button>
            
            <div className="hc-help">Count today's movements (0–300)</div>
          </div>

          {/* Movement */}
          <div className={`hc-tile ${saving.mv ? "is-saving" : ""} ${todayLogged.mv ? "is-logged" : ""}`}>
            <div className="hc-tile-header">
              <span className="hc-icon">⚡</span>
              <div className="hc-label">Movement Level</div>
            </div>
            
            <div className="hc-select-wrap">
              <select
                className="hc-input" 
                value={movement} 
                onChange={(e) => setMovement(e.target.value)}
                disabled={!email || todayLogged.mv || saving.mv}
              >
                <option value="low">Low</option>
                <option value="normal">Normal</option>
                <option value="active">Active</option>
              </select>
            </div>

            <button 
              className={`hc-btn ${todayLogged.mv ? "logged" : ""}`} 
              onClick={onSaveMovement}
              disabled={!email || todayLogged.mv || saving.mv}
            >
              {todayLogged.mv ? "Logged ✓" : saving.mv ? "Saving..." : "Save"}
            </button>
            
            <div className="hc-help">Choose activity level</div>
          </div>
        </div>

        {msg && <div className="hc-msg">{msg}</div>}

        {/* Charts Slider */}
        <div className="hc-charts">
          <div className="hc-charts-header">
            <button className="hc-nav-btn" onClick={prevChart} aria-label="Previous chart">‹</button>
            <div className="hc-chart-title">{chartsMeta[chartIndex]?.title}</div>
            <button className="hc-nav-btn" onClick={() => setChartIndex((chartIndex + 1) % chartsMeta.length)} aria-label="Next chart">›</button>
          </div>

          <div className="hc-chart-body">
            <LineChart
              title=""
              yLabel={chartsMeta[chartIndex]?.yLabel}
              series={chartsMeta[chartIndex]?.series || []}
            />
          </div>

          <div className="hc-dots" role="tablist" aria-label="Select chart">
            {chartsMeta.map((c, i) => (
              <button
                key={c.key}
                role="tab"
                aria-selected={i === chartIndex}
                className={`hc-dot ${i === chartIndex ? "active" : ""}`}
                onClick={() => setChartIndex(i)}
                title={c.title}
              />
            ))}
          </div>
        </div>
      </section>
    </div>
  );
};

export default Homepage;
