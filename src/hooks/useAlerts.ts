import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { RealtimeChannel } from '@supabase/supabase-js';

interface Alert {
  id: string;
  name: string;
  severity: string;
  service_id: string | null;
  message: string;
  metric_name: string;
  threshold: number;
  current_value: number;
  fired_at: string;
  acknowledged_at: string | null;
  silenced_until: string | null;
  created_at: string;
  services?: {
    name: string;
  } | null;
}

export function useAlerts() {
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let channel: RealtimeChannel;

    const fetchAlerts = async () => {
      try {
        const { data, error } = await supabase
          .from('alerts')
          .select('*, services(name)')
          .order('fired_at', { ascending: false });
        
        if (error) throw error;
        setAlerts(data || []);
      } catch (err) {
        console.error('Error fetching alerts:', err);
        setError(err instanceof Error ? err.message : 'Failed to fetch alerts');
      } finally {
        setLoading(false);
      }
    };

    fetchAlerts();

    channel = supabase
      .channel('alerts-realtime')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'alerts' },
        (payload) => {
          console.log('Alerts realtime update:', payload);
          fetchAlerts();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const createAlert = async (alert: {
    name: string;
    severity: string;
    service_id?: string;
    message: string;
    metric_name: string;
    threshold: number;
    current_value: number;
  }) => {
    const { data, error } = await supabase
      .from('alerts')
      .insert([alert])
      .select()
      .single();
    
    if (error) throw error;
    return data;
  };

  const acknowledgeAlert = async (id: string) => {
    const { error } = await supabase
      .from('alerts')
      .update({ acknowledged_at: new Date().toISOString() })
      .eq('id', id);
    
    if (error) throw error;
  };

  const silenceAlert = async (id: string, durationMinutes: number) => {
    const silencedUntil = new Date(Date.now() + durationMinutes * 60 * 1000).toISOString();
    const { error } = await supabase
      .from('alerts')
      .update({ silenced_until: silencedUntil })
      .eq('id', id);
    
    if (error) throw error;
  };

  return { alerts, loading, error, createAlert, acknowledgeAlert, silenceAlert };
}
