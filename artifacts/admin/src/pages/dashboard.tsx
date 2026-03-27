import { useEvents } from "@/hooks/use-events";
import { useMerch } from "@/hooks/use-merch";
import { useMembers } from "@/hooks/use-members";
import { useAuth } from "@/hooks/use-auth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  CalendarDays, Users, Wifi, ArrowRight,
  Plus, FileText, Activity, TrendingUp,
} from "lucide-react";
import { Link } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { fetchApi } from "@/lib/api";

type LiveUser = { id: number; name: string; avatarUrl: string | null; lastSeenAt: string };
type LiveUsersData = { count: number; users: LiveUser[] };
type SessionStats = {
  totalSessions: number;
  avgDuration: number;
  totalSeconds: number;
  todaySessions: number;
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

export default function Dashboard() {
  const { data: user } = useAuth();
  const { data: events, isLoading: eventsLoading } = useEvents();
  const { data: merch, isLoading: merchLoading } = useMerch();
  const { data: members, isLoading: membersLoading } = useMembers();

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
  const players = members?.filter(m => !m.accountType || m.accountType === "player").length || 0;
  const supporters = members?.filter(m => m.accountType === "supporter").length || 0;

  const liveCount = liveData?.count ?? 0;
  const liveUsers = liveData?.users ?? [];

  const stats = [
    {
      title: "Members",
      value: membersLoading ? "..." : members?.length || 0,
      subtext: `${players} players · ${supporters} supporters`,
      icon: Users,
      color: "text-blue-600",
      bg: "bg-blue-600/10",
      badgeColor: "text-blue-600 bg-blue-600/10",
      href: "/members",
    },
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
      label: "New Post",
      desc: "Publish to the feed",
      icon: FileText,
      color: "text-blue-600",
      bg: "bg-blue-600/10",
      border: "border-blue-600/20",
      href: "/posts",
    },
    {
      label: "Members",
      desc: `Manage ${members?.length ?? "..."} members`,
      icon: Users,
      color: "text-purple-600",
      bg: "bg-purple-600/10",
      border: "border-purple-600/20",
      href: "/members",
    },
  ];

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      {/* Header */}
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
      <div className="grid grid-cols-2 gap-3">
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
                <p className="text-[11px] text-muted-foreground mb-2">{stat.subtext}</p>
                <div className={`inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-md ${stat.badgeColor}`}>
                  View <ArrowRight className="w-2.5 h-2.5" />
                </div>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>

      {/* ── MAIN 2-COL GRID ── */}
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-5">

        {/* LEFT: Quick actions + upcoming events */}
        <div className="space-y-5">

          {/* Quick Actions */}
          <div className="grid grid-cols-3 gap-2.5">
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

        </div>

        {/* RIGHT: Engagement stats */}
        <div className="space-y-4">

          {/* App Engagement */}
          <Card className="bg-card border-border/60 shadow-sm">
            <CardHeader className="pb-2 px-4 pt-4">
              <CardTitle className="flex items-center gap-2 text-sm">
                <Activity className="w-4 h-4 text-primary" />
                App Engagement
              </CardTitle>
            </CardHeader>
            <CardContent className="px-4 pb-4 pt-0">
              <div className="grid grid-cols-2 gap-2">
                {[
                  {
                    label: "Today",
                    value: sessionLoading ? "…" : sessionStats?.todaySessions ?? 0,
                    sub: sessionLoading ? "" : `Avg ${fmtDuration(sessionStats?.todayAvgDuration ?? 0)}`,
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

          {/* Quick Stats */}
          <Card className="bg-card border-border/60 shadow-sm">
            <CardHeader className="pb-2 px-4 pt-4">
              <CardTitle className="flex items-center gap-2 text-sm">
                <TrendingUp className="w-4 h-4 text-primary" />
                Club at a Glance
              </CardTitle>
            </CardHeader>
            <CardContent className="px-4 pb-4 pt-0 space-y-2.5">
              {[
                {
                  label: "Players",
                  value: membersLoading ? "…" : players,
                  color: "text-blue-600",
                },
                {
                  label: "Supporters",
                  value: membersLoading ? "…" : supporters,
                  color: "text-pink-600",
                },
                {
                  label: "Upcoming Events",
                  value: eventsLoading ? "…" : upcomingEvents,
                  color: "text-primary",
                },
                {
                  label: "Merch Items",
                  value: merch ? merch.length : "…",
                  color: "text-purple-600",
                },
              ].map((row) => (
                <div key={row.label} className="flex items-center justify-between">
                  <span className="text-xs text-muted-foreground">{row.label}</span>
                  <span className={`text-xs font-bold ${row.color}`}>{row.value}</span>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
