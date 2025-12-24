import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { backendApi } from '@/lib/backendApi';

interface Metric {
  id: string;
  service_id: string | null;
  metric_name: string;
  value: number;
  unit: string | null;
  recorded_at: string;
}

interface MetricDataPoint {
  timestamp: Date;
  value: number;
}

interface MetricSeries {
  name: string;
  data: MetricDataPoint[];
  unit?: string;
}

interface MetricsStatusItem {
  service_id: string;
  service_name: string;
  status: string;
  latency: string;
  error_rate: string;
  saturation: string;
}

export function useMetrics(serviceId?: string, hours = 24) {
  const [metrics, setMetrics] = useState<Metric[]>([]);
  const [metricsStatus, setMetricsStatus] = useState<MetricsStatusItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [useBackend, setUseBackend] = useState(false);

  const fetchFromBackend = useCallback(async () => {
    try {
      const statusData = await backendApi.getMetricsStatus(serviceId);
      setMetricsStatus(statusData.services || []);
      setError(null);
      return true;
    } catch (err) {
      console.warn('Backend metrics fetch failed:', err);
      return false;
    }
  }, [serviceId]);

  const fetchFromSupabase = useCallback(async () => {
    try {
      const fromTime = new Date(Date.now() - hours * 60 * 60 * 1000).toISOString();
      
      let query = supabase
        .from('metrics')
        .select('*')
        .gte('recorded_at', fromTime)
        .order('recorded_at', { ascending: true });
      
      if (serviceId) {
        query = query.eq('service_id', serviceId);
      }
      
      const { data, error: supaError } = await query.limit(1000);
      
      if (supaError) throw supaError;
      setMetrics(data || []);
      setError(null);
    } catch (err) {
      console.error('Error fetching metrics:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch metrics');
    }
  }, [serviceId, hours]);

  const fetchMetrics = useCallback(async () => {
    setLoading(true);
    
    await backendApi.waitForCheck();
    
    if (backendApi.isBackendAvailable()) {
      const success = await fetchFromBackend();
      if (success) {
        setUseBackend(true);
        setLoading(false);
        return;
      }
    }
    
    setUseBackend(false);
    await fetchFromSupabase();
    setLoading(false);
  }, [fetchFromBackend, fetchFromSupabase]);

  useEffect(() => {
    fetchMetrics();
    const interval = setInterval(fetchMetrics, 30000);
    return () => clearInterval(interval);
  }, [fetchMetrics]);

  const addMetric = async (metric: {
    service_id?: string;
    metric_name: string;
    value: number;
    unit?: string;
  }) => {
    const { data, error } = await supabase
      .from('metrics')
      .insert([metric])
      .select()
      .single();
    
    if (error) throw error;
    return data;
  };

  const getMetricSeries = (metricName: string): MetricSeries => {
    const filtered = metrics.filter(m => m.metric_name === metricName);
    return {
      name: metricName,
      data: filtered.map(m => ({
        timestamp: new Date(m.recorded_at),
        value: Number(m.value)
      })),
      unit: filtered[0]?.unit || undefined
    };
  };

  const queryPrometheus = async (query: string) => {
    if (backendApi.isBackendAvailable()) {
      return backendApi.queryPrometheus(query);
    }
    throw new Error('Backend not available for Prometheus queries');
  };

  const queryPrometheusRange = async (query: string, start: string, end: string, step = '1m') => {
    if (backendApi.isBackendAvailable()) {
      return backendApi.queryPrometheusRange(query, start, end, step);
    }
    throw new Error('Backend not available for Prometheus queries');
  };

  return { 
    metrics, 
    metricsStatus,
    loading, 
    error, 
    addMetric, 
    getMetricSeries,
    queryPrometheus,
    queryPrometheusRange,
    refetch: fetchMetrics,
    isUsingBackend: useBackend
  };
}
