import { Switch, Route, Router as WouterRouter } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";

import { Layout } from "@/components/layout";
import Login from "@/pages/login";
import Dashboard from "@/pages/dashboard";
import Events from "@/pages/events";
import Posts from "@/pages/posts";
import Merch from "@/pages/merch";
import Members from "@/pages/members";
import Videos from "@/pages/videos";
import NotFound from "@/pages/not-found";

const queryClient = new QueryClient();

function ProtectedRoute({ component: Component }: { component: React.ComponentType }) {
  const token = localStorage.getItem("dc_admin_token");
  if (!token) return null;
  return <Component />;
}

function Router() {
  return (
    <Layout>
      <Switch>
        <Route path="/login" component={Login} />
        <Route path="/" render={() => <ProtectedRoute component={Dashboard} />} />
        <Route path="/events" render={() => <ProtectedRoute component={Events} />} />
        <Route path="/posts" render={() => <ProtectedRoute component={Posts} />} />
        <Route path="/merch" render={() => <ProtectedRoute component={Merch} />} />
        <Route path="/members" render={() => <ProtectedRoute component={Members} />} />
        <Route path="/videos" render={() => <ProtectedRoute component={Videos} />} />
        <Route component={NotFound} />
      </Switch>
    </Layout>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
          <Router />
        </WouterRouter>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
