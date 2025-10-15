import { useState } from 'react';
import { useLocation } from 'wouter';
import { Home } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useMutation } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';

export default function Login() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [formData, setFormData] = useState({ name: '', email: '' });

  const loginMutation = useMutation({
    mutationFn: async (data: { name: string; email: string }) => {
      return await apiRequest('POST', '/api/users/login', data);
    },
    onSuccess: (user) => {
      localStorage.setItem('momUser', JSON.stringify(user));
      setLocation('/');
    },
    onError: (error: any) => {
      toast({
        title: "Login Failed",
        description: error.message || "Failed to login. Please try again.",
        variant: "destructive"
      });
    }
  });

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (formData.name && formData.email) {
      loginMutation.mutate(formData);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-indigo-100 flex items-center justify-center p-4">
      <div className="bg-card rounded-lg shadow-xl border border-card-border p-8 w-full max-w-md">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-primary/10 rounded-full mb-4">
            <Home className="w-8 h-8 text-primary" />
          </div>
          <h1 className="text-3xl font-bold text-foreground mb-2">MoM Wholesale System</h1>
          <p className="text-muted-foreground">Property Management & Analysis Platform</p>
        </div>
        
        <form onSubmit={handleLogin} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Full Name</Label>
            <Input
              id="name"
              type="text"
              value={formData.name}
              onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
              placeholder="John Doe"
              required
              disabled={loginMutation.isPending}
              data-testid="input-name"
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="email">Email Address</Label>
            <Input
              id="email"
              type="email"
              value={formData.email}
              onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
              placeholder="john@company.com"
              required
              disabled={loginMutation.isPending}
              data-testid="input-email"
            />
          </div>
          
          <Button
            type="submit"
            className="w-full"
            disabled={!formData.name || !formData.email || loginMutation.isPending}
            data-testid="button-login"
          >
            {loginMutation.isPending ? 'Logging in...' : 'Access System'}
          </Button>
        </form>
      </div>
    </div>
  );
}
