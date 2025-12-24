import { cn } from '@/lib/utils';
import { format } from 'date-fns';

interface LogEntry {
  id: string;
  level: string;
  message: string;
  trace_id: string | null;
  created_at: string;
  services?: {
    name: string;
  } | null;
}

interface LogViewerProps {
  logs: LogEntry[];
  maxHeight?: string;
}

const levelStyles: Record<string, string> = {
  error: 'text-terminal-error',
  warn: 'text-terminal-warning',
  info: 'text-terminal-info',
  debug: 'text-muted-foreground',
};

const levelBadgeStyles: Record<string, string> = {
  error: 'bg-status-critical/20 text-status-critical',
  warn: 'bg-status-warning/20 text-status-warning',
  info: 'bg-primary/20 text-primary',
  debug: 'bg-muted text-muted-foreground',
};

export function LogViewer({ logs, maxHeight = '500px' }: LogViewerProps) {
  return (
    <div 
      className="bg-terminal rounded-md border border-border overflow-hidden"
      style={{ maxHeight }}
    >
      <div className="flex items-center justify-between px-4 py-2 border-b border-border bg-secondary/30">
        <span className="text-xs text-muted-foreground font-mono">
          {logs.length} log entries
        </span>
        <span className="text-xs text-muted-foreground">
          Last updated: {format(new Date(), 'HH:mm:ss')}
        </span>
      </div>
      
      <div className="overflow-auto scrollbar-thin" style={{ maxHeight: `calc(${maxHeight} - 40px)` }}>
        {logs.length > 0 ? (
          logs.map((log) => (
            <div
              key={log.id}
              className={cn(
                'flex gap-3 px-4 py-2 border-b border-border/50 hover:bg-secondary/20 font-mono text-xs',
                levelStyles[log.level] || levelStyles.info
              )}
            >
              <span className="text-muted-foreground shrink-0">
                {format(new Date(log.created_at), 'HH:mm:ss.SSS')}
              </span>
              <span className={cn(
                'shrink-0 px-1.5 py-0.5 rounded text-[10px] uppercase',
                levelBadgeStyles[log.level] || levelBadgeStyles.info
              )}>
                {log.level}
              </span>
              <span className="text-primary shrink-0">[{log.services?.name || 'system'}]</span>
              <span className="text-foreground break-all">{log.message}</span>
              {log.trace_id && (
                <span className="text-muted-foreground ml-auto shrink-0">
                  trace: {log.trace_id}
                </span>
              )}
            </div>
          ))
        ) : (
          <div className="p-8 text-center text-muted-foreground">
            <p>No logs available</p>
          </div>
        )}
      </div>
    </div>
  );
}
