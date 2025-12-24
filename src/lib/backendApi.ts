/**
 * Backend API Client
 * Handles communication with FastAPI backend for Docker deployment
 * Falls back to Supabase when backend is not available
 */

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:8000';

interface BackendStatus {
  available: boolean;
  prometheus: boolean;
  loki: boolean;
  database: boolean;
  lastChecked: Date;
}

class BackendApiClient {
  private baseUrl: string;
  private _status: BackendStatus = {
    available: false,
    prometheus: false,
    loki: false,
    database: false,
    lastChecked: new Date()
  };
  private checkPromise: Promise<void> | null = null;

  constructor() {
    this.baseUrl = BACKEND_URL;
    this.checkPromise = this.checkBackendAvailability();
  }

  async waitForCheck(): Promise<void> {
    if (this.checkPromise) {
      await this.checkPromise;
    }
  }

  private async checkBackendAvailability(): Promise<void> {
    try {
      const response = await fetch(`${this.baseUrl}/health`, { 
        method: 'GET',
        signal: AbortSignal.timeout(3000)
      });
      
      if (response.ok) {
        const data = await response.json();
        this._status = {
          available: true,
          prometheus: data.prometheus || false,
          loki: data.loki || false,
          database: data.database || false,
          lastChecked: new Date()
        };
        console.log('Backend API connected:', this._status);
      } else {
        this._status.available = false;
      }
    } catch {
      this._status = {
        available: false,
        prometheus: false,
        loki: false,
        database: false,
        lastChecked: new Date()
      };
      console.log('Backend API not available, using Supabase fallback');
    }
  }

  get status(): BackendStatus {
    return this._status;
  }

  isBackendAvailable(): boolean {
    return this._status.available;
  }

  async refreshStatus(): Promise<BackendStatus> {
    await this.checkBackendAvailability();
    return this._status;
  }

