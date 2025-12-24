import { cn } from '@/lib/utils';
import { StatusBadge } from './StatusBadge';
import type { Alert } from '@/types/sre';
import { formatDistanceToNow } from 'date-fns';
import { Bell } from 'lucide-react';

interface AlertRowProps {
  alert: Alert;
}

export function AlertRow({ alert }: AlertRowProps) {
  return (
    <div
      className={cn(
        'flex items-center gap-4 p-4 border-b border-border hover:bg-accent/50 transition-colors',
        alert.severity === 'critical' && 'bg-status-critical/5',
        alert.severity === 'warning' && 'bg-status-warning/5',
      )}
    >
      <div className={cn(
        'flex h-8 w-8 items-center justify-center rounded-md',
        alert.severity === 'critical' && 'bg-status-critical/20 text-status-critical',
        alert.severity === 'warning' && 'bg-status-warning/20 text-status-warning',
        alert.severity === 'info' && 'bg-primary/20 text-primary',
      )}>
        <Bell className="h-4 w-4" />
      </div>

      <div className="flex-1">
        <div className="flex items-center gap-2">
          <span className="font-medium">{alert.name}</span>
          <StatusBadge status={alert.severity} />
        </div>
        <div className="text-sm text-muted-foreground">
          {alert.service} • {alert.message}
        </div>
      </div>

      <div className="text-right">
        <div className="font-mono text-sm">
          <span className="text-status-critical">{alert.currentValue}</span>
          <span className="text-muted-foreground"> / {alert.threshold}</span>
        </div>
        <div className="text-xs text-muted-foreground">
          {formatDistanceToNow(alert.firedAt, { addSuffix: true })}
        </div>
      </div>
    </div>
  );
}
