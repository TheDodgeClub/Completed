import { useEvents } from "@/hooks/use-events";
import { usePosts } from "@/hooks/use-posts";
import { useMerch } from "@/hooks/use-merch";
import { useMembers } from "@/hooks/use-members";
import { useAuth } from "@/hooks/use-auth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CalendarDays, MessageSquare, Users, Trophy, Zap, CircleDot } from "lucide-react";
import { Link } from "wouter";

const LEVEL_NAMES = ["Rookie", "Player", "Contender", "Competitor", "Veteran", "Elite", "Pro", "Champion", "Legend", "Icon"];

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

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div>
        <h1 className="text-3xl font-display font-bold text-foreground">Dashboard</h1>
        <p className="text-muted-foreground mt-2 text-lg">Welcome back, {user?.name}. Here's what's happening at Dodge Club.</p>
      </div>

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
