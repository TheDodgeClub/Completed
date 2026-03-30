import { useEffect, useState } from "react";
import "./tokens.css";

const LEVEL_NAMES = ["Beginner", "Developing", "Experienced", "Skilled", "Advanced", "Pro", "League", "Expert", "Master", "Icon"];
const LEVEL_THRESHOLDS = [0, 300, 800, 1600, 2500, 5000, 10000, 20000, 40000, 80000];

const DEMO_LEVEL = 5;
const DEMO_XP = 2512;
const DEMO_LEVEL_NAME = LEVEL_NAMES[DEMO_LEVEL - 1];
const DEMO_NEXT = LEVEL_THRESHOLDS[DEMO_LEVEL] ?? LEVEL_THRESHOLDS[LEVEL_THRESHOLDS.length - 1];
const DEMO_CURR_THRESH = LEVEL_THRESHOLDS[DEMO_LEVEL - 1];

interface Particle {
  id: number; x: number; color: string;
  size: number; delay: number; duration: number;
}

function makeParticles(n: number): Particle[] {
  const colors = ["#0B3E1E", "#2D7A4F", "#B8860B", "#DAA520", "#6B8E7A", "#A0C4A8", "#F5E6C8"];
  return Array.from({ length: n }, (_, i) => ({
    id: i,
    x: 5 + Math.random() * 90,
    color: colors[Math.floor(Math.random() * colors.length)],
    size: 5 + Math.random() * 7,
    delay: Math.random() * 0.8,
    duration: 2 + Math.random() * 1.5,
  }));
}

