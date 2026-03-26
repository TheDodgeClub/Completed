import { useEvents } from "@/hooks/use-events";
import { usePosts } from "@/hooks/use-posts";
import { useMerch } from "@/hooks/use-merch";
import { useMembers } from "@/hooks/use-members";
import { useAuth } from "@/hooks/use-auth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  CalendarDays, MessageSquare, Users, Trophy, Zap, CircleDot,
  Bell, Send, CheckCircle, Clock, Activity, BarChart2, TrendingUp, Wifi,
  ArrowRight, Plus, FileText,
} from "lucide-react";
import { Link } from "wouter";
import { useState, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import { fetchApi } from "@/lib/api";

const LEVEL_NAMES = ["Rookie", "Player", "Contender", "Competitor", "Veteran", "Ace", "Pro", "Champion", "Legend", "Icon"];

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
  const notifRef = useRef<HTMLDivElement>(null);

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
      color: "text-blue-400",
      bg: "bg-blue-400/10",
      badgeColor: "text-blue-400 bg-blue-400/10",
      href: "/members",
    },
    {
      title: "Total XP Earned",
      value: membersLoading ? "..." : totalXp.toLocaleString(),
      subtext: `Across ${members?.length || 0} members`,
      icon: Zap,
      color: "text-accent",
      bg: "bg-accent/10",
      badgeColor: "text-accent bg-accent/10",
      href: "/members",
    },
    {
      title: "Medals Awarded",
      value: membersLoading ? "..." : totalMedals,
      subtext: "To members across all events",
      icon: Trophy,
      color: "text-yellow-500",
      bg: "bg-yellow-500/10",
      badgeColor: "text-yellow-500 bg-yellow-500/10",
      href: "/members",
    },
    {
      title: "Upcoming Events",
      value: eventsLoading ? "..." : upcomingEvents,
      subtext: `Out of ${events?.length || 0} total events`,
      icon: CalendarDays,
      color: "text-primary",
      bg: "bg-primary/10",
      badgeColor: "text-primary bg-primary/10",
      href: "/events",
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

  const quickActions = [
    {
      label: "Send Notification",
      desc: "Broadcast to all members",
      icon: Bell,
      color: "text-accent",
      bg: "bg-accent/10",
      border: "border-accent/25",
      onClick: () => notifRef.current?.scrollIntoView({ behavior: "smooth", block: "center" }),
    },
    {
      label: "Add Event",
      desc: "Schedule a new session",
      icon: Plus,
      color: "text-primary",
      bg: "bg-primary/10",
      border: "border-primary/25",
      href: "/events",
    },
    {
      label: "New Post",
      desc: "Publish to the feed",
      icon: FileText,
      color: "text-blue-400",
      bg: "bg-blue-400/10",
      border: "border-blue-400/25",
      href: "/posts",
    },
    {
      label: "View Members",
      desc: `Manage all ${members?.length ?? "..."} members`,
      icon: Users,
      color: "text-purple-400",
      bg: "bg-purple-400/10",
      border: "border-purple-400/25",
      href: "/members",
    },
  ];

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-display font-bold text-foreground">Dashboard</h1>
        <p className="text-muted-foreground mt-1">Welcome back, {user?.name}. Here's what's happening.</p>
      </div>

      {/* ── QUICK ACTIONS ── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {quickActions.map((action) => {
          const inner = (
            <button
              key={action.label}
              onClick={action.onClick}
              className={`w-full text-left rounded-2xl border ${action.border} ${action.bg} p-4 cursor-pointer hover:brightness-110 transition-all duration-150 group`}
            >
              <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${action.bg} mb-3 group-hover:scale-110 transition-transform`}>
                <action.icon className={`w-4 h-4 ${action.color}`} />
              </div>
              <div className={`text-sm font-bold ${action.color} mb-0.5`}>{action.label}</div>
              <div className="text-xs text-muted-foreground">{action.desc}</div>
            </button>
          );
          if (action.href) {
            return (
              <Link key={action.label} href={action.href} className="block">
                {inner}
              </Link>
            );
          }
          return <div key={action.label}>{inner}</div>;
        })}
      </div>

      {/* ── LIVE NOW BANNER ── */}
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

      {/* ── MAIN 2-COLUMN GRID ── */}
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_380px] gap-6">

        {/* LEFT: KPI cards + Leaderboards */}
        <div className="space-y-6">

          {/* KPI stat cards with explicit "View all →" affordance */}
          <div className="grid grid-cols-2 gap-4">
            {stats.map((stat) => (
              <Link key={stat.title} href={stat.href} className="block group">
                <Card className="bg-card border-border/50 shadow-lg shadow-black/20 hover:border-primary/40 transition-all duration-300 overflow-hidden relative h-full">
                  <div className="absolute inset-0 bg-gradient-to-br from-white/[0.02] to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                  <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
                    <CardTitle className="text-sm font-medium text-muted-foreground">{stat.title}</CardTitle>
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${stat.bg} transition-transform group-hover:scale-110`}>
                      <stat.icon className={`w-5 h-5 ${stat.color}`} />
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="text-4xl font-display font-bold text-foreground mb-1">{stat.value}</div>
                    <p className="text-xs text-muted-foreground mb-3">{stat.subtext}</p>
                    {/* Explicit CTA badge — visible affordance even before hover */}
                    <div className={`inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-lg ${stat.badgeColor}`}>
                      View all <ArrowRight className="w-3 h-3" />
                    </div>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>

          {/* Leaderboards — 3 columns */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">

            {/* XP Leaderboard */}
            <Card className="bg-card border-border/50 shadow-lg shadow-black/20">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2 text-sm">
                    <Zap className="w-4 h-4 text-accent" />
                    XP Leaderboard
                  </CardTitle>
                  <Link href="/members">
                    <span className="text-xs font-semibold text-accent bg-accent/10 px-2 py-1 rounded-lg hover:bg-accent/20 transition-colors cursor-pointer">
                      View →
                    </span>
                  </Link>
                </div>
              </CardHeader>
              <CardContent className="space-y-1 pt-0">
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
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2 text-sm">
                    <Trophy className="w-4 h-4 text-yellow-500" />
                    Medals
                  </CardTitle>
                  <Link href="/members">
                    <span className="text-xs font-semibold text-yellow-500 bg-yellow-500/10 px-2 py-1 rounded-lg hover:bg-yellow-500/20 transition-colors cursor-pointer">
                      View →
                    </span>
                  </Link>
                </div>
              </CardHeader>
              <CardContent className="space-y-1 pt-0">
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
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2 text-sm">
                    <CircleDot className="w-4 h-4 text-purple-400" />
                    Rings
                  </CardTitle>
                  <Link href="/members">
                    <span className="text-xs font-semibold text-purple-400 bg-purple-400/10 px-2 py-1 rounded-lg hover:bg-purple-400/20 transition-colors cursor-pointer">
                      View →
                    </span>
                  </Link>
                </div>
              </CardHeader>
              <CardContent className="space-y-1 pt-0">
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
        </div>

        {/* RIGHT: Push notification + Engagement stats */}
        <div className="space-y-4">

          {/* Push Notification — promoted above fold, not buried at bottom */}
          <div ref={notifRef}>
            <Card className="bg-card border-accent/20 shadow-lg shadow-black/20">
              <CardHeader className="pb-3">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-accent/10 flex items-center justify-center shrink-0">
                    <Bell className="w-4 h-4 text-accent" />
                  </div>
                  <div>
                    <CardTitle className="text-base">Push Notification</CardTitle>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Broadcast to all {members?.length ?? "..."} members
                    </p>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                {notifResult && (
                  <div className={`flex items-center gap-2 p-3 rounded-xl text-sm font-medium ${notifResult.sent > 0 ? "bg-green-500/10 text-green-400 border border-green-500/20" : "bg-destructive/10 text-destructive border border-destructive/20"}`}>
                    <CheckCircle className="w-4 h-4 shrink-0" />
                    {notifResult.sent > 0
                      ? `Sent to ${notifResult.sent} member${notifResult.sent !== 1 ? "s" : ""}${notifResult.failed > 0 ? ` (${notifResult.failed} failed)` : ""}`
                      : "Failed to send — please try again"}
                  </div>
                )}
                <div>
                  <label className="text-xs font-semibold text-muted-foreground tracking-widest uppercase mb-1.5 block">Title</label>
                  <Input
                    placeholder="e.g. New event this Friday!"
                    value={notifTitle}
                    onChange={(e) => setNotifTitle(e.target.value)}
                    className="bg-background border-border/60 focus:border-accent/50"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-muted-foreground tracking-widest uppercase mb-1.5 block">Message</label>
                  <Textarea
                    placeholder="e.g. Join us at the sports hall on Friday at 7pm…"
                    value={notifBody}
                    onChange={(e) => setNotifBody(e.target.value)}
                    rows={3}
                    className="bg-background border-border/60 focus:border-accent/50 resize-none"
                  />
                </div>
                <Button
                  className="w-full bg-accent text-accent-foreground hover:bg-accent/90 font-bold gap-2"
                  onClick={handleSendNotification}
                  disabled={notifSending || !notifTitle.trim() || !notifBody.trim()}
                >
                  {notifSending ? (
                    <>Sending…</>
                  ) : (
                    <><Send className="w-4 h-4" /> Send to All Members</>
                  )}
                </Button>
              </CardContent>
            </Card>
          </div>

          {/* Engagement stats — compact 2x2 mini cards */}
          <Card className="bg-card border-border/50 shadow-lg shadow-black/20">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-sm">
                <Activity className="w-4 h-4 text-primary" />
                App Engagement
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="grid grid-cols-2 gap-3">
                {[
                  {
                    label: "Sessions Today",
                    value: sessionLoading ? "…" : sessionStats?.todaySessions ?? 0,
                    sub: sessionLoading ? "" : `Avg ${fmtDuration(sessionStats?.todayAvgDuration ?? 0)}`,
                    color: "text-green-400",
                    bg: "bg-green-400/10",
                  },
                  {
                    label: "Avg Session",
                    value: sessionLoading ? "…" : fmtDuration(sessionStats?.avgDuration ?? 0),
                    sub: "All-time per session",
                    color: "text-blue-400",
                    bg: "bg-blue-400/10",
                  },
                  {
                    label: "This Week",
                    value: sessionLoading ? "…" : sessionStats?.weekSessions ?? 0,
                    sub: sessionLoading ? "" : `Avg ${fmtDuration(sessionStats?.weekAvgDuration ?? 0)}`,
                    color: "text-purple-400",
                    bg: "bg-purple-400/10",
                  },
                  {
                    label: "Total Time",
                    value: sessionLoading ? "…" : fmtDuration(sessionStats?.totalSeconds ?? 0),
                    sub: `${sessionStats?.totalSessions ?? 0} sessions`,
                    color: "text-accent",
                    bg: "bg-accent/10",
                  },
                ].map((s) => (
                  <div key={s.label} className={`rounded-xl p-3 ${s.bg} border border-border/30`}>
                    <div className="text-xs text-muted-foreground mb-1.5">{s.label}</div>
                    <div className={`text-xl font-display font-bold ${s.color}`}>{s.value}</div>
                    {s.sub && <div className="text-xs text-muted-foreground mt-0.5">{s.sub}</div>}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* ── SESSION ANALYTICS — full width below ── */}
      <div>
        <h2 className="text-lg font-display font-bold text-foreground mb-4 flex items-center gap-2">
          <BarChart2 className="w-5 h-5 text-primary" />
          Sessions — Last 7 Days &amp; Top Users
        </h2>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

          {/* Daily breakdown bar chart */}
          <Card className="bg-card border-border/50 shadow-lg shadow-black/20">
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-sm">
                <BarChart2 className="w-4 h-4 text-primary" />
                Daily Session Count
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
                            <div className="h-full bg-primary rounded-full transition-all" style={{ width: `${pct}%` }} />
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
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-sm">
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
    </div>
  );
}
