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

export function VariantA() {
  const nextEvent = EVENTS[0];
  const moreEvents = EVENTS.slice(1);

  return (
    <div style={{ display: "flex", justifyContent: "center", alignItems: "flex-start", minHeight: "100vh", backgroundColor: "#111", padding: "24px 0" }}>
      <div style={{ width: 390, minHeight: 844, backgroundColor: "var(--dc-bg)", borderRadius: 40, overflow: "hidden", boxShadow: "0 24px 80px rgba(0,0,0,0.8)", position: "relative", fontFamily: "'Inter', sans-serif" }}>
        
        {/* Content Area */}
        <div style={{ height: "calc(100% - 70px)", overflowY: "auto", paddingBottom: "20px" }}>
          
          {/* Minimal Header */}
          <div style={{ 
            height: 72, 
            backgroundColor: "var(--dc-primary)", 
            display: "flex", 
            justifyContent: "space-between", 
            alignItems: "center",
            padding: "0 20px"
          }}>
            <div style={{ fontWeight: 800, fontSize: 16, color: "var(--dc-text)", letterSpacing: 1 }}>THE DODGE CLUB</div>
            <div style={{ fontSize: 20 }}>🔔</div>
          </div>

          <div style={{ padding: "20px" }}>
            
            {/* NEXT EVENT Dominant Card */}
            <div style={{ 
              backgroundColor: "var(--dc-surface)", 
              borderRadius: 16, 
              border: "1px solid var(--dc-border)",
              padding: "24px",
              marginBottom: "24px",
              display: "flex",
              flexDirection: "column",
              gap: "16px"
            }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: "var(--dc-accent)", letterSpacing: 2 }}>NEXT EVENT</div>
              
              <div style={{ display: "flex", gap: "16px", alignItems: "flex-start" }}>
                <div style={{ 
                  backgroundColor: "var(--dc-surface2)", 
                  padding: "12px", 
                  borderRadius: 12, 
                  textAlign: "center",
                  minWidth: "60px"
                }}>
                  <div style={{ fontSize: 24, fontWeight: 800, color: "var(--dc-text)" }}>{nextEvent.day}</div>
                  <div style={{ fontSize: 12, fontWeight: 600, color: "var(--dc-primary)" }}>{nextEvent.month}</div>
                </div>
                
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 24, fontWeight: 800, color: "var(--dc-text)", marginBottom: 8, lineHeight: 1.2 }}>{nextEvent.title}</div>
                  <div style={{ fontSize: 14, color: "var(--dc-text-secondary)", marginBottom: 4 }}>📍 {nextEvent.location}</div>
                  <div style={{ fontSize: 14, color: "var(--dc-text-secondary)" }}>⏰ {nextEvent.time}</div>
                </div>
              </div>

              <button style={{ 
                backgroundColor: "var(--dc-accent)", 
                color: "var(--dc-bg)", 
                border: "none", 
                borderRadius: 24, 
                padding: "16px", 
                fontSize: 16, 
                fontWeight: 700,
                cursor: "pointer",
                marginTop: "8px"
              }}>
                Get Tickets
              </button>
            </div>

            {/* Stats Row */}
            <div style={{ 
              display: "flex", 
              justifyContent: "space-around", 
              padding: "16px 0",
              borderTop: "1px solid var(--dc-border)",
              borderBottom: "1px solid var(--dc-border)",
              marginBottom: "32px"
            }}>
              <div style={{ textAlign: "center" }}>
                <span style={{ fontSize: 18, fontWeight: 800, color: "var(--dc-text)" }}>{STATS.events}</span>
                <span style={{ fontSize: 14, color: "var(--dc-text-muted)", marginLeft: 6 }}>Events</span>
              </div>
              <div style={{ textAlign: "center" }}>
                <span style={{ fontSize: 18, fontWeight: 800, color: "var(--dc-text)" }}>{STATS.members}</span>
                <span style={{ fontSize: 14, color: "var(--dc-text-muted)", marginLeft: 6 }}>Members</span>
              </div>
              <div style={{ textAlign: "center" }}>
                <span style={{ fontSize: 18, fontWeight: 800, color: "var(--dc-text)" }}>{STATS.tickets}</span>
                <span style={{ fontSize: 14, color: "var(--dc-text-muted)", marginLeft: 6 }}>Tickets</span>
              </div>
            </div>

            {/* More Events */}
            <div style={{ marginBottom: "32px" }}>
              <h2 style={{ fontSize: 18, fontWeight: 800, color: "var(--dc-text)", marginBottom: "16px" }}>More Events</h2>
              <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                {moreEvents.map((event, i) => (
                  <div key={i} style={{ 
                    display: "flex", 
                    alignItems: "center", 
                    gap: "16px",
                    paddingBottom: "12px",
                    borderBottom: i < moreEvents.length - 1 ? "1px solid var(--dc-border)" : "none"
                  }}>
                    <div style={{ fontSize: 14, fontWeight: 700, color: "var(--dc-text-secondary)", width: "50px" }}>
                      {event.day} {event.month}
                    </div>
                    <div style={{ flex: 1, fontSize: 16, fontWeight: 600, color: "var(--dc-text)" }}>{event.title}</div>
                    <div style={{ color: "var(--dc-text-muted)" }}>›</div>
                  </div>
                ))}
              </div>
            </div>

            {/* Club News */}
            <div style={{ marginBottom: "32px" }}>
              <h2 style={{ fontSize: 18, fontWeight: 800, color: "var(--dc-text)", marginBottom: "16px" }}>Club News</h2>
              <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                {POSTS.map((post, i) => (
                  <div key={i} style={{ 
                    backgroundColor: "var(--dc-surface)", 
                    padding: "16px", 
                    borderRadius: 12,
                    border: "1px solid var(--dc-border)"
                  }}>
                    <div style={{ fontSize: 14, fontWeight: 700, color: "var(--dc-text)", marginBottom: 4 }}>{post.title}</div>
                    <div style={{ fontSize: 12, color: "var(--dc-text-muted)", marginBottom: 8 }}>{post.date}</div>
                    <div style={{ fontSize: 13, color: "var(--dc-text-secondary)", lineHeight: 1.4 }}>{post.preview}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* Slim Merch Link */}
            <div style={{ textAlign: "center", padding: "16px 0" }}>
              <a href="#" style={{ color: "var(--dc-primary)", fontSize: 14, fontWeight: 600, textDecoration: "none" }}>Shop Merch →</a>
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