import { useState, useEffect, useRef, useCallback } from "react";
import { BrowserMultiFormatReader } from "@zxing/browser";
import {
  loginAdmin, getMe, getActiveEvents, scanCheckIn, scanTicketCheckIn, getCheckinStats,
  clearToken, type AdminUser, type ActiveEvent, type CheckInResult, type CheckInStats,
} from "@/lib/api";

type Screen = "loading" | "login" | "events" | "dashboard";

export default function App() {
  const [screen, setScreen] = useState<Screen>("loading");
  const [user, setUser] = useState<AdminUser | null>(null);
  const [events, setEvents] = useState<ActiveEvent[]>([]);
  const [selectedEvent, setSelectedEvent] = useState<ActiveEvent | null>(null);

  useEffect(() => {
    getMe().then(u => {
      if (u?.isAdmin) { setUser(u); loadEvents(); }
      else setScreen("login");
    });
  }, []);

  function loadEvents() {
    setScreen("loading");
    getActiveEvents()
      .then(es => { setEvents(es); setScreen("events"); })
      .catch(() => { setEvents([]); setScreen("events"); });
  }

  function handleLogout() { clearToken(); setUser(null); setScreen("login"); }
  function handleSelectEvent(ev: ActiveEvent) { setSelectedEvent(ev); setScreen("dashboard"); }

  if (screen === "loading") return <Loading />;
  if (screen === "login") return <LoginScreen onLogin={(u) => { setUser(u); loadEvents(); }} />;
  if (screen === "events") return (
    <EventsScreen events={events} user={user!} onSelect={handleSelectEvent} onRefresh={loadEvents} onLogout={handleLogout} />
  );
  if (screen === "dashboard" && selectedEvent) return (
    <DashboardScreen event={selectedEvent} onBack={() => setScreen("events")} onLogout={handleLogout} />
  );
  return null;
}

/* ─── Loading ───────────────────────────────────────────────── */
function Loading() {
  return (
    <div className="fixed inset-0 flex items-center justify-center bg-[#0a0a0a]">
      <div className="w-10 h-10 border-2 border-[hsl(355,78%,56%)] border-t-transparent rounded-full animate-spin" />
    </div>
  );
}

/* ─── Login ─────────────────────────────────────────────────── */
function LoginScreen({ onLogin }: { onLogin: (u: AdminUser) => void }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true); setError(null);
    try { const u = await loginAdmin(email, password); onLogin(u); }
    catch (err: any) { setError(err.message ?? "Login failed"); }
    finally { setLoading(false); }
  }

  return (
    <div className="fixed inset-0 flex flex-col bg-[#0a0a0a] overflow-y-auto"
      style={{ paddingTop: "env(safe-area-inset-top)", paddingBottom: "env(safe-area-inset-bottom)" }}>
      <div className="flex-1 flex flex-col items-center justify-center px-6 py-12 min-h-0">
        <div className="w-full max-w-sm">
          <div className="text-center mb-10">
            <div className="text-5xl mb-4">🏐</div>
            <h1 className="text-3xl font-bold text-white tracking-tight">Dodge Club</h1>
            <p className="text-base text-gray-400 mt-1.5 font-medium">Door Staff Scanner</p>
          </div>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-gray-400 mb-2 uppercase tracking-widest">Email</label>
              <input type="email" value={email} onChange={e => setEmail(e.target.value)}
                className="w-full bg-[#1c1c1e] border border-[#2c2c2e] text-white rounded-2xl px-5 py-4 text-base focus:outline-none focus:border-[hsl(355,78%,56%)] transition-colors"
                placeholder="your@email.com" autoComplete="email" required />
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-400 mb-2 uppercase tracking-widest">Password</label>
              <input type="password" value={password} onChange={e => setPassword(e.target.value)}
                className="w-full bg-[#1c1c1e] border border-[#2c2c2e] text-white rounded-2xl px-5 py-4 text-base focus:outline-none focus:border-[hsl(355,78%,56%)] transition-colors"
                placeholder="••••••••" autoComplete="current-password" required />
            </div>
            {error && (
              <div className="bg-red-500/10 border border-red-500/30 rounded-xl px-4 py-3">
                <p className="text-red-400 text-sm text-center font-medium">{error}</p>
              </div>
            )}
            <button type="submit" disabled={loading}
              className="w-full bg-[hsl(355,78%,56%)] text-white font-bold rounded-2xl py-4 text-base active:opacity-80 transition-opacity disabled:opacity-50 mt-2">
              {loading ? "Signing in…" : "Sign In"}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}

