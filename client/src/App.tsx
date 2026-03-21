import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/NotFound";
import { Route, Switch } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import Home from "./pages/Home";
import Dashboard from "./pages/Dashboard";
import PoolPage from "./pages/PoolPage";
import PoolSettings from "./pages/PoolSettings";
import JoinPool from "./pages/JoinPool";
import AdminPanel from "./pages/AdminPanel";
import ProjectDashboard from "./pages/ProjectDashboard";
import EnterPool from "./pages/EnterPool";
import PublicPools from "./pages/PublicPools";

// Organizer pages (Fase 4)
import CreatePool from "./pages/organizer/CreatePool";
import OrganizerDashboard from "./pages/organizer/OrganizerDashboard";
import OrganizerMembers from "./pages/organizer/OrganizerMembers";
import OrganizerAccess from "./pages/organizer/OrganizerAccess";
import OrganizerIdentity from "./pages/organizer/OrganizerIdentity";
import OrganizerRules from "./pages/organizer/OrganizerRules";

function Router() {
  return (
    <Switch>
      {/* Public routes */}
      <Route path="/" component={Home} />
      <Route path="/join/:token" component={JoinPool} />
      <Route path="/enter-pool" component={EnterPool} />
      <Route path="/pools/public" component={PublicPools} />

      {/* Participant routes */}
      <Route path="/dashboard" component={Dashboard} />
      <Route path="/pool/:slug" component={PoolPage} />

      {/* Organizer routes — O1-O6 */}
      <Route path="/create-pool" component={CreatePool} />
      <Route path="/pool/:slug/manage" component={OrganizerDashboard} />
      <Route path="/pool/:slug/manage/members" component={OrganizerMembers} />
      <Route path="/pool/:slug/manage/access" component={OrganizerAccess} />
      <Route path="/pool/:slug/manage/identity" component={OrganizerIdentity} />
      <Route path="/pool/:slug/manage/rules" component={OrganizerRules} />
      {/* Legacy settings route — redirect to manage */}
      <Route path="/pool/:slug/settings" component={OrganizerDashboard} />

      {/* Admin routes */}
      <Route path="/admin" component={AdminPanel} />

      {/* Project tracking */}
      <Route path="/project-status" component={ProjectDashboard} />

      <Route path="/404" component={NotFound} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider defaultTheme="dark">
        <TooltipProvider>
          <Toaster />
          <Router />
        </TooltipProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
