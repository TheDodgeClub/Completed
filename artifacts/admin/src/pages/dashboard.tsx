import { useEvents, Event } from "@/hooks/use-events";
import { useAuth } from "@/hooks/use-auth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  CalendarDays, Wifi, Plus, Activity, Users,
  Smartphone, MapPin,
} from "lucide-react";
import { Link } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { fetchApi } from "@/lib/api";
import { useMemo } from "react";

type LiveUser = { id: number; name: string; avatarUrl: string | null; lastSeenAt: string };
type LiveUsersData = { count: number; users: LiveUser[] };
type SessionStats = {
  totalSessions: number;
  avgDuration: number;
  totalSeconds: number;
  todaySessions: number;
  todayUniqueUsers: number;
  todayAvgDuration: number;
  weekSessions: number;
  weekAvgDuration: number;
};

function fmtDuration(secs: number): string {
  if (secs < 60) return `${secs}s`;
  if (secs < 3600) return `${Math.floor(secs / 60)}m ${secs % 60}s`;
  const h = Math.floor(secs / 3600);
  const m = Math.floor((secs % 3600) / 60);
  return `${h}h ${m}m`;
}

function resolveAvatarUrl(url: string | null | undefined): string | undefined {
  if (!url) return undefined;
  if (url.startsWith("/objects/")) return `/api/storage${url}`;
  return url;
}

const CITY_COORDS: Record<string, [number, number]> = {
  london: [148, 295], manchester: [90, 183], birmingham: [112, 232],
  leeds: [112, 172], liverpool: [78, 183], newcastle: [128, 148],
  sheffield: [112, 192], bristol: [72, 268], cardiff: [62, 255],
  glasgow: [72, 98], edinburgh: [118, 98], nottingham: [122, 212],
  southampton: [103, 300], brighton: [125, 308], norwich: [162, 248],
  coventry: [118, 228], leicester: [128, 215], york: [122, 162],
  stoke: [98, 202], exeter: [62, 292], portsmouth: [112, 308],
  oxford: [112, 272], cambridge: [147, 262], reading: [122, 282],
  derby: [118, 205], swindon: [95, 272], luton: [132, 278],
  wolverhampton: [105, 228], bolton: [88, 178], middlesbrough: [132, 155],
  peterborough: [140, 248], ipswich: [158, 268], plymouth: [48, 310],
};

function UkMap({ events }: { events: Event[] | undefined }) {
  const pins = useMemo(() => {
    if (!events) return [];
    const seen = new Set<string>();
    const result: Array<{ city: string; coords: [number, number]; count: number }> = [];
    events.forEach(e => {
      const loc = (e.location ?? "").toLowerCase();
      for (const [city, coords] of Object.entries(CITY_COORDS)) {
        if (loc.includes(city) && !seen.has(city)) {
          seen.add(city);
          const count = events.filter(ev => (ev.location ?? "").toLowerCase().includes(city)).length;
          result.push({ city, coords, count });
          break;
        }
      }
    });
    return result;
  }, [events]);

  const GB_PATH =
    "M 55,330 L 70,325 L 95,318 L 120,312 L 145,318 L 165,310 " +
    "L 168,285 L 162,260 L 162,240 L 158,210 L 158,188 L 155,165 " +
    "L 150,148 L 148,128 L 148,108 L 152,88 L 162,62 L 168,38 " +
    "L 162,20 L 148,10 L 130,8 L 112,15 L 98,22 L 85,30 " +
    "L 72,45 L 62,62 L 58,80 L 55,98 L 52,108 L 50,122 " +
    "L 55,135 L 68,148 L 72,162 L 65,178 L 55,188 L 45,205 " +
    "L 35,218 L 32,235 L 38,255 L 42,272 L 42,292 L 48,308 L 55,330 Z";

  return (
    <div className="relative flex-1">
      <svg viewBox="0 0 210 345" className="w-full h-full" fill="none" style={{ maxHeight: 220 }}>
        <path d={GB_PATH} fill="rgba(11,94,47,0.18)" stroke="#0B5E2F" strokeWidth="1.5" strokeLinejoin="round" />
        <ellipse cx="38" cy="115" rx="13" ry="9" fill="rgba(11,94,47,0.18)" stroke="#0B5E2F" strokeWidth="1.2" />
        {pins.map(({ city, coords, count }) => (
          <g key={city}>
            <circle
              cx={coords[0]} cy={coords[1]}
              r={Math.min(5 + count * 2, 11)}
              fill="#FFD700" opacity={0.75}
            />
            <circle cx={coords[0]} cy={coords[1]} r={2.5} fill="#0B5E2F" />
          </g>
        ))}
      </svg>
      {pins.length === 0 && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <p className="text-[10px] text-muted-foreground/40">No locations matched</p>
        </div>
      )}
    </div>
  );
}

