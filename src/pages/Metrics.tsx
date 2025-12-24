import { MetricChart } from '@/components/sre/MetricChart';
import { GoldenSignalsPanel } from '@/components/sre/GoldenSignalsPanel';
import { 
  goldenSignals, 
  latencyMetrics, 
  requestMetrics, 
  errorMetrics, 
  cpuMetrics, 
  memoryMetrics 
} from '@/data/mockData';
import { Activity, Clock, Zap, AlertTriangle, Cpu, HardDrive } from 'lucide-react';

export default function Metrics() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Metrics Dashboard</h1>
        <p className="text-sm text-muted-foreground">
          Real-time metrics from Prometheus and OpenTelemetry
        </p>
      </div>

      {/* Golden Signals Overview */}
      <section>
        <h2 className="text-sm font-medium text-muted-foreground uppercase tracking-wider mb-4 flex items-center gap-2">
          <Activity className="h-4 w-4" />
          Golden Signals - Current Values
        </h2>
        <GoldenSignalsPanel signals={goldenSignals} />
      </section>

      {/* Latency Metrics */}
      <section>
        <h2 className="text-sm font-medium text-muted-foreground uppercase tracking-wider mb-4 flex items-center gap-2">
          <Clock className="h-4 w-4 text-metric-latency" />
          Latency Distribution (24h)
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
          <MetricChart series={latencyMetrics} color="hsl(var(--metric-latency))" height={250} />
        </div>
      </section>

      {/* Traffic & Errors */}
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
            <MetricChart series={requestMetrics} color="hsl(var(--metric-traffic))" height={200} />
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
            <MetricChart series={errorMetrics} color="hsl(var(--metric-errors))" height={200} />
          </div>
        </section>
      </div>

      {/* Resource Saturation */}
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
            <MetricChart series={cpuMetrics} color="hsl(var(--metric-saturation))" height={180} />
          </div>

          <div className="metric-card border-metric-saturation/30">
            <div className="flex items-center justify-between mb-4">
              <div>
                <span className="text-xs text-muted-foreground">Memory Usage</span>
                <div className="font-mono text-2xl">{goldenSignals.saturation.memory}%</div>
              </div>
              <HardDrive className="h-8 w-8 text-metric-saturation/50" />
            </div>
            <MetricChart series={memoryMetrics} color="hsl(var(--chart-3))" height={180} />
          </div>
        </div>
      </section>
    </div>
  );
}
