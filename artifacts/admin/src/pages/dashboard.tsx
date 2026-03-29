import { useState } from "react";
import { useEvents } from "@/hooks/use-events";
import { useAuth } from "@/hooks/use-auth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  CalendarDays, Wifi, Plus, Activity, Users,
  Smartphone, Bell, Send, Trophy,
} from "lucide-react";
import { Link } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { fetchApi } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";

type LiveUser = { id: number; name: string; avatarUrl: string | null; lastSeenAt: string };
type LiveUsersData = { count: number; users: LiveUser[] };
type LeaderboardEntry = { userId: number; name: string; avatarUrl: string | null; count?: number; totalSpentPence?: number };
type Leaderboard = { topAttenders: LeaderboardEntry[]; topSpenders: LeaderboardEntry[] };
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


export default function Dashboard() {
  const { data: user } = useAuth();
  const { data: events, isLoading: eventsLoading } = useEvents();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [notifTitle, setNotifTitle] = useState("");
  const [notifBody, setNotifBody] = useState("");

  const { data: subscriberData } = useQuery<{ count: number }>({
    queryKey: ["admin-notify-subscribers"],
    queryFn: () => fetchApi<{ count: number }>("/api/admin/notify/subscribers"),
    refetchInterval: 60000,
  });
  const subscriberCount = subscriberData?.count ?? null;

  const { mutate: sendNotif, isPending: sending } = useMutation({
    mutationFn: () => fetchApi<{ sent: number }>("/api/admin/notify", {
      method: "POST",
      body: JSON.stringify({ title: notifTitle.trim(), body: notifBody.trim() }),
    }),
    onSuccess: (data) => {
      toast({ title: "Notification sent!", description: `Delivered to ${data.sent} member${data.sent !== 1 ? "s" : ""}.` });
      setNotifTitle("");
      setNotifBody("");
      queryClient.invalidateQueries({ queryKey: ["admin-announcements"] });
    },
    onError: (err: any) => {
      toast({ title: "Failed to send", description: err.message ?? "Something went wrong.", variant: "destructive" });
    },
  });

  const { data: leaderboard } = useQuery<Leaderboard>({
    queryKey: ["admin-leaderboard"],
    queryFn: () => fetchApi<Leaderboard>("/api/admin/leaderboard"),
    refetchInterval: 300000,
  });

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

      {/* ── MAIN CONTENT ── */}
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

          {/* Send Push Notification */}
          <Card className="bg-card border-border/60 shadow-sm">
            <CardHeader className="pb-2 px-4 pt-4">
              <CardTitle className="flex items-center justify-between text-sm">
                <span className="flex items-center gap-2">
                  <Bell className="w-4 h-4 text-primary" />
                  Send Push Notification
                </span>
                {subscriberCount !== null && (
                  <span className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground bg-muted/60 rounded-full px-2.5 py-0.5">
                    <span className={`inline-block w-1.5 h-1.5 rounded-full ${subscriberCount > 0 ? "bg-green-500" : "bg-muted-foreground/40"}`} />
                    {subscriberCount} subscriber{subscriberCount !== 1 ? "s" : ""}
                  </span>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent className="px-4 pb-4 pt-0 space-y-3">
              <Input
                placeholder="Title  e.g. New event just dropped 🎉"
                value={notifTitle}
                onChange={e => setNotifTitle(e.target.value)}
                maxLength={65}
              />
              <Textarea
                placeholder="Message  e.g. April Showdown tickets are live — grab yours now!"
                value={notifBody}
                onChange={e => setNotifBody(e.target.value)}
                rows={2}
                maxLength={178}
              />
              <Button
                className="w-full gap-2"
                disabled={!notifTitle.trim() || !notifBody.trim() || sending}
                onClick={() => sendNotif()}
              >
                <Send className="w-4 h-4" />
                {sending ? "Sending…" : "Send to all subscribers"}
              </Button>
            </CardContent>
          </Card>

          {/* Top Members Leaderboard */}
          <Card className="bg-card border-border/60 shadow-sm">
            <CardHeader className="pb-2 px-4 pt-4">
              <CardTitle className="flex items-center gap-2 text-sm">
                <Trophy className="w-4 h-4 text-yellow-500" />
                Top Members
              </CardTitle>
            </CardHeader>
            <CardContent className="px-4 pb-4 pt-0">
              <div className="grid grid-cols-2 gap-4">
                {/* Top Attenders */}
                <div>
                  <div className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground mb-2">Most Events Attended</div>
                  {!leaderboard ? (
                    <div className="text-xs text-muted-foreground">Loading…</div>
                  ) : leaderboard.topAttenders.length === 0 ? (
                    <div className="text-xs text-muted-foreground">No data yet</div>
                  ) : (
                    <ol className="space-y-1.5">
                      {leaderboard.topAttenders.map((entry, i) => (
                        <li key={entry.userId} className="flex items-center gap-2">
                          <span className={`text-[10px] font-bold w-4 shrink-0 text-center ${i === 0 ? "text-yellow-500" : i === 1 ? "text-slate-400" : i === 2 ? "text-amber-700" : "text-muted-foreground"}`}>
                            {i === 0 ? "🥇" : i === 1 ? "🥈" : i === 2 ? "🥉" : `${i + 1}`}
                          </span>
                          <div className="w-6 h-6 rounded-full bg-secondary flex items-center justify-center overflow-hidden shrink-0">
                            {entry.avatarUrl ? (
                              <img src={entry.avatarUrl.startsWith("/objects/") ? `/api/storage${entry.avatarUrl}` : entry.avatarUrl} alt={entry.name} className="w-full h-full object-cover" />
                            ) : (
                              <span className="text-[9px] font-bold">{entry.name.charAt(0)}</span>
                            )}
                          </div>
                          <span className="text-xs font-medium text-foreground truncate flex-1">{entry.name}</span>
                          <span className="text-xs font-bold text-primary shrink-0">{entry.count}</span>
                        </li>
                      ))}
                    </ol>
                  )}
                </div>
                {/* Top Spenders */}
                <div>
                  <div className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground mb-2">Highest Spend</div>
                  {!leaderboard ? (
                    <div className="text-xs text-muted-foreground">Loading…</div>
                  ) : leaderboard.topSpenders.length === 0 ? (
                    <div className="text-xs text-muted-foreground">No data yet</div>
                  ) : (
                    <ol className="space-y-1.5">
                      {leaderboard.topSpenders.map((entry, i) => (
                        <li key={entry.userId} className="flex items-center gap-2">
                          <span className={`text-[10px] font-bold w-4 shrink-0 text-center ${i === 0 ? "text-yellow-500" : i === 1 ? "text-slate-400" : i === 2 ? "text-amber-700" : "text-muted-foreground"}`}>
                            {i === 0 ? "🥇" : i === 1 ? "🥈" : i === 2 ? "🥉" : `${i + 1}`}
                          </span>
                          <div className="w-6 h-6 rounded-full bg-secondary flex items-center justify-center overflow-hidden shrink-0">
                            {entry.avatarUrl ? (
                              <img src={entry.avatarUrl.startsWith("/objects/") ? `/api/storage${entry.avatarUrl}` : entry.avatarUrl} alt={entry.name} className="w-full h-full object-cover" />
                            ) : (
                              <span className="text-[9px] font-bold">{entry.name.charAt(0)}</span>
                            )}
                          </div>
                          <span className="text-xs font-medium text-foreground truncate flex-1">{entry.name}</span>
                          <span className="text-xs font-bold text-green-600 shrink-0">
                            £{((entry.totalSpentPence ?? 0) / 100).toFixed(2)}
                          </span>
                        </li>
                      ))}
                    </ol>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

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
    </div>
  );
}
