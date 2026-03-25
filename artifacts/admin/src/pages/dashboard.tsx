import { useEvents } from "@/hooks/use-events";
import { usePosts } from "@/hooks/use-posts";
import { useMerch } from "@/hooks/use-merch";
import { useMembers } from "@/hooks/use-members";
import { useAuth } from "@/hooks/use-auth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { CalendarDays, MessageSquare, Users, Trophy, Zap, CircleDot, Bell, Send, CheckCircle, Clock, Activity, BarChart2, TrendingUp, Wifi } from "lucide-react";
import { Link } from "wouter";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { fetchApi } from "@/lib/api";

const LEVEL_NAMES = ["Rookie", "Player", "Contender", "Competitor", "Veteran", "Elite", "Pro", "Champion", "Legend", "Icon"];

type LiveUser = {
  id: number;
  name: string;
  avatarUrl: string | null;
  lastSeenAt: string;
};

type LiveUsersData = {
  count: number;
  users: LiveUser[];
};

type SessionStats = {
  totalSessions: number;
  avgDuration: number;
  totalSeconds: number;
  todaySessions: number;
  todayAvgDuration: number;
  weekSessions: number;
  weekAvgDuration: number;
  topUsers: { userId: number; name: string; avatarUrl: string | null; sessions: number; avgDuration: number; totalSeconds: number }[];
  dailyBreakdown: { day: string; sessions: number; avgDuration: number }[];
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

function MemberAvatar({ member }: { member: { name: string; avatarUrl: string | null } }) {
  return (
    <div className="w-8 h-8 rounded-full bg-secondary flex items-center justify-center overflow-hidden border border-border/50 shrink-0">
      {member.avatarUrl ? (
        <img src={resolveAvatarUrl(member.avatarUrl)} alt={member.name} className="w-full h-full object-cover" />
      ) : (
        <span className="font-bold text-xs">{member.name.charAt(0)}</span>
      )}
    </div>
  );
}

function RankBadge({ idx }: { idx: number }) {
  const colors = ["text-accent", "text-slate-300", "text-amber-600"];
  return (
    <span className={`w-5 text-center text-sm font-bold shrink-0 ${colors[idx] ?? "text-muted-foreground"}`}>
      {idx + 1}
    </span>
  );
}

export default function Dashboard() {
  const { data: user } = useAuth();
  const { data: events, isLoading: eventsLoading } = useEvents();
  const { data: posts, isLoading: postsLoading } = usePosts();
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

  const [notifTitle, setNotifTitle] = useState("");
  const [notifBody, setNotifBody] = useState("");
  const [notifSending, setNotifSending] = useState(false);
  const [notifResult, setNotifResult] = useState<{ sent: number; failed: number } | null>(null);

  const handleSendNotification = async () => {
    if (!notifTitle.trim() || !notifBody.trim()) return;
    setNotifSending(true);
    setNotifResult(null);
    try {
      const data = await fetchApi<{ sent: number; failed: number }>("/api/admin/notify", {
        method: "POST",
        body: JSON.stringify({ title: notifTitle, body: notifBody }),
      });
      setNotifResult({ sent: data.sent ?? 0, failed: data.failed ?? 0 });
      setNotifTitle("");
      setNotifBody("");
    } catch {
      setNotifResult({ sent: 0, failed: 1 });
    } finally {
      setNotifSending(false);
    }
  };

  const upcomingEvents = events?.filter(e => e.isUpcoming)?.length || 0;
  const totalMedals = members?.reduce((sum, m) => sum + m.medalsEarned, 0) || 0;
  const totalRings = members?.reduce((sum, m) => sum + m.ringsEarned, 0) || 0;
  const totalXp = members?.reduce((sum, m) => sum + (m.xp ?? 0), 0) || 0;

  const topByXp = [...(members ?? [])].sort((a, b) => (b.xp ?? 0) - (a.xp ?? 0)).slice(0, 5);
  const topByMedals = [...(members ?? [])].sort((a, b) => b.medalsEarned - a.medalsEarned).slice(0, 5);
  const topByRings = [...(members ?? [])].sort((a, b) => b.ringsEarned - a.ringsEarned).slice(0, 5);

  const stats = [
    {
      title: "Total Members",
      value: membersLoading ? "..." : members?.length || 0,
      subtext: "Active in the club",
      icon: Users,
      color: "text-blue-500",
      bg: "bg-blue-500/10",
      href: "/members"
    },
    {
      title: "Total XP Earned",
      value: membersLoading ? "..." : totalXp.toLocaleString(),
      subtext: `Across ${members?.length || 0} members`,
      icon: Zap,
      color: "text-accent",
      bg: "bg-accent/10",
      href: "/members"
    },
    {
      title: "Medals Awarded",
      value: membersLoading ? "..." : totalMedals,
      subtext: "To members across all events",
      icon: Trophy,
      color: "text-yellow-500",
      bg: "bg-yellow-500/10",
      href: "/members"
    },
    {
      title: "Upcoming Events",
      value: eventsLoading ? "..." : upcomingEvents,
      subtext: `Out of ${events?.length || 0} total events`,
      icon: CalendarDays,
      color: "text-primary",
      bg: "bg-primary/10",
      href: "/events"
    },
  ];

  const emptyState = (
    <div className="text-sm text-muted-foreground py-4 text-center">No members yet</div>
  );
  const loadingState = (
    <div className="text-sm text-muted-foreground py-4 text-center">Loading...</div>
  );

  const liveCount = liveData?.count ?? 0;
  const liveUsers = liveData?.users ?? [];

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div>
        <h1 className="text-3xl font-display font-bold text-foreground">Dashboard</h1>
        <p className="text-muted-foreground mt-2 text-lg">Welcome back, {user?.name}. Here's what's happening at Dodge Club.</p>
      </div>

      {/* Live Now banner */}
      <Card className={`border ${liveCount > 0 ? "border-green-500/40 bg-green-500/5" : "border-border/50 bg-card"} shadow-lg shadow-black/20 transition-colors duration-500`}>
        <CardContent className="py-4 px-5">
          <div className="flex items-center gap-3 flex-wrap">
            <div className="flex items-center gap-2 shrink-0">
              {liveCount > 0 ? (
                <span className="relative flex h-3 w-3">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75" />
                  <span className="relative inline-flex rounded-full h-3 w-3 bg-green-500" />
                </span>
              ) : (
                <span className="inline-flex rounded-full h-3 w-3 bg-muted-foreground/30" />
              )}
              <Wifi className={`w-4 h-4 ${liveCount > 0 ? "text-green-400" : "text-muted-foreground"}`} />
              <span className={`font-bold text-lg ${liveCount > 0 ? "text-green-400" : "text-muted-foreground"}`}>
                {liveCount}
              </span>
              <span className="text-sm font-medium text-muted-foreground">
                {liveCount === 1 ? "member" : "members"} live in the app right now
              </span>
              <span className="text-xs text-muted-foreground/60 ml-1">(last 5 min)</span>
            </div>
            {liveUsers.length > 0 && (
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-muted-foreground/40 text-xs">—</span>
                {liveUsers.slice(0, 8).map((u) => (
                  <div key={u.id} className="flex items-center gap-1.5 bg-green-500/10 border border-green-500/20 rounded-full px-2 py-0.5">
                    <div className="w-4 h-4 rounded-full bg-secondary flex items-center justify-center overflow-hidden shrink-0">
                      {u.avatarUrl ? (
                        <img src={resolveAvatarUrl(u.avatarUrl)} alt={u.name} className="w-full h-full object-cover" />
                      ) : (
                        <span className="text-[8px] font-bold">{u.name.charAt(0)}</span>
                      )}
                    </div>
                    <span className="text-xs font-medium text-green-300">{u.name.split(" ")[0]}</span>
                  </div>
                ))}
                {liveUsers.length > 8 && (
                  <span className="text-xs text-muted-foreground">+{liveUsers.length - 8} more</span>
                )}
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Stat cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat, i) => (
          <Link key={i} href={stat.href} className="block group">
            <Card className="bg-card border-border/50 shadow-lg shadow-black/20 hover:border-primary/50 hover:shadow-primary/5 transition-all duration-300 overflow-hidden relative">
              <div className="absolute inset-0 bg-gradient-to-br from-white/[0.02] to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
              <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
                <CardTitle className="text-sm font-medium text-muted-foreground">{stat.title}</CardTitle>
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${stat.bg} transition-transform group-hover:scale-110`}>
                  <stat.icon className={`w-5 h-5 ${stat.color}`} />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-4xl font-display font-bold text-foreground">{stat.value}</div>
                <p className="text-xs text-muted-foreground mt-2">{stat.subtext}</p>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>

      {/* Leaderboards */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* XP Leaderboard */}
        <Card className="bg-card border-border/50 shadow-lg shadow-black/20">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Zap className="w-5 h-5 text-accent" />
              XP Leaderboard
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-1">
            {membersLoading ? loadingState : topByXp.length === 0 ? emptyState : topByXp.map((member, idx) => {
              const maxVal = topByXp[0]?.xp ?? 1;
              const pct = maxVal > 0 ? Math.max(((member.xp ?? 0) / maxVal) * 100, 2) : 2;
              return (
                <Link key={member.id} href="/members">
                  <div className="flex items-center gap-2 p-2 rounded-xl hover:bg-secondary/40 transition-colors cursor-pointer">
                    <RankBadge idx={idx} />
                    <MemberAvatar member={member} />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-1">
                        <span className="font-semibold text-xs text-foreground truncate">{member.name}</span>
                        <span className="text-xs text-accent font-bold shrink-0">{(member.xp ?? 0).toLocaleString()}</span>
                      </div>
                      <div className="h-1 bg-secondary rounded-full overflow-hidden mt-1">
                        <div className="h-full bg-accent rounded-full" style={{ width: `${pct}%` }} />
                      </div>
                    </div>
                  </div>
                </Link>
              );
            })}
          </CardContent>
        </Card>

        {/* Medal Leaderboard */}
        <Card className="bg-card border-border/50 shadow-lg shadow-black/20">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Trophy className="w-5 h-5 text-yellow-500" />
              Medal Leaderboard
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-1">
            {membersLoading ? loadingState : topByMedals.length === 0 ? emptyState : topByMedals.map((member, idx) => {
              const maxVal = topByMedals[0]?.medalsEarned ?? 1;
              const pct = maxVal > 0 ? Math.max((member.medalsEarned / maxVal) * 100, 2) : 2;
              return (
                <Link key={member.id} href="/members">
                  <div className="flex items-center gap-2 p-2 rounded-xl hover:bg-secondary/40 transition-colors cursor-pointer">
                    <RankBadge idx={idx} />
                    <MemberAvatar member={member} />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-1">
                        <span className="font-semibold text-xs text-foreground truncate">{member.name}</span>
                        <span className="text-xs text-yellow-500 font-bold shrink-0">{member.medalsEarned} 🏅</span>
                      </div>
                      <div className="h-1 bg-secondary rounded-full overflow-hidden mt-1">
                        <div className="h-full bg-yellow-500 rounded-full" style={{ width: `${pct}%` }} />
                      </div>
                    </div>
                  </div>
                </Link>
              );
            })}
          </CardContent>
        </Card>

        {/* Ring Leaderboard */}
        <Card className="bg-card border-border/50 shadow-lg shadow-black/20">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CircleDot className="w-5 h-5 text-purple-400" />
              Ring Leaderboard
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-1">
            {membersLoading ? loadingState : topByRings.length === 0 ? emptyState : topByRings.map((member, idx) => {
              const maxVal = topByRings[0]?.ringsEarned ?? 1;
              const pct = maxVal > 0 ? Math.max((member.ringsEarned / maxVal) * 100, 2) : 2;
              return (
                <Link key={member.id} href="/members">
                  <div className="flex items-center gap-2 p-2 rounded-xl hover:bg-secondary/40 transition-colors cursor-pointer">
                    <RankBadge idx={idx} />
                    <MemberAvatar member={member} />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-1">
                        <span className="font-semibold text-xs text-foreground truncate">{member.name}</span>
                        <span className="text-xs text-purple-400 font-bold shrink-0">{member.ringsEarned} 💍</span>
                      </div>
                      <div className="h-1 bg-secondary rounded-full overflow-hidden mt-1">
                        <div className="h-full bg-purple-400 rounded-full" style={{ width: `${pct}%` }} />
                      </div>
                    </div>
                  </div>
                </Link>
              );
            })}
          </CardContent>
        </Card>
      </div>

      {/* Session Analytics */}
      <div>
        <h2 className="text-xl font-display font-bold text-foreground mb-4 flex items-center gap-2">
          <Activity className="w-5 h-5 text-primary" />
          App Engagement
        </h2>

        {/* Summary stat cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
          {[
            {
              label: "Avg Session",
              value: sessionLoading ? "…" : fmtDuration(sessionStats?.avgDuration ?? 0),
              sub: "All-time per session",
              icon: Clock,
              color: "text-primary",
              bg: "bg-primary/10",
            },
            {
              label: "Sessions Today",
              value: sessionLoading ? "…" : sessionStats?.todaySessions ?? 0,
              sub: sessionLoading ? "" : `Avg ${fmtDuration(sessionStats?.todayAvgDuration ?? 0)}`,
              icon: TrendingUp,
              color: "text-green-400",
              bg: "bg-green-400/10",
            },
            {
              label: "Sessions This Week",
              value: sessionLoading ? "…" : sessionStats?.weekSessions ?? 0,
              sub: sessionLoading ? "" : `Avg ${fmtDuration(sessionStats?.weekAvgDuration ?? 0)}`,
              icon: BarChart2,
              color: "text-blue-400",
              bg: "bg-blue-400/10",
            },
            {
              label: "Total Time in App",
              value: sessionLoading ? "…" : fmtDuration(sessionStats?.totalSeconds ?? 0),
              sub: `Across ${sessionStats?.totalSessions ?? 0} sessions`,
              icon: Activity,
              color: "text-accent",
              bg: "bg-accent/10",
            },
          ].map((s) => (
            <Card key={s.label} className="bg-card border-border/50 shadow-lg shadow-black/20">
              <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
                <CardTitle className="text-sm font-medium text-muted-foreground">{s.label}</CardTitle>
                <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${s.bg}`}>
                  <s.icon className={`w-4 h-4 ${s.color}`} />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-display font-bold text-foreground">{s.value}</div>
                <p className="text-xs text-muted-foreground mt-1">{s.sub}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Daily breakdown bar chart */}
          <Card className="bg-card border-border/50 shadow-lg shadow-black/20">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <BarChart2 className="w-4 h-4 text-primary" />
                Sessions — Last 7 Days
              </CardTitle>
            </CardHeader>
            <CardContent>
              {sessionLoading ? (
                <div className="text-sm text-muted-foreground py-6 text-center">Loading…</div>
              ) : !sessionStats?.dailyBreakdown?.length ? (
                <div className="text-sm text-muted-foreground py-6 text-center">No session data yet. Data appears once members open the app.</div>
              ) : (
                <div className="space-y-2">
                  {(() => {
                    const maxSessions = Math.max(...sessionStats.dailyBreakdown.map(d => d.sessions), 1);
                    return sessionStats.dailyBreakdown.map((d) => {
                      const pct = Math.max((d.sessions / maxSessions) * 100, 2);
                      const date = new Date(d.day);
                      const label = date.toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short" });
                      return (
                        <div key={d.day} className="flex items-center gap-3">
                          <span className="text-xs text-muted-foreground w-24 shrink-0">{label}</span>
                          <div className="flex-1 h-5 bg-secondary rounded-full overflow-hidden">
                            <div
                              className="h-full bg-primary rounded-full transition-all"
                              style={{ width: `${pct}%` }}
                            />
                          </div>
                          <span className="text-xs font-medium text-foreground w-16 text-right shrink-0">
                            {d.sessions} · {fmtDuration(d.avgDuration)}
                          </span>
                        </div>
                      );
                    });
                  })()}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Top users by time */}
          <Card className="bg-card border-border/50 shadow-lg shadow-black/20">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Clock className="w-4 h-4 text-primary" />
                Most Time in App
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-1">
              {sessionLoading ? (
                <div className="text-sm text-muted-foreground py-6 text-center">Loading…</div>
              ) : !sessionStats?.topUsers?.length ? (
                <div className="text-sm text-muted-foreground py-6 text-center">No session data yet.</div>
              ) : sessionStats.topUsers.map((u, idx) => {
                const maxSecs = sessionStats.topUsers[0]?.totalSeconds ?? 1;
                const pct = maxSecs > 0 ? Math.max((u.totalSeconds / maxSecs) * 100, 2) : 2;
                return (
                  <div key={u.userId} className="flex items-center gap-2 p-2 rounded-xl hover:bg-secondary/40 transition-colors">
                    <span className={`w-5 text-center text-sm font-bold shrink-0 ${idx === 0 ? "text-accent" : idx === 1 ? "text-slate-300" : idx === 2 ? "text-amber-600" : "text-muted-foreground"}`}>{idx + 1}</span>
                    <MemberAvatar member={u} />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-1">
                        <span className="font-semibold text-xs text-foreground truncate">{u.name}</span>
                        <span className="text-xs text-primary font-bold shrink-0">{fmtDuration(u.totalSeconds)}</span>
                      </div>
                      <div className="flex items-center gap-2 mt-1">
                        <div className="flex-1 h-1 bg-secondary rounded-full overflow-hidden">
                          <div className="h-full bg-primary rounded-full" style={{ width: `${pct}%` }} />
                        </div>
                        <span className="text-xs text-muted-foreground shrink-0">{u.sessions} sessions · {fmtDuration(u.avgDuration)} avg</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Push Notification Broadcaster */}
      <Card className="bg-card border-border/50 shadow-lg shadow-black/20">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bell className="w-5 h-5 text-accent" />
            Push Notification Broadcast
          </CardTitle>
          <p className="text-sm text-muted-foreground">Send an instant alert to all members who have enabled push notifications.</p>
        </CardHeader>
        <CardContent className="space-y-3">
          {notifResult && (
            <div className={`flex items-center gap-2 text-sm rounded-lg px-4 py-3 ${notifResult.failed > 0 && notifResult.sent === 0 ? "bg-destructive/10 text-destructive border border-destructive/20" : "bg-primary/10 text-primary border border-primary/20"}`}>
              <CheckCircle className="w-4 h-4 shrink-0" />
              <span>
                {notifResult.sent > 0
                  ? `Sent to ${notifResult.sent} member${notifResult.sent !== 1 ? "s" : ""}${notifResult.failed > 0 ? ` · ${notifResult.failed} failed` : ""}`
                  : "No opted-in members found or delivery failed."}
              </span>
            </div>
          )}
          <Input
            placeholder="Notification title (e.g. New event announced!)"
            value={notifTitle}
            onChange={(e) => { setNotifTitle(e.target.value); setNotifResult(null); }}
            className="bg-secondary/30 border-border/50 focus:border-primary/50"
          />
          <Textarea
            placeholder="Message body (e.g. Join us this Saturday at Dodgeclub Park…)"
            value={notifBody}
            onChange={(e) => { setNotifBody(e.target.value); setNotifResult(null); }}
            rows={3}
            className="bg-secondary/30 border-border/50 focus:border-primary/50 resize-none"
          />
          <div className="flex justify-end">
            <Button
              onClick={handleSendNotification}
              disabled={notifSending || !notifTitle.trim() || !notifBody.trim()}
              className="bg-primary hover:bg-primary/80 text-white gap-2"
            >
              <Send className="w-4 h-4" />
              {notifSending ? "Sending…" : "Send to All Members"}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Quick Actions */}
      <Card className="bg-card border-border/50 shadow-lg shadow-black/20">
        <CardHeader>
          <CardTitle>Quick Actions</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <Link href="/events">
            <Button variant="outline" className="w-full justify-start h-12 bg-secondary/20 hover:bg-primary/10 hover:text-primary hover:border-primary/30 border-border/50 rounded-xl">
              <CalendarDays className="w-4 h-4 mr-2" /> New event
            </Button>
          </Link>
          <Link href="/posts">
            <Button variant="outline" className="w-full justify-start h-12 bg-secondary/20 hover:bg-primary/10 hover:text-primary hover:border-primary/30 border-border/50 rounded-xl">
              <MessageSquare className="w-4 h-4 mr-2" /> Post update
            </Button>
          </Link>
          <Link href="/members">
            <Button variant="outline" className="w-full justify-start h-12 bg-secondary/20 hover:bg-primary/10 hover:text-primary hover:border-primary/30 border-border/50 rounded-xl">
              <Users className="w-4 h-4 mr-2" /> Attendance
            </Button>
          </Link>
          <Link href="/members">
            <Button variant="outline" className="w-full justify-start h-12 bg-secondary/20 hover:bg-accent/10 hover:text-accent hover:border-accent/30 border-border/50 rounded-xl">
              <Trophy className="w-4 h-4 mr-2" /> Award medal
            </Button>
          </Link>
        </CardContent>
      </Card>
    </div>
  );
}
