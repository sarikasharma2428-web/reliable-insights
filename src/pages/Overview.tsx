import { ServiceCard } from '@/components/sre/ServiceCard';
import { IncidentRow } from '@/components/sre/IncidentRow';
import { AlertRow } from '@/components/sre/AlertRow';
import { GoldenSignalsPanel } from '@/components/sre/GoldenSignalsPanel';
import { useServices } from '@/hooks/useServices';
import { useIncidents } from '@/hooks/useIncidents';
import { useAlerts } from '@/hooks/useAlerts';
import { Activity, AlertTriangle, Server, Bell, RefreshCw } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';

export default function Overview() {
  const { services, loading: servicesLoading } = useServices();
  const { incidents, loading: incidentsLoading } = useIncidents();
  const { alerts, loading: alertsLoading } = useAlerts();

  const activeIncidents = incidents.filter((i) => i.status !== 'resolved');
  const criticalServices = services.filter((s) => s.status === 'critical' || s.status === 'degraded');
  const activeAlerts = alerts.filter((a) => !a.acknowledged_at);

  // Calculate golden signals from services
  const goldenSignals = {
    latency: {
      p50: services.length > 0 
        ? Math.round(services.reduce((acc, s) => acc + s.latency_p50, 0) / services.length) 
        : 0,
      p95: services.length > 0 
        ? Math.round(services.reduce((acc, s) => acc + (s.latency_p50 + s.latency_p99) / 2, 0) / services.length) 
        : 0,
      p99: services.length > 0 
        ? Math.round(services.reduce((acc, s) => acc + s.latency_p99, 0) / services.length) 
        : 0,
    },
    traffic: {
      requestsPerSecond: services.reduce((acc, s) => acc + s.requests_per_second, 0),
      bytesPerSecond: services.reduce((acc, s) => acc + s.requests_per_second, 0) * 1024,
    },
    errors: {
      rate: services.length > 0 
        ? Number((services.reduce((acc, s) => acc + Number(s.error_rate), 0) / services.length).toFixed(2))
        : 0,
      count: Math.round(services.reduce((acc, s) => acc + Number(s.error_rate) * s.requests_per_second / 100, 0)),
    },
    saturation: {
      cpu: services.length > 0 
        ? Math.round(services.reduce((acc, s) => acc + Number(s.cpu_usage), 0) / services.length)
        : 0,
      memory: services.length > 0 
        ? Math.round(services.reduce((acc, s) => acc + Number(s.memory_usage), 0) / services.length)
        : 0,
      disk: 45,
    },
  };

  const isLoading = servicesLoading || incidentsLoading || alertsLoading;

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">System Overview</h1>
          <p className="text-sm text-muted-foreground">
            Real-time observability metrics and system health
          </p>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-4 text-sm">
            <div className="flex items-center gap-2">
              <Server className="h-4 w-4 text-muted-foreground" />
              <span className="font-mono">{services.length} services</span>
            </div>
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-status-warning" />
              <span className="font-mono">{activeIncidents.length} incidents</span>
            </div>
            <div className="flex items-center gap-2">
              <Bell className="h-4 w-4 text-status-critical" />
              <span className="font-mono">{activeAlerts.length} alerts</span>
            </div>
          </div>
        </div>
      </div>

      {/* Golden Signals */}
      <section>
        <h2 className="text-sm font-medium text-muted-foreground uppercase tracking-wider mb-4 flex items-center gap-2">
          <Activity className="h-4 w-4" />
          Golden Signals
          <span className="ml-2 flex items-center gap-1 text-primary">
            <RefreshCw className="h-3 w-3 animate-spin" />
            <span className="text-[10px]">LIVE</span>
          </span>
        </h2>
        {isLoading ? (
          <div className="grid grid-cols-4 gap-4">
            {[1, 2, 3, 4].map(i => (
              <Skeleton key={i} className="h-32" />
            ))}
          </div>
        ) : (
          <GoldenSignalsPanel signals={goldenSignals} />
        )}
      </section>

      {/* Services Grid */}
      {criticalServices.length > 0 && (
        <section>
          <h2 className="text-sm font-medium text-muted-foreground uppercase tracking-wider mb-4 flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-status-warning" />
            Services Requiring Attention
          </h2>
          <div className="grid grid-cols-3 gap-4">
            {criticalServices.map((service) => (
              <ServiceCard key={service.id} service={service} />
            ))}
          </div>
        </section>
      )}

      {/* Active Incidents */}
      <section>
        <h2 className="text-sm font-medium text-muted-foreground uppercase tracking-wider mb-4">
          Active Incidents ({activeIncidents.length})
        </h2>
        <div className="rounded-md border border-border bg-card overflow-hidden">
          {incidentsLoading ? (
            <div className="p-4 space-y-3">
              {[1, 2].map(i => <Skeleton key={i} className="h-20" />)}
            </div>
          ) : activeIncidents.length > 0 ? (
            activeIncidents.map((incident) => (
              <IncidentRow key={incident.id} incident={incident} />
            ))
          ) : (
            <div className="p-8 text-center text-muted-foreground">
              <Activity className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p>No active incidents</p>
            </div>
          )}
        </div>
      </section>

      {/* Recent Alerts */}
      <section>
        <h2 className="text-sm font-medium text-muted-foreground uppercase tracking-wider mb-4">
          Recent Alerts ({alerts.length})
        </h2>
        <div className="rounded-md border border-border bg-card overflow-hidden">
          {alertsLoading ? (
            <div className="p-4 space-y-3">
              {[1, 2, 3].map(i => <Skeleton key={i} className="h-16" />)}
            </div>
          ) : alerts.length > 0 ? (
            alerts.slice(0, 5).map((alert) => (
              <AlertRow key={alert.id} alert={alert} />
            ))
          ) : (
            <div className="p-8 text-center text-muted-foreground">
              <Bell className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p>No alerts</p>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
