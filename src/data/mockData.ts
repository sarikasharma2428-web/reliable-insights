import type { Service, Incident, Alert, LogEntry, GoldenSignals, SLO, MetricSeries } from '@/types/sre';

export const services: Service[] = [
  {
    id: 'api-gateway',
    name: 'api-gateway',
    status: 'healthy',
    uptime: 99.97,
    latencyP50: 23,
    latencyP99: 187,
    errorRate: 0.02,
    requestsPerSecond: 1247,
    lastChecked: new Date(),
  },
  {
    id: 'user-service',
    name: 'user-service',
    status: 'healthy',
    uptime: 99.99,
    latencyP50: 45,
    latencyP99: 234,
    errorRate: 0.01,
    requestsPerSecond: 523,
    lastChecked: new Date(),
  },
  {
    id: 'payment-service',
    name: 'payment-service',
    status: 'degraded',
    uptime: 99.82,
    latencyP50: 156,
    latencyP99: 892,
    errorRate: 0.34,
    requestsPerSecond: 89,
    lastChecked: new Date(),
  },
  {
    id: 'notification-service',
    name: 'notification-service',
    status: 'healthy',
    uptime: 99.95,
    latencyP50: 12,
    latencyP99: 78,
    errorRate: 0.05,
    requestsPerSecond: 2341,
    lastChecked: new Date(),
  },
  {
    id: 'search-service',
    name: 'search-service',
    status: 'critical',
    uptime: 94.23,
    latencyP50: 892,
    latencyP99: 4521,
    errorRate: 5.67,
    requestsPerSecond: 156,
    lastChecked: new Date(),
  },
  {
    id: 'inventory-service',
    name: 'inventory-service',
    status: 'healthy',
    uptime: 99.98,
    latencyP50: 34,
    latencyP99: 156,
    errorRate: 0.03,
    requestsPerSecond: 678,
    lastChecked: new Date(),
  },
];

export const incidents: Incident[] = [
  {
    id: 'INC-2024-001',
    title: 'High latency in search-service',
    description: 'Search queries experiencing 10x normal latency. Elasticsearch cluster showing high heap usage.',
    severity: 'critical',
    status: 'ongoing',
    service: 'search-service',
    triggeredBy: 'latency_p99 > 2000ms',
    startedAt: new Date(Date.now() - 45 * 60 * 1000),
    acknowledgedAt: new Date(Date.now() - 40 * 60 * 1000),
    timeline: [
      {
        id: '1',
        timestamp: new Date(Date.now() - 45 * 60 * 1000),
        type: 'triggered',
        message: 'Alert fired: search-service latency_p99 exceeded 2000ms threshold',
      },
      {
        id: '2',
        timestamp: new Date(Date.now() - 40 * 60 * 1000),
        type: 'acknowledged',
        message: 'Incident acknowledged by on-call engineer',
        author: 'sarah.chen@company.com',
      },
      {
        id: '3',
        timestamp: new Date(Date.now() - 35 * 60 * 1000),
        type: 'comment',
        message: 'Investigating Elasticsearch heap usage. GC pauses detected.',
        author: 'sarah.chen@company.com',
      },
      {
        id: '4',
        timestamp: new Date(Date.now() - 20 * 60 * 1000),
        type: 'escalated',
        message: 'Escalated to Platform team - requires cluster scaling',
        author: 'sarah.chen@company.com',
      },
    ],
  },
  {
    id: 'INC-2024-002',
    title: 'Elevated error rate in payment-service',
    description: 'Payment processing failures increased. Third-party payment gateway reporting intermittent issues.',
    severity: 'high',
    status: 'ongoing',
    service: 'payment-service',
    triggeredBy: 'error_rate > 0.3%',
    startedAt: new Date(Date.now() - 120 * 60 * 1000),
    acknowledgedAt: new Date(Date.now() - 115 * 60 * 1000),
    timeline: [
      {
        id: '1',
        timestamp: new Date(Date.now() - 120 * 60 * 1000),
        type: 'triggered',
        message: 'Alert fired: payment-service error_rate exceeded 0.3% threshold',
      },
      {
        id: '2',
        timestamp: new Date(Date.now() - 115 * 60 * 1000),
        type: 'acknowledged',
        message: 'Incident acknowledged',
        author: 'mike.johnson@company.com',
      },
    ],
  },
  {
    id: 'INC-2024-003',
    title: 'Database connection pool exhaustion',
    description: 'User service DB connections reached maximum. Queries timing out.',
    severity: 'medium',
    status: 'resolved',
    service: 'user-service',
    triggeredBy: 'db_connections > 95%',
    startedAt: new Date(Date.now() - 24 * 60 * 60 * 1000),
    acknowledgedAt: new Date(Date.now() - 24 * 60 * 60 * 1000 + 5 * 60 * 1000),
    resolvedAt: new Date(Date.now() - 23 * 60 * 60 * 1000),
    timeline: [
      {
        id: '1',
        timestamp: new Date(Date.now() - 24 * 60 * 60 * 1000),
        type: 'triggered',
        message: 'Alert fired: DB connection pool utilization exceeded 95%',
      },
      {
        id: '2',
        timestamp: new Date(Date.now() - 24 * 60 * 60 * 1000 + 5 * 60 * 1000),
        type: 'acknowledged',
        message: 'Investigating connection leak in user-service',
        author: 'alex.wong@company.com',
      },
      {
        id: '3',
        timestamp: new Date(Date.now() - 23 * 60 * 60 * 1000),
        type: 'resolved',
        message: 'Fixed connection leak. Pool usage normalized.',
        author: 'alex.wong@company.com',
      },
    ],
  },
];

