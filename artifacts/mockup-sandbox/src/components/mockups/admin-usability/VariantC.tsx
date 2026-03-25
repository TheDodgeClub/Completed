export function VariantC() {
  const members = [
    { name: "Asher", xp: 4400, medals: 3, rings: 3, avatar: "A", avatarBg: "#1d4ed8" },
    { name: "Jordz", xp: 1000, medals: 0, rings: 1, avatar: "J", avatarBg: "#7c3aed" },
    { name: "Q", xp: 500, medals: 0, rings: 0, avatar: "Q", avatarBg: "#b45309" },
    { name: "Dodge Club HQ", xp: 0, medals: 0, rings: 0, avatar: "D", avatarBg: "#166534" },
    { name: "Jabez", xp: 0, medals: 0, rings: 0, avatar: "J", avatarBg: "#9f1239" },
  ];

  const navItems = [
    { label: "Dashboard", active: true },
    { label: "Events", count: 1 },
    { label: "Posts", count: 2 },
    { label: "Videos", count: 0 },
    { label: "Merch", count: 4 },
    { label: "Members", count: 6 },
    { label: "Elite Members" },
    { label: "Settings" },
  ];

  return (
    <div style={{ display: "flex", height: "100vh", background: "#f8f9fa", fontFamily: "'Inter', system-ui, sans-serif", overflow: "hidden", color: "#111" }}>
      {/* Sidebar — high contrast light/dark hybrid */}
      <aside style={{ width: 232, background: "#1a1a1a", borderRight: "none", display: "flex", flexDirection: "column", flexShrink: 0 }}>
        <div style={{ padding: "24px 20px 16px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <div style={{ width: 40, height: 40, borderRadius: 12, background: "#0B5E2F", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <span style={{ color: "#fff", fontWeight: 800, fontSize: 16, letterSpacing: "-0.5px" }}>DC</span>
            </div>
            <div>
              <div style={{ fontWeight: 700, fontSize: 16, color: "#fff", lineHeight: 1.2 }}>Dodge Club</div>
              <div style={{ fontSize: 11, color: "#0B5E2F", letterSpacing: "0.14em", textTransform: "uppercase", fontWeight: 600, marginTop: 2 }}>Admin</div>
            </div>
          </div>
        </div>

        {/* Section label — visible, not hidden in opacity */}
        <div style={{ padding: "8px 20px 8px", fontSize: 11, color: "#888", letterSpacing: "0.12em", textTransform: "uppercase", fontWeight: 700, borderTop: "1px solid #2a2a2a" }}>Management</div>
        <nav style={{ flex: 1, padding: "4px 12px" }}>
          {navItems.map((item) => (
            <div key={item.label} style={{
              display: "flex", alignItems: "center", gap: 10, padding: "11px 14px", borderRadius: 10, marginBottom: 2,
              background: item.active ? "#0B5E2F" : "transparent",
              color: item.active ? "#fff" : "#aaa",
              fontWeight: item.active ? 700 : 400, fontSize: 14, cursor: "pointer",
              transition: "background 0.15s",
            }}>
              <span style={{ flex: 1 }}>{item.label}</span>
              {item.count !== undefined && (
                <span style={{
                  fontSize: 12, padding: "2px 8px", borderRadius: 10, fontWeight: 700,
                  background: item.active ? "rgba(255,255,255,0.2)" : "#2a2a2a",
                  color: item.active ? "#fff" : "#666",
                }}>{item.count}</span>
              )}
            </div>
          ))}
        </nav>
        <div style={{ padding: 16, borderTop: "1px solid #2a2a2a" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 4px", marginBottom: 10 }}>
            <div style={{ width: 36, height: 36, borderRadius: "50%", background: "#0B5E2F", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 800, fontSize: 14, color: "#fff", flexShrink: 0 }}>D</div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 14, fontWeight: 700, color: "#fff", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>Dodge Club HQ</div>
              <div style={{ fontSize: 11, color: "#888", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>admin@dodgeclub.com</div>
            </div>
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <button style={{ width: 40, height: 40, borderRadius: 10, background: "#2a2a2a", border: "1px solid #333", cursor: "pointer", color: "#aaa", fontSize: 15, display: "flex", alignItems: "center", justifyContent: "center" }}>☀</button>
            <button style={{ flex: 1, height: 40, borderRadius: 10, background: "#2a2a2a", border: "1px solid #333", cursor: "pointer", color: "#e55", fontSize: 14, fontWeight: 600 }}>Sign Out</button>
          </div>
        </div>
      </aside>

      {/* Main — light background for maximum contrast */}
      <main style={{ flex: 1, overflowY: "auto", padding: "36px 40px", background: "#f5f5f5" }}>

        {/* Page header — large, legible */}
        <div style={{ marginBottom: 32 }}>
          <h1 style={{ margin: 0, fontSize: 30, fontWeight: 800, color: "#111", letterSpacing: "-0.03em" }}>Dashboard</h1>
          <p style={{ margin: "6px 0 0", fontSize: 15, color: "#555", lineHeight: 1.5 }}>
            Welcome back, <strong style={{ color: "#111" }}>Dodge Club HQ</strong>. Here's what's happening today.
          </p>
        </div>

        {/* ── STATUS BANNER — text + color, not just color ── */}
        <div style={{ background: "#fff", border: "2px solid #16a34a", borderRadius: 14, padding: "16px 20px", marginBottom: 32, display: "flex", alignItems: "center", gap: 14, boxShadow: "0 1px 4px rgba(0,0,0,0.06)" }}>
          {/* Text label alongside color indicator */}
          <div style={{ display: "flex", alignItems: "center", gap: 8, background: "#dcfce7", borderRadius: 10, padding: "6px 14px" }}>
            <div style={{ width: 10, height: 10, borderRadius: "50%", background: "#16a34a" }} />
            <span style={{ fontSize: 14, fontWeight: 700, color: "#15803d" }}>LIVE NOW</span>
          </div>
          <span style={{ fontSize: 16, fontWeight: 700, color: "#111" }}>2 members in the app</span>
          <span style={{ fontSize: 13, color: "#888" }}>Dodge, Quason — checked in last 5 minutes</span>
        </div>

        {/* ── KPI CARDS — large numbers, clear labels ── */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 16, marginBottom: 32 }}>
          {[
            { label: "Total Members", value: "6", sub: "Active in the club", color: "#1d4ed8", bgAccent: "#eff6ff", border: "#bfdbfe" },
            { label: "Total XP Earned", value: "5,900", sub: "Across 6 members", color: "#b45309", bgAccent: "#fffbeb", border: "#fde68a" },
            { label: "Medals Awarded", value: "3", sub: "Across all events", color: "#15803d", bgAccent: "#f0fdf4", border: "#bbf7d0" },
            { label: "Upcoming Events", value: "1", sub: "Out of 1 total", color: "#7c3aed", bgAccent: "#faf5ff", border: "#ddd6fe" },
          ].map((s) => (
            <div key={s.label} style={{ background: "#fff", border: `1px solid ${s.border}`, borderRadius: 16, padding: "20px 22px", boxShadow: "0 1px 4px rgba(0,0,0,0.05)" }}>
              {/* Label first, clearly readable */}
              <div style={{ fontSize: 12, fontWeight: 700, color: "#555", letterSpacing: "0.04em", marginBottom: 10, textTransform: "uppercase" }}>{s.label}</div>
              {/* Very large number */}
              <div style={{ fontSize: 48, fontWeight: 900, color: s.color, letterSpacing: "-0.04em", lineHeight: 1 }}>{s.value}</div>
              {/* Contextual sub-label */}
              <div style={{ fontSize: 13, color: "#777", marginTop: 8, lineHeight: 1.4 }}>{s.sub}</div>
            </div>
          ))}
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 24 }}>
          {/* Left col: Leaderboard */}
          <div style={{ background: "#fff", border: "1px solid #e5e7eb", borderRadius: 16, padding: "22px 24px", boxShadow: "0 1px 4px rgba(0,0,0,0.05)" }}>
            {/* Section heading — visible size, not just muted */}
            <h2 style={{ margin: "0 0 18px", fontSize: 16, fontWeight: 800, color: "#111", letterSpacing: "-0.02em" }}>⚡ XP Leaderboard</h2>
            {members.map((m, i) => {
              const max = members[0].xp || 1;
              const pct = Math.max((m.xp / max) * 100, 3);
              return (
                <div key={m.name} style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 8px", borderRadius: 12, marginBottom: 4, background: i === 0 ? "#f0fdf4" : "transparent", border: i === 0 ? "1px solid #bbf7d0" : "1px solid transparent" }}>
                  {/* Rank with text — position 1/2/3 clearly differentiated */}
                  <div style={{ width: 28, height: 28, borderRadius: "50%", background: i === 0 ? "#15803d" : i === 1 ? "#475569" : i === 2 ? "#92400e" : "#e5e7eb", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                    <span style={{ fontSize: 12, fontWeight: 800, color: i < 3 ? "#fff" : "#6b7280" }}>{i + 1}</span>
                  </div>
                  <div style={{ width: 34, height: 34, borderRadius: "50%", background: m.avatarBg, display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 800, fontSize: 13, color: "#fff", flexShrink: 0 }}>{m.avatar}</div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 6 }}>
                      <span style={{ fontSize: 14, fontWeight: 700, color: "#111", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{m.name}</span>
                      <span style={{ fontSize: 14, fontWeight: 800, color: "#15803d", flexShrink: 0, marginLeft: 8 }}>{m.xp.toLocaleString()} XP</span>
                    </div>
                    {/* Thicker, visible progress bar */}
                    <div style={{ height: 6, background: "#e5e7eb", borderRadius: 4, overflow: "hidden" }}>
                      <div style={{ height: "100%", background: "#15803d", borderRadius: 4, width: `${pct}%` }} />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Right col: Engagement stats + session chart */}
          <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
            {/* Engagement numbers — bigger text, clear labels */}
            <div style={{ background: "#fff", border: "1px solid #e5e7eb", borderRadius: 16, padding: "22px 24px", boxShadow: "0 1px 4px rgba(0,0,0,0.05)" }}>
              <h2 style={{ margin: "0 0 16px", fontSize: 16, fontWeight: 800, color: "#111" }}>📊 App Engagement</h2>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
                {[
                  { label: "Sessions Today", value: "44", sub: "Avg 2m 8s each", color: "#1d4ed8" },
                  { label: "Avg Session Length", value: "2m 8s", sub: "All-time per session", color: "#15803d" },
                  { label: "Sessions This Week", value: "44", sub: "Same as today", color: "#7c3aed" },
                  { label: "Total Time in App", value: "1h 33m", sub: "Across 44 sessions", color: "#b45309" },
                ].map((s) => (
                  <div key={s.label} style={{ background: "#f8f9fa", borderRadius: 12, padding: "14px 16px", border: "1px solid #e5e7eb" }}>
                    {/* Label visible even at small size — uppercase with weight */}
                    <div style={{ fontSize: 11, fontWeight: 700, color: "#777", letterSpacing: "0.06em", textTransform: "uppercase", marginBottom: 8 }}>{s.label}</div>
                    <div style={{ fontSize: 26, fontWeight: 900, color: s.color, letterSpacing: "-0.03em", lineHeight: 1 }}>{s.value}</div>
                    <div style={{ fontSize: 12, color: "#888", marginTop: 5 }}>{s.sub}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* Push notification — visible but not buried */}
            <div style={{ background: "#fff", border: "1px solid #e5e7eb", borderRadius: 16, padding: "22px 24px", boxShadow: "0 1px 4px rgba(0,0,0,0.05)" }}>
              <h2 style={{ margin: "0 0 4px", fontSize: 16, fontWeight: 800, color: "#111" }}>🔔 Push Notification</h2>
              <p style={{ margin: "0 0 16px", fontSize: 13, color: "#666" }}>Broadcast an alert to all members with notifications enabled.</p>
              <div style={{ background: "#f5f5f5", border: "1px solid #ddd", borderRadius: 10, padding: "10px 14px", fontSize: 14, color: "#999", marginBottom: 10, minHeight: 40 }}>Notification title…</div>
              <div style={{ background: "#f5f5f5", border: "1px solid #ddd", borderRadius: 10, padding: "10px 14px", fontSize: 14, color: "#999", marginBottom: 14, minHeight: 56 }}>Message body…</div>
              <button style={{ background: "#0B5E2F", color: "#fff", border: "none", borderRadius: 12, padding: "13px 0", width: "100%", fontSize: 15, fontWeight: 700, cursor: "pointer", letterSpacing: "0.01em" }}>
                Send to All Members →
              </button>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