/* ─── Events ─────────────────────────────────────────────────── */
function EventCard({ ev, onSelect }: { ev: ActiveEvent; onSelect: (e: ActiveEvent) => void }) {
  return (
    <button onClick={() => onSelect(ev)}
      className="w-full bg-[#141414] border border-[#2a2a2a] rounded-2xl p-4 text-left active:opacity-70 transition-opacity">
      <div className="flex items-start gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-0.5">
            {ev.checkInOpen && (
              <span className="inline-flex items-center gap-1 bg-green-900/50 border border-green-700/40 text-green-400 text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full">
                <span className="w-1.5 h-1.5 bg-green-400 rounded-full animate-pulse inline-block" />
                Live
              </span>
            )}
          </div>
          <h3 className="font-bold text-base text-white leading-tight truncate">{ev.title}</h3>
          <p className="text-xs text-gray-400 mt-0.5 truncate">{ev.location}</p>
          <p className="text-xs text-gray-500 mt-0.5">
            {new Date(ev.date).toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short" })}
            {" · "}
            {new Date(ev.date).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" })}
          </p>
        </div>
        {ev.checkInPin && (
          <div className="shrink-0 bg-[hsl(355,78%,56%)]/15 border border-[hsl(355,78%,56%)]/30 rounded-xl px-2.5 py-2 text-center">
            <p className="text-[8px] text-[hsl(355,78%,56%)] font-bold uppercase tracking-wider">PIN</p>
            <p className="text-lg font-mono font-bold text-white mt-0.5 tracking-widest">{ev.checkInPin}</p>
          </div>
        )}
      </div>
      <div className="mt-3 flex items-center justify-between">
        <span className="text-[hsl(355,78%,56%)] font-semibold text-xs">Open Dashboard →</span>
      </div>
    </button>
  );
}

function EventsScreen({ events, user, onSelect, onRefresh, onLogout }: {
  events: ActiveEvent[]; user: AdminUser;
  onSelect: (e: ActiveEvent) => void; onRefresh: () => void; onLogout: () => void;
}) {
  const activeEvents = events.filter(e => e.checkInOpen);
  const upcomingEvents = events.filter(e => !e.checkInOpen);

  return (
    <div className="fixed inset-0 flex flex-col bg-[#0a0a0a] text-white"
      style={{ paddingTop: "env(safe-area-inset-top)", paddingBottom: "env(safe-area-inset-bottom)" }}>
      <div className="flex items-center justify-between px-5 pt-4 pb-3 border-b border-[#1e1e1e] shrink-0">
        <div>
          <p className="text-lg font-bold leading-tight">🏐 Scanner</p>
          <p className="text-xs text-gray-400 mt-0.5">{user.name}</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={onRefresh} className="min-h-[44px] px-4 bg-[#1c1c1e] rounded-xl text-sm font-semibold text-gray-200 active:opacity-70">Refresh</button>
          <button onClick={onLogout} className="min-h-[44px] px-4 bg-[#1c1c1e] rounded-xl text-sm text-gray-400 active:opacity-70">Sign out</button>
        </div>
      </div>
      <div className="flex-1 overflow-y-auto px-4 pt-4 pb-6 space-y-5">

        {/* Active now section */}
        {activeEvents.length > 0 && (
          <div>
            <p className="text-xs font-bold text-green-500 uppercase tracking-widest mb-2 px-1">● Active now</p>
            <div className="space-y-3">
              {activeEvents.map(ev => <EventCard key={ev.id} ev={ev} onSelect={onSelect} />)}
            </div>
          </div>
        )}

        {/* Upcoming section */}
        {upcomingEvents.length > 0 && (
          <div>
            <p className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-2 px-1">Upcoming events</p>
            <div className="space-y-3">
              {upcomingEvents.map(ev => <EventCard key={ev.id} ev={ev} onSelect={onSelect} />)}
            </div>
          </div>
        )}

        {/* Empty state */}
        {events.length === 0 && (
          <div className="flex flex-col items-center justify-center h-64 text-center px-6">
            <div className="text-5xl mb-4">🗓</div>
            <p className="text-base font-semibold text-gray-300">No upcoming events</p>
            <p className="text-sm text-gray-500 mt-2 leading-relaxed">Published events in the next 7 days will appear here.</p>
            <button onClick={onRefresh} className="mt-6 min-h-[48px] px-6 bg-[#1c1c1e] border border-[#2c2c2e] text-[hsl(355,78%,56%)] rounded-2xl text-base font-semibold active:opacity-70">Check Again</button>
          </div>
        )}
      </div>
    </div>
  );
}

/* ─── Initials Avatar ─────────────────────────────────────────── */
function Avatar({ name, size = 36 }: { name: string; size?: number }) {
  const initials = name.split(" ").map(w => w[0]).join("").toUpperCase().slice(0, 2);
  const colors = ["#e53935", "#d81b60", "#8e24aa", "#3949ab", "#1e88e5", "#00897b", "#43a047", "#fb8c00"];
  const color = colors[name.charCodeAt(0) % colors.length];
  return (
    <div style={{ width: size, height: size, borderRadius: size / 2, background: color, flexShrink: 0 }}
      className="flex items-center justify-center">
      <span style={{ fontSize: size * 0.38, fontWeight: 700, color: "white" }}>{initials}</span>
    </div>
  );
}

/* ─── Dashboard ───────────────────────────────────────────────── */
type ResultState = { type: "success" | "duplicate" | "error"; member?: CheckInResult["member"]; message?: string; xpGained?: number } | null;

function DashboardScreen({ event, onBack, onLogout }: { event: ActiveEvent; onBack: () => void; onLogout: () => void }) {
  const [stats, setStats] = useState<CheckInStats | null>(null);
  const [scannerOpen, setScannerOpen] = useState(false);
  const [lastResult, setLastResult] = useState<ResultState>(null);

  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const fetchStats = useCallback(async () => {
    try { setStats(await getCheckinStats(event.id)); } catch {}
  }, [event.id]);

  useEffect(() => {
    fetchStats();
    pollRef.current = setInterval(fetchStats, 6000);
    return () => { if (pollRef.current) clearInterval(pollRef.current); };
  }, [fetchStats]);

  // When a scan completes, refresh stats immediately
  function handleScanResult(result: ResultState) {
    setLastResult(result);
    if (result?.type === "success") fetchStats();
  }

  const checkedInCount = stats?.checkedIn.length ?? 0;
  const expectedCount = stats?.expectedCount ?? 0;
  const pct = expectedCount > 0 ? Math.min(100, Math.round((checkedInCount / expectedCount) * 100)) : 0;

  return (
    <div className="fixed inset-0 flex flex-col bg-[#0a0a0a] text-white"
      style={{ paddingTop: "env(safe-area-inset-top)" }}>

      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-3 border-b border-[#1e1e1e] shrink-0">
        <button onClick={onBack} className="min-h-[44px] min-w-[44px] flex items-center justify-center text-gray-300 text-2xl active:opacity-60 -ml-1">‹</button>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-bold text-white truncate">{event.title}</p>
          <p className="text-xs text-gray-400 truncate">
            {new Date(event.date).toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short" })}
            {" · "}
            {new Date(event.date).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" })}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {event.checkInPin && (
            <div className="shrink-0 bg-[hsl(355,78%,56%)]/20 border border-[hsl(355,78%,56%)]/40 rounded-xl px-3 py-2 text-center">
              <p className="text-[8px] text-[hsl(355,78%,56%)] font-bold uppercase tracking-wider">PIN</p>
              <p className="text-base font-mono font-bold text-white leading-tight tracking-widest">{event.checkInPin}</p>
            </div>
          )}
          <button onClick={onLogout} className="min-h-[44px] px-3 text-gray-500 text-xs active:opacity-70">Sign out</button>
        </div>
      </div>

      {/* Stats bar */}
      <div className="px-4 pt-4 pb-3 shrink-0">
        <div className="bg-[#141414] border border-[#2a2a2a] rounded-2xl p-4">
          <div className="flex items-end justify-between mb-2.5">
            <div>
              <p className="text-4xl font-bold text-white leading-none">{checkedInCount}</p>
              <p className="text-xs text-gray-400 mt-1 font-medium">members checked in</p>
            </div>
            <div className="text-right">
              <p className="text-2xl font-bold text-gray-300 leading-none">{expectedCount}</p>
              <p className="text-xs text-gray-500 mt-1 font-medium">tickets sold</p>
            </div>
          </div>
          {/* Progress bar */}
          <div className="h-2 bg-[#2a2a2a] rounded-full overflow-hidden">
            <div
              className="h-full bg-[hsl(355,78%,56%)] rounded-full transition-all duration-700"
              style={{ width: `${pct}%` }}
            />
          </div>
          <p className="text-xs text-gray-500 mt-1.5 text-right">{pct}% arrived</p>
        </div>

        {/* Last scan result banner */}
        {lastResult && (
          <div className={`mt-3 rounded-xl px-4 py-2.5 flex items-center gap-2 ${lastResult.type === "success" ? "bg-green-900/40 border border-green-700/30" : lastResult.type === "duplicate" ? "bg-amber-900/40 border border-amber-700/30" : "bg-red-900/40 border border-red-700/30"}`}>
            <span className="text-lg">{lastResult.type === "success" ? "✅" : lastResult.type === "duplicate" ? "🔄" : "❌"}</span>
            <div className="flex-1 min-w-0">
              {lastResult.member && <p className="text-sm font-bold text-white truncate">{lastResult.member.name}</p>}
              <p className={`text-xs ${lastResult.type === "success" ? "text-green-400" : lastResult.type === "duplicate" ? "text-amber-400" : "text-red-400"}`}>
                {lastResult.type === "success" ? `Checked in · +${lastResult.xpGained ?? 0} XP` : lastResult.type === "duplicate" ? "Already checked in" : (lastResult.message ?? "Failed")}
              </p>
            </div>
            <button onClick={() => setLastResult(null)} className="text-gray-500 text-xl leading-none">×</button>
          </div>
        )}
      </div>

      {/* Attendee list */}
      <div className="flex-1 overflow-y-auto px-4 pb-4 min-h-0">
        <p className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-2">Checked in</p>
        {!stats ? (
          <div className="flex items-center justify-center py-12">
            <div className="w-6 h-6 border-2 border-[hsl(355,78%,56%)] border-t-transparent rounded-full animate-spin" />
          </div>
        ) : stats.checkedIn.length === 0 ? (
          <div className="text-center py-10">
            <p className="text-4xl mb-3">👥</p>
            <p className="text-sm text-gray-500">No one checked in yet</p>
          </div>
        ) : (
          <div className="space-y-1">
            {stats.checkedIn.map((m, i) => (
              <div key={m.id} className="flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-white/[0.03] transition-colors">
                <span className="text-xs text-gray-600 w-5 text-right shrink-0">{i + 1}</span>
                <Avatar name={m.name} size={34} />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-white truncate">{m.name}</p>
                  {m.checkedInAt && (
                    <p className="text-xs text-gray-500">{new Date(m.checkedInAt).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" })}</p>
                  )}
                </div>
                <span className="text-green-500 text-base shrink-0">✓</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Scan button */}
      <div className="shrink-0 px-4 pt-3 bg-[#0a0a0a] border-t border-[#1e1e1e]"
        style={{ paddingBottom: "max(env(safe-area-inset-bottom), 20px)" }}>
        <button
          onClick={() => setScannerOpen(true)}
          className="w-full min-h-[60px] bg-[hsl(355,78%,56%)] text-white font-bold rounded-2xl text-lg active:opacity-80 transition-opacity flex items-center justify-center gap-3"
        >
          <span className="text-2xl">📷</span>
          Scan QR Code
        </button>
      </div>

      {/* Camera overlay */}
      {scannerOpen && (
        <ScannerOverlay
          event={event}
          onClose={() => setScannerOpen(false)}
          onResult={handleScanResult}
        />
      )}
    </div>
  );
}

/* ─── Camera Scanner Overlay ─────────────────────────────────── */
function ScannerOverlay({ event, onClose, onResult }: {
  event: ActiveEvent;
  onClose: () => void;
  onResult: (r: ResultState) => void;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [result, setResult] = useState<ResultState>(null);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [manualId, setManualId] = useState("");

  // Use refs for mutable state so camera effect is never restarted after mount
  const processingRef = useRef(false);
  const lastScannedRef = useRef<string | null>(null);
  const resultTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const eventIdRef = useRef(event.id);
  const onResultRef = useRef(onResult);
  useEffect(() => { eventIdRef.current = event.id; }, [event.id]);
  useEffect(() => { onResultRef.current = onResult; }, [onResult]);

  // Stable check-in function — reads from refs, never changes identity
  const doCheckIn = useCallback(async (apiCall: () => Promise<CheckInResult>) => {
    if (processingRef.current) return;
    processingRef.current = true;
    try {
      const res = await apiCall();
      const r: ResultState = res.alreadyCheckedIn
        ? { type: "duplicate", member: res.member, xpGained: 0 }
        : { type: "success", member: res.member, xpGained: res.xpGained ?? 0 };
      setResult(r);
      onResultRef.current(r);
    } catch (err: any) {
      const r: ResultState = { type: "error", message: err.message ?? "Check-in failed" };
      setResult(r);
      onResultRef.current(r);
    } finally {
      processingRef.current = false;
      if (resultTimerRef.current) clearTimeout(resultTimerRef.current);
      resultTimerRef.current = setTimeout(() => {
        setResult(null);
        lastScannedRef.current = null;
      }, 3000);
    }
  }, []);

  const processUserId = useCallback((userId: number) => {
    doCheckIn(() => scanCheckIn(eventIdRef.current, userId));
  }, [doCheckIn]);

  const processTicketCode = useCallback((ticketCode: string) => {
    doCheckIn(() => scanTicketCheckIn(eventIdRef.current, ticketCode));
  }, [doCheckIn]);

  // Stable QR handler via ref — camera effect never needs to restart
  const handleQRValueRef = useRef<(text: string) => void>(() => {});
  useEffect(() => {
    handleQRValueRef.current = (text: string) => {
      if (lastScannedRef.current === text) return;
      lastScannedRef.current = text;

      // Member QR: dodgeclub:member:{userId}
      const memberMatch = text.match(/^dodgeclub:member:(\d+)$/);
      if (memberMatch) { processUserId(Number(memberMatch[1])); return; }

      // Ticket QR: 16-char hex code (8 random bytes)
      const ticketMatch = text.match(/^[0-9A-F]{16}$/i);
      if (ticketMatch) { processTicketCode(text.toUpperCase()); return; }

      const r: ResultState = { type: "error", message: "Not a Dodge Club QR code" };
      setResult(r);
      if (resultTimerRef.current) clearTimeout(resultTimerRef.current);
      resultTimerRef.current = setTimeout(() => { setResult(null); lastScannedRef.current = null; }, 2500);
    };
  }, [processUserId, processTicketCode]);

  // Camera starts once on mount, never restarts
  useEffect(() => {
    const reader = new BrowserMultiFormatReader(undefined, { delayBetweenScanAttempts: 300 });
    if (videoRef.current) {
      reader.decodeFromConstraints(
        { video: { facingMode: { ideal: "environment" }, width: { ideal: 1280 }, height: { ideal: 720 } } },
        videoRef.current,
        (res, err) => {
          if (res) handleQRValueRef.current(res.getText());
          if (err && !(
            err?.name === "NotFoundException" ||
            err?.message?.includes("No MultiFormat") ||
            err?.message?.includes("Barcode") ||
            err?.message?.includes("No code found")
          )) {
            setCameraError("Camera unavailable — use manual entry");
          }
        }
      ).catch(() => setCameraError("Camera unavailable — use manual entry"));
    }
    return () => {
      BrowserMultiFormatReader.releaseAllStreams();
      if (resultTimerRef.current) clearTimeout(resultTimerRef.current);
    };
  }, []); // empty — camera starts once and stays running

  function handleManualSubmit(e: React.FormEvent) {
    e.preventDefault();
    const val = manualId.trim().replace(/\s/g, "").toUpperCase();
    if (!val) return;
    // Ticket code: 16-char hex (with or without spaces)
    if (/^[0-9A-F]{16}$/.test(val)) {
      processTicketCode(val);
    } else {
      const id = parseInt(val, 10);
      if (!isNaN(id)) processUserId(id);
    }
    setManualId("");
  }

  const resultBg = result?.type === "success" ? "bg-green-900/95" : result?.type === "duplicate" ? "bg-amber-900/95" : "bg-red-900/95";
  const resultIcon = result?.type === "success" ? "✅" : result?.type === "duplicate" ? "🔄" : "❌";
  const resultColor = result?.type === "success" ? "text-green-300" : result?.type === "duplicate" ? "text-amber-300" : "text-red-300";
  const resultMsg = result?.type === "success" ? "Checked In!" : result?.type === "duplicate" ? "Already checked in" : (result?.message ?? "Failed");

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-black"
      style={{ paddingTop: "env(safe-area-inset-top)" }}>

      {/* Overlay header */}
      <div className="flex items-center justify-between px-4 py-3 bg-black/80 backdrop-blur-sm shrink-0 z-10">
        <p className="text-sm font-bold text-white truncate flex-1">{event.title}</p>
        <button onClick={onClose}
          className="min-h-[44px] min-w-[44px] flex items-center justify-center text-white text-2xl bg-white/10 rounded-full active:opacity-60 ml-2">
          ×
        </button>
      </div>

      {/* Camera view */}
      <div className="relative flex-1 overflow-hidden bg-black">
        <video ref={videoRef} className="absolute inset-0 w-full h-full object-cover" muted playsInline />

        {/* Corner viewfinder */}
        {!result && !cameraError && (
          <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
            <div className="relative w-64 h-64">
              <span className="absolute top-0 left-0 w-10 h-10 border-l-[3px] border-t-[3px] border-[hsl(355,78%,56%)] rounded-tl-lg" />
              <span className="absolute top-0 right-0 w-10 h-10 border-r-[3px] border-t-[3px] border-[hsl(355,78%,56%)] rounded-tr-lg" />
              <span className="absolute bottom-0 left-0 w-10 h-10 border-l-[3px] border-b-[3px] border-[hsl(355,78%,56%)] rounded-bl-lg" />
              <span className="absolute bottom-0 right-0 w-10 h-10 border-r-[3px] border-b-[3px] border-[hsl(355,78%,56%)] rounded-br-lg" />
              <div className="absolute inset-x-0 top-1/2 h-px bg-[hsl(355,78%,56%)]/60 animate-pulse" />
            </div>
            <p className="absolute bottom-[calc(50%-152px)] text-xs text-white/60 font-medium">Aim at member's QR code</p>
          </div>
        )}

        {/* Result overlay */}
        {result && (
          <div className={`absolute inset-0 flex flex-col items-center justify-center ${resultBg} backdrop-blur-sm px-6`}>
            <div className="text-7xl mb-4">{resultIcon}</div>
            {result.member && (
              <>
                <p className="text-3xl font-bold text-white text-center leading-tight">{result.member.name}</p>
                <p className="text-sm text-white/50 mt-2">Member #{result.member.id}</p>
              </>
            )}
            <p className={`mt-3 text-xl font-bold ${resultColor}`}>{resultMsg}</p>
            {result.type === "success" && (result.xpGained ?? 0) > 0 && (
              <div className="mt-4 bg-white/10 border border-white/20 rounded-2xl px-6 py-3 flex items-center gap-2">
                <span className="text-2xl">⚡</span>
                <span className="text-xl font-bold text-white">+{result.xpGained} XP</span>
              </div>
            )}
          </div>
        )}

        {/* Camera error */}
        {cameraError && !result && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/85">
            <div className="text-5xl mb-4">📷</div>
            <p className="text-white/70 text-sm text-center px-8">{cameraError}</p>
          </div>
        )}

        {/* Processing spinner */}
        {processing && !result && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/50">
            <div className="w-12 h-12 border-2 border-[hsl(355,78%,56%)] border-t-transparent rounded-full animate-spin" />
          </div>
        )}
      </div>

      {/* Manual entry */}
      <div className="shrink-0 bg-[#0a0a0a] border-t border-white/10 px-4 pt-3"
        style={{ paddingBottom: "max(env(safe-area-inset-bottom), 16px)" }}>
        <p className="text-xs text-gray-500 text-center mb-2 font-medium">Manual · member ID or ticket code</p>
        <form onSubmit={handleManualSubmit} className="flex gap-2">
          <input type="text" value={manualId} onChange={e => setManualId(e.target.value)}
            className="flex-1 bg-[#1c1c1e] border border-[#2c2c2e] text-white rounded-2xl px-5 py-3.5 text-base focus:outline-none focus:border-[hsl(355,78%,56%)] transition-colors"
            placeholder="Member ID or ticket code" autoCapitalize="characters" autoCorrect="off" />
          <button type="submit" disabled={processing || !manualId.trim()}
            className="min-h-[52px] px-6 bg-[hsl(355,78%,56%)] text-white font-bold rounded-2xl text-base active:opacity-80 disabled:opacity-40 transition-opacity shrink-0">
            Go
          </button>
        </form>
      </div>
    </div>
  );
}