export const alerts: Alert[] = [
  {
    id: 'ALT-001',
    name: 'High Latency Alert',
    severity: 'critical',
    service: 'search-service',
    message: 'P99 latency exceeded threshold',
    metric: 'latency_p99',
    threshold: 2000,
    currentValue: 4521,
    firedAt: new Date(Date.now() - 45 * 60 * 1000),
  },
  {
    id: 'ALT-002',
    name: 'Error Rate Alert',
    severity: 'warning',
    service: 'payment-service',
    message: 'Error rate above acceptable threshold',
    metric: 'error_rate',
    threshold: 0.3,
    currentValue: 0.34,
    firedAt: new Date(Date.now() - 120 * 60 * 1000),
  },
  {
    id: 'ALT-003',
    name: 'CPU Saturation',
    severity: 'warning',
    service: 'search-service',
    message: 'CPU usage above 85%',
    metric: 'cpu_usage',
    threshold: 85,
    currentValue: 92,
    firedAt: new Date(Date.now() - 30 * 60 * 1000),
  },
  {
    id: 'ALT-004',
    name: 'Memory Pressure',
    severity: 'info',
    service: 'api-gateway',
    message: 'Memory usage trending up',
    metric: 'memory_usage',
    threshold: 75,
    currentValue: 78,
    firedAt: new Date(Date.now() - 15 * 60 * 1000),
  },
];

