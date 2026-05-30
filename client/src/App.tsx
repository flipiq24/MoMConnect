import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/not-found";
import Acquisition from "@/pages/acquisition";
import Pipeline from "@/pages/pipeline";

const DEFAULT_USER = { name: "John Doe", email: "john@company.com" };

function Router() {
  const user = DEFAULT_USER;

  return (
    <div className="min-h-screen bg-background">
      <main className="max-w-7xl mx-auto px-4 py-6">
        <Switch>
          <Route path="/">{() => <Acquisition userEmail={user.email} />}</Route>
          <Route path="/acquisition">{() => <Acquisition userEmail={user.email} />}</Route>
          <Route path="/pipeline">{() => <Pipeline userEmail={user.email} />}</Route>
          <Route component={NotFound} />
        </Switch>
      </main>
    </div>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Router />
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
