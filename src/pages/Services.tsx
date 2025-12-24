import { ServiceCard } from '@/components/sre/ServiceCard';
import { services } from '@/data/mockData';
import { Server, CheckCircle, AlertTriangle, XCircle } from 'lucide-react';

export default function Services() {
  const healthyCount = services.filter((s) => s.status === 'healthy').length;
  const degradedCount = services.filter((s) => s.status === 'degraded').length;
  const criticalCount = services.filter((s) => s.status === 'critical').length;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Services</h1>
          <p className="text-sm text-muted-foreground">
            Monitor all registered services and their health status
          </p>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-4 gap-4">
        <div className="metric-card flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-md bg-secondary">
            <Server className="h-5 w-5 text-foreground" />
          </div>
          <div>
            <div className="text-2xl font-semibold font-mono">{services.length}</div>
            <div className="text-xs text-muted-foreground uppercase tracking-wider">Total Services</div>
          </div>
        </div>
        <div className="metric-card flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-md bg-status-healthy/20">
            <CheckCircle className="h-5 w-5 text-status-healthy" />
          </div>
          <div>
            <div className="text-2xl font-semibold font-mono text-status-healthy">{healthyCount}</div>
            <div className="text-xs text-muted-foreground uppercase tracking-wider">Healthy</div>
          </div>
        </div>
        <div className="metric-card flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-md bg-status-warning/20">
            <AlertTriangle className="h-5 w-5 text-status-warning" />
          </div>
          <div>
            <div className="text-2xl font-semibold font-mono text-status-warning">{degradedCount}</div>
            <div className="text-xs text-muted-foreground uppercase tracking-wider">Degraded</div>
          </div>
        </div>
        <div className="metric-card flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-md bg-status-critical/20">
            <XCircle className="h-5 w-5 text-status-critical" />
          </div>
          <div>
            <div className="text-2xl font-semibold font-mono text-status-critical">{criticalCount}</div>
            <div className="text-xs text-muted-foreground uppercase tracking-wider">Critical</div>
          </div>
        </div>
      </div>

      {/* Services Grid */}
      <div className="grid grid-cols-3 gap-4">
        {services.map((service) => (
          <ServiceCard key={service.id} service={service} />
        ))}
      </div>
    </div>
  );
}
