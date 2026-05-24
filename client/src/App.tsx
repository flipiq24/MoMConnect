import { Switch, Route, useLocation } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useEffect, useState } from "react";
import NotFound from "@/pages/not-found";
import Login from "@/pages/login";
import Acquisition from "@/pages/acquisition";
import Pipeline from "@/pages/pipeline";
import { Header } from "@/components/Header";

function Router() {
  const [location, setLocation] = useLocation();
  const [user, setUser] = useState<{ name: string; email: string } | null>(null);

  useEffect(() => {
    const savedUser = localStorage.getItem('momUser');
    if (savedUser) {
      setUser(JSON.parse(savedUser));
    } else if (location !== '/login') {
      setLocation('/login');
    }
  }, [location, setLocation]);

  // Listen for storage changes (logout from another tab)
  useEffect(() => {
    const handleStorageChange = () => {
      const savedUser = localStorage.getItem('momUser');
      if (!savedUser && location !== '/login') {
        setLocation('/login');
      } else if (savedUser) {
        setUser(JSON.parse(savedUser));
      }
    };

    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, [location, setLocation]);

  if (location === '/login' || !user) {
    return <Login />;
  }

  // Extra safety check - should never hit this but TypeScript needs it
  if (!user.email) {
    return <Login />;
  }

  return (
    <div className="min-h-screen bg-background">
      <Header userName={user.name} userEmail={user.email} />
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
