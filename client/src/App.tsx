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

function Router() {
  return (
    <Switch>
      <Route path="/" component={Home} />
      <Route path="/dashboard" component={Dashboard} />
      <Route path="/pool/:slug/settings" component={PoolSettings} />
      <Route path="/pool/:slug" component={PoolPage} />
      <Route path="/join/:token" component={JoinPool} />
      <Route path="/admin" component={AdminPanel} />
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
