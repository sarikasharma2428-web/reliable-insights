import { useEffect, useState, useCallback } from 'react';
import { backendApi } from '@/lib/backendApi';

interface BackendHealth {
  api: { status: string };
  database: { status: string; error?: string };
  prometheus: { status: string; error?: string };
  loki: { status: string; error?: string };
}

interface SystemHealth {
  overall: 'healthy' | 'degraded' | 'unhealthy' | 'unknown';
  backend: BackendHealth | null;
  timestamp: Date;
}

export function useSystemHealth() {
  const [health, setHealth] = useState<SystemHealth>({
    overall: 'unknown',
    backend: null,
    timestamp: new Date(),
  });
  const [loading, setLoading] = useState(true);

  const checkHealth = useCallback(async () => {
    try {
      if (backendApi.isBackendAvailable()) {
        const data = await backendApi.healthCheck();
        
        const allHealthy = ['api', 'database', 'prometheus', 'loki']
          .every(key => data.checks?.[key]?.status === 'healthy');
        
        const someHealthy = ['api', 'database', 'prometheus', 'loki']
          .some(key => data.checks?.[key]?.status === 'healthy');

        setHealth({
          overall: allHealthy ? 'healthy' : someHealthy ? 'degraded' : 'unhealthy',
          backend: data.checks,
          timestamp: new Date(),
        });
      } else {
        // Backend not available, but Supabase might be working
        setHealth({
          overall: 'degraded',
          backend: null,
          timestamp: new Date(),
        });
      }
    } catch (err) {
      console.error('Health check failed:', err);
      setHealth({
        overall: 'unhealthy',
        backend: null,
        timestamp: new Date(),
      });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    checkHealth();
    const interval = setInterval(checkHealth, 60000); // Check every minute
    return () => clearInterval(interval);
  }, [checkHealth]);

  return { health, loading, refetch: checkHealth };
}
