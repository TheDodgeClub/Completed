import { useState, useEffect, useRef, useCallback } from "react";
import { BrowserMultiFormatReader } from "@zxing/browser";
import {
  loginAdmin, getMe, getActiveEvents, scanCheckIn,
  clearToken, type AdminUser, type ActiveEvent, type CheckInResult,
} from "@/lib/api";

/* ─── Screens ─────────────────────────────────────────────── */
type Screen = "loading" | "login" | "events" | "scanner";

export default function App() {
  const [screen, setScreen] = useState<Screen>("loading");
  const [user, setUser] = useState<AdminUser | null>(null);
  const [events, setEvents] = useState<ActiveEvent[]>([]);
  const [selectedEvent, setSelectedEvent] = useState<ActiveEvent | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    getMe().then(u => {
      if (u?.isAdmin) { setUser(u); loadEvents(); } else setScreen("login");
    });
  }, []);

  function loadEvents() {
    setScreen("loading");
    getActiveEvents()
      .then(es => { setEvents(es); setScreen("events"); })
      .catch(() => { setEvents([]); setScreen("events"); });
  }

  function handleLogout() {
    clearToken();
    setUser(null);
    setScreen("login");
  }

  function handleSelectEvent(ev: ActiveEvent) {
    setSelectedEvent(ev);
    setScreen("scanner");
  }

  if (screen === "loading") return <Loading />;
  if (screen === "login") return <LoginScreen onLogin={(u) => { setUser(u); loadEvents(); }} />;
  if (screen === "events") return (
    <EventsScreen
      events={events}
      user={user!}
      onSelect={handleSelectEvent}
      onRefresh={loadEvents}
      onLogout={handleLogout}
    />
  );
  if (screen === "scanner" && selectedEvent) return (
    <ScannerScreen
      event={selectedEvent}
      onBack={() => setScreen("events")}
      onLogout={handleLogout}
    />
  );
  return null;
}

