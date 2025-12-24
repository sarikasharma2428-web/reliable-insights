import { cn } from '@/lib/utils';
import { StatusBadge } from './StatusBadge';
import type { Service } from '@/types/sre';
import { ExternalLink } from 'lucide-react';
import { Link } from 'react-router-dom';

interface ServiceCardProps {
  service: Service;
}

export function ServiceCard({ service }: ServiceCardProps) {
  return (
    <Link
      to={`/services/${service.id}`}
      className={cn(
        'metric-card group cursor-pointer',
        service.status === 'critical' && 'border-status-critical/30 bg-status-critical/5',
        service.status === 'degraded' && 'border-status-warning/30 bg-status-warning/5',
      )}
    >
      <div className="flex items-start justify-between">
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-2">
            <span className="font-mono text-sm font-medium">{service.name}</span>
            <ExternalLink className="h-3 w-3 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
          </div>
          <StatusBadge status={service.status} />
        </div>
        <div className="text-right">
          <div className="text-lg font-mono font-semibold">{service.uptime}%</div>
          <div className="text-[10px] text-muted-foreground uppercase tracking-wider">uptime</div>
        </div>
      </div>

      <div className="mt-4 grid grid-cols-3 gap-4 border-t border-border pt-4">
        <div>
          <div className="text-xs text-muted-foreground">P99 Latency</div>
          <div className="font-mono text-sm">{service.latencyP99}ms</div>
        </div>
        <div>
          <div className="text-xs text-muted-foreground">Error Rate</div>
          <div className={cn(
            'font-mono text-sm',
            service.errorRate > 1 && 'text-status-critical',
            service.errorRate > 0.1 && service.errorRate <= 1 && 'text-status-warning'
          )}>
            {service.errorRate}%
          </div>
        </div>
        <div>
          <div className="text-xs text-muted-foreground">RPS</div>
          <div className="font-mono text-sm">{service.requestsPerSecond.toLocaleString()}</div>
        </div>
      </div>
    </Link>
  );
}
