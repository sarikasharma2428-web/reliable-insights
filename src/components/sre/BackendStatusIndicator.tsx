import { useState, useEffect } from 'react';
import { Cloud, Server, Loader2 } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { backendApi } from '@/lib/backendApi';

type BackendStatus = 'checking' | 'fastapi' | 'supabase';

export function BackendStatusIndicator() {
  const [status, setStatus] = useState<BackendStatus>('checking');

  useEffect(() => {
    const checkBackend = async () => {
      const isAvailable = await backendApi.checkHealth();
      setStatus(isAvailable ? 'fastapi' : 'supabase');
    };

    checkBackend();
    const interval = setInterval(checkBackend, 30000); // Check every 30s

    return () => clearInterval(interval);
  }, []);

  const config = {
    checking: {
      icon: Loader2,
      label: 'Checking...',
      color: 'text-muted-foreground',
      iconClass: 'animate-spin',
    },
    fastapi: {
      icon: Server,
      label: 'FastAPI Backend',
      color: 'text-green-500',
      iconClass: '',
    },
    supabase: {
      icon: Cloud,
      label: 'Cloud Fallback',
      color: 'text-blue-500',
      iconClass: '',
    },
  };

  const { icon: Icon, label, color, iconClass } = config[status];

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <div className={`flex items-center gap-1.5 px-2 py-1 rounded-md bg-muted/50 ${color}`}>
            <Icon className={`h-3.5 w-3.5 ${iconClass}`} />
            <span className="text-xs font-medium hidden sm:inline">{label}</span>
          </div>
        </TooltipTrigger>
        <TooltipContent>
          <p>
            {status === 'fastapi' && 'Connected to FastAPI backend'}
            {status === 'supabase' && 'Using Lovable Cloud database'}
            {status === 'checking' && 'Checking backend status...'}
          </p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
