import { Bell, RefreshCw, Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useState, useEffect } from 'react';
import { BackendStatusIndicator } from '@/components/sre/BackendStatusIndicator';

export function Header() {
  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  return (
    <header className="sticky top-0 z-40 flex h-14 items-center justify-between border-b border-border bg-background/95 backdrop-blur px-6">
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2 text-sm text-muted-foreground font-mono">
          <Clock className="h-4 w-4" />
          <span>{currentTime.toLocaleTimeString()}</span>
          <span className="text-border">|</span>
          <span>UTC: {currentTime.toISOString().split('T')[1].split('.')[0]}</span>
        </div>
        <BackendStatusIndicator />
      </div>

      <div className="flex items-center gap-2">
        <Button variant="ghost" size="sm" className="gap-2 text-muted-foreground hover:text-foreground">
          <RefreshCw className="h-4 w-4" />
          <span className="text-xs">Auto-refresh: 30s</span>
        </Button>
        <Button variant="ghost" size="icon" className="relative">
          <Bell className="h-4 w-4" />
          <span className="absolute -top-0.5 -right-0.5 h-4 w-4 rounded-full bg-status-critical text-[10px] font-bold flex items-center justify-center">
            3
          </span>
        </Button>
      </div>
    </header>
  );
}
