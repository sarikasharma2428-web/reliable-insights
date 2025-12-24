import { useParams, Link } from 'react-router-dom';
import { incidents } from '@/data/mockData';
import { StatusBadge } from '@/components/sre/StatusBadge';
import { Button } from '@/components/ui/button';
import { formatDistanceToNow, format } from 'date-fns';
import { 
  ArrowLeft, 
  Clock, 
  User, 
  MessageSquare, 
  AlertTriangle,
  CheckCircle,
  ArrowUpCircle,
  Bell
} from 'lucide-react';
import { cn } from '@/lib/utils';

const timelineIcons = {
  triggered: Bell,
  acknowledged: User,
  escalated: ArrowUpCircle,
  resolved: CheckCircle,
  comment: MessageSquare,
};

const timelineStyles = {
  triggered: 'bg-status-critical/20 text-status-critical border-status-critical/30',
  acknowledged: 'bg-primary/20 text-primary border-primary/30',
  escalated: 'bg-status-warning/20 text-status-warning border-status-warning/30',
  resolved: 'bg-status-healthy/20 text-status-healthy border-status-healthy/30',
  comment: 'bg-secondary text-muted-foreground border-border',
};

export default function IncidentDetail() {
  const { id } = useParams<{ id: string }>();
  const incident = incidents.find((i) => i.id === id);

  if (!incident) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <AlertTriangle className="h-12 w-12 text-muted-foreground mb-4" />
        <h2 className="text-lg font-semibold mb-2">Incident not found</h2>
        <Link to="/incidents">
          <Button variant="outline">Back to Incidents</Button>
        </Link>
      </div>
    );
  }

  const duration = incident.resolvedAt 
    ? formatDistanceToNow(incident.startedAt, { addSuffix: false })
    : formatDistanceToNow(incident.startedAt, { addSuffix: false }) + ' (ongoing)';

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="space-y-2">
          <Link to="/incidents" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
            <ArrowLeft className="h-4 w-4" />
            Back to Incidents
          </Link>
          <div className="flex items-center gap-3">
            <span className="font-mono text-sm text-muted-foreground">{incident.id}</span>
            <StatusBadge status={incident.severity} size="md" />
            <StatusBadge status={incident.status} size="md" />
          </div>
          <h1 className="text-2xl font-semibold">{incident.title}</h1>
          <p className="text-muted-foreground">{incident.description}</p>
        </div>
        
        {incident.status !== 'resolved' && (
          <div className="flex gap-2">
            <Button variant="outline">Acknowledge</Button>
            <Button variant="default">Resolve</Button>
          </div>
        )}
      </div>

      {/* Metadata */}
      <div className="grid grid-cols-4 gap-4">
        <div className="metric-card">
          <div className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Service</div>
          <div className="font-mono">{incident.service}</div>
        </div>
        <div className="metric-card">
          <div className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Duration</div>
          <div className="font-mono">{duration}</div>
        </div>
        <div className="metric-card">
          <div className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Triggered By</div>
          <div className="font-mono text-sm">{incident.triggeredBy}</div>
        </div>
        <div className="metric-card">
          <div className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Started At</div>
          <div className="font-mono text-sm">{format(incident.startedAt, 'MMM dd, HH:mm:ss')}</div>
        </div>
      </div>

      {/* Timeline */}
      <div>
        <h2 className="text-sm font-medium text-muted-foreground uppercase tracking-wider mb-4 flex items-center gap-2">
          <Clock className="h-4 w-4" />
          Incident Timeline
        </h2>
        
        <div className="relative">
          {/* Timeline line */}
          <div className="absolute left-5 top-0 bottom-0 w-px bg-border" />
          
          <div className="space-y-4">
            {incident.timeline.map((event, index) => {
              const Icon = timelineIcons[event.type];
              return (
                <div key={event.id} className="relative flex gap-4 animate-slide-in" style={{ animationDelay: `${index * 50}ms` }}>
                  <div className={cn(
                    'relative z-10 flex h-10 w-10 shrink-0 items-center justify-center rounded-full border',
                    timelineStyles[event.type]
                  )}>
                    <Icon className="h-4 w-4" />
                  </div>
                  
                  <div className="flex-1 rounded-md border border-border bg-card p-4">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs text-muted-foreground font-mono uppercase">
                        {event.type}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {format(event.timestamp, 'MMM dd, HH:mm:ss')}
                      </span>
                    </div>
                    <p className="text-sm">{event.message}</p>
                    {event.author && (
                      <div className="mt-2 flex items-center gap-2 text-xs text-muted-foreground">
                        <User className="h-3 w-3" />
                        {event.author}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
