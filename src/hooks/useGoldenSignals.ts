import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { backendApi } from '@/lib/backendApi';

interface GoldenSignals {
  latency: number;
  traffic: number;
  errors: number;
  saturation: number;
}

interface ServiceHealth {
  serviceId: string;
  serviceName: string;
  status: 'healthy' | 'degraded' | 'critical' | 'unknown';
  goldenSignals: GoldenSignals;
  lastChecked: Date;
}

export function useGoldenSignals(serviceId?: string) {
  const [signals, setSignals] = useState<GoldenSignals | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchSignals = useCallback(async () => {
    if (!serviceId) {
      setSignals(null);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      
      // Try backend API first
      if (backendApi.isBackendAvailable()) {
        const data = await backendApi.getGoldenSignals(serviceId);
        setSignals(data);
      } else {
        // Fallback to Supabase
        const { data: service, error: err } = await supabase
          .from('services')
          .select('latency_p99, requests_per_second, error_rate, memory_usage')
          .eq('id', serviceId)
          .single();
        
        if (err) throw err;
        
        setSignals({
          latency: service.latency_p99 || 0,
          traffic: service.requests_per_second || 0,
          errors: service.error_rate || 0,
          saturation: service.memory_usage || 0,
        });
      }
      
      setError(null);
    } catch (err) {
      console.error('Error fetching golden signals:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch signals');
    } finally {
      setLoading(false);
    }
  }, [serviceId]);

  useEffect(() => {
    fetchSignals();
    const interval = setInterval(fetchSignals, 15000); // Refresh every 15s
    return () => clearInterval(interval);
  }, [fetchSignals]);

  return { signals, loading, error, refetch: fetchSignals };
}

export function useServicesHealth() {
  const [healthData, setHealthData] = useState<ServiceHealth[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchHealth = async () => {
      try {
        const { data: services, error } = await supabase
          .from('services')
          .select('*')
          .order('name');
        
        if (error) throw error;

        const health: ServiceHealth[] = (services || []).map(service => ({
          serviceId: service.id,
          serviceName: service.name,
          status: determineHealthStatus(service),
          goldenSignals: {
            latency: service.latency_p99 || 0,
            traffic: service.requests_per_second || 0,
            errors: service.error_rate || 0,
            saturation: service.memory_usage || 0,
          },
          lastChecked: new Date(service.last_checked_at || service.updated_at),
        }));

        setHealthData(health);
      } catch (err) {
        console.error('Error fetching services health:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchHealth();
    
    // Real-time updates
    const channel = supabase
      .channel('services-health')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'services' }, () => {
        fetchHealth();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  return { healthData, loading };
}

function determineHealthStatus(service: {
  error_rate?: number | null;
  latency_p99?: number | null;
  cpu_usage?: number | null;
  memory_usage?: number | null;
  status?: string;
}): 'healthy' | 'degraded' | 'critical' | 'unknown' {
  if (service.status === 'critical') return 'critical';
  if (service.status === 'degraded') return 'degraded';
  if (service.status === 'healthy') return 'healthy';

  const errorRate = service.error_rate || 0;
  const latency = service.latency_p99 || 0;
  const cpu = service.cpu_usage || 0;
  const memory = service.memory_usage || 0;

  if (errorRate > 10 || latency > 2000 || cpu > 95 || memory > 95) {
    return 'critical';
  }
  
  if (errorRate > 5 || latency > 1000 || cpu > 85 || memory > 85) {
    return 'degraded';
  }

  return 'healthy';
}
