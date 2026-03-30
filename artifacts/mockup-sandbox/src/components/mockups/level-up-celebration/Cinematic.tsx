import { useEffect, useState } from "react";
import "./tokens.css";

const LEVEL_NAMES = ["Beginner", "Developing", "Experienced", "Skilled", "Advanced", "Pro", "League", "Expert", "Master", "Icon"];
const LEVEL_THRESHOLDS = [0, 300, 800, 1600, 2500, 5000, 10000, 20000, 40000, 80000];
const LEVEL_COLORS: Record<number, string> = {
  1: "#8B7355", 2: "#6B9E6B", 3: "#4A90A4", 4: "#7B68EE",
  5: "#E8952D", 6: "#E84040", 7: "#00BFFF", 8: "#FF69B4",
  9: "#C0C0C0", 10: "#FFD700",
};

const DEMO_LEVEL = 5;
const DEMO_XP = 2512;
const DEMO_LEVEL_NAME = LEVEL_NAMES[DEMO_LEVEL - 1];
const DEMO_COLOR = LEVEL_COLORS[DEMO_LEVEL];
const DEMO_NEXT = LEVEL_THRESHOLDS[DEMO_LEVEL] ?? LEVEL_THRESHOLDS[LEVEL_THRESHOLDS.length - 1];
const DEMO_CURR_THRESH = LEVEL_THRESHOLDS[DEMO_LEVEL - 1];

interface Particle {
  id: number; x: number; y: number; color: string;
  rotation: number; size: number; delay: number; duration: number; shape: "rect" | "circle";
}

function makeParticles(n: number): Particle[] {
  const colors = ["#FFD700", "#FFA500", "#FFFFFF", "#C8F7C5", "#A8E6CF", "#FFD3B6", "#FF8B94"];
  return Array.from({ length: n }, (_, i) => ({
    id: i,
    x: Math.random() * 100,
    y: -10 - Math.random() * 20,
    color: colors[Math.floor(Math.random() * colors.length)],
    rotation: Math.random() * 360,
    size: 5 + Math.random() * 8,
    delay: Math.random() * 1.5,
    duration: 2.5 + Math.random() * 2,
    shape: Math.random() > 0.5 ? "rect" : "circle",
  }));
}

