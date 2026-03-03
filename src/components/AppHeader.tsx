import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { BarChart3, Home } from 'lucide-react';
import { Button } from '@/components/ui/button';
import ThemeToggle from './ThemeToggle';

const AppHeader: React.FC = () => {
  const location = useLocation();
  const isHome = location.pathname === '/';

  return (
    <header className="sticky top-0 z-50 border-b bg-card/80 backdrop-blur-sm">
      <div className="container flex items-center justify-between h-14">
        <Link to="/" className="flex items-center gap-2 font-display font-bold text-lg">
          <BarChart3 className="h-5 w-5 text-primary" />
          <span>Adesão Pro</span>
        </Link>
        <div className="flex items-center gap-2">
          {!isHome && (
            <Button variant="ghost" size="sm" asChild>
              <Link to="/"><Home className="h-4 w-4 mr-1" /> Início</Link>
            </Button>
          )}
          <ThemeToggle />
        </div>
      </div>
    </header>
  );
};

export default AppHeader;
