import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { RealtimeChannel } from '@supabase/supabase-js';

interface Incident {
  id: string;
  incident_number: string;
  title: string;
  description: string | null;
  severity: string;
  status: string;
  service_id: string | null;
  triggered_by: string | null;
  started_at: string;
  acknowledged_at: string | null;
  resolved_at: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
  services?: {
    name: string;
  } | null;
}

interface IncidentEvent {
  id: string;
  incident_id: string;
  event_type: string;
  message: string;
  author_id: string | null;
  created_at: string;
}

export function useIncidents() {
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let channel: RealtimeChannel;

    const fetchIncidents = async () => {
      try {
        const { data, error } = await supabase
          .from('incidents')
          .select('*, services(name)')
          .order('started_at', { ascending: false });
        
        if (error) throw error;
        setIncidents(data || []);
      } catch (err) {
        console.error('Error fetching incidents:', err);
        setError(err instanceof Error ? err.message : 'Failed to fetch incidents');
      } finally {
        setLoading(false);
      }
    };

    fetchIncidents();

    channel = supabase
      .channel('incidents-realtime')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'incidents' },
        (payload) => {
          console.log('Incidents realtime update:', payload);
          fetchIncidents(); // Refetch to get joined data
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const createIncident = async (incident: {
    title: string;
    description?: string;
    severity: string;
    service_id?: string;
    triggered_by?: string;
  }) => {
    const incidentNumber = `INC-${Date.now().toString(36).toUpperCase()}`;
    
    const { data, error } = await supabase
      .from('incidents')
      .insert([{ 
        ...incident, 
        incident_number: incidentNumber,
        status: 'open'
      }])
      .select()
      .single();
    
    if (error) throw error;

    // Create initial event
    await supabase.from('incident_events').insert([{
      incident_id: data.id,
      event_type: 'triggered',
      message: `Incident triggered: ${incident.title}`
    }]);

    return data;
  };

  const acknowledgeIncident = async (id: string) => {
    const { data, error } = await supabase
      .from('incidents')
      .update({ 
        status: 'ongoing',
        acknowledged_at: new Date().toISOString()
      })
      .eq('id', id)
      .select()
      .single();
    
    if (error) throw error;

    await supabase.from('incident_events').insert([{
      incident_id: id,
      event_type: 'acknowledged',
      message: 'Incident acknowledged'
    }]);

    return data;
  };

  const resolveIncident = async (id: string) => {
    const { data, error } = await supabase
      .from('incidents')
      .update({ 
        status: 'resolved',
        resolved_at: new Date().toISOString()
      })
      .eq('id', id)
      .select()
      .single();
    
    if (error) throw error;

    await supabase.from('incident_events').insert([{
      incident_id: id,
      event_type: 'resolved',
      message: 'Incident resolved'
    }]);

    return data;
  };

  const getIncidentEvents = async (incidentId: string): Promise<IncidentEvent[]> => {
    const { data, error } = await supabase
      .from('incident_events')
      .select('*')
      .eq('incident_id', incidentId)
      .order('created_at', { ascending: true });
    
    if (error) throw error;
    return data || [];
  };

  return { 
    incidents, 
    loading, 
    error, 
    createIncident, 
    acknowledgeIncident, 
    resolveIncident,
    getIncidentEvents
  };
}
