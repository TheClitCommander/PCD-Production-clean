import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthGuard } from "@/components/AuthGuard";
import Dashboard from "@/pages/dashboard";
import Prospects from "@/pages/prospects";
import Inbox from "@/pages/inbox";
import Leads from "@/pages/leads";
import Campaigns from "@/pages/campaigns";
import Profile from "@/pages/profile";
import Account from "@/pages/account";
import Notifications from "@/pages/notifications";
import CustomerSite from "@/pages/customer-site";
import BusinessOverview from "@/pages/business-overview";
import Scheduling from "@/pages/scheduling";
import Analytics from "@/pages/analytics";
import NotFound from "@/pages/not-found";
import Clients from "@/pages/clients";
import ClientProfile from "@/pages/client-profile";
import Templates from "@/pages/templates";
import ProgressPublic from "@/pages/progress-public";
import Login from "@/pages/login";

function Router() {
  return (
    <AuthGuard>
      <Switch>
        {/* Public routes */}
        <Route path="/login" component={Login} />
        <Route path="/progress/public/:clientId" component={ProgressPublic} />
        
        {/* Protected admin routes */}
        <Route path="/" component={Dashboard} />
        <Route path="/prospects" component={Prospects} />
        <Route path="/prospects/:id" component={BusinessOverview} />
        <Route path="/inbox" component={Inbox} />
        <Route path="/leads" component={Leads} />
        <Route path="/campaigns" component={Campaigns} />
        <Route path="/scheduling" component={Scheduling} />
        <Route path="/analytics" component={Analytics} />
        <Route path="/profile" component={Profile} />
        <Route path="/account" component={Account} />
        <Route path="/notifications" component={Notifications} />
        <Route path="/customer-site" component={CustomerSite} />
        <Route path="/business/:id" component={BusinessOverview} />
        <Route path="/clients" component={Clients} />
        <Route path="/clients/:id" component={ClientProfile} />
        <Route path="/templates" component={Templates} />
        <Route component={NotFound} />
      </Switch>
    </AuthGuard>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Router />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
