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
import PublicProfile from "./pages/PublicProfile";
import GlobalRanking from "./pages/GlobalRanking";
import UpgradePage from "./pages/UpgradePage";
import PoolMemberProfile from "./pages/PoolMemberProfile";
import Notifications from "./pages/Notifications";
import NotificationPreferences from "./pages/NotificationPreferences";
import Suspended from "./pages/Suspended";
import BetHistory from "./pages/BetHistory";
import PoolRules from "./pages/PoolRules";
import PoolBracket from "./pages/PoolBracket";
import MyProfile from "./pages/MyProfile";

// Organizer pages (Fase 4)
import CreatePool from "./pages/organizer/CreatePool";
import OrganizerDashboard from "./pages/organizer/OrganizerDashboard";
import OrganizerMembers from "./pages/organizer/OrganizerMembers";
import OrganizerAccess from "./pages/organizer/OrganizerAccess";
import OrganizerIdentity from "./pages/organizer/OrganizerIdentity";
import OrganizerRules from "./pages/organizer/OrganizerRules";
import SubscriptionPage from "./pages/organizer/SubscriptionPage";
import CustomTournament from "./pages/organizer/CustomTournament";

// Admin pages A1-A10
import AdminDashboard from "./pages/admin/AdminDashboard";
import AdminTournaments from "./pages/admin/AdminTournaments";
import AdminTournamentDetail from "./pages/admin/AdminTournamentDetail";
import AdminUsers from "./pages/admin/AdminUsers";
import AdminPools from "./pages/admin/AdminPools";
import AdminSubscriptions from "./pages/admin/AdminSubscriptions";
import AdminBroadcasts from "./pages/admin/AdminBroadcasts";
import AdminAds from "./pages/admin/AdminAds";
import AdminSettings from "./pages/admin/AdminSettings";
import AdminAudit from "./pages/admin/AdminAudit";
import AdminIntegrations from "./pages/admin/AdminIntegrations";
import AdminBadges from "./pages/admin/AdminBadges";
import { useAnalytics } from "./hooks/useAnalytics";

function Router() {
  useAnalytics();
  return (
    <Switch>
      {/* Public routes */}
      <Route path="/" component={Home} />
      <Route path="/join/:token" component={JoinPool} />
      <Route path="/enter-pool" component={EnterPool} />
      <Route path="/pools/public" component={PublicPools} />
      <Route path="/profile/:userId" component={PublicProfile} />
      <Route path="/ranking" component={GlobalRanking} />
      <Route path="/upgrade" component={UpgradePage} />

      {/* Participant routes */}
      <Route path="/dashboard" component={Dashboard} />
      <Route path="/pool/:slug" component={PoolPage} />
      <Route path="/pool/:slug/player/:userId" component={PoolMemberProfile} />
      <Route path="/pool/:slug/history" component={BetHistory} />
      <Route path="/pool/:slug/rules" component={PoolRules} />
      <Route path="/pool/:slug/bracket" component={PoolBracket} />
      <Route path="/my-profile" component={MyProfile} />
      <Route path="/notifications" component={Notifications} />
      <Route path="/notification-preferences" component={NotificationPreferences} />
      <Route path="/suspended" component={Suspended} />

      {/* Organizer routes — O1-O6 */}
      <Route path="/create-pool" component={CreatePool} />
      <Route path="/pool/:slug/manage" component={OrganizerDashboard} />
      <Route path="/pool/:slug/manage/members" component={OrganizerMembers} />
      <Route path="/pool/:slug/manage/access" component={OrganizerAccess} />
      <Route path="/pool/:slug/manage/identity" component={OrganizerIdentity} />
      <Route path="/pool/:slug/manage/rules" component={OrganizerRules} />
      <Route path="/pool/:slug/manage/plan" component={SubscriptionPage} />
      <Route path="/pool/:slug/manage/tournament" component={CustomTournament} />
      {/* Legacy settings route — redirect to manage */}
      <Route path="/pool/:slug/settings" component={OrganizerDashboard} />

      {/* Admin routes A1-A10 */}
      <Route path="/admin" component={AdminDashboard} />
      <Route path="/admin/tournaments" component={AdminTournaments} />
      <Route path="/admin/tournaments/:id" component={AdminTournamentDetail} />
      <Route path="/admin/users" component={AdminUsers} />
      <Route path="/admin/pools" component={AdminPools} />
      <Route path="/admin/subscriptions" component={AdminSubscriptions} />
      <Route path="/admin/broadcasts" component={AdminBroadcasts} />
      <Route path="/admin/ads" component={AdminAds} />
      <Route path="/admin/settings" component={AdminSettings} />
      <Route path="/admin/audit" component={AdminAudit} />
      <Route path="/admin/integrations" component={AdminIntegrations} />
      <Route path="/admin/badges" component={AdminBadges} />
      {/* Legacy admin panel */}
      <Route path="/admin-legacy" component={AdminPanel} />

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
