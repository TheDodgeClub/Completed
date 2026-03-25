import { useEvents } from "@/hooks/use-events";
import { usePosts } from "@/hooks/use-posts";
import { useMerch } from "@/hooks/use-merch";
import { useMembers } from "@/hooks/use-members";
import { useAuth } from "@/hooks/use-auth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CalendarDays, MessageSquare, ShoppingBag, Users, Trophy, Zap, CircleDot } from "lucide-react";
import { Link } from "wouter";

const LEVEL_NAMES = ["Rookie", "Player", "Contender", "Competitor", "Veteran", "Elite", "Pro", "Champion", "Legend", "Icon"];

function resolveAvatarUrl(url: string | null | undefined): string | undefined {
  if (!url) return undefined;
  if (url.startsWith("/objects/")) return `/api/storage${url}`;
  return url;
}

export default function Dashboard() {
  const { data: user } = useAuth();
  const { data: events, isLoading: eventsLoading } = useEvents();
  const { data: posts, isLoading: postsLoading } = usePosts();
  const { data: merch, isLoading: merchLoading } = useMerch();
  const { data: members, isLoading: membersLoading } = useMembers();

  const upcomingEvents = events?.filter(e => e.isUpcoming)?.length || 0;
  const outOfStockMerch = merch?.filter(m => !m.inStock)?.length || 0;
  const totalMedals = members?.reduce((sum, m) => sum + m.medalsEarned, 0) || 0;
  const totalXp = members?.reduce((sum, m) => sum + (m.xp ?? 0), 0) || 0;
  const topMembers = [...(members ?? [])].sort((a, b) => (b.xp ?? 0) - (a.xp ?? 0)).slice(0, 5);

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
      title: "Upcoming Events",
      value: eventsLoading ? "..." : upcomingEvents,
      subtext: `Out of ${events?.length || 0} total events`,
      icon: CalendarDays,
      color: "text-primary",
      bg: "bg-primary/10",
      href: "/events"
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
  ];

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div>
        <h1 className="text-3xl font-display font-bold text-foreground">Dashboard</h1>
        <p className="text-muted-foreground mt-2 text-lg">Welcome back, {user?.name}. Here's what's happening at Dodge Club.</p>
      </div>

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

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* XP Leaderboard */}
        <Card className="bg-card border-border/50 shadow-lg shadow-black/20">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Zap className="w-5 h-5 text-accent" />
              XP Leaderboard
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {membersLoading ? (
              <div className="text-sm text-muted-foreground py-4 text-center">Loading...</div>
            ) : topMembers.length === 0 ? (
              <div className="text-sm text-muted-foreground py-4 text-center">No members yet</div>
            ) : (
              topMembers.map((member, idx) => {
                const levelName = LEVEL_NAMES[(member.level ?? 1) - 1] ?? "Player";
                const maxXp = topMembers[0]?.xp ?? 1;
                const pct = maxXp > 0 ? Math.max(((member.xp ?? 0) / maxXp) * 100, 2) : 2;
                return (
                  <Link key={member.id} href="/members">
                    <div className="flex items-center gap-3 p-3 rounded-xl hover:bg-secondary/40 transition-colors group cursor-pointer">
                      <span className={`w-6 text-center text-sm font-bold shrink-0 ${idx === 0 ? "text-accent" : idx === 1 ? "text-slate-300" : idx === 2 ? "text-amber-600" : "text-muted-foreground"}`}>
                        {idx + 1}
                      </span>
                      <div className="w-9 h-9 rounded-full bg-secondary flex items-center justify-center overflow-hidden border border-border/50 shrink-0">
                        {member.avatarUrl ? (
                          <img src={resolveAvatarUrl(member.avatarUrl)} alt={member.name} className="w-full h-full object-cover" />
                        ) : (
                          <span className="font-bold text-sm">{member.name.charAt(0)}</span>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-sm text-foreground truncate">{member.name}</span>
                          <span className="text-[10px] font-bold bg-accent/20 text-accent border border-accent/30 rounded px-1.5 py-0.5 shrink-0">
                            LV {member.level ?? 1}
                          </span>
                        </div>
                        <div className="flex items-center gap-2 mt-0.5">
                          <div className="flex-1 h-1.5 bg-secondary rounded-full overflow-hidden">
                            <div className="h-full bg-accent rounded-full transition-all" style={{ width: `${pct}%` }} />
                          </div>
                          <span className="text-xs text-accent font-semibold shrink-0">{(member.xp ?? 0).toLocaleString()} XP</span>
                        </div>
                        <span className="text-[10px] text-muted-foreground">{levelName}</span>
                      </div>
                    </div>
                  </Link>
                );
              })
            )}
          </CardContent>
        </Card>

        {/* Quick Actions */}
        <Card className="bg-card border-border/50 shadow-lg shadow-black/20">
          <CardHeader>
            <CardTitle>Quick Actions</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <Link href="/events">
              <Button variant="outline" className="w-full justify-start h-12 bg-secondary/20 hover:bg-primary/10 hover:text-primary hover:border-primary/30 border-border/50 rounded-xl">
                <CalendarDays className="w-4 h-4 mr-3" /> Create a new event
              </Button>
            </Link>
            <Link href="/posts">
              <Button variant="outline" className="w-full justify-start h-12 bg-secondary/20 hover:bg-primary/10 hover:text-primary hover:border-primary/30 border-border/50 rounded-xl">
                <MessageSquare className="w-4 h-4 mr-3" /> Post an update
              </Button>
            </Link>
            <Link href="/members">
              <Button variant="outline" className="w-full justify-start h-12 bg-secondary/20 hover:bg-primary/10 hover:text-primary hover:border-primary/30 border-border/50 rounded-xl">
                <Users className="w-4 h-4 mr-3" /> Record attendance
              </Button>
            </Link>
            <Link href="/members">
              <Button variant="outline" className="w-full justify-start h-12 bg-secondary/20 hover:bg-accent/10 hover:text-accent hover:border-accent/30 border-border/50 rounded-xl">
                <Trophy className="w-4 h-4 mr-3" /> Award a medal
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
