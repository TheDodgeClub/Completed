export function VariantB() {
  const members = [
    { name: "Asher", xp: 4400, medals: 3, rings: 3, avatar: "A" },
    { name: "Jordz", xp: 1000, medals: 0, rings: 1, avatar: "J" },
    { name: "Q", xp: 500, medals: 0, rings: 0, avatar: "Q" },
    { name: "Dodge Club HQ", xp: 0, medals: 0, rings: 0, avatar: "D" },
    { name: "Jabez", xp: 0, medals: 0, rings: 0, avatar: "J" },
  ];

  const navItems = [
    { label: "Dashboard", icon: "⊞", active: true },
    { label: "Events", icon: "📅", count: 1 },
    { label: "Posts", icon: "💬", count: 2 },
    { label: "Videos", icon: "▶", count: 0 },
    { label: "Merch", icon: "🛍", count: 4 },
    { label: "Members", icon: "👥", count: 6 },
    { label: "Elite Members", icon: "👑" },
    { label: "Settings", icon: "⚙" },
  ];

  const quickActions = [
    { label: "Send Notification", icon: "🔔", color: "#FFC107", bg: "rgba(255,193,7,0.12)", border: "rgba(255,193,7,0.3)", desc: "Broadcast to all members" },
    { label: "Add Event", icon: "＋", color: "#0B5E2F", bg: "rgba(11,94,47,0.12)", border: "rgba(11,94,47,0.3)", desc: "Schedule a new session" },
    { label: "New Post", icon: "✏", color: "#60a5fa", bg: "rgba(96,165,250,0.12)", border: "rgba(96,165,250,0.3)", desc: "Publish to the feed" },
    { label: "View Members", icon: "→", color: "#a78bfa", bg: "rgba(167,139,250,0.12)", border: "rgba(167,139,250,0.3)", desc: "Manage all 6 members" },
  ];

  return (
    <div style={{ display: "flex", height: "100vh", background: "#0a0a0a", fontFamily: "system-ui, sans-serif", overflow: "hidden", color: "#e5e5e5" }}>
      {/* Sidebar */}
      <aside style={{ width: 220, background: "#111", borderRight: "1px solid rgba(255,255,255,0.08)", display: "flex", flexDirection: "column", flexShrink: 0 }}>
        <div style={{ padding: "20px 16px 16px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{ width: 36, height: 36, borderRadius: 10, background: "linear-gradient(135deg,#0B5E2F,#0a3d1f)", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <span style={{ color: "#fff", fontWeight: 800, fontSize: 14 }}>DC</span>
            </div>
            <div>
              <div style={{ fontWeight: 700, fontSize: 15, color: "#f0f0f0" }}>Dodge Club</div>
              <div style={{ fontSize: 10, color: "#0B5E2F", letterSpacing: "0.12em", textTransform: "uppercase", fontWeight: 600 }}>Admin</div>
            </div>
          </div>
        </div>
        <div style={{ padding: "4px 16px 8px", fontSize: 10, color: "#555", letterSpacing: "0.1em", textTransform: "uppercase", fontWeight: 600 }}>Management</div>
        <nav style={{ flex: 1, padding: "0 8px" }}>
          {navItems.map((item) => (
            <div key={item.label} style={{
              display: "flex", alignItems: "center", gap: 10, padding: "9px 12px", borderRadius: 10, marginBottom: 2,
              background: item.active ? "rgba(11,94,47,0.15)" : "transparent",
              color: item.active ? "#0B5E2F" : "#777",
              borderLeft: item.active ? "2px solid #0B5E2F" : "2px solid transparent",
              fontWeight: item.active ? 600 : 400, fontSize: 14, cursor: "pointer",
            }}>
              <span style={{ flex: 1 }}>{item.label}</span>
              {item.count !== undefined && (
                <span style={{ fontSize: 11, padding: "1px 7px", borderRadius: 10, background: item.active ? "rgba(11,94,47,0.2)" : "rgba(255,255,255,0.06)", color: item.active ? "#0B5E2F" : "#555" }}>{item.count}</span>
              )}
            </div>
          ))}
        </nav>
        <div style={{ padding: 12, borderTop: "1px solid rgba(255,255,255,0.07)" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 8px" }}>
            <div style={{ width: 32, height: 32, borderRadius: "50%", background: "#1e1e1e", display: "flex", alignItems: "center", justifyContent: "center", border: "1px solid rgba(255,255,255,0.1)", fontWeight: 700, fontSize: 12 }}>D</div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 13, fontWeight: 600, color: "#e5e5e5", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>Dodge Club HQ</div>
              <div style={{ fontSize: 11, color: "#555", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>admin@dodgeclub.com</div>
            </div>
          </div>
          <div style={{ display: "flex", gap: 6, marginTop: 6 }}>
            <div style={{ width: 34, height: 34, borderRadius: 8, border: "1px solid rgba(255,255,255,0.1)", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", color: "#666" }}>☀</div>
            <div style={{ flex: 1, height: 34, borderRadius: 8, border: "1px solid rgba(255,255,255,0.1)", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", color: "#777", fontSize: 13 }}>Sign Out</div>
          </div>
        </div>
      </aside>

      {/* Main */}
      <main style={{ flex: 1, overflowY: "auto", padding: "28px 32px", background: "radial-gradient(ellipse at top right, rgba(11,94,47,0.05), transparent 60%)" }}>

        <div style={{ marginBottom: 24 }}>
          <h1 style={{ margin: 0, fontSize: 26, fontWeight: 800, color: "#f0f0f0", letterSpacing: "-0.02em" }}>Dashboard</h1>
          <p style={{ margin: "4px 0 0", fontSize: 13, color: "#555" }}>Welcome back, Dodge Club HQ. Here's what's happening.</p>
        </div>

        {/* ── QUICK ACTIONS — prominent CTA strip ── */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12, marginBottom: 28 }}>
          {quickActions.map((action) => (
            <button key={action.label} style={{
              background: action.bg, border: `1px solid ${action.border}`, borderRadius: 14,
              padding: "14px 16px", cursor: "pointer", textAlign: "left", transition: "all 0.15s",
            }}>
              <div style={{ fontSize: 20, marginBottom: 8 }}>{action.icon}</div>
              <div style={{ fontSize: 13, fontWeight: 700, color: action.color, marginBottom: 3 }}>{action.label}</div>
              <div style={{ fontSize: 11, color: "#555" }}>{action.desc}</div>
            </button>
          ))}
        </div>

        {/* ── LIVE BANNER ── */}
        <div style={{ background: "rgba(34,197,94,0.07)", border: "1px solid rgba(34,197,94,0.2)", borderRadius: 12, padding: "12px 18px", marginBottom: 24, display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{ width: 8, height: 8, borderRadius: "50%", background: "#22c55e", boxShadow: "0 0 8px #22c55e", flexShrink: 0 }} />
          <span style={{ fontSize: 13, fontWeight: 600, color: "#22c55e" }}>2 members live right now</span>
          <span style={{ fontSize: 12, color: "#444" }}>—</span>
          {["Dodge", "Quason"].map(n => (
            <span key={n} style={{ fontSize: 11, background: "rgba(34,197,94,0.12)", border: "1px solid rgba(34,197,94,0.2)", borderRadius: 20, padding: "2px 10px", color: "#22c55e" }}>{n}</span>
          ))}
          <span style={{ marginLeft: "auto", fontSize: 11, color: "#444" }}>last 5 min</span>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
          {/* Left col: KPI cards + Leaderboard */}
          <div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 20 }}>
              {[
                { label: "Total Members", value: "6", sub: "Active in club", href: "/members", color: "#60a5fa" },
                { label: "Total XP", value: "5,900", sub: "Across all members", href: "/members", color: "#FFC107" },
                { label: "Medals Awarded", value: "3", sub: "All events", href: "/members", color: "#facc15" },
                { label: "Upcoming Events", value: "1", sub: "Out of 1 total", href: "/events", color: "#0B5E2F" },
              ].map((s) => (
                <div key={s.label} style={{ background: "#141414", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 14, padding: "16px", position: "relative", overflow: "hidden" }}>
                  <div style={{ fontSize: 10, color: "#555", fontWeight: 600, letterSpacing: "0.06em", marginBottom: 8 }}>{s.label}</div>
                  <div style={{ fontSize: 32, fontWeight: 900, color: s.color, letterSpacing: "-0.02em", lineHeight: 1, marginBottom: 6 }}>{s.value}</div>
                  <div style={{ fontSize: 11, color: "#444", marginBottom: 12 }}>{s.sub}</div>
                  {/* Explicit CTA — key affordance */}
                  <div style={{ display: "inline-flex", alignItems: "center", gap: 4, fontSize: 11, fontWeight: 600, color: s.color, background: `rgba(${s.color === "#60a5fa" ? "96,165,250" : s.color === "#FFC107" ? "255,193,7" : s.color === "#facc15" ? "250,204,21" : "11,94,47"},0.1)`, borderRadius: 8, padding: "4px 10px", cursor: "pointer" }}>
                    View all <span style={{ fontSize: 12 }}>→</span>
                  </div>
                </div>
              ))}
            </div>

            {/* XP Leaderboard with explicit link */}
            <div style={{ background: "#141414", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 14, padding: "16px" }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: "#e5e5e5" }}>⚡ XP Leaderboard</div>
                <div style={{ fontSize: 11, fontWeight: 600, color: "#FFC107", background: "rgba(255,193,7,0.1)", borderRadius: 8, padding: "4px 10px", cursor: "pointer" }}>View members →</div>
              </div>
              {members.slice(0, 5).map((m, i) => {
                const max = members[0].xp || 1;
                const pct = Math.max((m.xp / max) * 100, 3);
                return (
                  <div key={m.name} style={{ display: "flex", alignItems: "center", gap: 8, padding: "7px 8px", borderRadius: 10, marginBottom: 2, cursor: "pointer", border: "1px solid transparent" }}>
                    <span style={{ fontSize: 11, fontWeight: 700, width: 16, textAlign: "center", color: i === 0 ? "#FFC107" : i === 1 ? "#aaa" : i === 2 ? "#92400e" : "#444" }}>{i + 1}</span>
                    <div style={{ width: 24, height: 24, borderRadius: "50%", background: "#1e1e1e", border: "1px solid rgba(255,255,255,0.1)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 9, fontWeight: 700, flexShrink: 0 }}>{m.avatar}</div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 3 }}>
                        <span style={{ fontSize: 12, fontWeight: 600, color: "#ccc" }}>{m.name}</span>
                        <span style={{ fontSize: 11, fontWeight: 700, color: "#FFC107" }}>{m.xp.toLocaleString()}</span>
                      </div>
                      <div style={{ height: 2, background: "rgba(255,255,255,0.06)", borderRadius: 2, overflow: "hidden" }}>
                        <div style={{ height: "100%", background: "#FFC107", borderRadius: 2, width: `${pct}%` }} />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Right col: Push notification composer (action surface) */}
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            <div style={{ background: "#141414", border: "1px solid rgba(255,193,7,0.2)", borderRadius: 16, padding: "20px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
                <div style={{ width: 32, height: 32, borderRadius: 10, background: "rgba(255,193,7,0.12)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16 }}>🔔</div>
                <div>
                  <div style={{ fontSize: 14, fontWeight: 700, color: "#e5e5e5" }}>Push Notification</div>
                  <div style={{ fontSize: 11, color: "#555" }}>Broadcast to all 6 members</div>
                </div>
              </div>
              <div style={{ height: 1, background: "rgba(255,255,255,0.06)", margin: "14px 0" }} />
              <div style={{ marginBottom: 12 }}>
                <label style={{ display: "block", fontSize: 11, fontWeight: 600, color: "#888", letterSpacing: "0.06em", marginBottom: 6 }}>TITLE</label>
                <div style={{ background: "#1a1a1a", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 10, padding: "10px 14px", fontSize: 13, color: "#555" }}>e.g. New event this Friday!</div>
              </div>
              <div style={{ marginBottom: 16 }}>
                <label style={{ display: "block", fontSize: 11, fontWeight: 600, color: "#888", letterSpacing: "0.06em", marginBottom: 6 }}>MESSAGE</label>
                <div style={{ background: "#1a1a1a", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 10, padding: "10px 14px", fontSize: 13, color: "#555", minHeight: 64 }}>e.g. Join us at the sports hall…</div>
              </div>
              <button style={{ width: "100%", background: "#FFC107", border: "none", borderRadius: 12, padding: "13px 0", fontSize: 14, fontWeight: 700, color: "#000", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}>
                <span>✉</span> Send to All Members
              </button>
            </div>

            {/* Session stats — compact, explicit links */}
            <div style={{ background: "#141414", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 16, padding: "18px" }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: "#e5e5e5" }}>📊 Engagement</div>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                {[
                  { label: "Sessions today", value: "44", color: "#22c55e" },
                  { label: "Avg session", value: "2m 8s", color: "#60a5fa" },
                  { label: "This week", value: "44", color: "#a78bfa" },
                  { label: "Total time", value: "1h 33m", color: "#FFC107" },
                ].map((s) => (
                  <div key={s.label} style={{ background: "#1a1a1a", borderRadius: 10, padding: "12px 14px", border: "1px solid rgba(255,255,255,0.05)" }}>
                    <div style={{ fontSize: 10, color: "#555", marginBottom: 4 }}>{s.label}</div>
                    <div style={{ fontSize: 20, fontWeight: 800, color: s.color }}>{s.value}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
