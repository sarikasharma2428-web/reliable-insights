import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { backendApi } from '@/lib/backendApi';
import type { RealtimeChannel } from '@supabase/supabase-js';

interface Service {
  id: string;
  name: string;
  description: string | null;
  status: string;
  uptime: number | null;
  latency_p50: number | null;
  latency_p99: number | null;
  error_rate: number | null;
  requests_per_second: number | null;
  cpu_usage: number | null;
  memory_usage: number | null;
  last_checked_at: string | null;
  created_at: string;
  updated_at: string;
}

export function useServices() {
  const [services, setServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [useBackend, setUseBackend] = useState(false);

  const fetchFromBackend = useCallback(async () => {
    try {
      const data = await backendApi.getServices();
      setServices(data as Service[]);
      setError(null);
      return true;
    } catch (err) {
      console.warn('Backend fetch failed, falling back to Supabase:', err);
      return false;
    }
  }, []);

  const fetchFromSupabase = useCallback(async () => {
    try {
      const { data, error: supaError } = await supabase
        .from('services')
        .select('*')
        .order('name');
      
      if (supaError) throw supaError;
      setServices(data || []);
      setError(null);
    } catch (err) {
      console.error('Error fetching services:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch services');
    }
  }, []);

  const fetchServices = useCallback(async () => {
    setLoading(true);
    
    // Check if backend is available
    await backendApi.waitForCheck();
    
    if (backendApi.isBackendAvailable()) {
      const success = await fetchFromBackend();
      if (success) {
        setUseBackend(true);
        setLoading(false);
        return;
      }
    }
    
    // Fallback to Supabase
    setUseBackend(false);
    await fetchFromSupabase();
    setLoading(false);
  }, [fetchFromBackend, fetchFromSupabase]);

  useEffect(() => {
    let channel: RealtimeChannel | null = null;

    fetchServices();

    // Set up real-time subscription (Supabase)
    channel = supabase
      .channel('services-realtime')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'services' },
        (payload) => {
          console.log('Services realtime update:', payload);
          if (payload.eventType === 'INSERT') {
            setServices(prev => [...prev, payload.new as Service]);
          } else if (payload.eventType === 'UPDATE') {
            setServices(prev => prev.map(s => 
              s.id === (payload.new as Service).id ? payload.new as Service : s
            ));
          } else if (payload.eventType === 'DELETE') {
            setServices(prev => prev.filter(s => s.id !== (payload.old as Service).id));
          }
        }
      )
      .subscribe();

    // Polling for backend data
    const pollInterval = useBackend ? setInterval(fetchServices, 30000) : null;

    return () => {
      if (channel) supabase.removeChannel(channel);
      if (pollInterval) clearInterval(pollInterval);
    };
  }, [fetchServices, useBackend]);

  const addService = async (service: { name: string; description?: string }) => {
    if (useBackend && backendApi.isBackendAvailable()) {
      const data = await backendApi.createService(service);
      await fetchServices();
      return data;
    }
    
    const { data, error } = await supabase
      .from('services')
      .insert([{ ...service, status: 'unknown' }])
      .select()
      .single();
    if (error) throw error;
    return data;
  };

  const updateService = async (id: string, updates: Partial<Service>) => {
    if (useBackend && backendApi.isBackendAvailable()) {
      const data = await backendApi.updateService(id, updates);
      await fetchServices();
      return data;
    }
    
    const { data, error } = await supabase
      .from('services')
      .update(updates)
      .eq('id', id)
      .select()
      .single();
    if (error) throw error;
    return data;
  };

  const deleteService = async (id: string) => {
    if (useBackend && backendApi.isBackendAvailable()) {
      await backendApi.deleteService(id);
      await fetchServices();
      return;
    }
    
    const { error } = await supabase.from('services').delete().eq('id', id);
    if (error) throw error;
  };

  return { 
    services, 
    loading, 
    error, 
    addService, 
    updateService, 
    deleteService,
    refetch: fetchServices,
    isUsingBackend: useBackend
  };
}
