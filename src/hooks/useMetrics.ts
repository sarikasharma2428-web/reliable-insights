import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';

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

export function useMetrics(serviceId?: string, hours = 24) {
  const [metrics, setMetrics] = useState<Metric[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchMetrics = async () => {
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
        
        const { data, error } = await query.limit(1000);
        
        if (error) throw error;
        setMetrics(data || []);
      } catch (err) {
        console.error('Error fetching metrics:', err);
        setError(err instanceof Error ? err.message : 'Failed to fetch metrics');
      } finally {
        setLoading(false);
      }
    };

    fetchMetrics();
    const interval = setInterval(fetchMetrics, 30000); // Refresh every 30s

    return () => clearInterval(interval);
  }, [serviceId, hours]);

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

  return { metrics, loading, error, addMetric, getMetricSeries };
}
