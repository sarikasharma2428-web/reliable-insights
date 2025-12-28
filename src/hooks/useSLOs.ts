import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { RealtimeChannel } from '@supabase/supabase-js';

interface SLO {
  id: string;
  name: string;
  service_id: string | null;
  target_availability: number;
  current_availability: number;
  target_latency_p99: number | null;
  current_latency_p99: number | null;
  error_budget: number | null;
  error_budget_consumed: number | null;
  period: string | null;
  created_at: string;
  updated_at: string;
  services?: {
    name: string;
  } | null;
}

export function useSLOs() {
  const [slos, setSLOs] = useState<SLO[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchSLOs = useCallback(async () => {
    try {
      const { data, error: supaError } = await supabase
        .from('slos')
        .select('*, services(name)')
        .order('name');

      if (supaError) throw supaError;
      setSLOs(data || []);
      setError(null);
    } catch (err) {
      console.error('Error fetching SLOs:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch SLOs');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    let channel: RealtimeChannel | null = null;

    fetchSLOs();

    channel = supabase
      .channel('slos-realtime')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'slos' },
        () => {
          fetchSLOs();
        }
      )
      .subscribe();

    return () => {
      if (channel) supabase.removeChannel(channel);
    };
  }, [fetchSLOs]);

  const createSLO = async (slo: {
    name: string;
    service_id?: string;
    target_availability: number;
    target_latency_p99?: number;
    error_budget?: number;
    period?: string;
  }) => {
    const { data, error } = await supabase
      .from('slos')
      .insert([{
        ...slo,
        current_availability: 100,
        current_latency_p99: 0,
        error_budget_consumed: 0
      }])
      .select()
      .single();

    if (error) throw error;
    return data;
  };

  const updateSLO = async (id: string, updates: Partial<SLO>) => {
    const { data, error } = await supabase
      .from('slos')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data;
  };

  const deleteSLO = async (id: string) => {
    const { error } = await supabase.from('slos').delete().eq('id', id);
    if (error) throw error;
  };

  // Calculated stats
  const breachingCount = slos.filter(s => 
    s.current_availability < s.target_availability
  ).length;
  
  const budgetExhaustedCount = slos.filter(s => 
    s.error_budget_consumed && s.error_budget && 
    (s.error_budget_consumed / s.error_budget) >= 1
  ).length;

  return {
    slos,
    loading,
    error,
    createSLO,
    updateSLO,
    deleteSLO,
    refetch: fetchSLOs,
    breachingCount,
    budgetExhaustedCount
  };
}
