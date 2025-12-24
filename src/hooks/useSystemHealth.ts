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
        
        // Check the flat structure returned by healthCheck
        const dbHealthy = data.database === true;
        const promHealthy = data.prometheus === true;
        const lokiHealthy = data.loki === true;
        const allHealthy = dbHealthy && promHealthy && lokiHealthy;
        const someHealthy = dbHealthy || promHealthy || lokiHealthy;

        setHealth({
          overall: allHealthy ? 'healthy' : someHealthy ? 'degraded' : 'unhealthy',
          backend: {
            api: { status: 'healthy' },
            database: { status: dbHealthy ? 'healthy' : 'unhealthy' },
            prometheus: { status: promHealthy ? 'healthy' : 'unhealthy' },
            loki: { status: lokiHealthy ? 'healthy' : 'unhealthy' },
          },
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
