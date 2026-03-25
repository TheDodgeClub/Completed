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

export function VariantC() {
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
                <div style={{ fontSize: 14, fontWeight: 700, color: "#fff", letterSpacing: 3, textShadow: "0 1px 3px rgba(0,0,0,0.5)" }}>THE DODGE</div>
                <div style={{ fontSize: 44, fontWeight: 800, color: "#fff", lineHeight: 1.1, textShadow: "0 1px 3px rgba(0,0,0,0.5)" }}>CLUB</div>
              </div>
              <div style={{ 
                width: 44, height: 44, 
                backgroundColor: "rgba(0,0,0,0.4)", 
                borderRadius: 22, 
                display: "flex", alignItems: "center", justifyContent: "center",
                cursor: "pointer"
              }}>
                <span style={{ fontSize: 20 }}>🔔</span>
              </div>
            </div>

            <div style={{ 
              fontSize: 17, 
              color: "#fff", 
              marginBottom: 24, 
              lineHeight: 1.5, 
              maxWidth: 280,
              textShadow: "0 1px 3px rgba(0,0,0,0.5)"
            }}>
              Where legends dodge and champions are made.
            </div>

            <div style={{ display: "flex", gap: "12px" }}>
              <button style={{ 
                backgroundColor: "var(--dc-primary-dark)", 
                color: "#fff", 
                border: "2px solid #fff", 
                borderRadius: 12, 
                padding: "14px 20px", 
                fontSize: 16, 
                fontWeight: 700,
                cursor: "pointer",
                display: "flex", alignItems: "center", gap: 8
              }}>
                👤 Join Now
              </button>
              <button style={{ 
                backgroundColor: "var(--dc-primary-dark)", 
                color: "#fff", 
                border: "2px solid #fff", 
                borderRadius: 12, 
                padding: "14px 20px", 
                fontSize: 16, 
                fontWeight: 700,
                cursor: "pointer",
                display: "flex", alignItems: "center", gap: 8
              }}>
                🎟️ Buy Tickets
              </button>
            </div>
          </div>

          <div style={{ padding: "20px", display: "flex", flexDirection: "column", gap: "32px" }}>
            
            {/* Stats */}
            <div>
              <h2 style={{ fontSize: 22, fontWeight: 800, color: "var(--dc-text)", marginBottom: 18, fontFamily: "'Poppins', sans-serif" }}>Community Stats</h2>
              <div style={{ display: "flex", gap: "10px" }}>
                {[
                  { label: "Events", value: STATS.events, icon: "📅" },
                  { label: "Members", value: STATS.members, icon: "👥" },
                  { label: "Tickets", value: STATS.tickets, icon: "🎟️" }
                ].map((stat, i) => (
                  <div key={i} style={{ 
                    flex: 1, 
                    backgroundColor: "var(--dc-surface)", 
                    border: "1px solid var(--dc-border)",
                    padding: "16px 12px", 
                    borderRadius: 12,
                    display: "flex", flexDirection: "column", alignItems: "center", gap: 8
                  }}>
                    <div style={{ fontSize: 20 }}>{stat.icon}</div>
                    <div style={{ fontSize: 32, fontWeight: 800, color: "var(--dc-text)" }}>{stat.value}</div>
                    <div style={{ fontSize: 13, color: "var(--dc-text-secondary)" }}>{stat.label}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* Upcoming Events */}
            <div>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 18 }}>
                <h2 style={{ fontSize: 22, fontWeight: 800, color: "var(--dc-text)", fontFamily: "'Poppins', sans-serif" }}>Upcoming Events</h2>
                <button style={{ 
                  background: "none", 
                  border: "none", 
                  color: "var(--dc-secondary)", 
                  fontSize: 15, 
                  fontWeight: 600,
                  cursor: "pointer"
                }}>
                  See All
                </button>
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
                {EVENTS.map((event, i) => (
                  <div key={i} style={{ 
                    backgroundColor: "var(--dc-surface)", 
                    borderRadius: 12, 
                    border: "1px solid var(--dc-border)",
                    padding: "16px",
                    display: "flex", gap: 16
                  }}>
                    <div style={{ backgroundColor: "var(--dc-surface2)", padding: "12px", borderRadius: 8, textAlign: "center", minWidth: 65, alignSelf: "flex-start" }}>
                      <span className="sr-only" style={{ position: "absolute", width: 1, height: 1, padding: 0, margin: -1, overflow: "hidden", clip: "rect(0, 0, 0, 0)", whiteSpace: "nowrap", borderWidth: 0 }}>Date:</span>
                      <div style={{ fontSize: 22, fontWeight: 800, color: "var(--dc-text)" }}>{event.day}</div>
                      <div style={{ fontSize: 13, fontWeight: 600, color: "var(--dc-primary)" }}>{event.month}</div>
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 18, fontWeight: 800, color: "var(--dc-text)", marginBottom: 8 }}>{event.title}</div>
                      <div style={{ fontSize: 14, color: "var(--dc-text-secondary)", marginBottom: 6 }}>
                        <strong style={{ color: "var(--dc-text)" }}>Location:</strong> {event.location}
                      </div>
                      <div style={{ fontSize: 14, color: "var(--dc-text-secondary)" }}>
                        <strong style={{ color: "var(--dc-text)" }}>Time:</strong> {event.time}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Merch CTA */}
            <div style={{ 
              background: "linear-gradient(90deg, var(--dc-secondary) 0%, #0E5C30 100%)",
              borderRadius: 18, 
              padding: "24px",
              display: "flex", alignItems: "center", gap: 16,
              cursor: "pointer"
            }}>
              <span style={{ fontSize: 32 }}>🛍️</span>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 18, fontWeight: 700, color: "#fff", marginBottom: 6, textShadow: "0 1px 2px rgba(0,0,0,0.5)" }}>Official Merch</div>
                <div style={{ fontSize: 15, color: "#fff", textShadow: "0 1px 2px rgba(0,0,0,0.5)" }}>Rep the Dodge Club. Shop now.</div>
              </div>
              <span style={{ color: "#fff", fontSize: 24 }}>›</span>
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