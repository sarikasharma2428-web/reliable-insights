import { ServiceCard } from '@/components/sre/ServiceCard';
import { IncidentRow } from '@/components/sre/IncidentRow';
import { AlertRow } from '@/components/sre/AlertRow';
import { GoldenSignalsPanel } from '@/components/sre/GoldenSignalsPanel';
import { MetricChart } from '@/components/sre/MetricChart';
import { services, incidents, alerts, goldenSignals, latencyMetrics, errorMetrics } from '@/data/mockData';
import { Activity, AlertTriangle, Server, Bell } from 'lucide-react';

export default function Overview() {
  const activeIncidents = incidents.filter((i) => i.status !== 'resolved');
  const criticalServices = services.filter((s) => s.status === 'critical' || s.status === 'degraded');
  const activeAlerts = alerts.filter((a) => !a.acknowledgedAt);

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

      {/* Golden Signals */}
      <section>
        <h2 className="text-sm font-medium text-muted-foreground uppercase tracking-wider mb-4 flex items-center gap-2">
          <Activity className="h-4 w-4" />
          Golden Signals
        </h2>
        <GoldenSignalsPanel signals={goldenSignals} />
      </section>

      {/* Charts Row */}
      <div className="grid grid-cols-2 gap-6">
        <div className="metric-card">
          <h3 className="text-sm font-medium text-muted-foreground mb-4">Latency P99 (24h)</h3>
          <MetricChart series={latencyMetrics} color="hsl(var(--metric-latency))" height={180} />
        </div>
        <div className="metric-card">
          <h3 className="text-sm font-medium text-muted-foreground mb-4">Error Rate (24h)</h3>
          <MetricChart series={errorMetrics} color="hsl(var(--metric-errors))" height={180} />
        </div>
      </div>

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
          {activeIncidents.length > 0 ? (
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
          {alerts.slice(0, 5).map((alert) => (
            <AlertRow key={alert.id} alert={alert} />
          ))}
        </div>
      </section>
    </div>
  );
}
