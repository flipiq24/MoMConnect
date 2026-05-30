import { Switch, Route, useLocation } from "wouter";
import { Bell, Flag, MessageSquare, Mail, SlidersHorizontal } from "lucide-react";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import {
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import { ACQ_ASSOCIATE_OPTIONS } from "@shared/pipelineOptions";
import NotFound from "@/pages/not-found";
import Acquisition from "@/pages/acquisition";
import Pipeline from "@/pages/pipeline";
import MyDeals from "@/pages/my-deals";
import { AppSidebar } from "@/components/AppSidebar";
import { ThemeProvider, ThemeToggle } from "@/components/theme";

const DEFAULT_USER = { name: "John Doe", email: "john@company.com" };

function TopBar() {
  return (
    <header className="flex items-center justify-between gap-2 p-2 border-b">
      <div className="flex items-center gap-2">
        <SidebarTrigger data-testid="button-sidebar-toggle" />
        <Select defaultValue={ACQ_ASSOCIATE_OPTIONS[0]}>
          <SelectTrigger className="w-48" data-testid="select-aa">
            <SelectValue placeholder="Acquisition Associate" />
          </SelectTrigger>
          <SelectContent>
            {ACQ_ASSOCIATE_OPTIONS.map((aa) => (
              <SelectItem key={aa} value={aa}>
                {aa}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button variant="outline" size="sm" data-testid="button-filters">
          <SlidersHorizontal className="w-3.5 h-3.5" />
          Filters
        </Button>
      </div>
      <div className="flex items-center gap-1">
        <Button variant="ghost" size="icon" data-testid="button-notifications" aria-label="Notifications">
          <Bell className="w-4 h-4" />
        </Button>
        <Button variant="ghost" size="icon" data-testid="button-flags" aria-label="Flags">
          <Flag className="w-4 h-4" />
        </Button>
        <Button variant="ghost" size="icon" data-testid="button-messages" aria-label="Messages">
          <MessageSquare className="w-4 h-4" />
        </Button>
        <Button variant="ghost" size="icon" data-testid="button-mail" aria-label="Mail">
          <Mail className="w-4 h-4" />
        </Button>
        <ThemeToggle />
      </div>
    </header>
  );
}

function Router() {
  const user = DEFAULT_USER;
  const [, setLocation] = useLocation();

  const style = {
    "--sidebar-width": "16rem",
    "--sidebar-width-icon": "3rem",
  };

  return (
    <SidebarProvider style={style as React.CSSProperties}>
      <div className="flex h-screen w-full">
        <AppSidebar
          userName={user.name}
          userEmail={user.email}
          onAddProperty={() => setLocation("/acquisition?new=1")}
        />
        <div className="flex flex-col flex-1 min-w-0">
          <TopBar />
          <main className="flex-1 overflow-auto bg-background">
            <Switch>
              <Route path="/">{() => <Acquisition userEmail={user.email} />}</Route>
              <Route path="/my-deals">{() => <MyDeals userEmail={user.email} />}</Route>
              <Route path="/acquisition">{() => <Acquisition userEmail={user.email} />}</Route>
              <Route path="/pipeline">{() => <Pipeline userEmail={user.email} />}</Route>
              <Route component={NotFound} />
            </Switch>
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <TooltipProvider>
          <Router />
          <Toaster />
        </TooltipProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}

export default App;