  private async request<T>(
    method: string,
    endpoint: string,
    data?: unknown
  ): Promise<T> {
    const url = endpoint.startsWith('/health') 
      ? `${this.baseUrl}${endpoint}`
      : `${this.baseUrl}/api/v1${endpoint}`;

    const options: RequestInit = {
      method,
      headers: {
        'Content-Type': 'application/json',
      },
    };

    if (data) {
      options.body = JSON.stringify(data);
    }

    const response = await fetch(url, options);
    
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`API Error (${response.status}): ${errorText}`);
    }
    
    return response.json();
  }

  async get<T>(endpoint: string): Promise<T> {
    return this.request<T>('GET', endpoint);
  }

  async post<T>(endpoint: string, data: unknown): Promise<T> {
    return this.request<T>('POST', endpoint, data);
  }

  async put<T>(endpoint: string, data: unknown): Promise<T> {
    return this.request<T>('PUT', endpoint, data);
  }

  async delete(endpoint: string): Promise<void> {
    await this.request('DELETE', endpoint);
  }

  // ============ Services API ============
  async getServices() {
    return this.get<Array<{
      id: string;
      name: string;
      description: string | null;
      status: string;
      cpu_usage: number | null;
      memory_usage: number | null;
      requests_per_second: number | null;
      error_rate: number | null;
      latency_p50: number | null;
      latency_p99: number | null;
      uptime: number | null;
      last_checked_at: string | null;
      created_at: string;
      updated_at: string;
    }>>('/services');
  }

  async getService(id: string) {
    return this.get<{
      id: string;
      name: string;
      description: string | null;
      status: string;
      cpu_usage: number | null;
      memory_usage: number | null;
      requests_per_second: number | null;
      error_rate: number | null;
      latency_p50: number | null;
      latency_p99: number | null;
      uptime: number | null;
      last_checked_at: string | null;
      created_at: string;
      updated_at: string;
    }>(`/services/${id}`);
  }

  async createService(service: { name: string; description?: string }) {
    return this.post('/services', service);
  }

  async updateService(id: string, updates: { name?: string; description?: string; status?: string }) {
    return this.put(`/services/${id}`, updates);
  }

  async deleteService(id: string) {
    return this.delete(`/services/${id}`);
  }

  // ============ Metrics API ============
  async getMetricsStatus(serviceId?: string) {
    const params = serviceId ? `?service_id=${serviceId}` : '';
    return this.get<{
      services: Array<{
        service_id: string;
        service_name: string;
        status: string;
        latency: string;
        error_rate: string;
        saturation: string;
      }>;
    }>(`/metrics/status${params}`);
  }

  async getGoldenSignals(serviceId: string, window = '5m') {
    return this.get<{
      latency: number;
      traffic: number;
      errors: number;
      saturation: number;
    }>(`/metrics/golden-signals/${serviceId}?window=${window}`);
  }

  async queryPrometheus(query: string) {
    return this.get<{ status: string; data: unknown }>(`/metrics/prometheus/query?query=${encodeURIComponent(query)}`);
  }

  async queryPrometheusRange(query: string, start: string, end: string, step = '1m') {
    return this.get<{ status: string; data: unknown[] }>(`/metrics/prometheus/query_range?query=${encodeURIComponent(query)}&start=${start}&end=${end}&step=${step}`);
  }

  // ============ Logs API ============
  async getLogs(params?: { service_id?: string; level?: string; limit?: number; start?: string; end?: string }) {
    const searchParams = new URLSearchParams();
    if (params?.service_id) searchParams.append('service_id', params.service_id);
    if (params?.level) searchParams.append('level', params.level);
    if (params?.limit) searchParams.append('limit', params.limit.toString());
    if (params?.start) searchParams.append('start', params.start);
    if (params?.end) searchParams.append('end', params.end);
    
    const queryString = searchParams.toString();
    return this.get<Array<{
      id: string;
      timestamp: string;
      level: string;
      message: string;
      service_id: string | null;
      metadata: Record<string, unknown> | null;
    }>>(`/logs${queryString ? `?${queryString}` : ''}`);
  }

  async queryLoki(query: string, start?: string, end?: string, limit = 100) {
    let url = `/logs/loki/query?query=${encodeURIComponent(query)}&limit=${limit}`;
    if (start) url += `&start=${start}`;
    if (end) url += `&end=${end}`;
    return this.get<Array<{
      timestamp: string;
      labels: Record<string, string>;
      message: string;
      level: string;
    }>>(url);
  }

  // ============ Incidents API ============
  async getIncidents(params?: { status?: string; severity?: string; service_id?: string }) {
    const searchParams = new URLSearchParams();
    if (params?.status) searchParams.append('status', params.status);
    if (params?.severity) searchParams.append('severity', params.severity);
    if (params?.service_id) searchParams.append('service_id', params.service_id);
    
    const queryString = searchParams.toString();
    return this.get<Array<{
      id: string;
      incident_number: string;
      title: string;
      description: string | null;
      severity: string;
      status: string;
      service_id: string | null;
      triggered_by: string | null;
      started_at: string;
      acknowledged_at: string | null;
      resolved_at: string | null;
      created_at: string;
      updated_at: string;
    }>>(`/incidents${queryString ? `?${queryString}` : ''}`);
  }

  async getIncident(id: string) {
    return this.get<{
      id: string;
      incident_number: string;
      title: string;
      description: string | null;
      severity: string;
      status: string;
      service_id: string | null;
      triggered_by: string | null;
      started_at: string;
      acknowledged_at: string | null;
      resolved_at: string | null;
      created_at: string;
      updated_at: string;
      events: Array<{
        id: string;
        event_type: string;
        message: string;
        created_at: string;
      }>;
    }>(`/incidents/${id}`);
  }

  async createIncident(incident: {
    title: string;
    description?: string;
    severity: string;
    service_id?: string;
    triggered_by?: string;
  }) {
    return this.post('/incidents', incident);
  }

  async acknowledgeIncident(id: string) {
    return this.post(`/incidents/${id}/acknowledge`, {});
  }

  async resolveIncident(id: string, resolution_note?: string) {
    return this.post(`/incidents/${id}/resolve`, { resolution_note });
  }

  async correlateIncident(incidentId: string) {
    return this.get<{
      incident_id: string;
      incident_number: string;
      window: { start: string; end: string };
      metrics: Record<string, unknown>;
      logs: Array<{
        timestamp: string;
        level: string;
        message: string;
      }>;
      potential_causes: Array<{
        type: string;
        cause: string;
        description: string;
        confidence: number;
      }>;
    }>(`/incidents/${incidentId}/correlate`);
  }

  // ============ Alerts API ============
  async getAlerts(params?: { severity?: string; acknowledged?: boolean; service_id?: string }) {
    const searchParams = new URLSearchParams();
    if (params?.severity) searchParams.append('severity', params.severity);
    if (params?.acknowledged !== undefined) searchParams.append('acknowledged', String(params.acknowledged));
    if (params?.service_id) searchParams.append('service_id', params.service_id);
    
    const queryString = searchParams.toString();
    return this.get<Array<{
      id: string;
      name: string;
      message: string;
      severity: string;
      metric_name: string;
      threshold: number;
      current_value: number;
      service_id: string | null;
      fired_at: string;
      acknowledged_at: string | null;
      silenced_until: string | null;
    }>>(`/alerts${queryString ? `?${queryString}` : ''}`);
  }

  async acknowledgeAlert(id: string) {
    return this.post(`/alerts/${id}/acknowledge`, {});
  }

  async silenceAlert(id: string, duration_minutes: number) {
    return this.post(`/alerts/${id}/silence`, { duration_minutes });
  }

  // ============ Health API ============
  async healthCheck() {
    return this.get<{
      status: string;
      version: string;
      database: boolean;
      prometheus: boolean;
      loki: boolean;
    }>('/health/detailed');
  }

  async checkHealth(): Promise<boolean> {
    try {
      const response = await fetch(`${this.baseUrl}/health`, { 
        method: 'GET',
        signal: AbortSignal.timeout(3000)
      });
      return response.ok;
    } catch {
      return false;
    }
  }
}

export const backendApi = new BackendApiClient();
export type { BackendStatus };
