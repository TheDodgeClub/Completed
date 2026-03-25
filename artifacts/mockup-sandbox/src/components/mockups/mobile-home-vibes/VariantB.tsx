const events = [
  { title: "Friday Night Dodgeball", date: "Fri, Jan 31", venue: "Sports Hall B", spots: 4, hot: true },
  { title: "Saturday Smash Session", date: "Sat, Feb 1", venue: "Main Arena", spots: 12, hot: false },
  { title: "Midweek Mixer", date: "Wed, Feb 5", venue: "Sports Hall A", spots: 8, hot: false },
];

const posts = [
  { author: "Asher", time: "2h ago", body: "Huge shoutout to everyone who came to last night's session 🔥 That final round was INSANE." },
  { author: "Coach Dee", time: "1d ago", body: "Friday spots are filling up fast. Book your ticket now before it's too late." },
];

export function VariantB() {
  return (
    <div style={{
      width: 390, height: 820, fontFamily: "system-ui, -apple-system, sans-serif",
      overflowY: "auto", overflowX: "hidden", background: "#F2F4F2", color: "#111",
    }}>
      {/* Status bar — light */}
      <div style={{ height: 44, display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0 20px", background: "#0B5E2F" }}>
        <span style={{ fontSize: 13, fontWeight: 700, color: "rgba(255,255,255,0.9)" }}>9:41</span>
        <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
          <span style={{ fontSize: 11, color: "rgba(255,255,255,0.7)" }}>●●●</span>
          <span style={{ fontSize: 11, color: "rgba(255,255,255,0.7)" }}>▲</span>
          <span style={{ fontSize: 11, color: "rgba(255,255,255,0.7)" }}>⬛</span>
        </div>
      </div>

      {/* Hero — solid bright green, bold and athletic */}
      <div style={{ background: "#0B5E2F", padding: "20px 20px 32px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <div style={{ width: 28, height: 28, borderRadius: 8, background: "rgba(255,255,255,0.2)", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <span style={{ fontWeight: 900, fontSize: 13, color: "#fff" }}>DC</span>
            </div>
            <span style={{ fontWeight: 800, fontSize: 14, color: "rgba(255,255,255,0.9)", letterSpacing: "0.04em" }}>THE DODGE CLUB</span>
          </div>
          <div style={{ width: 36, height: 36, borderRadius: "50%", background: "rgba(255,255,255,0.15)", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <span style={{ fontSize: 14 }}>🔔</span>
          </div>
        </div>

        {/* Tagline — big, bold, sport energy */}
        <div style={{ marginBottom: 24 }}>
          <div style={{ fontSize: 34, fontWeight: 900, lineHeight: 1, letterSpacing: "-0.03em", color: "#FFFFFF", marginBottom: 4 }}>
            Come alone.
          </div>
          <div style={{ fontSize: 34, fontWeight: 900, lineHeight: 1, letterSpacing: "-0.03em", color: "#FFC107" }}>
            Win together.
          </div>
          <div style={{ fontSize: 14, color: "rgba(255,255,255,0.7)", marginTop: 10, lineHeight: 1.4 }}>
            South London's premier dodgeball club.
          </div>
        </div>

        {/* CTAs — strong solid buttons */}
        <div style={{ display: "flex", gap: 10 }}>
          <button style={{ flex: 1, background: "#ffffff", border: "none", borderRadius: 12, padding: "14px 0", display: "flex", alignItems: "center", justifyContent: "center", gap: 8, cursor: "pointer" }}>
            <span style={{ fontSize: 15 }}>🛡</span>
            <span style={{ fontWeight: 800, fontSize: 14, color: "#0B5E2F" }}>Member Zone</span>
          </button>
          <button style={{ background: "#FFC107", border: "none", borderRadius: 12, padding: "14px 18px", display: "flex", alignItems: "center", gap: 8, cursor: "pointer" }}>
            <span style={{ fontSize: 14 }}>🏷</span>
            <span style={{ fontWeight: 800, fontSize: 14, color: "#000" }}>Tickets</span>
          </button>
        </div>
      </div>

      {/* Quick stat strip — light bg, green accent */}
      <div style={{ background: "#fff", borderBottom: "1px solid #e8e8e8", display: "flex" }}>
        {[{ label: "Members", value: "312" }, { label: "Sessions", value: "48" }, { label: "This week", value: "5 left" }].map((s, i) => (
          <div key={i} style={{ flex: 1, padding: "12px 0", textAlign: "center", borderRight: i < 2 ? "1px solid #e8e8e8" : "none" }}>
            <div style={{ fontWeight: 900, fontSize: 16, color: "#0B5E2F" }}>{s.value}</div>
            <div style={{ fontSize: 11, color: "#888", marginTop: 1 }}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* Event hero banner */}
      <div style={{ margin: "16px 16px 0", borderRadius: 14, overflow: "hidden", height: 140, background: "linear-gradient(135deg, #0B5E2F, #1A8C4E)", position: "relative", cursor: "pointer" }}>
        <div style={{ position: "absolute", top: 12, left: 14 }}>
          <div style={{ background: "#FFC107", borderRadius: 6, padding: "3px 10px", display: "inline-block", marginBottom: 6 }}>
            <span style={{ fontWeight: 800, fontSize: 10, color: "#000", letterSpacing: "0.08em" }}>NEXT UP</span>
          </div>
        </div>
        <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, padding: "10px 14px" }}>
          <div style={{ fontWeight: 800, fontSize: 17, color: "#fff", letterSpacing: "-0.01em" }}>Friday Night Dodgeball</div>
          <div style={{ fontSize: 12, color: "rgba(255,255,255,0.75)", marginTop: 2 }}>Fri, Jan 31 · 4 spots remaining</div>
        </div>
        <div style={{ position: "absolute", right: 14, top: "50%", transform: "translateY(-50%)", width: 36, height: 36, borderRadius: "50%", background: "rgba(255,255,255,0.2)", display: "flex", alignItems: "center", justifyContent: "center" }}>
          <span style={{ color: "#fff", fontSize: 16 }}>›</span>
        </div>
      </div>

      {/* Upcoming Events — cards on white, strong green accent */}
      <div style={{ padding: "16px 16px 0" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
          <span style={{ fontWeight: 900, fontSize: 16, color: "#111", letterSpacing: "-0.01em" }}>Upcoming Events</span>
          <span style={{ fontSize: 13, fontWeight: 700, color: "#0B5E2F", cursor: "pointer" }}>See All →</span>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {events.map((e, i) => (
            <div key={i} style={{ background: "#fff", border: "1px solid #E8E8E8", borderRadius: 12, padding: "12px 14px", display: "flex", alignItems: "center", gap: 12, cursor: "pointer", borderLeft: e.hot ? "3px solid #0B5E2F" : "1px solid #E8E8E8" }}>
              <div style={{ width: 38, height: 38, borderRadius: 10, background: e.hot ? "#0B5E2F" : "#F2F4F2", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                <span style={{ fontSize: 18 }}>🏐</span>
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 700, fontSize: 13, color: "#111", marginBottom: 2 }}>{e.title}</div>
                <div style={{ fontSize: 11, color: "#888" }}>{e.date} · {e.spots} spots</div>
              </div>
              {e.hot && <div style={{ background: "#0B5E2F", borderRadius: 6, padding: "2px 8px" }}><span style={{ fontSize: 10, fontWeight: 700, color: "#fff" }}>HOT</span></div>}
            </div>
          ))}
        </div>
      </div>

      {/* Elite banner — green, high energy */}
      <div style={{ margin: "16px 16px 0", background: "#0B5E2F", borderRadius: 14, padding: "16px", display: "flex", alignItems: "center", gap: 12 }}>
        <span style={{ fontSize: 24 }}>👑</span>
        <div style={{ flex: 1 }}>
          <div style={{ fontWeight: 800, fontSize: 14, color: "#fff", marginBottom: 2 }}>Go Elite</div>
          <div style={{ fontSize: 12, color: "rgba(255,255,255,0.7)" }}>£8.99/month · Unlock everything</div>
        </div>
        <button style={{ background: "#FFC107", border: "none", borderRadius: 10, padding: "8px 14px", fontWeight: 800, fontSize: 13, color: "#000", cursor: "pointer" }}>Join →</button>
      </div>

      {/* Latest Updates — clean cards on white */}
      <div style={{ padding: "16px 16px 32px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
          <span style={{ fontWeight: 900, fontSize: 16, color: "#111", letterSpacing: "-0.01em" }}>Latest Updates</span>
          <span style={{ fontSize: 13, fontWeight: 700, color: "#0B5E2F", cursor: "pointer" }}>See All →</span>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {posts.map((p, i) => (
            <div key={i} style={{ background: "#fff", border: "1px solid #E8E8E8", borderRadius: 12, padding: "14px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
                <div style={{ width: 28, height: 28, borderRadius: "50%", background: "#0B5E2F", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, fontWeight: 700, color: "#fff" }}>{p.author[0]}</div>
                <span style={{ fontWeight: 700, fontSize: 13, color: "#111" }}>{p.author}</span>
                <span style={{ fontSize: 11, color: "#aaa", marginLeft: "auto" }}>{p.time}</span>
              </div>
              <div style={{ fontSize: 13, color: "#444", lineHeight: 1.5 }}>{p.body}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
