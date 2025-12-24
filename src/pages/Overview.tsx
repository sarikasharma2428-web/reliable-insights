import { ServiceCard } from '@/components/sre/ServiceCard';
import { IncidentRow } from '@/components/sre/IncidentRow';
import { AlertRow } from '@/components/sre/AlertRow';
import { GoldenSignalsPanel } from '@/components/sre/GoldenSignalsPanel';
import { MetricChart } from '@/components/sre/MetricChart';
import { useServices } from '@/hooks/useServices';
import { useIncidents } from '@/hooks/useIncidents';
import { useAlerts } from '@/hooks/useAlerts';
import { Activity, AlertTriangle, Server, Bell, Plus, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { Skeleton } from '@/components/ui/skeleton';

export default function Overview() {
  const { services, loading: servicesLoading, addService } = useServices();
  const { incidents, loading: incidentsLoading, createIncident } = useIncidents();
  const { alerts, loading: alertsLoading, createAlert } = useAlerts();
  const { toast } = useToast();

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

  const seedDemoData = async () => {
    try {
      // Add demo services
      const demoServices = [
        { name: 'api-gateway', description: 'Main API Gateway', status: 'healthy', uptime: 99.97, latency_p50: 23, latency_p99: 187, error_rate: 0.02, requests_per_second: 1247, cpu_usage: 45, memory_usage: 62 },
        { name: 'user-service', description: 'User Management Service', status: 'healthy', uptime: 99.99, latency_p50: 45, latency_p99: 234, error_rate: 0.01, requests_per_second: 523, cpu_usage: 32, memory_usage: 48 },
        { name: 'payment-service', description: 'Payment Processing', status: 'degraded', uptime: 99.82, latency_p50: 156, latency_p99: 892, error_rate: 0.34, requests_per_second: 89, cpu_usage: 78, memory_usage: 85 },
        { name: 'search-service', description: 'Search Engine', status: 'critical', uptime: 94.23, latency_p50: 892, latency_p99: 4521, error_rate: 5.67, requests_per_second: 156, cpu_usage: 92, memory_usage: 88 },
        { name: 'notification-service', description: 'Push Notifications', status: 'healthy', uptime: 99.95, latency_p50: 12, latency_p99: 78, error_rate: 0.05, requests_per_second: 2341, cpu_usage: 28, memory_usage: 35 },
      ];

      for (const service of demoServices) {
        await addService(service);
      }

      // Create demo incident
      await createIncident({
        title: 'High latency in search-service',
        description: 'Search queries experiencing 10x normal latency',
        severity: 'critical',
        triggered_by: 'latency_p99 > 2000ms'
      });

      // Create demo alerts
      await createAlert({
        name: 'High Latency Alert',
        severity: 'critical',
        message: 'P99 latency exceeded threshold',
        metric_name: 'latency_p99',
        threshold: 2000,
        current_value: 4521
      });

      await createAlert({
        name: 'Error Rate Alert',
        severity: 'warning',
        message: 'Error rate above acceptable threshold',
        metric_name: 'error_rate',
        threshold: 0.3,
        current_value: 0.34
      });

      toast({ title: 'Demo data created!', description: 'Services, incidents, and alerts added.' });
    } catch (error) {
      console.error('Error seeding demo data:', error);
      toast({ 
        title: 'Error', 
        description: 'Failed to create demo data. It may already exist.',
        variant: 'destructive'
      });
    }
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
          {services.length === 0 && !servicesLoading && (
            <Button onClick={seedDemoData} className="gap-2">
              <Plus className="h-4 w-4" />
              Add Demo Data
            </Button>
          )}
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
