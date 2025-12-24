import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { CheckCircle, AlertTriangle, XCircle, HelpCircle, Database, Server, BarChart3, FileText } from 'lucide-react';
import { cn } from '@/lib/utils';

interface BackendHealth {
  api: { status: string };
  database: { status: string; error?: string };
  prometheus: { status: string; error?: string };
  loki: { status: string; error?: string };
}

interface SystemHealth {
  overall: 'healthy' | 'degraded' | 'unhealthy' | 'unknown';
  backend: BackendHealth | null;
  timestamp: Date;
}

interface SystemHealthIndicatorProps {
  health: SystemHealth;
}

export function SystemHealthIndicator({ health }: SystemHealthIndicatorProps) {
  const statusConfig = {
    healthy: {
      icon: CheckCircle,
      label: 'All Systems Operational',
      color: 'text-status-healthy',
      bg: 'bg-status-healthy/10',
    },
    degraded: {
      icon: AlertTriangle,
      label: 'Partial Outage',
      color: 'text-status-warning',
      bg: 'bg-status-warning/10',
    },
    unhealthy: {
      icon: XCircle,
      label: 'Major Outage',
      color: 'text-status-critical',
      bg: 'bg-status-critical/10',
    },
    unknown: {
      icon: HelpCircle,
      label: 'Status Unknown',
      color: 'text-muted-foreground',
      bg: 'bg-muted',
    },
  };

  const config = statusConfig[health.overall];
  const Icon = config.icon;

  const componentIcons = {
    api: Server,
    database: Database,
    prometheus: BarChart3,
    loki: FileText,
  };

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Badge variant="outline" className={cn('gap-1.5 cursor-help', config.bg)}>
            <Icon className={cn('h-3 w-3', config.color)} />
            <span className="text-xs">{config.label}</span>
          </Badge>
        </TooltipTrigger>
        <TooltipContent side="bottom" className="w-64 p-3">
          <div className="space-y-2">
            <div className="font-medium text-sm">System Components</div>
            {health.backend ? (
              <div className="space-y-1.5">
                {Object.entries(health.backend).map(([key, value]) => {
                  const ComponentIcon = componentIcons[key as keyof typeof componentIcons] || Server;
                  const isHealthy = value.status === 'healthy';
                  return (
                    <div key={key} className="flex items-center justify-between text-xs">
                      <div className="flex items-center gap-1.5">
                        <ComponentIcon className="h-3 w-3 text-muted-foreground" />
                        <span className="capitalize">{key}</span>
                      </div>
                      <span className={cn(
                        isHealthy ? 'text-status-healthy' : 'text-status-critical'
                      )}>
                        {isHealthy ? '● Online' : '○ Offline'}
                      </span>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="text-xs text-muted-foreground">
                Backend not connected. Using Supabase.
              </div>
            )}
            <div className="text-[10px] text-muted-foreground pt-1 border-t border-border">
              Last checked: {health.timestamp.toLocaleTimeString()}
            </div>
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