export const logs: LogEntry[] = [
  {
    id: '1',
    timestamp: new Date(Date.now() - 1000),
    level: 'error',
    service: 'search-service',
    message: 'Elasticsearch query timeout after 30000ms',
    metadata: { query_id: 'q-789xyz', index: 'products' },
    traceId: 'trace-abc123',
  },
  {
    id: '2',
    timestamp: new Date(Date.now() - 2000),
    level: 'warn',
    service: 'payment-service',
    message: 'Payment gateway returned 503, retrying...',
    metadata: { gateway: 'stripe', attempt: 2 },
    traceId: 'trace-def456',
  },
  {
    id: '3',
    timestamp: new Date(Date.now() - 3000),
    level: 'info',
    service: 'api-gateway',
    message: 'Rate limit applied for client 192.168.1.100',
    metadata: { client_ip: '192.168.1.100', limit: 1000 },
  },
  {
    id: '4',
    timestamp: new Date(Date.now() - 4000),
    level: 'error',
    service: 'search-service',
    message: 'GC pause exceeded 500ms, heap pressure critical',
    metadata: { gc_type: 'full', pause_ms: 847 },
  },
  {
    id: '5',
    timestamp: new Date(Date.now() - 5000),
    level: 'info',
    service: 'user-service',
    message: 'User authentication successful',
    metadata: { user_id: 'usr_12345', method: 'oauth2' },
    traceId: 'trace-ghi789',
  },
  {
    id: '6',
    timestamp: new Date(Date.now() - 6000),
    level: 'debug',
    service: 'notification-service',
    message: 'Email queued for delivery',
    metadata: { queue_size: 42, template: 'welcome' },
  },
  {
    id: '7',
    timestamp: new Date(Date.now() - 7000),
    level: 'error',
    service: 'payment-service',
    message: 'Transaction failed: insufficient funds',
    metadata: { transaction_id: 'txn_abc123', error_code: 'E_INSUFFICIENT' },
    traceId: 'trace-jkl012',
  },
  {
    id: '8',
    timestamp: new Date(Date.now() - 8000),
    level: 'warn',
    service: 'inventory-service',
    message: 'Stock level below threshold for SKU-12345',
    metadata: { sku: 'SKU-12345', current_stock: 5, threshold: 10 },
  },
  {
    id: '9',
    timestamp: new Date(Date.now() - 9000),
    level: 'info',
    service: 'api-gateway',
    message: 'Health check passed for all upstream services',
  },
  {
    id: '10',
    timestamp: new Date(Date.now() - 10000),
    level: 'error',
    service: 'search-service',
    message: 'Index shard failed to allocate, node disk full',
    metadata: { shard: 3, node: 'es-node-02', disk_usage: '98%' },
  },
];

export const goldenSignals: GoldenSignals = {
  latency: {
    p50: 45,
    p95: 234,
    p99: 567,
  },
  traffic: {
    requestsPerSecond: 4234,
    bytesPerSecond: 12500000,
  },
  errors: {
    rate: 0.23,
    count: 156,
  },
  saturation: {
    cpu: 67,
    memory: 72,
    disk: 45,
  },
};

export const slos: SLO[] = [
  {
    id: 'slo-api',
    name: 'API Availability',
    service: 'api-gateway',
    slis: [
      { name: 'Availability', target: 99.9, current: 99.97, period: '30d' },
      { name: 'Latency P99 < 200ms', target: 95, current: 94.2, period: '30d' },
    ],
    errorBudget: 0.1,
    errorBudgetConsumed: 0.03,
  },
  {
    id: 'slo-search',
    name: 'Search Performance',
    service: 'search-service',
    slis: [
      { name: 'Availability', target: 99.5, current: 94.23, period: '30d' },
      { name: 'Latency P99 < 500ms', target: 90, current: 45.6, period: '30d' },
    ],
    errorBudget: 0.5,
    errorBudgetConsumed: 5.77,
  },
];

// Generate time series data for charts
export function generateMetricSeries(name: string, hours: number = 24, baseValue: number = 50, variance: number = 20): MetricSeries {
  const data = [];
  const now = Date.now();
  const interval = (hours * 60 * 60 * 1000) / 100;
  
  for (let i = 100; i >= 0; i--) {
    const timestamp = new Date(now - i * interval);
    const noise = (Math.random() - 0.5) * variance;
    const trend = Math.sin(i / 10) * (variance / 2);
    const value = Math.max(0, baseValue + noise + trend);
    data.push({ timestamp, value });
  }
  
  return { name, data };
}

export const latencyMetrics = generateMetricSeries('Latency P99', 24, 150, 100);
export const requestMetrics = generateMetricSeries('Requests/s', 24, 1000, 300);
export const errorMetrics = generateMetricSeries('Error Rate', 24, 0.5, 0.3);
export const cpuMetrics = generateMetricSeries('CPU Usage', 24, 65, 25);
export const memoryMetrics = generateMetricSeries('Memory Usage', 24, 70, 15);
