import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface SLOStatus {
  id: string;
  name: string;
  serviceId: string;
  serviceName?: string;
  targetAvailability: number;
  currentAvailability: number;
  targetLatency: number | null;
  currentLatency: number | null;
  errorBudget: number;
  errorBudgetConsumed: number;
  errorBudgetRemaining: number;
  status: 'healthy' | 'warning' | 'critical' | 'exhausted';
  isBreaching: boolean;
}

export function useSLOStatus() {
  const [slos, setSlos] = useState<SLOStatus[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchSLOs = useCallback(async () => {
    try {
      const { data, error: err } = await supabase
        .from('slos')
        .select('*, services(name)')
        .order('name');
      
      if (err) throw err;

      const sloStatuses: SLOStatus[] = (data || []).map(slo => {
        const target = Number(slo.target_availability) || 99.9;
        const current = Number(slo.current_availability) || 100;
        const errorBudgetTotal = 100 - target;
        const errorBudgetConsumed = Number(slo.error_budget_consumed) || (100 - current);
        const errorBudgetRemaining = Math.max(0, errorBudgetTotal - errorBudgetConsumed);
        const errorBudgetPercent = errorBudgetTotal > 0 
          ? (errorBudgetRemaining / errorBudgetTotal) * 100 
          : 100;

        let status: SLOStatus['status'] = 'healthy';
        if (errorBudgetPercent <= 0) status = 'exhausted';
        else if (errorBudgetPercent <= 20) status = 'critical';
        else if (errorBudgetPercent <= 50) status = 'warning';

        return {
          id: slo.id,
          name: slo.name,
          serviceId: slo.service_id || '',
          serviceName: slo.services?.name,
          targetAvailability: target,
          currentAvailability: current,
          targetLatency: slo.target_latency_p99,
          currentLatency: slo.current_latency_p99,
          errorBudget: errorBudgetTotal,
          errorBudgetConsumed,
          errorBudgetRemaining,
          status,
          isBreaching: current < target,
        };
      });

      setSlos(sloStatuses);
      setError(null);
    } catch (err) {
      console.error('Error fetching SLOs:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch SLOs');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSLOs();

    const channel = supabase
      .channel('slos-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'slos' }, () => {
        fetchSLOs();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchSLOs]);

  const summary = {
    total: slos.length,
    healthy: slos.filter(s => s.status === 'healthy').length,
    warning: slos.filter(s => s.status === 'warning').length,
    critical: slos.filter(s => s.status === 'critical').length,
    exhausted: slos.filter(s => s.status === 'exhausted').length,
    breaching: slos.filter(s => s.isBreaching).length,
  };

  return { slos, loading, error, summary, refetch: fetchSLOs };
}
