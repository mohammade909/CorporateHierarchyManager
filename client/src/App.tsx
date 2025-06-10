import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/not-found";
import Login from "@/pages/login";
import Register from "@/pages/register";
import Dashboard from "@/pages/dashboard";
import UserManagement from "@/pages/user-management";
import CompanyProfile from "@/pages/company-profile";
import Messages from "@/pages/messages";
import Meetings from "@/pages/meetings";
import OrganizationChart from "@/pages/organization-chart";
import AppLayout from "@/components/layout/app-layout";
import { AuthProvider, useAuth } from "./lib/auth";
import { WebSocketProvider } from "./lib/websocket";
import { ChatPage } from "./pages/ChatPage";
import ZoomChat from "./pages/TeamChat";

function PrivateRoute({ component: Component, ...rest }: any) {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        Loading...
      </div>
    );
  }

  if (!user) {
    // Redirect to login if not authenticated
    window.location.href = "/login";
    return null;
  }

  return <Component {...rest} />;
}

function Router() {
  return (
    <Switch>
      <Route path="/login" component={Login} />
      <Route path="/">
        <AppLayout>
          <PrivateRoute component={Dashboard} />
        </AppLayout>
      </Route>
      <Route path="/dashboard">
        <AppLayout>
          <PrivateRoute component={Dashboard} />
        </AppLayout>
      </Route>
      <Route path="/user-management">
        <AppLayout>
          <PrivateRoute component={UserManagement} />
        </AppLayout>
      </Route>
      <Route path="/company-profile">
        <AppLayout>
          <PrivateRoute component={CompanyProfile} />
        </AppLayout>
      </Route>
      <Route path="/messages">
        <AppLayout>
          <PrivateRoute component={Messages} />
        </AppLayout>
      </Route>
      <Route path="/chat">
        <AppLayout>
          <PrivateRoute component={ZoomChat} />
        </AppLayout>
      </Route>
      <Route path="/meetings">
        <AppLayout>
          <PrivateRoute component={Meetings} />
        </AppLayout>
      </Route>
      <Route path="/organization-chart">
        <AppLayout>
          <PrivateRoute component={OrganizationChart} />
        </AppLayout>
      </Route>
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <WebSocketProvider>
          <TooltipProvider>
            <Toaster />
            <Router />
          </TooltipProvider>
        </WebSocketProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;
