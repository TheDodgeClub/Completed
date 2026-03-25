const events = [
  { title: "Friday Night Dodgeball", date: "Fri, Jan 31", venue: "Sports Hall B", spots: 4 },
  { title: "Saturday Smash Session", date: "Sat, Feb 1", venue: "Main Arena", spots: 12 },
  { title: "Midweek Mixer", date: "Wed, Feb 5", venue: "Sports Hall A", spots: 8 },
];

const posts = [
  { author: "Asher", time: "2h ago", body: "Huge shoutout to everyone who came to last night's session 🔥 That final round was INSANE." },
  { author: "Coach Dee", time: "1d ago", body: "Friday spots are filling up fast. Book your ticket now before it's too late." },
];

export function VariantA() {
  return (
    <div style={{
      width: 390, height: 820, background: "#0D0D0D", fontFamily: "system-ui, -apple-system, sans-serif",
      overflowY: "auto", overflowX: "hidden", position: "relative", color: "#F0F0F0",
    }}>
      {/* Status bar */}
      <div style={{ height: 44, display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0 20px", background: "#0D0D0D" }}>
        <span style={{ fontSize: 13, fontWeight: 700, color: "#F0F0F0" }}>9:41</span>
        <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
          <span style={{ fontSize: 11, color: "#888" }}>●●●</span>
          <span style={{ fontSize: 11, color: "#888" }}>▲</span>
          <span style={{ fontSize: 11, color: "#888" }}>⬛</span>
        </div>
      </div>

      {/* Hero — pure black, no gradient, tight */}
      <div style={{ background: "#0D0D0D", padding: "20px 20px 28px", borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
          {/* Logo text treatment */}
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              {/* Green pip — only green on screen */}
              <div style={{ width: 6, height: 6, borderRadius: "50%", background: "#0B5E2F" }} />
              <span style={{ fontSize: 13, fontWeight: 800, letterSpacing: "0.2em", textTransform: "uppercase", color: "#F0F0F0" }}>The Dodge Club</span>
            </div>
          </div>
          <div style={{ width: 36, height: 36, borderRadius: "50%", background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <span style={{ fontSize: 14 }}>🔔</span>
          </div>
        </div>

        {/* Tagline — tight, condensed, character */}
        <div style={{ marginBottom: 28 }}>
          <div style={{ fontSize: 30, fontWeight: 900, lineHeight: 1.05, letterSpacing: "-0.03em", color: "#FFFFFF", marginBottom: 6 }}>
            Come alone.
          </div>
          <div style={{ fontSize: 30, fontWeight: 900, lineHeight: 1.05, letterSpacing: "-0.03em", color: "rgba(255,255,255,0.35)" }}>
            Win together.
          </div>
        </div>

        {/* CTAs — amber is the action colour, not green */}
        <div style={{ display: "flex", gap: 10 }}>
          <button style={{ flex: 1, background: "#FFC107", border: "none", borderRadius: 10, padding: "13px 16px", display: "flex", alignItems: "center", justifyContent: "center", gap: 8, cursor: "pointer" }}>
            <span style={{ fontSize: 13 }}>🛡</span>
            <span style={{ fontWeight: 700, fontSize: 14, color: "#000" }}>Member Zone</span>
          </button>
          <button style={{ background: "transparent", border: "1px solid rgba(255,255,255,0.15)", borderRadius: 10, padding: "13px 16px", display: "flex", alignItems: "center", gap: 8, cursor: "pointer" }}>
            <span style={{ fontSize: 13 }}>🏷</span>
            <span style={{ fontWeight: 600, fontSize: 14, color: "rgba(255,255,255,0.7)" }}>Tickets</span>
          </button>
        </div>
      </div>

      {/* Event hero banner */}
      <div style={{ margin: "16px 16px 0", borderRadius: 12, overflow: "hidden", height: 150, background: "linear-gradient(135deg, #1a1a1a, #222)", border: "1px solid rgba(255,255,255,0.07)", position: "relative", cursor: "pointer" }}>
        <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, padding: "12px 14px", background: "linear-gradient(transparent, rgba(0,0,0,0.85))" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 4 }}>
            <div style={{ width: 4, height: 4, borderRadius: "50%", background: "#FFC107" }} />
            <span style={{ fontSize: 10, fontWeight: 700, color: "#FFC107", letterSpacing: "0.12em", textTransform: "uppercase" }}>Next Up</span>
          </div>
          <div style={{ fontWeight: 800, fontSize: 16, color: "#fff", letterSpacing: "-0.01em" }}>Friday Night Dodgeball</div>
          <div style={{ fontSize: 12, color: "rgba(255,255,255,0.6)", marginTop: 2 }}>Fri, Jan 31 · Sports Hall B · 4 spots left</div>
        </div>
      </div>

      {/* Upcoming Events */}
      <div style={{ padding: "20px 16px 0" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
          <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.14em", textTransform: "uppercase", color: "#555" }}>Upcoming Events</span>
          <span style={{ fontSize: 12, fontWeight: 600, color: "#FFC107", cursor: "pointer" }}>See All</span>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
          {events.map((e, i) => (
            <div key={i} style={{ display: "flex", alignItems: "center", gap: 12, padding: "11px 14px", borderRadius: 10, background: "#141414", border: "1px solid rgba(255,255,255,0.05)", cursor: "pointer" }}>
              <div style={{ width: 36, height: 36, borderRadius: 8, background: "#1E1E1E", display: "flex", alignItems: "center", justifyContent: "center", border: "1px solid rgba(255,255,255,0.07)", flexShrink: 0 }}>
                <span style={{ fontSize: 16 }}>🏐</span>
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontWeight: 700, fontSize: 13, color: "#E8E8E8", marginBottom: 2, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{e.title}</div>
                <div style={{ fontSize: 11, color: "#555" }}>{e.date} · {e.spots} spots</div>
              </div>
              <span style={{ fontSize: 14, color: "rgba(255,255,255,0.2)" }}>›</span>
            </div>
          ))}
        </div>
      </div>

      {/* Elite banner — subdued, fits the vault aesthetic */}
      <div style={{ margin: "20px 16px 0", padding: "14px 16px", background: "#141414", border: "1px solid rgba(255,193,7,0.15)", borderRadius: 12, display: "flex", alignItems: "center", gap: 12 }}>
        <div style={{ width: 36, height: 36, borderRadius: 10, background: "rgba(255,193,7,0.1)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
          <span style={{ fontSize: 18 }}>👑</span>
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ fontWeight: 700, fontSize: 13, color: "#E8E8E8", marginBottom: 2 }}>Go Elite</div>
          <div style={{ fontSize: 11, color: "#555" }}>£8.99/mo · Unlock member benefits</div>
        </div>
        <button style={{ background: "#FFC107", border: "none", borderRadius: 8, padding: "7px 12px", fontWeight: 700, fontSize: 12, color: "#000", cursor: "pointer", flexShrink: 0 }}>Join</button>
      </div>

      {/* Latest Updates */}
      <div style={{ padding: "20px 16px 32px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
          <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.14em", textTransform: "uppercase", color: "#555" }}>Latest Updates</span>
          <span style={{ fontSize: 12, fontWeight: 600, color: "#FFC107", cursor: "pointer" }}>See All</span>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
          {posts.map((p, i) => (
            <div key={i} style={{ padding: "14px", borderRadius: 10, background: "#141414", border: "1px solid rgba(255,255,255,0.05)" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
                <div style={{ width: 24, height: 24, borderRadius: "50%", background: "#1E1E1E", border: "1px solid rgba(255,255,255,0.1)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 10, fontWeight: 700 }}>{p.author[0]}</div>
                <span style={{ fontWeight: 700, fontSize: 12, color: "#E8E8E8" }}>{p.author}</span>
                <span style={{ fontSize: 11, color: "#444", marginLeft: "auto" }}>{p.time}</span>
              </div>
              <div style={{ fontSize: 13, color: "#888", lineHeight: 1.5 }}>{p.body}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
