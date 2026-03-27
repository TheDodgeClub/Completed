import React from "react";
import { useQuery } from "@tanstack/react-query";
import { api, Event, Post } from "@/lib/api";

const GREEN = "#0B5E2F";
const AMBER = "#FFC107";
const LIGHT_BG = "#F2F4F2";
const CARD_BG = "#FFFFFF";
const DARK_TEXT = "#111111";
const MUTED = "#666666";

function formatDate(iso: string) {
  const d = new Date(iso);
  return d.toLocaleDateString("en-GB", { weekday: "short", month: "short", day: "numeric" });
}

function spotsLabel(event: Event) {
  if (!event.ticketCapacity) return null;
  const remaining = event.ticketCapacity - event.attendeeCount;
  if (remaining <= 0) return "Sold out";
  return `${remaining} spot${remaining === 1 ? "" : "s"} remaining`;
}

function Header() {
  return (
    <div
      style={{ background: GREEN, padding: "0 20px", height: 56, display: "flex", alignItems: "center", justifyContent: "space-between" }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <div
          style={{
            width: 32, height: 32, borderRadius: 8, background: "rgba(255,255,255,0.2)",
            display: "flex", alignItems: "center", justifyContent: "center",
            fontWeight: 800, fontSize: 13, color: "white", letterSpacing: 0.5,
          }}
        >
          DC
        </div>
        <span style={{ color: "white", fontWeight: 700, fontSize: 14, letterSpacing: 1, textTransform: "uppercase" }}>
          The Dodge Club
        </span>
      </div>
      <button
        style={{
          width: 36, height: 36, borderRadius: "50%", border: "none",
          background: "rgba(255,255,255,0.15)", cursor: "pointer",
          display: "flex", alignItems: "center", justifyContent: "center",
        }}
        aria-label="Notifications"
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
          <path d="M13.73 21a2 2 0 0 1-3.46 0" />
        </svg>
      </button>
    </div>
  );
}

function Hero() {
  return (
    <div style={{ background: GREEN, padding: "28px 20px 32px" }}>
      <div style={{ marginBottom: 8 }}>
        <span style={{ color: "white", fontSize: 36, fontWeight: 800, lineHeight: 1.1, display: "block" }}>
          Come alone.
        </span>
        <span style={{ color: AMBER, fontSize: 36, fontWeight: 800, lineHeight: 1.1, display: "block" }}>
          Win together.
        </span>
      </div>
      <p style={{ color: "rgba(255,255,255,0.75)", fontSize: 14, marginBottom: 24, marginTop: 8 }}>
        South London's premier dodgeball club.
      </p>
      <div style={{ display: "flex", gap: 10 }}>
        <a
          href="#events"
          style={{
            flex: 1, height: 48, borderRadius: 12, background: "white", border: "none",
            fontWeight: 700, fontSize: 14, color: DARK_TEXT, display: "flex", alignItems: "center",
            justifyContent: "center", gap: 8, textDecoration: "none", cursor: "pointer",
          }}
        >
          <span>🏐</span>
          Member Zone
        </a>
        <a
          href="#events"
          style={{
            flex: 1, height: 48, borderRadius: 12, background: AMBER, border: "none",
            fontWeight: 700, fontSize: 14, color: DARK_TEXT, display: "flex", alignItems: "center",
            justifyContent: "center", gap: 8, textDecoration: "none", cursor: "pointer",
          }}
        >
          <span>🎟️</span>
          Tickets
        </a>
      </div>
    </div>
  );
}

function StatStrip({ members, events }: { members: number; events: number }) {
  return (
    <div
      style={{
        background: CARD_BG, borderBottom: `1px solid #E8EAE8`,
        display: "grid", gridTemplateColumns: "1fr 1fr 1fr",
        padding: "16px 0",
      }}
    >
      {[
        { value: members > 0 ? members.toString() : "—", label: "Members" },
        { value: events > 0 ? events.toString() : "—", label: "Sessions" },
        { value: "5 left", label: "This week" },
      ].map((s, i) => (
        <div key={i} style={{ textAlign: "center", borderRight: i < 2 ? "1px solid #E8EAE8" : "none" }}>
          <div style={{ fontWeight: 800, fontSize: 22, color: DARK_TEXT }}>{s.value}</div>
          <div style={{ fontSize: 12, color: MUTED, marginTop: 2 }}>{s.label}</div>
        </div>
      ))}
    </div>
  );
}

function NextUp({ event }: { event: Event }) {
  const spots = spotsLabel(event);
  return (
    <div style={{ padding: "20px 16px 8px" }}>
      <div
        style={{
          background: GREEN, borderRadius: 16, padding: "20px 20px 20px",
          position: "relative", overflow: "hidden",
        }}
      >
        <div
          style={{
            position: "absolute", top: 16, left: 20,
            background: AMBER, borderRadius: 6, padding: "3px 10px",
            fontSize: 11, fontWeight: 800, color: DARK_TEXT, letterSpacing: 0.5, textTransform: "uppercase",
          }}
        >
          Next Up
        </div>
        <div style={{ marginTop: 32 }}>
          <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between" }}>
            <div>
              <div style={{ fontWeight: 800, fontSize: 20, color: "white", marginBottom: 6 }}>
                {event.title}
              </div>
              <div style={{ fontSize: 13, color: "rgba(255,255,255,0.7)" }}>
                {formatDate(event.date)}{spots ? ` · ${spots}` : ""}
              </div>
            </div>
            <a
              href={event.ticketUrl || "#events"}
              style={{
                width: 36, height: 36, borderRadius: "50%", background: "rgba(255,255,255,0.2)",
                display: "flex", alignItems: "center", justifyContent: "center",
                textDecoration: "none", flexShrink: 0,
              }}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="9 18 15 12 9 6" />
              </svg>
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}

function EventCard({ event, hot }: { event: Event; hot?: boolean }) {
  const spots = spotsLabel(event);
  return (
    <div
      style={{
        display: "flex", alignItems: "center", gap: 14,
        padding: "14px 16px", background: CARD_BG,
        borderBottom: "1px solid #EEEEE",
        borderLeft: hot ? `3px solid ${AMBER}` : "none",
      }}
    >
      <div
        style={{
          width: 44, height: 44, borderRadius: 12, background: GREEN, flexShrink: 0,
          display: "flex", alignItems: "center", justifyContent: "center",
          fontSize: 22,
        }}
      >
        🏐
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontWeight: 700, fontSize: 14, color: DARK_TEXT, marginBottom: 2 }}>
          {event.title}
        </div>
        <div style={{ fontSize: 12, color: MUTED }}>
          {formatDate(event.date)}{spots ? ` · ${spots}` : ""}
        </div>
      </div>
      {hot && (
        <span
          style={{
            background: GREEN, color: "white", fontWeight: 700, fontSize: 11,
            padding: "4px 10px", borderRadius: 8, letterSpacing: 0.5, textTransform: "uppercase",
            flexShrink: 0,
          }}
        >
          HOT
        </span>
      )}
    </div>
  );
}

