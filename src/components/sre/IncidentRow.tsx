import { cn } from '@/lib/utils';
import { StatusBadge } from './StatusBadge';
import type { Incident } from '@/types/sre';
import { formatDistanceToNow } from 'date-fns';
import { Link } from 'react-router-dom';
import { ChevronRight } from 'lucide-react';

interface IncidentRowProps {
  incident: Incident;
}

export function IncidentRow({ incident }: IncidentRowProps) {
  return (
    <Link
      to={`/incidents/${incident.id}`}
      className={cn(
        'flex items-center justify-between p-4 border-b border-border hover:bg-accent/50 transition-colors group',
        incident.severity === 'critical' && incident.status !== 'resolved' && 'bg-status-critical/5',
      )}
    >
      <div className="flex items-center gap-4">
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-2">
            <span className="font-mono text-xs text-muted-foreground">{incident.id}</span>
            <StatusBadge status={incident.severity} />
            <StatusBadge status={incident.status} />
          </div>
          <span className="font-medium">{incident.title}</span>
          <span className="text-sm text-muted-foreground">
            {incident.service} • Triggered by: <span className="font-mono text-xs">{incident.triggeredBy}</span>
          </span>
        </div>
      </div>

      <div className="flex items-center gap-4">
        <div className="text-right text-sm">
          <div className="text-muted-foreground">Started</div>
          <div className="font-mono">{formatDistanceToNow(incident.startedAt, { addSuffix: true })}</div>
        </div>
        <ChevronRight className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
      </div>
    </Link>
  );
}