export function CleanLight() {
  const [particles] = useState(() => makeParticles(45));
  const [showContent, setShowContent] = useState(false);
  const [counter, setCounter] = useState(DEMO_CURR_THRESH);
  const [barWidth, setBarWidth] = useState(0);

  useEffect(() => {
    const t = setTimeout(() => setShowContent(true), 200);
    return () => clearTimeout(t);
  }, []);

  useEffect(() => {
    if (!showContent) return;
    const targetProg = Math.min((DEMO_XP - DEMO_CURR_THRESH) / (DEMO_NEXT - DEMO_CURR_THRESH), 1);
    const duration = 1000;
    const startTime = Date.now();
    const tick = () => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setCounter(Math.floor(DEMO_CURR_THRESH + (DEMO_XP - DEMO_CURR_THRESH) * eased));
      setBarWidth(targetProg * eased * 100);
      if (progress < 1) requestAnimationFrame(tick);
    };
    const t = setTimeout(() => requestAnimationFrame(tick), 300);
    return () => clearTimeout(t);
  }, [showContent]);

  return (
    <div className="clean-root">
      <style>{`
        .clean-root {
          width: 390px; height: 844px;
          background: #F0EDE8;
          display: flex; flex-direction: column;
          align-items: center; justify-content: flex-start;
          overflow: hidden; position: relative;
          font-family: 'Inter', sans-serif;
        }
        .confetti-piece {
          position: absolute; top: -20px; border-radius: 2px;
          animation: drop-piece var(--dur)s var(--delay)s ease-in both;
          transform-origin: center;
        }
        @keyframes drop-piece {
          0%   { transform: translateY(0) rotate(0deg); opacity: 1; }
          70%  { opacity: 0.8; }
          100% { transform: translateY(200px) rotate(calc(var(--spin) * 1deg)); opacity: 0; }
        }
        .top-band {
          width: 100%; background: #0B3E1E;
          display: flex; flex-direction: column; align-items: center;
          padding: 56px 24px 32px; position: relative; overflow: hidden;
        }
        .top-band-glow {
          position: absolute; bottom: -40px; width: 300px; height: 80px;
          background: radial-gradient(ellipse, rgba(218,165,32,0.25) 0%, transparent 70%);
          pointer-events: none;
        }
        .badge-wrap {
          width: 110px; height: 110px; border-radius: 50%;
          background: linear-gradient(135deg, #DAA520 0%, #B8860B 50%, #DAA520 100%);
          display: flex; align-items: center; justify-content: center;
          box-shadow: 0 4px 24px rgba(0,0,0,0.3), 0 0 40px rgba(218,165,32,0.3);
          margin-bottom: 20px; position: relative;
          animation: ${showContent ? "badge-drop 0.5s 0.1s cubic-bezier(0.34,1.56,0.64,1) both" : "none"};
        }
        @keyframes badge-drop {
          from { transform: scale(0) rotate(-20deg); opacity: 0; }
          to   { transform: scale(1) rotate(0deg); opacity: 1; }
        }
        .badge-inner {
          width: 90px; height: 90px; border-radius: 50%;
          background: #0B3E1E; border: 2px solid rgba(218,165,32,0.4);
          display: flex; flex-direction: column; align-items: center; justify-content: center;
        }
        .badge-num {
          font-size: 40px; font-weight: 900; color: #DAA520; line-height: 1;
        }
        .badge-lbl {
          font-size: 8px; letter-spacing: 2px; color: rgba(218,165,32,0.7);
          text-transform: uppercase; font-weight: 600;
        }
        .top-eyebrow {
          font-size: 10px; letter-spacing: 4px; text-transform: uppercase;
          color: rgba(255,255,255,0.5); font-weight: 600; margin-bottom: 12px;
        }
        .top-name {
          font-size: 32px; font-weight: 800; color: #fff; letter-spacing: -0.5px;
          animation: ${showContent ? "slide-up 0.4s 0.4s ease-out both" : "none"};
        }
        .top-tagline {
          font-size: 13px; color: rgba(255,255,255,0.45); margin-top: 4px;
          letter-spacing: 2px; text-transform: uppercase;
          animation: ${showContent ? "slide-up 0.4s 0.55s ease-out both" : "none"};
        }
        @keyframes slide-up {
          from { opacity: 0; transform: translateY(10px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        .card-body {
          flex: 1; width: 100%; padding: 28px 24px 0;
          display: flex; flex-direction: column; gap: 16px;
          animation: ${showContent ? "fade-in 0.4s 0.6s ease-out both" : "none"};
          opacity: 0;
        }
        @keyframes fade-in {
          from { opacity: 0; transform: translateY(8px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        .stat-card {
          background: #fff; border-radius: 16px;
          padding: 18px 20px; border: 1px solid rgba(11,62,30,0.08);
          box-shadow: 0 2px 12px rgba(0,0,0,0.05);
        }
        .stat-header {
          display: flex; justify-content: space-between;
          align-items: flex-start; margin-bottom: 14px;
        }
        .stat-title {
          font-size: 11px; font-weight: 600; color: #888;
          text-transform: uppercase; letter-spacing: 1.5px;
        }
        .stat-xp {
          font-size: 30px; font-weight: 800; color: #1a1a1a; line-height: 1;
        }
        .stat-xp span { font-size: 14px; color: #888; font-weight: 500; margin-left: 2px; }
        .progress-bar-bg {
          height: 8px; background: #F0EDE8; border-radius: 8px; overflow: hidden; margin-bottom: 8px;
        }
        .progress-bar-fill {
          height: 100%; border-radius: 8px;
          background: linear-gradient(90deg, #0B3E1E, #2D7A4F);
          transition: width 1s cubic-bezier(0.22,1,0.36,1);
          width: ${barWidth}%;
        }
        .progress-labels {
          display: flex; justify-content: space-between;
          font-size: 11px; color: #999;
        }
        .next-label { color: #0B3E1E; font-weight: 600; }
        .perks-card {
          background: #fff; border-radius: 16px;
          padding: 16px 20px; border: 1px solid rgba(11,62,30,0.08);
          box-shadow: 0 2px 12px rgba(0,0,0,0.05);
        }
        .perks-title {
          font-size: 11px; font-weight: 600; color: #888;
          text-transform: uppercase; letter-spacing: 1.5px; margin-bottom: 12px;
        }
        .perk-row {
          display: flex; align-items: center; gap: 10px;
          padding: 8px 0; border-bottom: 1px solid #F0EDE8;
        }
        .perk-row:last-child { border-bottom: none; padding-bottom: 0; }
        .perk-icon {
          width: 32px; height: 32px; border-radius: 10px;
          background: #F0EDE8; display: flex; align-items: center;
          justify-content: center; font-size: 16px; flex-shrink: 0;
        }
        .perk-text { font-size: 13px; font-weight: 500; color: #1a1a1a; }
        .perk-sub { font-size: 11px; color: #999; }
        .continue-area {
          padding: 20px 24px 36px; width: 100%; animation: ${showContent ? "fade-in 0.4s 0.8s ease-out both" : "none"}; opacity: 0;
        }
        .continue-btn {
          width: 100%; height: 54px; border-radius: 27px;
          background: #0B3E1E; border: none; cursor: pointer;
          font-size: 16px; font-weight: 700; color: #DAA520;
          letter-spacing: 0.5px; transition: transform 0.1s, box-shadow 0.1s;
          box-shadow: 0 4px 16px rgba(11,62,30,0.25);
        }
        .continue-btn:hover { transform: scale(1.01); box-shadow: 0 6px 24px rgba(11,62,30,0.35); }
        .continue-btn:active { transform: scale(0.99); }
      `}</style>

      {/* Confetti */}
      {particles.map(p => (
        <div
          key={p.id}
          className="confetti-piece"
          style={{
            left: `${p.x}%`,
            width: p.size,
            height: p.size * 0.5,
            background: p.color,
            "--dur": p.duration,
            "--delay": p.delay,
            "--spin": Math.random() * 360,
          } as React.CSSProperties}
        />
      ))}

      <div className="top-band">
        <div className="top-eyebrow">You reached</div>

        <div className="badge-wrap">
          <div className="badge-inner">
            <div className="badge-num">{DEMO_LEVEL}</div>
            <div className="badge-lbl">Level</div>
          </div>
        </div>

        <div className="top-name">{DEMO_LEVEL_NAME}</div>
        <div className="top-tagline">New rank unlocked</div>
        <div className="top-band-glow" />
      </div>

      <div className="card-body">
        <div className="stat-card">
          <div className="stat-header">
            <span className="stat-title">Total XP</span>
          </div>
          <div className="stat-xp">{counter.toLocaleString()}<span>XP</span></div>
          <div style={{ marginTop: 12 }}>
            <div className="progress-bar-bg">
              <div className="progress-bar-fill" />
            </div>
            <div className="progress-labels">
              <span>{DEMO_CURR_THRESH.toLocaleString()} XP</span>
              <span className="next-label">{DEMO_NEXT.toLocaleString()} XP next level</span>
            </div>
          </div>
        </div>

        <div className="perks-card">
          <div className="perks-title">You've earned</div>
          <div className="perk-row">
            <div className="perk-icon">🏅</div>
            <div>
              <div className="perk-text">Advanced Badge</div>
              <div className="perk-sub">Shown on your player card</div>
            </div>
          </div>
          <div className="perk-row">
            <div className="perk-icon">⚡</div>
            <div>
              <div className="perk-text">Bonus XP Events</div>
              <div className="perk-sub">+10% XP at Advanced tier events</div>
            </div>
          </div>
          <div className="perk-row">
            <div className="perk-icon">🎯</div>
            <div>
              <div className="perk-text">New challenges unlocked</div>
              <div className="perk-sub">Check Achievements for details</div>
            </div>
          </div>
        </div>
      </div>

      <div className="continue-area">
        <button className="continue-btn">Continue Playing</button>
      </div>
    </div>
  );
}
