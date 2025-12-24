import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { backendApi } from '@/lib/backendApi';
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

export function useAlerts(options?: {
  severity?: string;
  acknowledged?: boolean;
  serviceId?: string;
}) {
  const { severity, acknowledged, serviceId } = options || {};
  
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [useBackend, setUseBackend] = useState(false);

  const fetchFromBackend = useCallback(async () => {
    try {
      const data = await backendApi.getAlerts({
        severity,
        acknowledged,
        service_id: serviceId
      });
      
      // Transform to match Alert interface
      const transformedAlerts: Alert[] = data.map(alert => ({
        ...alert,
        created_at: alert.fired_at,
        services: null
      }));
      
      setAlerts(transformedAlerts);
      setError(null);
      return true;
    } catch (err) {
      console.warn('Backend alerts fetch failed:', err);
      return false;
    }
  }, [severity, acknowledged, serviceId]);

  const fetchFromSupabase = useCallback(async () => {
    try {
      let query = supabase
        .from('alerts')
        .select('*, services(name)')
        .order('fired_at', { ascending: false });
      
      if (severity) {
        query = query.eq('severity', severity);
      }
      
      if (acknowledged !== undefined) {
        if (acknowledged) {
          query = query.not('acknowledged_at', 'is', null);
        } else {
          query = query.is('acknowledged_at', null);
        }
      }
      
      if (serviceId) {
        query = query.eq('service_id', serviceId);
      }
      
      const { data, error: supaError } = await query;
      
      if (supaError) throw supaError;
      setAlerts(data || []);
      setError(null);
    } catch (err) {
      console.error('Error fetching alerts:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch alerts');
    }
  }, [severity, acknowledged, serviceId]);

  const fetchAlerts = useCallback(async () => {
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

    fetchAlerts();

    channel = supabase
      .channel('alerts-realtime')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'alerts' },
        () => {
          fetchAlerts();
        }
      )
      .subscribe();

    // Poll more frequently for alerts
    const pollInterval = setInterval(fetchAlerts, 15000);

    return () => {
      if (channel) supabase.removeChannel(channel);
      clearInterval(pollInterval);
    };
  }, [fetchAlerts]);

  const sendAlertEmail = async (alert: {
    name: string;
    severity: string;
    service_id?: string;
    message: string;
    metric_name: string;
    threshold: number;
    current_value: number;
    fired_at: string;
    serviceName?: string;
  }) => {
    try {
      const { data, error } = await supabase.functions.invoke('send-alert-email', {
        body: {
          alertName: alert.name,
          severity: alert.severity,
          serviceName: alert.serviceName || 'Unknown Service',
          message: alert.message,
          metricName: alert.metric_name,
          threshold: alert.threshold,
          currentValue: alert.current_value,
          firedAt: alert.fired_at
        }
      });
      
      if (error) {
        console.error('Failed to send alert email:', error);
      } else {
        console.log('Alert email sent successfully:', data);
      }
    } catch (err) {
      console.error('Error invoking email function:', err);
    }
  };

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
      .select('*, services(name)')
      .single();
    
    if (error) throw error;
    
    // Send email notification for critical and warning alerts
    if (data && (alert.severity === 'critical' || alert.severity === 'warning')) {
      await sendAlertEmail({
        ...alert,
        fired_at: data.fired_at || new Date().toISOString(),
        serviceName: data.services?.name
      });
    }
    
    return data;
  };

  const acknowledgeAlert = async (id: string) => {
    if (useBackend && backendApi.isBackendAvailable()) {
      await backendApi.acknowledgeAlert(id);
      await fetchAlerts();
      return;
    }
    
    const { error } = await supabase
      .from('alerts')
      .update({ acknowledged_at: new Date().toISOString() })
      .eq('id', id);
    
    if (error) throw error;
  };

  const silenceAlert = async (id: string, durationMinutes: number) => {
    if (useBackend && backendApi.isBackendAvailable()) {
      await backendApi.silenceAlert(id, durationMinutes);
      await fetchAlerts();
      return;
    }
    
    const silencedUntil = new Date(Date.now() + durationMinutes * 60 * 1000).toISOString();
    const { error } = await supabase
      .from('alerts')
      .update({ silenced_until: silencedUntil })
      .eq('id', id);
    
    if (error) throw error;
  };

  // Stats helpers
  const activeAlerts = alerts.filter(a => !a.acknowledged_at && (!a.silenced_until || new Date(a.silenced_until) < new Date()));
  const criticalCount = activeAlerts.filter(a => a.severity === 'critical').length;
  const warningCount = activeAlerts.filter(a => a.severity === 'warning').length;

  return { 
    alerts, 
    loading, 
    error, 
    createAlert, 
    acknowledgeAlert, 
    silenceAlert,
    activeAlerts,
    criticalCount,
    warningCount,
    refetch: fetchAlerts,
    isUsingBackend: useBackend
  };
}
