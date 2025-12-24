export type ServiceStatus = 'healthy' | 'degraded' | 'critical' | 'unknown';
export type IncidentSeverity = 'critical' | 'high' | 'medium' | 'low';
export type IncidentStatus = 'open' | 'ongoing' | 'resolved';
export type AlertSeverity = 'critical' | 'warning' | 'info';
export type LogLevel = 'error' | 'warn' | 'info' | 'debug';

export interface Service {
  id: string;
  name: string;
  status: ServiceStatus;
  uptime: number;
  latencyP50: number;
  latencyP99: number;
  errorRate: number;
  requestsPerSecond: number;
  lastChecked: Date;
}

export interface GoldenSignals {
  latency: {
    p50: number;
    p95: number;
    p99: number;
  };
  traffic: {
    requestsPerSecond: number;
    bytesPerSecond: number;
  };
  errors: {
    rate: number;
    count: number;
  };
  saturation: {
    cpu: number;
    memory: number;
    disk: number;
  };
}

export interface Incident {
  id: string;
  title: string;
  description: string;
  severity: IncidentSeverity;
  status: IncidentStatus;
  service: string;
  triggeredBy: string;
  startedAt: Date;
  acknowledgedAt?: Date;
  resolvedAt?: Date;
  timeline: IncidentEvent[];
}

export interface IncidentEvent {
  id: string;
  timestamp: Date;
  type: 'triggered' | 'acknowledged' | 'escalated' | 'resolved' | 'comment';
  message: string;
  author?: string;
}

export interface Alert {
  id: string;
  name: string;
  severity: AlertSeverity;
  service: string;
  message: string;
  metric: string;
  threshold: number;
  currentValue: number;
  firedAt: Date;
  acknowledgedAt?: Date;
  silencedUntil?: Date;
}

export interface LogEntry {
  id: string;
  timestamp: Date;
  level: LogLevel;
  service: string;
  message: string;
  metadata?: Record<string, unknown>;
  traceId?: string;
}

export interface MetricDataPoint {
  timestamp: Date;
  value: number;
}

export interface MetricSeries {
  name: string;
  data: MetricDataPoint[];
  unit?: string;
}

export interface SLI {
  name: string;
  target: number;
  current: number;
  period: string;
}

export interface SLO {
  id: string;
  name: string;
  service: string;
  slis: SLI[];
  errorBudget: number;
  errorBudgetConsumed: number;
}
