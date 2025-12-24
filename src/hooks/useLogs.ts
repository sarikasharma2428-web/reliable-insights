import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { RealtimeChannel } from '@supabase/supabase-js';
import type { Json } from '@/integrations/supabase/types';

interface LogEntry {
  id: string;
  service_id: string | null;
  level: string;
  message: string;
  metadata: Json | null;
  trace_id: string | null;
  created_at: string;
  services?: {
    name: string;
  } | null;
}

export function useLogs(limit = 100) {
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let channel: RealtimeChannel;

    const fetchLogs = async () => {
      try {
        const { data, error } = await supabase
          .from('logs')
          .select('*, services(name)')
          .order('created_at', { ascending: false })
          .limit(limit);
        
        if (error) throw error;
        setLogs(data || []);
      } catch (err) {
        console.error('Error fetching logs:', err);
        setError(err instanceof Error ? err.message : 'Failed to fetch logs');
      } finally {
        setLoading(false);
      }
    };

    fetchLogs();

    channel = supabase
      .channel('logs-realtime')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'logs' },
        () => {
          fetchLogs();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [limit]);

  const addLog = async (log: {
    service_id?: string;
    level: string;
    message: string;
    metadata?: Json;
    trace_id?: string;
  }) => {
    const { data, error } = await supabase
      .from('logs')
      .insert([log])
      .select()
      .single();
    
    if (error) throw error;
    return data;
  };

  return { logs, loading, error, addLog };
}
