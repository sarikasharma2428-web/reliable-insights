import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Wifi, WifiOff, Trash2, Pause, Play } from 'lucide-react';
import { useState } from 'react';

interface LogEntry {
  id?: string;
  level: string;
  message: string;
  trace_id?: string | null;
  created_at?: string;
  timestamp?: string;
  services?: {
    name: string;
  } | null;
  labels?: Record<string, string>;
}

interface LogViewerProps {
  logs: LogEntry[];
  maxHeight?: string;
  isStreaming?: boolean;
  isConnected?: boolean;
  onClear?: () => void;
  onToggleStream?: () => void;
}

const levelStyles: Record<string, string> = {
  error: 'text-terminal-error',
  warn: 'text-terminal-warning',
  warning: 'text-terminal-warning',
  info: 'text-terminal-info',
  debug: 'text-muted-foreground',
};

const levelBadgeStyles: Record<string, string> = {
  error: 'bg-status-critical/20 text-status-critical',
  warn: 'bg-status-warning/20 text-status-warning',
  warning: 'bg-status-warning/20 text-status-warning',
  info: 'bg-primary/20 text-primary',
  debug: 'bg-muted text-muted-foreground',
};

export function LogViewer({ 
  logs, 
  maxHeight = '500px', 
  isStreaming = false,
  isConnected = false,
  onClear,
  onToggleStream,
}: LogViewerProps) {
  const [isPaused, setIsPaused] = useState(false);
  const displayLogs = isPaused ? logs.slice(0, 50) : logs;

  return (
    <div 
      className="bg-terminal rounded-md border border-border overflow-hidden"
      style={{ maxHeight }}
    >
      <div className="flex items-center justify-between px-4 py-2 border-b border-border bg-secondary/30">
        <div className="flex items-center gap-3">
          <span className="text-xs text-muted-foreground font-mono">
            {logs.length} log entries
          </span>
          {isStreaming && (
            <Badge variant="outline" className={cn(
              'gap-1 text-[10px]',
              isConnected ? 'text-status-healthy border-status-healthy/30' : 'text-muted-foreground'
            )}>
              {isConnected ? (
                <><Wifi className="h-2.5 w-2.5" /> STREAMING</>
              ) : (
                <><WifiOff className="h-2.5 w-2.5" /> DISCONNECTED</>
              )}
            </Badge>
          )}
        </div>
        <div className="flex items-center gap-2">
          {isStreaming && onToggleStream && (
            <Button
              variant="ghost"
              size="sm"
              className="h-6 px-2 text-xs"
              onClick={() => {
                setIsPaused(!isPaused);
              }}
            >
              {isPaused ? (
                <><Play className="h-3 w-3 mr-1" /> Resume</>
              ) : (
                <><Pause className="h-3 w-3 mr-1" /> Pause</>
              )}
            </Button>
          )}
          {onClear && (
            <Button
              variant="ghost"
              size="sm"
              className="h-6 px-2 text-xs"
              onClick={onClear}
            >
              <Trash2 className="h-3 w-3 mr-1" /> Clear
            </Button>
          )}
          <span className="text-xs text-muted-foreground">
            {format(new Date(), 'HH:mm:ss')}
          </span>
        </div>
      </div>
      
      <div className="overflow-auto scrollbar-thin" style={{ maxHeight: `calc(${maxHeight} - 40px)` }}>
        {displayLogs.length > 0 ? (
          displayLogs.map((log, idx) => {
            const timestamp = log.created_at || log.timestamp;
            const serviceName = log.services?.name || log.labels?.service || 'system';
            
            return (
              <div
                key={log.id || idx}
                className={cn(
                  'flex gap-3 px-4 py-2 border-b border-border/50 hover:bg-secondary/20 font-mono text-xs',
                  levelStyles[log.level] || levelStyles.info
                )}
              >
                <span className="text-muted-foreground shrink-0">
                  {timestamp ? format(new Date(timestamp), 'HH:mm:ss.SSS') : '--:--:--.---'}
                </span>
                <span className={cn(
                  'shrink-0 px-1.5 py-0.5 rounded text-[10px] uppercase',
                  levelBadgeStyles[log.level] || levelBadgeStyles.info
                )}>
                  {log.level}
                </span>
                <span className="text-primary shrink-0">[{serviceName}]</span>
                <span className="text-foreground break-all">{log.message}</span>
                {log.trace_id && (
                  <span className="text-muted-foreground ml-auto shrink-0">
                    trace: {log.trace_id}
                  </span>
                )}
              </div>
            );
          })
        ) : (
          <div className="p-8 text-center text-muted-foreground">
            <p>No logs available</p>
            {isStreaming && !isConnected && (
              <p className="text-xs mt-1">Waiting for connection...</p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
