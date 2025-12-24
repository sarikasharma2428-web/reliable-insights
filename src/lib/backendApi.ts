/**
 * Backend API Client
 * Handles communication with FastAPI backend for Docker deployment
 * Falls back to Supabase when backend is not available
 */

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:8000';

interface ApiConfig {
  useBackend: boolean;
}

class BackendApiClient {
  private baseUrl: string;
  private useBackend: boolean = false;

  constructor() {
    this.baseUrl = BACKEND_URL;
    this.checkBackendAvailability();
  }

  private async checkBackendAvailability() {
    try {
      const response = await fetch(`${this.baseUrl}/health`, { 
        method: 'GET',
        signal: AbortSignal.timeout(3000)
      });
      this.useBackend = response.ok;
      console.log(`Backend API ${this.useBackend ? 'connected' : 'not available'}`);
    } catch {
      this.useBackend = false;
      console.log('Backend API not available, using Supabase');
    }
  }

  isBackendAvailable(): boolean {
    return this.useBackend;
  }

  async get<T>(endpoint: string): Promise<T> {
    const response = await fetch(`${this.baseUrl}/api/v1${endpoint}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });
    
    if (!response.ok) {
      throw new Error(`API Error: ${response.statusText}`);
    }
    
    return response.json();
  }

  async post<T>(endpoint: string, data: unknown): Promise<T> {
    const response = await fetch(`${this.baseUrl}/api/v1${endpoint}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    });
    
    if (!response.ok) {
      throw new Error(`API Error: ${response.statusText}`);
    }
    
    return response.json();
  }

  async put<T>(endpoint: string, data: unknown): Promise<T> {
    const response = await fetch(`${this.baseUrl}/api/v1${endpoint}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    });
    
    if (!response.ok) {
      throw new Error(`API Error: ${response.statusText}`);
    }
    
    return response.json();
  }

  async delete(endpoint: string): Promise<void> {
    const response = await fetch(`${this.baseUrl}/api/v1${endpoint}`, {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
      },
    });
    
    if (!response.ok) {
      throw new Error(`API Error: ${response.statusText}`);
    }
  }

  // Golden Signals API
  async getGoldenSignals(serviceId: string, window = '5m') {
    return this.get<{
      latency: number;
      traffic: number;
      errors: number;
      saturation: number;
    }>(`/metrics/golden-signals/${serviceId}?window=${window}`);
  }

  // Prometheus Query
  async queryPrometheus(query: string) {
    return this.get<{ status: string; data: unknown }>(`/metrics/prometheus/query?query=${encodeURIComponent(query)}`);
  }

  // Loki Query
  async queryLoki(query: string, start?: string, end?: string) {
    let url = `/logs/loki/query?query=${encodeURIComponent(query)}`;
    if (start) url += `&start=${start}`;
    if (end) url += `&end=${end}`;
    return this.get<{ status: string; data: unknown[] }>(url);
  }

  // Incident Correlation
  async correlateIncident(incidentId: string) {
    return this.get<{
      metrics: Record<string, unknown>;
      logs: unknown[];
      potential_causes: Array<{
        type: string;
        cause: string;
        confidence: number;
      }>;
    }>(`/incidents/${incidentId}/correlate`);
  }

  // Health Check
  async healthCheck() {
    const response = await fetch(`${this.baseUrl}/health/detailed`);
    return response.json();
  }
}

export const backendApi = new BackendApiClient();
export type { ApiConfig };