function UpcomingEvents({ events }: { events: Event[] }) {
  const shown = events.slice(0, 5);
  return (
    <div id="events" style={{ padding: "20px 0 0" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0 16px", marginBottom: 12 }}>
        <span style={{ fontWeight: 800, fontSize: 18, color: DARK_TEXT }}>Upcoming Events</span>
        <a href="#events" style={{ fontSize: 13, fontWeight: 600, color: GREEN, textDecoration: "none" }}>
          See All →
        </a>
      </div>
      <div style={{ background: CARD_BG, borderRadius: "12px 12px 0 0", overflow: "hidden", border: "1px solid #E8EAE8" }}>
        {shown.length === 0 && (
          <div style={{ padding: 24, textAlign: "center", color: MUTED, fontSize: 14 }}>No upcoming events</div>
        )}
        {shown.map((ev, i) => (
          <EventCard key={ev.id} event={ev} hot={i === 0} />
        ))}
      </div>
    </div>
  );
}

function PostCard({ post }: { post: Post }) {
  const timeAgo = (() => {
    const diff = Date.now() - new Date(post.createdAt).getTime();
    const days = Math.floor(diff / 86400000);
    if (days > 0) return `${days}d ago`;
    const hrs = Math.floor(diff / 3600000);
    if (hrs > 0) return `${hrs}h ago`;
    return "Just now";
  })();

  return (
    <div
      style={{
        background: CARD_BG, borderRadius: 14, padding: "16px",
        border: "1px solid #E8EAE8", marginBottom: 10,
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
        <div
          style={{
            width: 36, height: 36, borderRadius: "50%", background: GREEN, flexShrink: 0,
            display: "flex", alignItems: "center", justifyContent: "center",
            color: "white", fontWeight: 700, fontSize: 13,
          }}
        >
          {(post.authorName ?? "DC").slice(0, 2).toUpperCase()}
        </div>
        <div>
          <div style={{ fontWeight: 700, fontSize: 13, color: DARK_TEXT }}>{post.authorName ?? "The Dodge Club"}</div>
          <div style={{ fontSize: 11, color: MUTED }}>{timeAgo}</div>
        </div>
        {post.isMembersOnly && (
          <span
            style={{
              marginLeft: "auto", background: "#E8F5EE", color: GREEN,
              fontSize: 10, fontWeight: 700, padding: "3px 8px", borderRadius: 6, letterSpacing: 0.5,
            }}
          >
            MEMBERS
          </span>
        )}
      </div>
      {post.title && (
        <div style={{ fontWeight: 700, fontSize: 15, color: DARK_TEXT, marginBottom: 6 }}>{post.title}</div>
      )}
      <p style={{ fontSize: 14, color: "#333", lineHeight: 1.5, margin: 0 }}>
        {post.content.length > 160 ? post.content.slice(0, 160) + "…" : post.content}
      </p>
    </div>
  );
}

function LatestUpdates({ posts }: { posts: Post[] }) {
  const shown = posts.slice(0, 3);
  if (shown.length === 0) return null;
  return (
    <div style={{ padding: "0 16px 16px" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
        <span style={{ fontWeight: 800, fontSize: 18, color: DARK_TEXT }}>Latest Updates</span>
        <a href="#posts" style={{ fontSize: 13, fontWeight: 600, color: GREEN, textDecoration: "none" }}>
          See All →
        </a>
      </div>
      {shown.map(p => <PostCard key={p.id} post={p} />)}
    </div>
  );
}

function Footer() {
  return (
    <div style={{ background: GREEN, padding: "32px 20px 48px" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16 }}>
        <div
          style={{
            width: 36, height: 36, borderRadius: 8, background: "rgba(255,255,255,0.2)",
            display: "flex", alignItems: "center", justifyContent: "center",
            fontWeight: 800, fontSize: 14, color: "white",
          }}
        >
          DC
        </div>
        <span style={{ color: "white", fontWeight: 700, fontSize: 16, letterSpacing: 1, textTransform: "uppercase" }}>
          The Dodge Club
        </span>
      </div>
      <p style={{ color: "rgba(255,255,255,0.65)", fontSize: 13, marginBottom: 24, lineHeight: 1.6 }}>
        South London's premier dodgeball club.<br />
        Come alone. Win together.
      </p>
      <div style={{ display: "flex", gap: 10, marginBottom: 28 }}>
        {["App Store", "Google Play"].map(store => (
          <a
            key={store}
            href="#"
            style={{
              flex: 1, height: 44, borderRadius: 10, background: "rgba(255,255,255,0.15)",
              border: "1px solid rgba(255,255,255,0.25)",
              display: "flex", alignItems: "center", justifyContent: "center",
              color: "white", fontWeight: 600, fontSize: 13, textDecoration: "none",
            }}
          >
            {store}
          </a>
        ))}
      </div>
      <div style={{ borderTop: "1px solid rgba(255,255,255,0.15)", paddingTop: 20 }}>
        <p style={{ color: "rgba(255,255,255,0.4)", fontSize: 11, margin: 0, textAlign: "center" }}>
          © {new Date().getFullYear()} The Dodge Club · South London
        </p>
      </div>
    </div>
  );
}

function Skeleton({ width = "100%", height = 20 }: { width?: string | number; height?: number }) {
  return (
    <div
      style={{
        width, height, borderRadius: 6,
        background: "linear-gradient(90deg, #e8eae8 25%, #f2f4f2 50%, #e8eae8 75%)",
        backgroundSize: "200% 100%",
        animation: "shimmer 1.4s infinite",
      }}
    />
  );
}

export default function Home() {
  const { data: events = [], isLoading: eventsLoading } = useQuery({
    queryKey: ["events", "upcoming"],
    queryFn: api.getUpcomingEvents,
  });
  const { data: stats } = useQuery({
    queryKey: ["stats"],
    queryFn: api.getStats,
  });
  const { data: posts = [] } = useQuery({
    queryKey: ["posts"],
    queryFn: api.getPosts,
  });

  const nextEvent = events[0];

  return (
    <>
      <style>{`
        @keyframes shimmer {
          0% { background-position: 200% 0; }
          100% { background-position: -200% 0; }
        }
        * { box-sizing: border-box; }
        a { -webkit-tap-highlight-color: transparent; }
      `}</style>
      <div
        style={{
          minHeight: "100vh",
          background: LIGHT_BG,
          maxWidth: 480,
          margin: "0 auto",
          fontFamily: "'Inter', system-ui, sans-serif",
        }}
      >
        <Header />
        <Hero />
        <StatStrip
          members={stats?.totalMembers ?? 0}
          events={stats?.totalEvents ?? 0}
        />

        {eventsLoading ? (
          <div style={{ padding: 20 }}>
            <Skeleton height={140} />
          </div>
        ) : nextEvent ? (
          <NextUp event={nextEvent} />
        ) : null}

        {eventsLoading ? (
          <div style={{ padding: "0 16px" }}>
            <Skeleton height={200} />
          </div>
        ) : (
          <UpcomingEvents events={events} />
        )}

        <LatestUpdates posts={posts} />

        <Footer />
      </div>

      <style>{`
        @media (min-width: 520px) {
          body { background: #E4E7E4; }
        }
      `}</style>
    </>
  );
}
