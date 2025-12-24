import { cn } from '@/lib/utils';
import type { ServiceStatus, IncidentSeverity, AlertSeverity, IncidentStatus } from '@/types/sre';

interface StatusBadgeProps {
  status: ServiceStatus | IncidentSeverity | AlertSeverity | IncidentStatus;
  size?: 'sm' | 'md';
  showDot?: boolean;
}

const statusStyles: Record<string, { bg: string; text: string; dot: string }> = {
  // Service status
  healthy: { bg: 'bg-status-healthy/10', text: 'text-status-healthy', dot: 'bg-status-healthy' },
  degraded: { bg: 'bg-status-warning/10', text: 'text-status-warning', dot: 'bg-status-warning' },
  critical: { bg: 'bg-status-critical/10', text: 'text-status-critical', dot: 'bg-status-critical' },
  unknown: { bg: 'bg-status-unknown/10', text: 'text-status-unknown', dot: 'bg-status-unknown' },
  
  // Incident status
  open: { bg: 'bg-status-critical/10', text: 'text-status-critical', dot: 'bg-status-critical' },
  ongoing: { bg: 'bg-status-warning/10', text: 'text-status-warning', dot: 'bg-status-warning' },
  resolved: { bg: 'bg-status-healthy/10', text: 'text-status-healthy', dot: 'bg-status-healthy' },
  
  // Severity
  high: { bg: 'bg-status-critical/10', text: 'text-status-critical', dot: 'bg-status-critical' },
  medium: { bg: 'bg-status-warning/10', text: 'text-status-warning', dot: 'bg-status-warning' },
  low: { bg: 'bg-muted', text: 'text-muted-foreground', dot: 'bg-muted-foreground' },
  warning: { bg: 'bg-status-warning/10', text: 'text-status-warning', dot: 'bg-status-warning' },
  info: { bg: 'bg-primary/10', text: 'text-primary', dot: 'bg-primary' },
};

export function StatusBadge({ status, size = 'sm', showDot = true }: StatusBadgeProps) {
  const style = statusStyles[status] || statusStyles.unknown;
  
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-md font-mono uppercase tracking-wider',
        style.bg,
        style.text,
        size === 'sm' ? 'px-2 py-0.5 text-[10px]' : 'px-2.5 py-1 text-xs'
      )}
    >
      {showDot && (
        <span className={cn('h-1.5 w-1.5 rounded-full', style.dot, status === 'ongoing' && 'animate-pulse')} />
      )}
      {status}
    </span>
  );
}
