import { useEvents } from "@/hooks/use-events";
import { usePosts } from "@/hooks/use-posts";
import { useMerch } from "@/hooks/use-merch";
import { useMembers } from "@/hooks/use-members";
import { useAuth } from "@/hooks/use-auth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CalendarDays, MessageSquare, ShoppingBag, Users, Trophy } from "lucide-react";
import { Link } from "wouter";

export default function Dashboard() {
  const { data: user } = useAuth();
  const { data: events, isLoading: eventsLoading } = useEvents();
  const { data: posts, isLoading: postsLoading } = usePosts();
  const { data: merch, isLoading: merchLoading } = useMerch();
  const { data: members, isLoading: membersLoading } = useMembers();

  const upcomingEvents = events?.filter(e => e.isUpcoming)?.length || 0;
  const outOfStockMerch = merch?.filter(m => !m.inStock)?.length || 0;
  const totalMedals = members?.reduce((sum, m) => sum + m.medalsEarned, 0) || 0;

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
      title: "Upcoming Events",
      value: eventsLoading ? "..." : upcomingEvents,
      subtext: `Out of ${events?.length || 0} total events`,
      icon: CalendarDays,
      color: "text-primary",
      bg: "bg-primary/10",
      href: "/events"
    },
    {
      title: "Products in Store",
      value: merchLoading ? "..." : merch?.length || 0,
      subtext: outOfStockMerch > 0 ? `${outOfStockMerch} items out of stock` : "All items in stock",
      icon: ShoppingBag,
      color: "text-emerald-500",
      bg: "bg-emerald-500/10",
      href: "/merch"
    },
    {
      title: "Community Posts",
      value: postsLoading ? "..." : posts?.length || 0,
      subtext: "On the message board",
      icon: MessageSquare,
      color: "text-purple-500",
      bg: "bg-purple-500/10",
      href: "/posts"
    }
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
        <Card className="bg-card border-border/50 shadow-lg shadow-black/20">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Trophy className="w-5 h-5 text-accent" />
              Community Achievements
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between p-6 rounded-2xl bg-secondary/30 border border-border/50">
              <div>
                <p className="text-sm text-muted-foreground font-medium mb-1">Total Medals Awarded</p>
                <p className="text-4xl font-display font-bold text-accent">{totalMedals}</p>
              </div>
              <div className="w-16 h-16 rounded-full bg-accent/10 border border-accent/20 flex items-center justify-center">
                <Trophy className="w-8 h-8 text-accent" />
              </div>
            </div>
            <p className="text-sm text-muted-foreground mt-4">
              Medals are awarded to members for attending events and demonstrating outstanding sportsmanship. You can award medals from the Members tab.
            </p>
          </CardContent>
        </Card>

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
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
