import { Home, TableProperties } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Link, useLocation } from 'wouter';

interface HeaderProps {
  userName: string;
  userEmail: string;
}

export function Header({ userName, userEmail }: HeaderProps) {
  const [location] = useLocation();

  return (
    <header className="sticky top-0 z-50 bg-card border-b border-card-border shadow-sm">
      <div className="max-w-7xl mx-auto px-4 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-primary/10 rounded-lg">
                <Home className="w-5 h-5 text-primary" />
              </div>
              <div>
                <h1 className="text-lg font-bold text-foreground">MoM Wholesale System</h1>
                <p className="text-sm text-muted-foreground" data-testid="text-user-info">
                  {userName} • {userEmail}
                </p>
              </div>
            </div>
            <nav className="flex items-center gap-1">
              <Link href="/pipeline">
                <Button
                  variant={location.startsWith('/pipeline') ? 'secondary' : 'ghost'}
                  size="sm"
                  data-testid="link-pipeline"
                >
                  <TableProperties className="w-4 h-4 mr-2" />
                  Pipeline
                </Button>
              </Link>
            </nav>
          </div>
        </div>
      </div>
    </header>
  );
}
