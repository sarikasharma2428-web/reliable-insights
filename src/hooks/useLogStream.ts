import { useEffect, useState, useRef, useCallback } from 'react';

interface StreamingLog {
  timestamp: string;
  level: string;
  message: string;
  labels?: Record<string, string>;
}

interface UseLogStreamOptions {
  serviceId?: string;
  level?: string;
  maxLogs?: number;
}

export function useLogStream(options: UseLogStreamOptions = {}) {
  const { serviceId, level, maxLogs = 100 } = options;
  const [logs, setLogs] = useState<StreamingLog[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout>();

  const connect = useCallback(() => {
    const backendUrl = import.meta.env.VITE_BACKEND_URL || 'http://localhost:8000';
    const wsUrl = backendUrl.replace('http://', 'ws://').replace('https://', 'wss://');
    
    let url = `${wsUrl}/api/v1/logs/stream`;
    const params = new URLSearchParams();
    if (serviceId) params.append('service_id', serviceId);
    if (level) params.append('level', level);
    if (params.toString()) url += `?${params.toString()}`;

    try {
      const ws = new WebSocket(url);
      wsRef.current = ws;

      ws.onopen = () => {
        console.log('Log stream connected');
        setIsConnected(true);
        setError(null);
      };

      ws.onmessage = (event) => {
        try {
          const log = JSON.parse(event.data) as StreamingLog;
          setLogs(prev => {
            const updated = [log, ...prev];
            return updated.slice(0, maxLogs);
          });
        } catch (e) {
          console.error('Failed to parse log:', e);
        }
      };

      ws.onerror = (e) => {
        console.error('WebSocket error:', e);
        setError('Connection error');
      };

      ws.onclose = () => {
        setIsConnected(false);
        // Attempt reconnect after 5 seconds
        reconnectTimeoutRef.current = setTimeout(() => {
          if (wsRef.current?.readyState === WebSocket.CLOSED) {
            connect();
          }
        }, 5000);
      };
    } catch (e) {
      console.error('Failed to connect:', e);
      setError('Failed to connect to log stream');
    }
  }, [serviceId, level, maxLogs]);

  const disconnect = useCallback(() => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
    }
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }
    setIsConnected(false);
  }, []);

  const clearLogs = useCallback(() => {
    setLogs([]);
  }, []);

  useEffect(() => {
    // Only attempt WebSocket if backend URL is configured
    const backendUrl = import.meta.env.VITE_BACKEND_URL;
    if (backendUrl) {
      connect();
    }

    return () => {
      disconnect();
    };
  }, [connect, disconnect]);

  return {
    logs,
    isConnected,
    error,
    connect,
    disconnect,
    clearLogs,
  };
}