/* ─── Loading ───────────────────────────────────────────────── */
function Loading() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-[#0a0a0a]">
      <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
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
    try {
      const u = await loginAdmin(email, password);
      onLogin(u);
    } catch (err: any) {
      setError(err.message ?? "Login failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#0a0a0a] p-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="text-4xl mb-3">🏐</div>
          <h1 className="text-2xl font-bold text-white">Dodge Club</h1>
          <p className="text-sm text-gray-400 mt-1">Door Staff Scanner</p>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-gray-400 mb-1.5 uppercase tracking-wider">Admin Email</label>
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              className="w-full bg-[#1a1a1a] border border-[#2a2a2a] text-white rounded-xl px-4 py-3 text-base focus:outline-none focus:border-primary"
              placeholder="admin@example.com"
              required
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-400 mb-1.5 uppercase tracking-wider">Password</label>
            <input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              className="w-full bg-[#1a1a1a] border border-[#2a2a2a] text-white rounded-xl px-4 py-3 text-base focus:outline-none focus:border-primary"
              placeholder="••••••••"
              required
            />
          </div>
          {error && <p className="text-red-400 text-sm text-center">{error}</p>}
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-primary text-white font-bold rounded-xl py-3 text-base disabled:opacity-50"
          >
            {loading ? "Signing in…" : "Sign In"}
          </button>
        </form>
      </div>
    </div>
  );
}

/* ─── Events ─────────────────────────────────────────────────── */
function EventsScreen({ events, user, onSelect, onRefresh, onLogout }: {
  events: ActiveEvent[];
  user: AdminUser;
  onSelect: (e: ActiveEvent) => void;
  onRefresh: () => void;
  onLogout: () => void;
}) {
  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white p-4">
      <div className="max-w-lg mx-auto">
        <div className="flex items-center justify-between mb-6 pt-4">
          <div>
            <h1 className="text-xl font-bold">🏐 Scanner</h1>
            <p className="text-xs text-gray-400">Signed in as {user.name}</p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={onRefresh}
              className="bg-[#1a1a1a] border border-[#2a2a2a] text-gray-300 rounded-lg px-3 py-2 text-sm font-medium"
            >
              Refresh
            </button>
            <button
              onClick={onLogout}
              className="bg-[#1a1a1a] border border-[#2a2a2a] text-gray-400 rounded-lg px-3 py-2 text-sm"
            >
              Sign out
            </button>
          </div>
        </div>

        <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">
          Events open for check-in
        </h2>

        {events.length === 0 ? (
          <div className="text-center py-16">
            <div className="text-4xl mb-3">🗓</div>
            <p className="text-gray-400">No events are currently open for check-in.</p>
            <p className="text-xs text-gray-500 mt-2">Events are available from 30 min before start to 2 hrs after.</p>
            <button onClick={onRefresh} className="mt-4 bg-[#1a1a1a] border border-[#2a2a2a] text-primary rounded-lg px-4 py-2 text-sm font-medium">
              Check Again
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            {events.map(ev => (
              <button
                key={ev.id}
                onClick={() => onSelect(ev)}
                className="w-full bg-[#141414] border border-[#2a2a2a] rounded-2xl p-5 text-left hover:border-primary transition-colors"
              >
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="font-bold text-lg text-white">{ev.title}</h3>
                    <p className="text-sm text-gray-400 mt-0.5">{ev.location}</p>
                    <p className="text-xs text-gray-500 mt-1">
                      {new Date(ev.date).toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long" })}
                      {" · "}
                      {new Date(ev.date).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" })}
                    </p>
                  </div>
                  <div className="ml-3 text-right shrink-0">
                    {ev.checkInPin ? (
                      <div className="bg-primary/20 border border-primary/30 rounded-lg px-3 py-2 text-center">
                        <p className="text-[10px] text-primary font-semibold uppercase tracking-wider">PIN</p>
                        <p className="text-xl font-mono font-bold text-white mt-0.5 tracking-widest">{ev.checkInPin}</p>
                      </div>
                    ) : (
                      <span className="text-xs text-gray-500">No PIN set</span>
                    )}
                  </div>
                </div>
                <div className="mt-3 flex items-center gap-2 text-primary font-semibold text-sm">
                  <span>Open Scanner →</span>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

/* ─── Scanner ────────────────────────────────────────────────── */
type ResultState = { type: "success" | "duplicate" | "error"; member?: CheckInResult["member"]; message?: string } | null;

function ScannerScreen({ event, onBack, onLogout }: { event: ActiveEvent; onBack: () => void; onLogout: () => void }) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const readerRef = useRef<BrowserMultiFormatReader | null>(null);
  const [result, setResult] = useState<ResultState>(null);
  const [scanning, setScanning] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [manualId, setManualId] = useState("");
  const [processing, setProcessing] = useState(false);
  const lastScannedRef = useRef<string | null>(null);
  const resultTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const processUserId = useCallback(async (userId: number) => {
    if (processing) return;
    setProcessing(true);
    try {
      const res = await scanCheckIn(event.id, userId);
      if (res.alreadyCheckedIn) {
        setResult({ type: "duplicate", member: res.member });
      } else {
        setResult({ type: "success", member: res.member });
      }
    } catch (err: any) {
      setResult({ type: "error", message: err.message ?? "Check-in failed" });
    } finally {
      setProcessing(false);
      if (resultTimerRef.current) clearTimeout(resultTimerRef.current);
      resultTimerRef.current = setTimeout(() => {
        setResult(null);
        lastScannedRef.current = null;
      }, 3500);
    }
  }, [event.id, processing]);

  const handleQRValue = useCallback((text: string) => {
    if (lastScannedRef.current === text) return;
    lastScannedRef.current = text;

    const match = text.match(/^dodgeclub:member:(\d+)$/);
    if (!match) {
      setResult({ type: "error", message: "Invalid QR code — not a Dodge Club member code" });
      if (resultTimerRef.current) clearTimeout(resultTimerRef.current);
      resultTimerRef.current = setTimeout(() => { setResult(null); lastScannedRef.current = null; }, 3000);
      return;
    }
    processUserId(Number(match[1]));
  }, [processUserId]);

  useEffect(() => {
    const reader = new BrowserMultiFormatReader(undefined, { delayBetweenScanAttempts: 500 });
    readerRef.current = reader;

    if (videoRef.current) {
      setScanning(true);
      reader.decodeFromConstraints(
        { video: { facingMode: "environment" } },
        videoRef.current,
        (result, err) => {
          if (result) handleQRValue(result.getText());
          if (err && !(err?.name === "NotFoundException" || err?.message?.includes("No MultiFormat"))) {
            setCameraError("Camera error — use manual entry below");
            setScanning(false);
          }
        }
      ).catch(() => {
        setCameraError("Camera unavailable — use manual entry below");
        setScanning(false);
      });
    }

    return () => {
      BrowserMultiFormatReader.releaseAllStreams();
      if (resultTimerRef.current) clearTimeout(resultTimerRef.current);
    };
  }, [handleQRValue]);

  function handleManualSubmit(e: React.FormEvent) {
    e.preventDefault();
    const id = parseInt(manualId.trim(), 10);
    if (!isNaN(id)) { processUserId(id); setManualId(""); }
  }

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white flex flex-col">
      {/* Header */}
      <div className="p-4 pt-safe flex items-center gap-3 border-b border-[#1e1e1e]">
        <button onClick={onBack} className="text-gray-400 text-sm font-medium">← Events</button>
        <div className="flex-1 text-center">
          <p className="text-sm font-bold truncate">{event.title}</p>
        </div>
        {event.checkInPin && (
          <div className="bg-primary/20 rounded-lg px-2.5 py-1 text-center">
            <p className="text-[9px] text-primary font-semibold uppercase tracking-wider">PIN</p>
            <p className="text-sm font-mono font-bold tracking-widest leading-tight">{event.checkInPin}</p>
          </div>
        )}
      </div>

      {/* Camera viewfinder */}
      <div className="relative flex-1 bg-black overflow-hidden max-h-[70vh]">
        <video ref={videoRef} className="w-full h-full object-cover" muted playsInline />

        {/* Scan frame */}
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="relative w-56 h-56">
            <div className="absolute top-0 left-0 w-10 h-10 border-l-4 border-t-4 border-primary rounded-tl-lg" />
            <div className="absolute top-0 right-0 w-10 h-10 border-r-4 border-t-4 border-primary rounded-tr-lg" />
            <div className="absolute bottom-0 left-0 w-10 h-10 border-l-4 border-b-4 border-primary rounded-bl-lg" />
            <div className="absolute bottom-0 right-0 w-10 h-10 border-r-4 border-b-4 border-primary rounded-br-lg" />
          </div>
        </div>

        {/* Result overlay */}
        {result && (
          <div className={`absolute inset-0 flex items-center justify-center ${
            result.type === "success" ? "bg-green-900/90" :
            result.type === "duplicate" ? "bg-yellow-900/90" : "bg-red-900/90"
          }`}>
            <div className="text-center p-8">
              <div className="text-6xl mb-3">
                {result.type === "success" ? "✅" : result.type === "duplicate" ? "🔄" : "❌"}
              </div>
              {result.member && (
                <>
                  <p className="text-3xl font-bold text-white">{result.member.name}</p>
                  <p className="text-sm text-gray-300 mt-1">Member #{result.member.id}</p>
                </>
              )}
              <p className={`mt-3 text-lg font-bold ${
                result.type === "success" ? "text-green-300" :
                result.type === "duplicate" ? "text-yellow-300" : "text-red-300"
              }`}>
                {result.type === "success" ? "Checked In!" :
                 result.type === "duplicate" ? "Already checked in" :
                 (result.message ?? "Failed")}
              </p>
            </div>
          </div>
        )}

        {/* Camera error */}
        {cameraError && !result && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/80">
            <div className="text-center p-6">
              <div className="text-4xl mb-3">📷</div>
              <p className="text-gray-300 text-sm">{cameraError}</p>
            </div>
          </div>
        )}

        {processing && !result && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/60">
            <div className="w-10 h-10 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          </div>
        )}
      </div>

      {/* Manual entry */}
      <div className="p-4 bg-[#0f0f0f] border-t border-[#1e1e1e]">
        <p className="text-xs text-gray-500 mb-2 text-center">Manual check-in by member ID</p>
        <form onSubmit={handleManualSubmit} className="flex gap-2">
          <input
            type="number"
            value={manualId}
            onChange={e => setManualId(e.target.value)}
            className="flex-1 bg-[#1a1a1a] border border-[#2a2a2a] text-white rounded-xl px-4 py-2.5 text-base focus:outline-none focus:border-primary"
            placeholder="Member ID"
            inputMode="numeric"
          />
          <button
            type="submit"
            disabled={processing || !manualId.trim()}
            className="bg-primary text-white font-bold rounded-xl px-5 py-2.5 disabled:opacity-50"
          >
            Check In
          </button>
        </form>
      </div>
    </div>
  );
}
