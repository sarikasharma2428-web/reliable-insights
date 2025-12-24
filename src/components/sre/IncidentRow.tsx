import { cn } from '@/lib/utils';
import { StatusBadge } from './StatusBadge';
import { formatDistanceToNow } from 'date-fns';
import { Link } from 'react-router-dom';
import { ChevronRight } from 'lucide-react';

interface Incident {
  id: string;
  incident_number: string;
  title: string;
  severity: string;
  status: string;
  triggered_by: string | null;
  started_at: string;
  services?: {
    name: string;
  } | null;
}

interface IncidentRowProps {
  incident: Incident;
}

export function IncidentRow({ incident }: IncidentRowProps) {
  const severity = incident.severity as 'critical' | 'high' | 'medium' | 'low';
  const status = incident.status as 'open' | 'ongoing' | 'resolved';
  
  return (
    <Link
      to={`/incidents/${incident.id}`}
      className={cn(
        'flex items-center justify-between p-4 border-b border-border hover:bg-accent/50 transition-colors group',
        severity === 'critical' && status !== 'resolved' && 'bg-status-critical/5',
      )}
    >
      <div className="flex items-center gap-4">
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-2">
            <span className="font-mono text-xs text-muted-foreground">{incident.incident_number}</span>
            <StatusBadge status={severity} />
            <StatusBadge status={status} />
          </div>
          <span className="font-medium">{incident.title}</span>
          <span className="text-sm text-muted-foreground">
            {incident.services?.name || 'Unknown service'} 
            {incident.triggered_by && (
              <> • Triggered by: <span className="font-mono text-xs">{incident.triggered_by}</span></>
            )}
          </span>
        </div>
      </div>

      <div className="flex items-center gap-4">
        <div className="text-right text-sm">
          <div className="text-muted-foreground">Started</div>
          <div className="font-mono">{formatDistanceToNow(new Date(incident.started_at), { addSuffix: true })}</div>
        </div>
        <ChevronRight className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
      </div>
    </Link>
  );
}
