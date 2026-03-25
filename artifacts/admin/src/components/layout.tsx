import { Link, useLocation } from "wouter";
import { useAuth, useLogout } from "@/hooks/use-auth";
import { useEvents } from "@/hooks/use-events";
import { usePosts } from "@/hooks/use-posts";
import { useMerch } from "@/hooks/use-merch";
import { useMembers } from "@/hooks/use-members";
import { useVideos } from "@/hooks/use-videos";
import {
  LayoutDashboard, CalendarDays, MessageSquare,
  ShoppingBag, Users, LogOut, Loader2, Video
} from "lucide-react";
import { Button } from "@/components/ui/button";

function NavItem({ href, icon: Icon, label, count }: { href: string, icon: any, label: string, count?: number }) {
  const [location] = useLocation();
  const isActive = location === href;

  return (
    <Link
      href={href}
      className={`
        flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 group
        ${isActive
          ? "bg-primary/10 text-primary font-semibold shadow-[inset_2px_0_0_0_hsl(var(--primary))]"
          : "text-muted-foreground hover:bg-white/5 hover:text-foreground"
        }
      `}
    >
      <Icon className={`w-5 h-5 ${isActive ? "text-primary" : "text-muted-foreground group-hover:text-foreground transition-colors"}`} />
      <span className="flex-1">{label}</span>
      {count !== undefined && count >= 0 && (
        <span className={`text-xs px-2 py-0.5 rounded-full ${isActive ? "bg-primary/20 text-primary" : "bg-white/10 text-muted-foreground"}`}>
          {count}
        </span>
      )}
    </Link>
  );
}

function SidebarNav() {
  const { data: events } = useEvents();
  const { data: posts } = usePosts();
  const { data: merch } = useMerch();
  const { data: members } = useMembers();
  const { data: videos } = useVideos();

  return (
    <nav className="flex-1 px-3 space-y-1 overflow-y-auto">
      <NavItem href="/" icon={LayoutDashboard} label="Dashboard" />
      <NavItem href="/events" icon={CalendarDays} label="Events" count={events?.length} />
      <NavItem href="/posts" icon={MessageSquare} label="Posts" count={posts?.length} />
      <NavItem href="/videos" icon={Video} label="Videos" count={videos?.length} />
      <NavItem href="/merch" icon={ShoppingBag} label="Merch" count={merch?.length} />
      <NavItem href="/members" icon={Users} label="Members" count={members?.length} />
    </nav>
  );
}

export function Layout({ children }: { children: React.ReactNode }) {
  const { data: user, isLoading } = useAuth();
  const { mutate: logout, isPending: isLoggingOut } = useLogout();
  const [location] = useLocation();

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-primary animate-spin" />
      </div>
    );
  }

  if (location === "/login") {
    return <>{children}</>;
  }

  return (
    <div className="flex h-screen bg-background overflow-hidden selection:bg-primary/30">
      {/* Sidebar */}
      <aside className="w-64 border-r border-border bg-card flex flex-col hidden md:flex shrink-0 z-20 shadow-2xl relative">
        <div className="p-6">
          <Link href="/" className="flex items-center gap-3 transition-opacity hover:opacity-80">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary to-primary/60 flex items-center justify-center shadow-lg shadow-primary/20">
              <span className="font-display font-bold text-white text-xl leading-none tracking-tighter">DC</span>
            </div>
            <div className="flex flex-col">
              <span className="font-display font-bold text-foreground leading-tight tracking-tight text-lg">Dodge Club</span>
              <span className="text-xs text-primary font-medium tracking-widest uppercase">Admin</span>
            </div>
          </Link>
        </div>

        <div className="px-4 py-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
          Management
        </div>

        {user && <SidebarNav />}

        <div className="p-4 mt-auto border-t border-border bg-white/5">
          <div className="flex items-center gap-3 mb-4 px-2">
            <div className="w-10 h-10 rounded-full bg-secondary flex items-center justify-center overflow-hidden border border-border">
              {user?.avatarUrl ? (
                <img src={user.avatarUrl} alt="Avatar" className="w-full h-full object-cover" />
              ) : (
                <span className="font-bold text-sm text-foreground">{user?.name?.charAt(0) || "A"}</span>
              )}
            </div>
            <div className="flex flex-col flex-1 min-w-0">
              <span className="text-sm font-semibold text-foreground truncate">{user?.name}</span>
              <span className="text-xs text-muted-foreground truncate">{user?.email}</span>
            </div>
          </div>
          <Button
            variant="outline"
            className="w-full justify-start text-muted-foreground hover:text-red-400 hover:bg-red-400/10 hover:border-red-400/20 transition-all"
            onClick={() => logout()}
            disabled={isLoggingOut}
          >
            <LogOut className="w-4 h-4 mr-2" />
            Sign Out
          </Button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col h-full overflow-hidden relative">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-primary/5 via-background to-background pointer-events-none" />
        <div className="flex-1 overflow-y-auto z-10 p-4 md:p-8">
          <div className="max-w-7xl mx-auto">
            {children}
          </div>
        </div>
      </main>
    </div>
  );
}
