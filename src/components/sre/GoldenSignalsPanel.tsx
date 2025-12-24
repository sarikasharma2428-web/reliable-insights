import { MetricCard } from './MetricCard';
import type { GoldenSignals } from '@/types/sre';
import { Clock, Zap, AlertTriangle, Gauge } from 'lucide-react';

interface GoldenSignalsPanelProps {
  signals: GoldenSignals;
}

export function GoldenSignalsPanel({ signals }: GoldenSignalsPanelProps) {
  return (
    <div className="grid grid-cols-4 gap-4">
      <MetricCard
        title="Latency (P99)"
        value={signals.latency.p99}
        unit="ms"
        change={12}
        changeLabel="vs last hour"
        icon={Clock}
        variant="latency"
      />
      <MetricCard
        title="Traffic"
        value={signals.traffic.requestsPerSecond.toLocaleString()}
        unit="req/s"
        change={-5}
        changeLabel="vs last hour"
        icon={Zap}
        variant="traffic"
      />
      <MetricCard
        title="Error Rate"
        value={signals.errors.rate.toFixed(2)}
        unit="%"
        change={23}
        changeLabel="vs last hour"
        icon={AlertTriangle}
        variant="errors"
      />
      <MetricCard
        title="CPU Saturation"
        value={signals.saturation.cpu}
        unit="%"
        change={-8}
        changeLabel="vs last hour"
        icon={Gauge}
        variant="saturation"
      />
    </div>
  );
}
