import { MetricChart } from '@/components/sre/MetricChart';
import { GoldenSignalsPanel } from '@/components/sre/GoldenSignalsPanel';
import { useServices } from '@/hooks/useServices';
import { useMetrics } from '@/hooks/useMetrics';
import type { GoldenSignals, MetricSeries } from '@/types/sre';
import { Activity, Clock, Zap, AlertTriangle, Cpu, HardDrive, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { useMemo } from 'react';

export default function Metrics() {
  const { services, loading: servicesLoading } = useServices();
  const { metrics, loading, refetch, isUsingBackend } = useMetrics();

  const goldenSignals: GoldenSignals = useMemo(() => {
    if (services.length === 0) {
      return {
        latency: { p50: 0, p95: 0, p99: 0 },
        traffic: { requestsPerSecond: 0, bytesPerSecond: 0 },
        errors: { rate: 0, count: 0 },
        saturation: { cpu: 0, memory: 0, disk: 0 },
      };
    }

    const avgLatencyP50 = services.reduce((sum, s) => sum + (s.latency_p50 || 0), 0) / services.length;
    const avgLatencyP99 = services.reduce((sum, s) => sum + (s.latency_p99 || 0), 0) / services.length;
    const totalRPS = services.reduce((sum, s) => sum + (s.requests_per_second || 0), 0);
    const avgErrorRate = services.reduce((sum, s) => sum + (s.error_rate || 0), 0) / services.length;
    const avgCPU = services.reduce((sum, s) => sum + (s.cpu_usage || 0), 0) / services.length;
    const avgMemory = services.reduce((sum, s) => sum + (s.memory_usage || 0), 0) / services.length;

    return {
      latency: { p50: Math.round(avgLatencyP50), p95: Math.round(avgLatencyP99 * 0.95), p99: Math.round(avgLatencyP99) },
      traffic: { requestsPerSecond: Math.round(totalRPS), bytesPerSecond: Math.round(totalRPS * 1024) },
      errors: { rate: Number(avgErrorRate.toFixed(2)), count: Math.round(totalRPS * avgErrorRate / 100 * 3600) },
      saturation: { cpu: Math.round(avgCPU), memory: Math.round(avgMemory), disk: 0 },
    };
  }, [services]);

  // Build time series from actual metrics data
  const latencyMetrics: MetricSeries = useMemo(() => {
    const data = metrics
      .filter(m => m.metric_name === 'latency_p99')
      .map(m => ({ timestamp: new Date(m.recorded_at), value: Number(m.value) }))
      .sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
    return { name: 'P99 Latency', data };
  }, [metrics]);

  const requestMetrics: MetricSeries = useMemo(() => {
    const data = metrics
      .filter(m => m.metric_name === 'requests_per_second')
      .map(m => ({ timestamp: new Date(m.recorded_at), value: Number(m.value) }))
      .sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
    return { name: 'Requests/sec', data };
  }, [metrics]);

  const errorMetrics: MetricSeries = useMemo(() => {
    const data = metrics
      .filter(m => m.metric_name === 'error_rate')
      .map(m => ({ timestamp: new Date(m.recorded_at), value: Number(m.value) }))
      .sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
    return { name: 'Error Rate', data };
  }, [metrics]);

  const cpuMetrics: MetricSeries = useMemo(() => {
    const data = metrics
      .filter(m => m.metric_name === 'cpu_usage')
      .map(m => ({ timestamp: new Date(m.recorded_at), value: Number(m.value) }))
      .sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
    return { name: 'CPU Usage', data };
  }, [metrics]);

  const memoryMetrics: MetricSeries = useMemo(() => {
    const data = metrics
      .filter(m => m.metric_name === 'memory_usage')
      .map(m => ({ timestamp: new Date(m.recorded_at), value: Number(m.value) }))
      .sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
    return { name: 'Memory Usage', data };
  }, [metrics]);

  const hasNoData = metrics.length === 0;

  if (servicesLoading || loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-64" />
        <div className="grid grid-cols-4 gap-4">{[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-24" />)}</div>
        <Skeleton className="h-64" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Metrics Dashboard</h1>
          <p className="text-sm text-muted-foreground">
            {isUsingBackend ? 'Real-time metrics from Prometheus' : 'Metrics from database'}
            {hasNoData && ' • No metrics data yet - use Test Panel to generate data'}
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={() => refetch()} className="gap-2">
          <RefreshCw className="h-4 w-4" />
          Refresh
        </Button>
      </div>

      <section>
        <h2 className="text-sm font-medium text-muted-foreground uppercase tracking-wider mb-4 flex items-center gap-2">
          <Activity className="h-4 w-4" />
          Golden Signals
        </h2>
        <GoldenSignalsPanel signals={goldenSignals} />
      </section>

      <section>
        <h2 className="text-sm font-medium text-muted-foreground uppercase tracking-wider mb-4 flex items-center gap-2">
          <Clock className="h-4 w-4 text-metric-latency" />
          Latency (24h)
        </h2>
        <div className="metric-card border-metric-latency/30">
          <div className="mb-4 grid grid-cols-3 gap-4">
            <div>
              <span className="text-xs text-muted-foreground">P50</span>
              <div className="font-mono text-lg">{goldenSignals.latency.p50}ms</div>
            </div>
            <div>
              <span className="text-xs text-muted-foreground">P95</span>
              <div className="font-mono text-lg">{goldenSignals.latency.p95}ms</div>
            </div>
            <div>
              <span className="text-xs text-muted-foreground">P99</span>
              <div className="font-mono text-lg">{goldenSignals.latency.p99}ms</div>
            </div>
          </div>
          {latencyMetrics.data.length > 0 ? (
            <MetricChart series={latencyMetrics} color="hsl(var(--metric-latency))" height={250} />
          ) : (
            <div className="h-[250px] flex items-center justify-center text-muted-foreground">
              No latency data available
            </div>
          )}
        </div>
      </section>

      <div className="grid grid-cols-2 gap-6">
        <section>
          <h2 className="text-sm font-medium text-muted-foreground uppercase tracking-wider mb-4 flex items-center gap-2">
            <Zap className="h-4 w-4 text-metric-traffic" />
            Traffic (24h)
          </h2>
          <div className="metric-card border-metric-traffic/30">
            <div className="mb-4">
              <span className="text-xs text-muted-foreground">Current RPS</span>
              <div className="font-mono text-2xl">{goldenSignals.traffic.requestsPerSecond.toLocaleString()}</div>
            </div>
            {requestMetrics.data.length > 0 ? (
              <MetricChart series={requestMetrics} color="hsl(var(--metric-traffic))" height={200} />
            ) : (
              <div className="h-[200px] flex items-center justify-center text-muted-foreground">
                No traffic data available
              </div>
            )}
          </div>
        </section>
        <section>
          <h2 className="text-sm font-medium text-muted-foreground uppercase tracking-wider mb-4 flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-metric-errors" />
            Error Rate (24h)
          </h2>
          <div className="metric-card border-metric-errors/30">
            <div className="mb-4">
              <span className="text-xs text-muted-foreground">Current Rate</span>
              <div className="font-mono text-2xl">{goldenSignals.errors.rate}%</div>
            </div>
            {errorMetrics.data.length > 0 ? (
              <MetricChart series={errorMetrics} color="hsl(var(--metric-errors))" height={200} />
            ) : (
              <div className="h-[200px] flex items-center justify-center text-muted-foreground">
                No error data available
              </div>
            )}
          </div>
        </section>
      </div>

      <section>
        <h2 className="text-sm font-medium text-muted-foreground uppercase tracking-wider mb-4 flex items-center gap-2">
          <Cpu className="h-4 w-4 text-metric-saturation" />
          Resource Saturation (24h)
        </h2>
        <div className="grid grid-cols-2 gap-6">
          <div className="metric-card border-metric-saturation/30">
            <div className="flex items-center justify-between mb-4">
              <div>
                <span className="text-xs text-muted-foreground">CPU Usage</span>
                <div className="font-mono text-2xl">{goldenSignals.saturation.cpu}%</div>
              </div>
              <Cpu className="h-8 w-8 text-metric-saturation/50" />
            </div>
            {cpuMetrics.data.length > 0 ? (
              <MetricChart series={cpuMetrics} color="hsl(var(--metric-saturation))" height={180} />
            ) : (
              <div className="h-[180px] flex items-center justify-center text-muted-foreground">
                No CPU data available
              </div>
            )}
          </div>
          <div className="metric-card border-metric-saturation/30">
            <div className="flex items-center justify-between mb-4">
              <div>
                <span className="text-xs text-muted-foreground">Memory Usage</span>
                <div className="font-mono text-2xl">{goldenSignals.saturation.memory}%</div>
              </div>
              <HardDrive className="h-8 w-8 text-metric-saturation/50" />
            </div>
            {memoryMetrics.data.length > 0 ? (
              <MetricChart series={memoryMetrics} color="hsl(var(--chart-3))" height={180} />
            ) : (
              <div className="h-[180px] flex items-center justify-center text-muted-foreground">
                No memory data available
              </div>
            )}
          </div>
        </div>
      </section>
    </div>
  );
}
