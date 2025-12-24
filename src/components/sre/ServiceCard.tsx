import { cn } from '@/lib/utils';
import { StatusBadge } from './StatusBadge';
import { ExternalLink } from 'lucide-react';
import { Link } from 'react-router-dom';

interface Service {
  id: string;
  name: string;
  status: string;
  uptime: number;
  latency_p50: number;
  latency_p99: number;
  error_rate: number;
  requests_per_second: number;
}

interface ServiceCardProps {
  service: Service;
}

export function ServiceCard({ service }: ServiceCardProps) {
  const status = service.status as 'healthy' | 'degraded' | 'critical' | 'unknown';
  
  return (
    <Link
      to={`/services/${service.id}`}
      className={cn(
        'metric-card group cursor-pointer',
        status === 'critical' && 'border-status-critical/30 bg-status-critical/5',
        status === 'degraded' && 'border-status-warning/30 bg-status-warning/5',
      )}
    >
      <div className="flex items-start justify-between">
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-2">
            <span className="font-mono text-sm font-medium">{service.name}</span>
            <ExternalLink className="h-3 w-3 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
          </div>
          <StatusBadge status={status} />
        </div>
        <div className="text-right">
          <div className="text-lg font-mono font-semibold">{Number(service.uptime).toFixed(2)}%</div>
          <div className="text-[10px] text-muted-foreground uppercase tracking-wider">uptime</div>
        </div>
      </div>

      <div className="mt-4 grid grid-cols-3 gap-4 border-t border-border pt-4">
        <div>
          <div className="text-xs text-muted-foreground">P99 Latency</div>
          <div className="font-mono text-sm">{service.latency_p99}ms</div>
        </div>
        <div>
          <div className="text-xs text-muted-foreground">Error Rate</div>
          <div className={cn(
            'font-mono text-sm',
            Number(service.error_rate) > 1 && 'text-status-critical',
            Number(service.error_rate) > 0.1 && Number(service.error_rate) <= 1 && 'text-status-warning'
          )}>
            {Number(service.error_rate).toFixed(2)}%
          </div>
        </div>
        <div>
          <div className="text-xs text-muted-foreground">RPS</div>
          <div className="font-mono text-sm">{service.requests_per_second.toLocaleString()}</div>
        </div>
      </div>
    </Link>
  );
}
