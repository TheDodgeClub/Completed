import React from "react";

const GREEN = "#0B5E2F";
const AMBER = "#FFC107";
const DARK_TEXT = "#111111";
const LIGHT_BG = "#F2F4F2";

export default function ManagePage() {
  const [email, setEmail] = React.useState("");
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  async function handleManage(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const BASE = import.meta.env.BASE_URL?.replace(/\/$/, "") ?? "";
      const encoded = encodeURIComponent(email.trim().toLowerCase());
      window.location.href = `${BASE}/api/elite/portal?email=${encoded}`;
    } catch {
      setError("Could not connect. Please try again.");
      setLoading(false);
    }
  }

  return (
    <div style={{ minHeight: "100vh", background: LIGHT_BG, fontFamily: "'Inter', system-ui, sans-serif" }}>
      <div style={{ background: GREEN, padding: "0 20px", height: 56, display: "flex", alignItems: "center" }}>
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
      </div>

      <div style={{ maxWidth: 480, margin: "0 auto", padding: "40px 20px" }}>
        <div style={{ background: "#07391B", borderRadius: 16, padding: "28px 20px" }}>
          <div style={{ color: AMBER, fontWeight: 800, fontSize: 11, letterSpacing: 1.5, textTransform: "uppercase", marginBottom: 8 }}>
            Elite Membership
          </div>
          <div style={{ color: "white", fontWeight: 800, fontSize: 22, lineHeight: 1.25, marginBottom: 6 }}>
            Manage your subscription
          </div>
          <div style={{ color: "rgba(255,255,255,0.55)", fontSize: 13, marginBottom: 24 }}>
            Enter your account email to access the billing portal.
          </div>

          <form onSubmit={handleManage} style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            <input
              type="email"
              placeholder="Enter your account email"
              value={email}
              onChange={e => { setEmail(e.target.value); setError(null); }}
              required
              style={{
                padding: "13px 14px", borderRadius: 10, border: "none", fontSize: 14,
                background: "rgba(255,255,255,0.1)", color: "white", outline: "none",
                width: "100%",
              }}
            />
            {error && (
              <div style={{ color: "#FF6B6B", fontSize: 12, paddingLeft: 2 }}>{error}</div>
            )}
            <button
              type="submit"
              disabled={loading}
              style={{
                background: AMBER, color: DARK_TEXT, fontWeight: 800, fontSize: 14,
                padding: "14px", borderRadius: 10, border: "none", cursor: loading ? "not-allowed" : "pointer",
                opacity: loading ? 0.7 : 1, width: "100%",
              }}
            >
              {loading ? "Opening portal…" : "Open Billing Portal"}
            </button>
            <div style={{ color: "rgba(255,255,255,0.35)", fontSize: 11, textAlign: "center", lineHeight: 1.5 }}>
              You'll be redirected to the Stripe billing portal to cancel, update, or view your subscription.
            </div>
          </form>
        </div>

        <div style={{ marginTop: 20, textAlign: "center" }}>
          <a href="../" style={{ color: GREEN, fontSize: 13, fontWeight: 600, textDecoration: "none" }}>
            ← Back to The Dodge Club
          </a>
        </div>
      </div>
    </div>
  );
}
