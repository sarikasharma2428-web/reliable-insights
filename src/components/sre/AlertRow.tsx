import { cn } from '@/lib/utils';
import { StatusBadge } from './StatusBadge';
import { formatDistanceToNow } from 'date-fns';
import { Bell } from 'lucide-react';

interface Alert {
  id: string;
  name: string;
  severity: string;
  message: string;
  metric_name: string;
  threshold: number;
  current_value: number;
  fired_at: string;
  services?: {
    name: string;
  } | null;
}

interface AlertRowProps {
  alert: Alert;
}

export function AlertRow({ alert }: AlertRowProps) {
  const severity = alert.severity as 'critical' | 'warning' | 'info';
  
  return (
    <div
      className={cn(
        'flex items-center gap-4 p-4 border-b border-border hover:bg-accent/50 transition-colors',
        severity === 'critical' && 'bg-status-critical/5',
        severity === 'warning' && 'bg-status-warning/5',
      )}
    >
      <div className={cn(
        'flex h-8 w-8 items-center justify-center rounded-md',
        severity === 'critical' && 'bg-status-critical/20 text-status-critical',
        severity === 'warning' && 'bg-status-warning/20 text-status-warning',
        severity === 'info' && 'bg-primary/20 text-primary',
      )}>
        <Bell className="h-4 w-4" />
      </div>

      <div className="flex-1">
        <div className="flex items-center gap-2">
          <span className="font-medium">{alert.name}</span>
          <StatusBadge status={severity} />
        </div>
        <div className="text-sm text-muted-foreground">
          {alert.services?.name || 'System'} • {alert.message}
        </div>
      </div>

      <div className="text-right">
        <div className="font-mono text-sm">
          <span className="text-status-critical">{Number(alert.current_value).toFixed(2)}</span>
          <span className="text-muted-foreground"> / {Number(alert.threshold).toFixed(2)}</span>
        </div>
        <div className="text-xs text-muted-foreground">
          {formatDistanceToNow(new Date(alert.fired_at), { addSuffix: true })}
        </div>
      </div>
    </div>
  );
}