export function Cinematic() {
  const [phase, setPhase] = useState<"burst" | "reveal" | "done">("burst");
  const [particles] = useState(() => makeParticles(60));
  const [counter, setCounter] = useState(DEMO_CURR_THRESH);

  useEffect(() => {
    const t1 = setTimeout(() => setPhase("reveal"), 400);
    return () => clearTimeout(t1);
  }, []);

  useEffect(() => {
    if (phase !== "reveal") return;
    const start = DEMO_CURR_THRESH;
    const end = DEMO_XP;
    const duration = 1200;
    const startTime = Date.now();
    const tick = () => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setCounter(Math.floor(start + (end - start) * eased));
      if (progress < 1) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  }, [phase]);

  const prog = Math.min((DEMO_XP - DEMO_CURR_THRESH) / (DEMO_NEXT - DEMO_CURR_THRESH), 1);

  return (
    <div className="cinematic-root">
      <style>{`
        .cinematic-root {
          width: 390px; height: 844px; background: #060F08;
          display: flex; flex-direction: column; align-items: center;
          justify-content: center; overflow: hidden; position: relative;
          font-family: 'Inter', sans-serif;
        }
        .confetti-particle {
          position: absolute; pointer-events: none;
          animation: fall var(--dur)s var(--delay)s ease-in both;
        }
        @keyframes fall {
          0%   { transform: translateY(var(--start-y)) translateX(0) rotate(0deg); opacity: 1; }
          80%  { opacity: 1; }
          100% { transform: translateY(920px) translateX(calc(var(--drift) * 1px)) rotate(var(--rot)); opacity: 0; }
        }
        .bg-rays {
          position: absolute; inset: 0; pointer-events: none;
          background: conic-gradient(from 0deg at 50% 42%,
            transparent 0deg, rgba(${DEMO_COLOR === '#FFD700' ? '255,215,0' : '232,149,45'},0.07) 15deg,
            transparent 30deg, rgba(${DEMO_COLOR === '#FFD700' ? '255,215,0' : '232,149,45'},0.05) 45deg,
            transparent 60deg, rgba(${DEMO_COLOR === '#FFD700' ? '255,215,0' : '232,149,45'},0.07) 75deg,
            transparent 90deg, rgba(${DEMO_COLOR === '#FFD700' ? '255,215,0' : '232,149,45'},0.05) 105deg,
            transparent 120deg, rgba(${DEMO_COLOR === '#FFD700' ? '255,215,0' : '232,149,45'},0.07) 135deg,
            transparent 150deg, rgba(${DEMO_COLOR === '#FFD700' ? '255,215,0' : '232,149,45'},0.05) 165deg,
            transparent 180deg, rgba(${DEMO_COLOR === '#FFD700' ? '255,215,0' : '232,149,45'},0.07) 195deg,
            transparent 210deg, rgba(${DEMO_COLOR === '#FFD700' ? '255,215,0' : '232,149,45'},0.05) 225deg,
            transparent 240deg, rgba(${DEMO_COLOR === '#FFD700' ? '255,215,0' : '232,149,45'},0.07) 255deg,
            transparent 270deg, rgba(${DEMO_COLOR === '#FFD700' ? '255,215,0' : '232,149,45'},0.05) 285deg,
            transparent 300deg, rgba(${DEMO_COLOR === '#FFD700' ? '255,215,0' : '232,149,45'},0.07) 315deg,
            transparent 330deg, rgba(${DEMO_COLOR === '#FFD700' ? '255,215,0' : '232,149,45'},0.05) 345deg,
            transparent 360deg
          );
        }
        .burst-ring {
          position: absolute; border-radius: 50%;
          animation: burst-expand 0.6s ease-out forwards;
          pointer-events: none;
        }
        @keyframes burst-expand {
          0%   { transform: scale(0); opacity: 0.9; }
          100% { transform: scale(8); opacity: 0; }
        }
        .content {
          position: relative; z-index: 10;
          display: flex; flex-direction: column; align-items: center;
          animation: fade-up 0.5s 0.3s ease-out both;
        }
        @keyframes fade-up {
          from { opacity: 0; transform: translateY(20px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        .level-reached {
          font-size: 11px; letter-spacing: 5px; font-weight: 600;
          color: rgba(255,255,255,0.5); text-transform: uppercase; margin-bottom: 8px;
        }
        .level-badge {
          width: 160px; height: 160px; border-radius: 50%;
          border: 3px solid ${DEMO_COLOR};
          display: flex; flex-direction: column;
          align-items: center; justify-content: center;
          box-shadow: 0 0 40px ${DEMO_COLOR}55, 0 0 80px ${DEMO_COLOR}22, inset 0 0 30px ${DEMO_COLOR}11;
          margin-bottom: 28px; position: relative;
          background: radial-gradient(circle at center, ${DEMO_COLOR}15 0%, transparent 70%);
        }
        .level-num {
          font-size: 64px; font-weight: 900; color: ${DEMO_COLOR};
          line-height: 1; letter-spacing: -2px;
          text-shadow: 0 0 20px ${DEMO_COLOR}99;
        }
        .level-word {
          font-size: 9px; letter-spacing: 3px; font-weight: 700;
          color: ${DEMO_COLOR}; text-transform: uppercase; opacity: 0.8;
        }
        .level-name {
          font-size: 36px; font-weight: 800; color: #fff; letter-spacing: -1px;
          margin-bottom: 6px; text-align: center;
        }
        .level-sub {
          font-size: 13px; color: rgba(255,255,255,0.4); letter-spacing: 3px;
          text-transform: uppercase; margin-bottom: 32px;
        }
        .xp-block {
          background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.08);
          border-radius: 16px; padding: 16px 28px; width: 300px;
          display: flex; flex-direction: column; gap: 10px; margin-bottom: 36px;
        }
        .xp-row {
          display: flex; justify-content: space-between; align-items: center;
        }
        .xp-label { font-size: 11px; color: rgba(255,255,255,0.4); text-transform: uppercase; letter-spacing: 2px; }
        .xp-value { font-size: 24px; font-weight: 800; color: #fff; }
        .xp-suffix { font-size: 12px; color: rgba(255,255,255,0.4); margin-left: 2px; }
        .bar-wrap {
          height: 4px; background: rgba(255,255,255,0.08); border-radius: 4px; overflow: hidden;
        }
        .bar-fill {
          height: 100%; border-radius: 4px; background: ${DEMO_COLOR};
          box-shadow: 0 0 8px ${DEMO_COLOR}88;
          transition: width 1.2s cubic-bezier(0.22, 1, 0.36, 1);
          width: ${phase === "reveal" ? prog * 100 : 0}%;
        }
        .bar-labels {
          display: flex; justify-content: space-between;
          font-size: 10px; color: rgba(255,255,255,0.3);
        }
        .continue-btn {
          width: 300px; height: 52px; border-radius: 26px;
          background: ${DEMO_COLOR}; border: none; cursor: pointer;
          font-size: 15px; font-weight: 700; letter-spacing: 1px;
          color: #060F08; text-transform: uppercase;
          box-shadow: 0 4px 24px ${DEMO_COLOR}44;
          transition: transform 0.1s, box-shadow 0.1s;
        }
        .continue-btn:hover { transform: scale(1.02); box-shadow: 0 6px 32px ${DEMO_COLOR}66; }
        .continue-btn:active { transform: scale(0.98); }
        .shine-ring {
          position: absolute; width: 220px; height: 220px;
          border-radius: 50%; border: 1px solid ${DEMO_COLOR}33;
          animation: spin 8s linear infinite;
          background: transparent;
        }
        @keyframes spin { to { transform: rotate(360deg); } }
        .shine-ring::before {
          content: ""; position: absolute; top: -2px; left: 30%;
          width: 30px; height: 3px; background: ${DEMO_COLOR};
          border-radius: 2px; opacity: 0.8;
          box-shadow: 0 0 10px ${DEMO_COLOR};
        }
      `}</style>

      {/* Animated rays behind everything */}
      <div className="bg-rays" />

      {/* Burst effect */}
      {phase === "burst" && (
        <div className="burst-ring" style={{
          width: 40, height: 40,
          background: `radial-gradient(circle, ${DEMO_COLOR}88, transparent)`,
        }} />
      )}

      {/* Confetti */}
      {particles.map(p => (
        <div
          key={p.id}
          className="confetti-particle"
          style={{
            left: `${p.x}%`,
            top: `${p.y}%`,
            width: p.shape === "rect" ? p.size : p.size,
            height: p.shape === "rect" ? p.size * 0.4 : p.size,
            borderRadius: p.shape === "circle" ? "50%" : "2px",
            background: p.color,
            "--dur": p.duration,
            "--delay": p.delay,
            "--start-y": `${p.y}%`,
            "--rot": `${p.rotation * 4}deg`,
            "--drift": (Math.random() - 0.5) * 120,
          } as React.CSSProperties}
        />
      ))}

      <div className="content">
        <div className="level-reached">Level Reached</div>

        <div className="level-badge">
          <div className="shine-ring" />
          <div className="level-num">{DEMO_LEVEL}</div>
          <div className="level-word">Level</div>
        </div>

        <div className="level-name">{DEMO_LEVEL_NAME}</div>
        <div className="level-sub">Unlocked</div>

        <div className="xp-block">
          <div className="xp-row">
            <span className="xp-label">Total XP</span>
            <span className="xp-value">
              {counter.toLocaleString()}
              <span className="xp-suffix"> XP</span>
            </span>
          </div>
          <div className="bar-wrap">
            <div className="bar-fill" />
          </div>
          <div className="bar-labels">
            <span>{DEMO_CURR_THRESH.toLocaleString()} XP</span>
            <span>{DEMO_NEXT.toLocaleString()} XP to next</span>
          </div>
        </div>

        <button className="continue-btn">Continue</button>
      </div>
    </div>
  );
}
