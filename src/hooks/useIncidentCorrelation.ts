import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { backendApi } from '@/lib/backendApi';

interface IncidentCorrelation {
  metrics: Record<string, unknown>;
  logs: Array<{
    timestamp: string;
    level: string;
    message: string;
  }>;
  potentialCauses: Array<{
    type: string;
    cause: string;
    description: string;
    confidence: number;
  }>;
}

export function useIncidentCorrelation(incidentId?: string) {
  const [correlation, setCorrelation] = useState<IncidentCorrelation | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchCorrelation = useCallback(async () => {
    if (!incidentId) return;

    setLoading(true);
    try {
      if (backendApi.isBackendAvailable()) {
        const data = await backendApi.correlateIncident(incidentId);
        setCorrelation({
          metrics: data.metrics,
          logs: data.logs as Array<{ timestamp: string; level: string; message: string }>,
          potentialCauses: data.potential_causes.map(c => ({
            ...c,
            description: c.cause,
          })),
        });
      } else {
        // Fallback: get logs around incident time
        const { data: incident } = await supabase
          .from('incidents')
          .select('*, services(id)')
          .eq('id', incidentId)
          .single();

        if (incident) {
          const startTime = new Date(new Date(incident.started_at).getTime() - 30 * 60 * 1000);
          const endTime = incident.resolved_at 
            ? new Date(new Date(incident.resolved_at).getTime() + 15 * 60 * 1000)
            : new Date();

          const { data: logs } = await supabase
            .from('logs')
            .select('*')
            .eq('service_id', incident.service_id)
            .gte('created_at', startTime.toISOString())
            .lte('created_at', endTime.toISOString())
            .in('level', ['error', 'warn'])
            .order('created_at', { ascending: false })
            .limit(50);

          setCorrelation({
            metrics: {},
            logs: (logs || []).map(l => ({
              timestamp: l.created_at || '',
              level: l.level,
              message: l.message,
            })),
            potentialCauses: analyzeLogs(logs || []),
          });
        }
      }
      setError(null);
    } catch (err) {
      console.error('Error fetching correlation:', err);
      setError(err instanceof Error ? err.message : 'Failed to correlate');
    } finally {
      setLoading(false);
    }
  }, [incidentId]);

  useEffect(() => {
    if (incidentId) {
      fetchCorrelation();
    }
  }, [incidentId, fetchCorrelation]);

  return { correlation, loading, error, refetch: fetchCorrelation };
}

function analyzeLogs(logs: Array<{ message: string; level: string }>): IncidentCorrelation['potentialCauses'] {
  const patterns = {
    database: ['connection', 'timeout', 'deadlock', 'transaction'],
    memory: ['out of memory', 'oom', 'heap', 'gc overhead'],
    dependency: ['upstream', 'downstream', 'connection refused', 'circuit breaker'],
    timeout: ['timeout', 'timed out', 'deadline exceeded'],
  };

  const counts: Record<string, number> = {};
  
  logs.forEach(log => {
    const msg = log.message.toLowerCase();
    Object.entries(patterns).forEach(([key, keywords]) => {
      if (keywords.some(k => msg.includes(k))) {
        counts[key] = (counts[key] || 0) + 1;
      }
    });
  });

  return Object.entries(counts)
    .filter(([, count]) => count >= 2)
    .map(([type, count]) => ({
      type: 'log_pattern',
      cause: `${type.charAt(0).toUpperCase() + type.slice(1)} related errors`,
      description: `Found ${count} log entries with ${type} related errors`,
      confidence: Math.min(75, 30 + count * 5),
    }))
    .sort((a, b) => b.confidence - a.confidence);
}