export default function Dashboard() {
  const { data: user } = useAuth();
  const { data: events, isLoading: eventsLoading } = useEvents();

  const { data: sessionStats, isLoading: sessionLoading } = useQuery<SessionStats>({
    queryKey: ["admin-session-stats"],
    queryFn: () => fetchApi<SessionStats>("/api/admin/sessions/stats"),
    refetchInterval: 60000,
  });

  const { data: liveData } = useQuery<LiveUsersData>({
    queryKey: ["admin-live-users"],
    queryFn: () => fetchApi<LiveUsersData>("/api/admin/live-users"),
    refetchInterval: 30000,
  });

  const upcomingEvents = events?.filter(e => e.isUpcoming)?.length || 0;
  const liveCount = liveData?.count ?? 0;
  const liveUsers = liveData?.users ?? [];

  const stats = [
    {
      title: "Upcoming Events",
      value: eventsLoading ? "..." : upcomingEvents,
      subtext: `${events?.length || 0} events total`,
      icon: CalendarDays,
      color: "text-primary",
      bg: "bg-primary/10",
      badgeColor: "text-primary bg-primary/10",
      href: "/events",
    },
    {
      title: "Today's Users",
      value: sessionLoading ? "..." : sessionStats?.todayUniqueUsers ?? 0,
      subtext: `${sessionStats?.todaySessions ?? 0} sessions today`,
      icon: Smartphone,
      color: "text-green-600",
      bg: "bg-green-600/10",
      badgeColor: "text-green-600 bg-green-600/10",
      href: "/members",
    },
    {
      title: "This Week",
      value: sessionLoading ? "..." : sessionStats?.weekSessions ?? 0,
      subtext: `Avg ${fmtDuration(sessionStats?.weekAvgDuration ?? 0)} session`,
      icon: Activity,
      color: "text-purple-600",
      bg: "bg-purple-600/10",
      badgeColor: "text-purple-600 bg-purple-600/10",
      href: "/members",
    },
  ];

  const quickActions = [
    {
      label: "Add Event",
      desc: "Schedule a new session",
      icon: Plus,
      color: "text-primary",
      bg: "bg-primary/10",
      border: "border-primary/20",
      href: "/events",
    },
    {
      label: "Members",
      desc: "View all members",
      icon: Users,
      color: "text-purple-600",
      bg: "bg-purple-600/10",
      border: "border-purple-600/20",
      href: "/members",
    },
  ];

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div>
        <h1 className="text-2xl font-display font-bold text-foreground">Dashboard</h1>
        <p className="text-muted-foreground text-sm mt-0.5">Welcome back, {user?.name}.</p>
      </div>

      {/* ── LIVE NOW BANNER ── */}
      <Card className={`border ${liveCount > 0 ? "border-green-500/50 bg-green-500/5" : "border-border/50 bg-card"} shadow-sm transition-colors duration-500`}>
        <CardContent className="py-3 px-4">
          <div className="flex items-center gap-3 flex-wrap">
            <div className="flex items-center gap-2 shrink-0">
              {liveCount > 0 ? (
                <span className="relative flex h-2.5 w-2.5">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75" />
                  <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-green-500" />
                </span>
              ) : (
                <span className="inline-flex rounded-full h-2.5 w-2.5 bg-muted-foreground/30" />
              )}
              <Wifi className={`w-3.5 h-3.5 ${liveCount > 0 ? "text-green-600" : "text-muted-foreground"}`} />
              <span className={`font-bold text-sm ${liveCount > 0 ? "text-green-600" : "text-muted-foreground"}`}>
                {liveCount}
              </span>
              <span className="text-xs text-muted-foreground">
                {liveCount === 1 ? "member" : "members"} live right now
              </span>
            </div>
            {liveUsers.length > 0 && (
              <div className="flex items-center gap-1.5 flex-wrap">
                {liveUsers.slice(0, 6).map((u) => (
                  <div key={u.id} className="flex items-center gap-1 bg-green-500/10 border border-green-500/20 rounded-full px-2 py-0.5">
                    <div className="w-3.5 h-3.5 rounded-full bg-secondary flex items-center justify-center overflow-hidden shrink-0">
                      {u.avatarUrl ? (
                        <img src={resolveAvatarUrl(u.avatarUrl)} alt={u.name} className="w-full h-full object-cover" />
                      ) : (
                        <span className="text-[7px] font-bold">{u.name.charAt(0)}</span>
                      )}
                    </div>
                    <span className="text-xs font-medium text-green-700 dark:text-green-300">{u.name.split(" ")[0]}</span>
                  </div>
                ))}
                {liveUsers.length > 6 && (
                  <span className="text-xs text-muted-foreground">+{liveUsers.length - 6} more</span>
                )}
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* ── KPI STAT CARDS ── */}
      <div className="grid grid-cols-3 gap-3">
        {stats.map((stat) => (
          <Link key={stat.title} href={stat.href} className="block group">
            <Card className="bg-card border-border/60 shadow-sm hover:border-primary/40 hover:shadow-md transition-all duration-200 overflow-hidden relative h-full">
              <div className="absolute inset-0 bg-gradient-to-br from-white/[0.015] to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
              <CardHeader className="flex flex-row items-center justify-between pb-1.5 space-y-0 px-4 pt-4">
                <CardTitle className="text-xs font-semibold text-muted-foreground tracking-wide uppercase">{stat.title}</CardTitle>
                <div className={`w-7 h-7 rounded-lg flex items-center justify-center ${stat.bg}`}>
                  <stat.icon className={`w-3.5 h-3.5 ${stat.color}`} />
                </div>
              </CardHeader>
              <CardContent className="px-4 pb-4 pt-0">
                <div className="text-2xl font-display font-bold text-foreground mb-0.5">{stat.value}</div>
                <p className="text-[11px] text-muted-foreground">{stat.subtext}</p>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>

      {/* ── MAIN 2-COL GRID ── */}
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_260px] gap-5">

        {/* LEFT: Quick actions + app engagement */}
        <div className="space-y-5">

          {/* Quick Actions */}
          <div className="grid grid-cols-2 gap-2.5">
            {quickActions.map((action) => (
              <Link key={action.label} href={action.href} className="block">
                <div className={`rounded-xl border ${action.border} ${action.bg} p-3.5 cursor-pointer hover:brightness-95 dark:hover:brightness-110 transition-all duration-150 group`}>
                  <div className={`w-7 h-7 rounded-lg flex items-center justify-center ${action.bg} mb-2 group-hover:scale-110 transition-transform`}>
                    <action.icon className={`w-3.5 h-3.5 ${action.color}`} />
                  </div>
                  <div className={`text-xs font-bold ${action.color} mb-0.5`}>{action.label}</div>
                  <div className="text-[10px] text-muted-foreground leading-snug">{action.desc}</div>
                </div>
              </Link>
            ))}
          </div>

          {/* App Engagement */}
          <Card className="bg-card border-border/60 shadow-sm">
            <CardHeader className="pb-2 px-4 pt-4">
              <CardTitle className="flex items-center gap-2 text-sm">
                <Activity className="w-4 h-4 text-primary" />
                App Engagement
              </CardTitle>
            </CardHeader>
            <CardContent className="px-4 pb-4 pt-0">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {[
                  {
                    label: "Today",
                    value: sessionLoading ? "…" : sessionStats?.todayUniqueUsers ?? 0,
                    sub: `${sessionStats?.todaySessions ?? 0} sessions`,
                    color: "text-green-600",
                    bg: "bg-green-600/8",
                  },
                  {
                    label: "Avg Session",
                    value: sessionLoading ? "…" : fmtDuration(sessionStats?.avgDuration ?? 0),
                    sub: "All-time",
                    color: "text-blue-600",
                    bg: "bg-blue-600/8",
                  },
                  {
                    label: "This Week",
                    value: sessionLoading ? "…" : sessionStats?.weekSessions ?? 0,
                    sub: sessionLoading ? "" : `Avg ${fmtDuration(sessionStats?.weekAvgDuration ?? 0)}`,
                    color: "text-purple-600",
                    bg: "bg-purple-600/8",
                  },
                  {
                    label: "Total Time",
                    value: sessionLoading ? "…" : fmtDuration(sessionStats?.totalSeconds ?? 0),
                    sub: `${sessionStats?.totalSessions ?? 0} sessions`,
                    color: "text-orange-600",
                    bg: "bg-orange-600/8",
                  },
                ].map((s) => (
                  <div key={s.label} className={`rounded-xl p-3 ${s.bg} border border-border/30`}>
                    <div className="text-[10px] text-muted-foreground mb-1 font-medium uppercase tracking-wide">{s.label}</div>
                    <div className={`text-lg font-display font-bold ${s.color}`}>{s.value}</div>
                    {s.sub && <div className="text-[10px] text-muted-foreground mt-0.5">{s.sub}</div>}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* RIGHT: UK Map */}
        <Card className="bg-card border-border/60 shadow-sm">
          <CardHeader className="pb-2 px-4 pt-4">
            <CardTitle className="flex items-center gap-2 text-sm">
              <MapPin className="w-4 h-4 text-primary" />
              Event Venues
            </CardTitle>
            <p className="text-[10px] text-muted-foreground mt-0.5">Mapped by event location</p>
          </CardHeader>
          <CardContent className="px-4 pb-4 pt-0 flex flex-col items-center">
            <UkMap events={events} />
            {events && events.length > 0 && (
              <div className="w-full mt-2 space-y-1">
                {Array.from(new Set(events.map(e => e.location).filter(Boolean)))
                  .slice(0, 4)
                  .map(loc => (
                    <div key={loc} className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
                      <div className="w-1.5 h-1.5 rounded-full bg-primary shrink-0" />
                      <span className="truncate">{loc}</span>
                    </div>
                  ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
