import React from 'react';
import './_group.css';

const EVENTS = [
  { day: "11", month: "APR", title: "Friday Night Throwdown", location: "Hackney Sports Hall, London", time: "19:30" },
  { day: "20", month: "SEPT", title: "Charity Dodge-a-thon", location: "Wembley Arena, London", time: "11:00" },
  { day: "15", month: "AUG", title: "Dodge Club Summer Slam", location: "Brixton Recreation Centre, London", time: "20:00" },
];

const POSTS = [
  { title: "New season kits are in!", date: "3 days ago", preview: "The new green and gold kits are available to pre-order now through the merch store." },
  { title: "Friendly match vs Hackney Rockets", date: "1 week ago", preview: "Great game last Saturday. Thanks to everyone who came out to support the team." },
];

const STATS = { events: 4, members: 3, tickets: 3 };

export function VariantB() {
  return (
    <div style={{ display: "flex", justifyContent: "center", alignItems: "flex-start", minHeight: "100vh", backgroundColor: "#111", padding: "24px 0" }}>
      <div style={{ width: 390, minHeight: 844, backgroundColor: "var(--dc-bg)", borderRadius: 40, overflow: "hidden", boxShadow: "0 24px 80px rgba(0,0,0,0.8)", position: "relative", fontFamily: "'Inter', sans-serif" }}>
        
        <div style={{ height: "calc(100% - 70px)", overflowY: "auto", paddingBottom: "20px" }}>
          
          {/* Hero */}
          <div style={{ 
            background: "linear-gradient(135deg, var(--dc-primary) 0%, var(--dc-primary-dark) 100%)",
            padding: "48px 24px 32px"
          }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 16 }}>
              <div>
                <div style={{ fontSize: 12, fontWeight: 700, color: "rgba(255,255,255,0.75)", letterSpacing: 3 }}>THE DODGE</div>
                <div style={{ fontSize: 44, fontWeight: 800, color: "var(--dc-text)", lineHeight: 1.1 }}>CLUB</div>
              </div>
              <div style={{ 
                width: 44, height: 44, 
                backgroundColor: "rgba(255,255,255,0.15)", 
                borderRadius: 22, 
                display: "flex", alignItems: "center", justifyContent: "center",
                position: "relative", cursor: "pointer"
              }}>
                <span style={{ fontSize: 20 }}>🔔</span>
                <div style={{ position: "absolute", top: 10, right: 12, width: 8, height: 8, backgroundColor: "red", borderRadius: 4 }}></div>
              </div>
            </div>

            <div style={{ fontSize: 15, color: "rgba(255,255,255,0.85)", marginBottom: 24, lineHeight: 1.5, maxWidth: 260 }}>
              Where legends dodge and champions are made.
            </div>

            <div style={{ display: "flex", gap: "12px" }}>
              <button style={{ 
                backgroundColor: "#fff", 
                color: "var(--dc-primary-dark)", 
                border: "none", 
                borderRadius: 12, 
                padding: "14px 20px", 
                fontSize: 14, 
                fontWeight: 700,
                cursor: "pointer",
                display: "flex", alignItems: "center", gap: 8,
                minHeight: 44
              }}>
                👤 Join Now
              </button>
              <button style={{ 
                backgroundColor: "transparent", 
                color: "var(--dc-accent)", 
                border: "2px solid var(--dc-accent)", 
                borderRadius: 12, 
                padding: "14px 20px", 
                fontSize: 14, 
                fontWeight: 700,
                cursor: "pointer",
                display: "flex", alignItems: "center", gap: 8,
                minHeight: 44
              }}>
                🎟️ Buy Tickets
              </button>
            </div>
          </div>

          <div style={{ padding: "20px", display: "flex", flexDirection: "column", gap: "28px" }}>
            
            {/* Stats */}
            <div>
              <h2 style={{ fontSize: 20, fontWeight: 800, color: "var(--dc-text)", marginBottom: 14 }}>Community Stats</h2>
              <div style={{ display: "flex", gap: "10px" }}>
                {[
                  { label: "Events", value: STATS.events, color: "var(--dc-primary)" },
                  { label: "Members", value: STATS.members, color: "var(--dc-secondary)" },
                  { label: "Tickets", value: STATS.tickets, color: "var(--dc-accent)" }
                ].map((stat, i) => (
                  <div key={i} style={{ 
                    flex: 1, 
                    backgroundColor: "var(--dc-surface)", 
                    padding: "16px 12px", 
                    borderRadius: 12,
                    display: "flex", flexDirection: "column", alignItems: "center", gap: 4,
                    position: "relative",
                    minHeight: 44,
                    cursor: "pointer"
                  }}>
                    <div style={{ fontSize: 24, fontWeight: 800, color: stat.color }}>{stat.value}</div>
                    <div style={{ fontSize: 12, color: "var(--dc-text-secondary)" }}>{stat.label}</div>
                    <div style={{ position: "absolute", right: 8, bottom: 8, color: "var(--dc-text-muted)", fontSize: 10 }}>›</div>
                  </div>
                ))}
              </div>
            </div>

            {/* Upcoming Events */}
            <div>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
                <h2 style={{ fontSize: 20, fontWeight: 800, color: "var(--dc-text)" }}>Upcoming Events</h2>
                <button style={{ 
                  backgroundColor: "rgba(26, 140, 78, 0.2)", 
                  color: "var(--dc-secondary)", 
                  border: "none", 
                  borderRadius: 16, 
                  padding: "8px 16px", 
                  fontSize: 13, 
                  fontWeight: 600,
                  cursor: "pointer",
                  minHeight: 44
                }}>
                  View All Events →
                </button>
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                {EVENTS.map((event, i) => (
                  <div key={i} style={{ 
                    backgroundColor: "var(--dc-surface)", 
                    borderRadius: 12, 
                    borderBottom: "4px solid var(--dc-surface2)",
                    padding: "16px",
                    display: "flex", alignItems: "center", gap: 16,
                    cursor: "pointer",
                    minHeight: 44
                  }}>
                    <div style={{ backgroundColor: "var(--dc-surface2)", padding: "12px", borderRadius: 8, textAlign: "center", minWidth: 60 }}>
                      <div style={{ fontSize: 20, fontWeight: 800, color: "var(--dc-text)" }}>{event.day}</div>
                      <div style={{ fontSize: 11, fontWeight: 600, color: "var(--dc-primary)" }}>{event.month}</div>
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 16, fontWeight: 800, color: "var(--dc-text)", marginBottom: 4 }}>{event.title}</div>
                      <div style={{ fontSize: 13, color: "var(--dc-text-secondary)", marginBottom: 8 }}>{event.location}</div>
                      <div style={{ fontSize: 12, color: "var(--dc-primary)", fontWeight: 600 }}>Tap to get tickets</div>
                    </div>
                    <div style={{ fontSize: 24, color: "var(--dc-text-muted)" }}>›</div>
                  </div>
                ))}
              </div>
            </div>

            {/* Merch CTA */}
            <div style={{ 
              background: "linear-gradient(90deg, var(--dc-secondary) 0%, #0E5C30 100%)",
              borderRadius: 18, 
              padding: "20px",
              display: "flex", alignItems: "center", gap: 16,
              cursor: "pointer",
              minHeight: 44
            }}>
              <span style={{ fontSize: 32 }}>🛍️</span>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 16, fontWeight: 700, color: "#fff", marginBottom: 4 }}>Official Merch</div>
                <div style={{ fontSize: 13, color: "rgba(255,255,255,0.8)" }}>Rep the Dodge Club.</div>
              </div>
              <button style={{
                backgroundColor: "#fff",
                color: "var(--dc-primary)",
                border: "none",
                borderRadius: 20,
                padding: "10px 16px",
                fontSize: 12,
                fontWeight: 800,
                minHeight: 44
              }}>
                SHOP NOW
              </button>
            </div>

          </div>
        </div>

        {/* Bottom nav bar */}
        <div style={{ position: "absolute", bottom: 0, width: "100%", backgroundColor: "#111", borderTop: "1px solid #2E2E2E", display: "flex", padding: "10px 0 20px" }}>
          {["Home","Tickets","Merch","Updates","Member"].map((tab, i) => (
            <div key={tab} style={{ flex: 1, textAlign: "center", color: i === 0 ? "#0B5E2F" : "#666", fontSize: 10 }}>
              <div style={{ fontSize: 20, marginBottom: 2 }}>{"🏠🎟️🛍️📢👤".split("").filter((_,j) => j === i*2)[0]}</div>
              {tab}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}