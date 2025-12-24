import { useEffect, useRef, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export const useRealtimeSimulation = (enabled: boolean = true, intervalMs: number = 5000) => {
  const { toast } = useToast();
  const [isRunning, setIsRunning] = useState(false);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);
  const [stats, setStats] = useState<{
    servicesUpdated: number;
    metricsRecorded: number;
    alertsCreated: number;
    incidentsCreated: number;
  } | null>(null);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  const runSimulation = async () => {
    try {
      const response = await supabase.functions.invoke('simulate-metrics');
      
      if (response.error) {
        console.error('Simulation error:', response.error);
        return;
      }

      const data = response.data;
      setLastUpdate(new Date());
      setStats({
        servicesUpdated: data.servicesUpdated || 0,
        metricsRecorded: data.metricsRecorded || 0,
        alertsCreated: data.alertsCreated || 0,
        incidentsCreated: data.incidentsCreated || 0,
      });

      // Show toast for new incidents
      if (data.incidentsCreated > 0) {
        toast({
          title: "🚨 New Incident Detected",
          description: `${data.incidentsCreated} new incident(s) auto-detected`,
          variant: "destructive",
        });
      }

      // Show toast for new alerts
      if (data.alertsCreated > 0 && data.incidentsCreated === 0) {
        toast({
          title: "⚠️ New Alert",
          description: `${data.alertsCreated} new alert(s) fired`,
        });
      }

    } catch (error) {
      console.error('Failed to run simulation:', error);
    }
  };

  const runHealthCheck = async () => {
    try {
      const response = await supabase.functions.invoke('health-check');
      if (response.error) {
        console.error('Health check error:', response.error);
      }
    } catch (error) {
      console.error('Failed to run health check:', error);
    }
  };

  const startSimulation = () => {
    if (intervalRef.current) return;
    
    setIsRunning(true);
    
    // Run immediately
    runSimulation();
    runHealthCheck();
    
    // Then run at interval
    intervalRef.current = setInterval(() => {
      runSimulation();
      // Run health check every other cycle
      if (Math.random() > 0.5) {
        runHealthCheck();
      }
    }, intervalMs);
  };

  const stopSimulation = () => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    setIsRunning(false);
  };

  useEffect(() => {
    if (enabled) {
      startSimulation();
    } else {
      stopSimulation();
    }

    return () => {
      stopSimulation();
    };
  }, [enabled, intervalMs]);

  return {
    isRunning,
    lastUpdate,
    stats,
    startSimulation,
    stopSimulation,
    runSimulation,
    runHealthCheck,
  };
};
