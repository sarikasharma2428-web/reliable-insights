import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { backendApi } from '@/lib/backendApi';
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

interface IncidentCorrelation {
  incident_id: string;
  incident_number: string;
  window: { start: string; end: string };
  metrics: Record<string, unknown>;
  logs: Array<{
    timestamp: string;
    level: string;
    message: string;
  }>;
  potential_causes: Array<{
    type: string;
    cause: string;
    description: string;
    confidence: number;
  }>;
}

export function useIncidents(options?: {
  status?: string;
  severity?: string;
  serviceId?: string;
}) {
  const { status, severity, serviceId } = options || {};
  
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [useBackend, setUseBackend] = useState(false);

  const fetchFromBackend = useCallback(async () => {
    try {
      const data = await backendApi.getIncidents({
        status,
        severity,
        service_id: serviceId
      });
      
      // Transform to match Incident interface
      const transformedIncidents: Incident[] = data.map(inc => ({
        ...inc,
        created_by: null,
        services: null
      }));
      
      setIncidents(transformedIncidents);
      setError(null);
      return true;
    } catch (err) {
      console.warn('Backend incidents fetch failed:', err);
      return false;
    }
  }, [status, severity, serviceId]);

  const fetchFromSupabase = useCallback(async () => {
    try {
      let query = supabase
        .from('incidents')
        .select('*, services(name)')
        .order('started_at', { ascending: false });
      
      if (status) {
        query = query.eq('status', status);
      }
      
      if (severity) {
        query = query.eq('severity', severity);
      }
      
      if (serviceId) {
        query = query.eq('service_id', serviceId);
      }
      
      const { data, error: supaError } = await query;
      
      if (supaError) throw supaError;
      setIncidents(data || []);
      setError(null);
    } catch (err) {
      console.error('Error fetching incidents:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch incidents');
    }
  }, [status, severity, serviceId]);

  const fetchIncidents = useCallback(async () => {
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
    let channel: RealtimeChannel | null = null;

    fetchIncidents();

    channel = supabase
      .channel('incidents-realtime')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'incidents' },
        () => {
          fetchIncidents();
        }
      )
      .subscribe();

    return () => {
      if (channel) supabase.removeChannel(channel);
    };
  }, [fetchIncidents]);

  const createIncident = async (incident: {
    title: string;
    description?: string;
    severity: string;
    service_id?: string;
    triggered_by?: string;
  }) => {
    if (useBackend && backendApi.isBackendAvailable()) {
      const data = await backendApi.createIncident(incident);
      await fetchIncidents();
      return data;
    }
    
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

    await supabase.from('incident_events').insert([{
      incident_id: data.id,
      event_type: 'triggered',
      message: `Incident triggered: ${incident.title}`
    }]);

    return data;
  };

  const acknowledgeIncident = async (id: string) => {
    if (useBackend && backendApi.isBackendAvailable()) {
      const data = await backendApi.acknowledgeIncident(id);
      await fetchIncidents();
      return data;
    }
    
    const { data, error } = await supabase
      .from('incidents')
      .update({ 
        status: 'acknowledged',
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

  const resolveIncident = async (id: string, resolution_note?: string) => {
    if (useBackend && backendApi.isBackendAvailable()) {
      const data = await backendApi.resolveIncident(id, resolution_note);
      await fetchIncidents();
      return data;
    }
    
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
      message: resolution_note || 'Incident resolved'
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

  const correlateIncident = async (incidentId: string): Promise<IncidentCorrelation | null> => {
    if (backendApi.isBackendAvailable()) {
      return backendApi.correlateIncident(incidentId);
    }
    return null;
  };

  return { 
    incidents, 
    loading, 
    error, 
    createIncident, 
    acknowledgeIncident, 
    resolveIncident,
    getIncidentEvents,
    correlateIncident,
    refetch: fetchIncidents,
    isUsingBackend: useBackend
  };
}
