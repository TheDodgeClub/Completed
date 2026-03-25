export function VariantA() {
  const members = [
    { name: "Asher", xp: 4400, medals: 3, rings: 3, avatar: "A" },
    { name: "Jordz", xp: 1000, medals: 0, rings: 1, avatar: "J" },
    { name: "Q", xp: 500, medals: 0, rings: 0, avatar: "Q" },
    { name: "Dodge Club HQ", xp: 0, medals: 0, rings: 0, avatar: "D" },
    { name: "Jabez", xp: 0, medals: 0, rings: 0, avatar: "J" },
  ];

  const days = [
    { label: "Mon 17", sessions: 3, avg: "1m 40s" },
    { label: "Tue 18", sessions: 5, avg: "2m 10s" },
    { label: "Wed 19", sessions: 12, avg: "2m 55s" },
    { label: "Thu 20", sessions: 8, avg: "1m 50s" },
    { label: "Fri 21", sessions: 44, avg: "2m 08s" },
    { label: "Sat 22", sessions: 7, avg: "3m 12s" },
    { label: "Sun 23", sessions: 4, avg: "1m 30s" },
  ];
  const maxSessions = 44;

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
              fontWeight: item.active ? 600 : 400, fontSize: 14,
              cursor: "pointer",
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
            <div style={{ width: 34, height: 32, borderRadius: 8, border: "1px solid rgba(255,255,255,0.1)", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", color: "#666" }}>☀</div>
            <div style={{ flex: 1, height: 32, borderRadius: 8, border: "1px solid rgba(255,255,255,0.1)", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", color: "#777", fontSize: 13 }}>Sign Out</div>
          </div>
        </div>
      </aside>

      {/* Main */}
      <main style={{ flex: 1, overflowY: "auto", padding: "28px 32px", background: "radial-gradient(ellipse at top right, rgba(11,94,47,0.05), transparent 60%)" }}>

        {/* Page title — minimal, doesn't compete */}
        <div style={{ marginBottom: 28 }}>
          <h1 style={{ margin: 0, fontSize: 26, fontWeight: 800, color: "#f0f0f0", letterSpacing: "-0.02em" }}>Dashboard</h1>
          <p style={{ margin: "4px 0 0", fontSize: 13, color: "#555" }}>Welcome back, Dodge Club HQ.</p>
        </div>

        {/* ── SECTION 1: RIGHT NOW — highest visual weight ── */}
        <div style={{ marginBottom: 8, display: "flex", alignItems: "center", gap: 8 }}>
          <div style={{ width: 6, height: 6, borderRadius: "50%", background: "#22c55e", boxShadow: "0 0 6px #22c55e" }} />
          <span style={{ fontSize: 10, letterSpacing: "0.12em", textTransform: "uppercase", fontWeight: 700, color: "#22c55e" }}>Right now</span>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 16, marginBottom: 32 }}>
          {/* Live users — MOST PROMINENT */}
          <div style={{ gridColumn: "1 / 2", background: "rgba(34,197,94,0.08)", border: "1px solid rgba(34,197,94,0.25)", borderRadius: 16, padding: "20px 24px", position: "relative", overflow: "hidden" }}>
            <div style={{ fontSize: 11, color: "#22c55e", fontWeight: 600, letterSpacing: "0.06em", marginBottom: 8 }}>Members in app</div>
            <div style={{ display: "flex", alignItems: "baseline", gap: 8 }}>
              <span style={{ fontSize: 52, fontWeight: 900, color: "#22c55e", lineHeight: 1 }}>2</span>
              <span style={{ fontSize: 14, color: "rgba(34,197,94,0.6)", fontWeight: 500 }}>live</span>
            </div>
            <div style={{ marginTop: 12, display: "flex", gap: 6 }}>
              {["Dodge", "Quason"].map((n) => (
                <div key={n} style={{ display: "flex", alignItems: "center", gap: 5, background: "rgba(34,197,94,0.12)", border: "1px solid rgba(34,197,94,0.2)", borderRadius: 20, padding: "3px 10px" }}>
                  <div style={{ width: 14, height: 14, borderRadius: "50%", background: "rgba(34,197,94,0.3)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 8, fontWeight: 700, color: "#22c55e" }}>{n[0]}</div>
                  <span style={{ fontSize: 11, color: "#22c55e", fontWeight: 500 }}>{n}</span>
                </div>
              ))}
            </div>
            <div style={{ position: "absolute", top: 16, right: 16, fontSize: 11, color: "rgba(34,197,94,0.4)" }}>last 5 min</div>
          </div>

          {/* Today's sessions — secondary signal */}
          <div style={{ background: "#141414", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 16, padding: "20px 24px" }}>
            <div style={{ fontSize: 11, color: "#888", fontWeight: 600, letterSpacing: "0.06em", marginBottom: 8 }}>Sessions today</div>
            <div style={{ display: "flex", alignItems: "baseline", gap: 8 }}>
              <span style={{ fontSize: 40, fontWeight: 800, color: "#e5e5e5", lineHeight: 1 }}>44</span>
            </div>
            <div style={{ marginTop: 8, fontSize: 12, color: "#555" }}>Avg 2m 8s per session</div>
          </div>

          {/* Upcoming events */}
          <div style={{ background: "#141414", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 16, padding: "20px 24px" }}>
            <div style={{ fontSize: 11, color: "#888", fontWeight: 600, letterSpacing: "0.06em", marginBottom: 8 }}>Upcoming events</div>
            <div style={{ display: "flex", alignItems: "baseline", gap: 8 }}>
              <span style={{ fontSize: 40, fontWeight: 800, color: "#FFC107", lineHeight: 1 }}>1</span>
            </div>
            <div style={{ marginTop: 8, fontSize: 12, color: "#555" }}>Out of 1 total event</div>
          </div>
        </div>

        {/* ── SECTION 2: CLUB HEALTH — medium weight ── */}
        <div style={{ marginBottom: 8, display: "flex", alignItems: "center", gap: 8 }}>
          <div style={{ width: 14, height: 1, background: "rgba(255,255,255,0.15)" }} />
          <span style={{ fontSize: 10, letterSpacing: "0.12em", textTransform: "uppercase", fontWeight: 700, color: "#555" }}>Club health</span>
          <div style={{ flex: 1, height: 1, background: "rgba(255,255,255,0.06)" }} />
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12, marginBottom: 28 }}>
          {[
            { label: "Members", value: "6", sub: "Active in club", color: "#60a5fa" },
            { label: "Total XP", value: "5,900", sub: "Across all members", color: "#FFC107" },
            { label: "Medals", value: "3", sub: "All-time awarded", color: "#facc15" },
            { label: "Total time", value: "1h 33m", sub: "All sessions", color: "#a78bfa" },
          ].map((s) => (
            <div key={s.label} style={{ background: "#141414", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 12, padding: "14px 16px" }}>
              <div style={{ fontSize: 10, color: "#555", fontWeight: 600, letterSpacing: "0.06em", marginBottom: 6 }}>{s.label}</div>
              <div style={{ fontSize: 26, fontWeight: 800, color: s.color, letterSpacing: "-0.02em" }}>{s.value}</div>
              <div style={{ fontSize: 11, color: "#444", marginTop: 4 }}>{s.sub}</div>
            </div>
          ))}
        </div>

        {/* ── SECTION 3: LEADERBOARDS — lower weight ── */}
        <div style={{ marginBottom: 8, display: "flex", alignItems: "center", gap: 8 }}>
          <div style={{ width: 14, height: 1, background: "rgba(255,255,255,0.15)" }} />
          <span style={{ fontSize: 10, letterSpacing: "0.12em", textTransform: "uppercase", fontWeight: 700, color: "#555" }}>Leaderboards</span>
          <div style={{ flex: 1, height: 1, background: "rgba(255,255,255,0.06)" }} />
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 16, marginBottom: 28 }}>
          {[
            { title: "XP", color: "#FFC107", key: "xp", fmt: (v: number) => v.toLocaleString() },
            { title: "Medals", color: "#facc15", key: "medals", fmt: (v: number) => `${v} 🏅` },
            { title: "Rings", color: "#a78bfa", key: "rings", fmt: (v: number) => `${v} 💍` },
          ].map((lb) => {
            const sorted = [...members].sort((a, b) => (b as any)[lb.key] - (a as any)[lb.key]);
            const max = (sorted[0] as any)[lb.key] || 1;
            return (
              <div key={lb.title} style={{ background: "#141414", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 14, padding: "14px 16px" }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: "#e5e5e5", marginBottom: 10, display: "flex", alignItems: "center", gap: 6 }}>
                  <span style={{ color: lb.color }}>●</span> {lb.title}
                </div>
                {sorted.slice(0, 5).map((m, i) => {
                  const val = (m as any)[lb.key];
                  const pct = max > 0 ? Math.max((val / max) * 100, 3) : 3;
                  return (
                    <div key={m.name} style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
                      <span style={{ fontSize: 11, fontWeight: 700, width: 16, textAlign: "center", color: i === 0 ? "#FFC107" : i === 1 ? "#aaa" : i === 2 ? "#92400e" : "#444" }}>{i + 1}</span>
                      <div style={{ width: 22, height: 22, borderRadius: "50%", background: "#1e1e1e", border: "1px solid rgba(255,255,255,0.1)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 9, fontWeight: 700, flexShrink: 0 }}>{m.avatar}</div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 3 }}>
                          <span style={{ fontSize: 11, fontWeight: 600, color: "#ccc", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{m.name}</span>
                          <span style={{ fontSize: 11, fontWeight: 700, color: lb.color, flexShrink: 0, marginLeft: 4 }}>{lb.fmt(val)}</span>
                        </div>
                        <div style={{ height: 2, background: "rgba(255,255,255,0.06)", borderRadius: 2, overflow: "hidden" }}>
                          <div style={{ height: "100%", background: lb.color, borderRadius: 2, width: `${pct}%`, opacity: 0.7 }} />
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            );
          })}
        </div>

        {/* ── SECTION 4: ENGAGEMENT — lowest weight, compact ── */}
        <div style={{ marginBottom: 8, display: "flex", alignItems: "center", gap: 8 }}>
          <div style={{ width: 14, height: 1, background: "rgba(255,255,255,0.15)" }} />
          <span style={{ fontSize: 10, letterSpacing: "0.12em", textTransform: "uppercase", fontWeight: 700, color: "#555" }}>App engagement — last 7 days</span>
          <div style={{ flex: 1, height: 1, background: "rgba(255,255,255,0.06)" }} />
        </div>
        <div style={{ background: "#141414", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 14, padding: "16px 20px" }}>
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            {days.map((d) => (
              <div key={d.label} style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <span style={{ fontSize: 11, color: "#555", width: 60, flexShrink: 0 }}>{d.label}</span>
                <div style={{ flex: 1, height: 14, background: "rgba(255,255,255,0.04)", borderRadius: 4, overflow: "hidden" }}>
                  <div style={{ height: "100%", background: "rgba(11,94,47,0.6)", borderRadius: 4, width: `${(d.sessions / maxSessions) * 100}%`, transition: "width 0.3s" }} />
                </div>
                <span style={{ fontSize: 11, color: "#555", width: 70, textAlign: "right", flexShrink: 0 }}>{d.sessions} · {d.avg}</span>
              </div>
            ))}
          </div>
        </div>
      </main>
    </div>
  );
}
