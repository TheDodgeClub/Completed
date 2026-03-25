const events = [
  { title: "Friday Night Dodgeball", date: "Fri, Jan 31", venue: "Sports Hall B", spots: 4 },
  { title: "Saturday Smash Session", date: "Sat, Feb 1", venue: "Main Arena", spots: 12 },
  { title: "Midweek Mixer", date: "Wed, Feb 5", venue: "Sports Hall A", spots: 8 },
];

const posts = [
  { author: "Asher", time: "2h ago", body: "Huge shoutout to everyone who came to last night's session 🔥 That final round was INSANE." },
  { author: "Coach Dee", time: "1d ago", body: "Friday spots are filling up fast. Book your ticket now before it's too late." },
];

export function VariantC() {
  return (
    <div style={{
      width: 390, height: 820, fontFamily: "Georgia, 'Times New Roman', serif",
      overflowY: "auto", overflowX: "hidden", background: "#FAF6F0", color: "#1C1410",
    }}>
      {/* Status bar — warm */}
      <div style={{ height: 44, display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0 20px", background: "#1C1410" }}>
        <span style={{ fontSize: 13, fontWeight: 700, color: "rgba(255,255,255,0.85)", fontFamily: "system-ui" }}>9:41</span>
        <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
          <span style={{ fontSize: 11, color: "rgba(255,255,255,0.5)", fontFamily: "system-ui" }}>●●●</span>
          <span style={{ fontSize: 11, color: "rgba(255,255,255,0.5)", fontFamily: "system-ui" }}>▲</span>
          <span style={{ fontSize: 11, color: "rgba(255,255,255,0.5)", fontFamily: "system-ui" }}>⬛</span>
        </div>
      </div>

      {/* Hero — deep warm charcoal, amber accent, intimate not corporate */}
      <div style={{ background: "linear-gradient(160deg, #1C1410 0%, #2A1F15 100%)", padding: "22px 22px 32px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 28 }}>
          <div>
            <div style={{ fontSize: 10, letterSpacing: "0.2em", textTransform: "uppercase", color: "rgba(255,255,255,0.4)", marginBottom: 4, fontFamily: "system-ui", fontWeight: 600 }}>Est. 2024</div>
            <div style={{ fontSize: 15, fontWeight: 700, color: "#FAF6F0", letterSpacing: "0.02em" }}>The Dodge Club</div>
          </div>
          <div style={{ width: 38, height: 38, borderRadius: "50%", background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <span style={{ fontSize: 14 }}>🔔</span>
          </div>
        </div>

        {/* Tagline — editorial, serif, personal */}
        <div style={{ marginBottom: 30 }}>
          <div style={{ fontSize: 28, fontWeight: 700, lineHeight: 1.15, letterSpacing: "-0.01em", color: "#FAF6F0", marginBottom: 8 }}>
            Come alone.{"\n"}Win together.
          </div>
          <div style={{ width: 40, height: 2, background: "#C17B2E", borderRadius: 1, marginBottom: 10 }} />
          <div style={{ fontSize: 13, color: "rgba(255,255,255,0.5)", lineHeight: 1.6, fontFamily: "system-ui", fontWeight: 400 }}>
            Your crew is waiting. Book your spot.
          </div>
        </div>

        {/* CTAs — amber primary, warm outline secondary */}
        <div style={{ display: "flex", gap: 10 }}>
          <button style={{ flex: 1, background: "#C17B2E", border: "none", borderRadius: 10, padding: "13px 0", display: "flex", alignItems: "center", justifyContent: "center", gap: 8, cursor: "pointer" }}>
            <span style={{ fontSize: 14 }}>🛡</span>
            <span style={{ fontWeight: 700, fontSize: 14, color: "#fff", fontFamily: "system-ui" }}>Member Zone</span>
          </button>
          <button style={{ background: "transparent", border: "1px solid rgba(255,255,255,0.2)", borderRadius: 10, padding: "13px 18px", display: "flex", alignItems: "center", gap: 8, cursor: "pointer" }}>
            <span style={{ fontSize: 14 }}>🏷</span>
            <span style={{ fontWeight: 600, fontSize: 14, color: "rgba(255,255,255,0.75)", fontFamily: "system-ui" }}>Tickets</span>
          </button>
        </div>
      </div>

      {/* Event hero banner — warm tones */}
      <div style={{ margin: "16px 16px 0", borderRadius: 14, overflow: "hidden", height: 148, background: "linear-gradient(135deg, #3D2410, #5C3618)", border: "1px solid rgba(193,123,46,0.15)", position: "relative", cursor: "pointer" }}>
        <div style={{ position: "absolute", top: 14, left: 14 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <div style={{ width: 6, height: 6, borderRadius: "50%", background: "#C17B2E" }} />
            <span style={{ fontSize: 10, fontWeight: 700, color: "#C17B2E", letterSpacing: "0.14em", textTransform: "uppercase", fontFamily: "system-ui" }}>Next Up</span>
          </div>
        </div>
        <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, padding: "12px 16px" }}>
          <div style={{ fontWeight: 700, fontSize: 16, color: "#FAF6F0", letterSpacing: "-0.01em", lineHeight: 1.2, marginBottom: 4 }}>Friday Night Dodgeball</div>
          <div style={{ fontSize: 12, color: "rgba(250,246,240,0.6)", fontFamily: "system-ui" }}>Fri, Jan 31 · Sports Hall B · 4 spots</div>
        </div>
      </div>

      {/* Upcoming Events — warm cards */}
      <div style={{ padding: "18px 16px 0" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
          <span style={{ fontWeight: 700, fontSize: 17, color: "#1C1410", letterSpacing: "-0.01em" }}>Upcoming Events</span>
          <span style={{ fontSize: 12, fontWeight: 600, color: "#C17B2E", cursor: "pointer", fontFamily: "system-ui" }}>See All</span>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {events.map((e, i) => (
            <div key={i} style={{ background: "#fff", border: "1px solid #EDE4D8", borderRadius: 12, padding: "12px 14px", display: "flex", alignItems: "center", gap: 12, cursor: "pointer" }}>
              <div style={{ width: 38, height: 38, borderRadius: 10, background: "#FAF6F0", border: "1px solid #EDE4D8", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                <span style={{ fontSize: 18 }}>🏐</span>
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 700, fontSize: 13, color: "#1C1410", marginBottom: 2 }}>{e.title}</div>
                <div style={{ fontSize: 11, color: "#9A7D6A", fontFamily: "system-ui" }}>{e.date} · {e.spots} spots</div>
              </div>
              <span style={{ fontSize: 16, color: "#C17B2E" }}>›</span>
            </div>
          ))}
        </div>
      </div>

      {/* Elite banner — warm, understated */}
      <div style={{ margin: "16px 16px 0", background: "#fff", border: "1px solid rgba(193,123,46,0.25)", borderRadius: 14, padding: "16px", display: "flex", alignItems: "center", gap: 14 }}>
        <div style={{ width: 42, height: 42, borderRadius: 12, background: "rgba(193,123,46,0.1)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
          <span style={{ fontSize: 20 }}>👑</span>
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ fontWeight: 700, fontSize: 14, color: "#1C1410", marginBottom: 2 }}>Become Elite</div>
          <div style={{ fontSize: 12, color: "#9A7D6A", lineHeight: 1.4, fontFamily: "system-ui" }}>£8.99/mo · Member events, XP boosts & more</div>
        </div>
        <button style={{ background: "#C17B2E", border: "none", borderRadius: 10, padding: "8px 14px", fontWeight: 700, fontSize: 13, color: "#fff", cursor: "pointer", fontFamily: "system-ui", flexShrink: 0 }}>Join</button>
      </div>

      {/* Latest Updates — warm, editorial */}
      <div style={{ padding: "18px 16px 32px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
          <span style={{ fontWeight: 700, fontSize: 17, color: "#1C1410", letterSpacing: "-0.01em" }}>Latest Updates</span>
          <span style={{ fontSize: 12, fontWeight: 600, color: "#C17B2E", cursor: "pointer", fontFamily: "system-ui" }}>See All</span>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {posts.map((p, i) => (
            <div key={i} style={{ background: "#fff", border: "1px solid #EDE4D8", borderRadius: 12, padding: "14px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
                <div style={{ width: 28, height: 28, borderRadius: "50%", background: "rgba(193,123,46,0.12)", border: "1px solid rgba(193,123,46,0.2)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, fontWeight: 700, color: "#C17B2E", fontFamily: "system-ui" }}>{p.author[0]}</div>
                <span style={{ fontWeight: 700, fontSize: 13, color: "#1C1410" }}>{p.author}</span>
                <span style={{ fontSize: 11, color: "#C8B8A8", marginLeft: "auto", fontFamily: "system-ui" }}>{p.time}</span>
              </div>
              <div style={{ fontSize: 14, color: "#5A4A3A", lineHeight: 1.6, fontFamily: "system-ui" }}>{p.body}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
