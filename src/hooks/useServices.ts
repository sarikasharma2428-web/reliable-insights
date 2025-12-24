import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { RealtimeChannel } from '@supabase/supabase-js';

interface Service {
  id: string;
  name: string;
  description: string | null;
  status: string;
  uptime: number;
  latency_p50: number;
  latency_p99: number;
  error_rate: number;
  requests_per_second: number;
  cpu_usage: number;
  memory_usage: number;
  last_checked_at: string;
  created_at: string;
  updated_at: string;
}

export function useServices() {
  const [services, setServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let channel: RealtimeChannel;

    const fetchServices = async () => {
      try {
        const { data, error } = await supabase
          .from('services')
          .select('*')
          .order('name');
        
        if (error) throw error;
        setServices(data || []);
      } catch (err) {
        console.error('Error fetching services:', err);
        setError(err instanceof Error ? err.message : 'Failed to fetch services');
      } finally {
        setLoading(false);
      }
    };

    fetchServices();

    // Set up real-time subscription
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

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const addService = async (service: Omit<Service, 'id' | 'created_at' | 'updated_at' | 'last_checked_at'>) => {
    const { data, error } = await supabase.from('services').insert([service]).select().single();
    if (error) throw error;
    return data;
  };

  const updateService = async (id: string, updates: Partial<Service>) => {
    const { data, error } = await supabase.from('services').update(updates).eq('id', id).select().single();
    if (error) throw error;
    return data;
  };

  const deleteService = async (id: string) => {
    const { error } = await supabase.from('services').delete().eq('id', id);
    if (error) throw error;
  };

  return { services, loading, error, addService, updateService, deleteService };
}
