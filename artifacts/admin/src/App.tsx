import { Switch, Route, Router as WouterRouter } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";

import { ThemeProvider } from "@/context/theme";
import { Layout } from "@/components/layout";
import Login from "@/pages/login";
import Dashboard from "@/pages/dashboard";
import Events from "@/pages/events";
import Posts from "@/pages/posts";
import Merch from "@/pages/merch";
import Members from "@/pages/members";
import Videos from "@/pages/videos";
import SettingsPage from "@/pages/settings";
import TicketsPage from "@/pages/tickets";
import LeaderboardPage from "@/pages/leaderboard";
import NotFound from "@/pages/not-found";

const queryClient = new QueryClient();

function makePR(Component: React.ComponentType) {
  return function ProtectedPage() {
    const token = localStorage.getItem("dc_admin_token");
    if (!token) return null;
    return <Component />;
  };
}

const ProtectedDashboard = makePR(Dashboard);
const ProtectedEvents = makePR(Events);
const ProtectedPosts = makePR(Posts);
const ProtectedMerch = makePR(Merch);
const ProtectedMembers = makePR(Members);
const ProtectedVideos = makePR(Videos);
const ProtectedSettings = makePR(SettingsPage);
const ProtectedTickets = makePR(TicketsPage);
const ProtectedLeaderboard = makePR(LeaderboardPage);

function Router() {
  return (
    <Layout>
      <Switch>
        <Route path="/login" component={Login} />
        <Route path="/" component={ProtectedDashboard} />
        <Route path="/events" component={ProtectedEvents} />
        <Route path="/posts" component={ProtectedPosts} />
        <Route path="/merch" component={ProtectedMerch} />
        <Route path="/members" component={ProtectedMembers} />
        <Route path="/videos" component={ProtectedVideos} />
        <Route path="/tickets" component={ProtectedTickets} />
        <Route path="/leaderboard" component={ProtectedLeaderboard} />
        <Route path="/settings" component={ProtectedSettings} />
        <Route component={NotFound} />
      </Switch>
    </Layout>
  );
}

function App() {
  return (
    <ThemeProvider>
      <QueryClientProvider client={queryClient}>
        <TooltipProvider>
          <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
            <Router />
          </WouterRouter>
          <Toaster />
        </TooltipProvider>
      </QueryClientProvider>
    </ThemeProvider>
  );
}

export default App;
