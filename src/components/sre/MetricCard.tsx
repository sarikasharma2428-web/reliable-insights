import { cn } from '@/lib/utils';
import { ArrowUp, ArrowDown, Minus } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

interface MetricCardProps {
  title: string;
  value: string | number;
  unit?: string;
  change?: number;
  changeLabel?: string;
  icon?: LucideIcon;
  variant?: 'default' | 'latency' | 'traffic' | 'errors' | 'saturation';
}

const variantStyles = {
  default: 'border-border',
  latency: 'border-metric-latency/30',
  traffic: 'border-metric-traffic/30',
  errors: 'border-metric-errors/30',
  saturation: 'border-metric-saturation/30',
};

const iconVariants = {
  default: 'text-primary',
  latency: 'text-metric-latency',
  traffic: 'text-metric-traffic',
  errors: 'text-metric-errors',
  saturation: 'text-metric-saturation',
};

export function MetricCard({ 
  title, 
  value, 
  unit, 
  change, 
  changeLabel,
  icon: Icon,
  variant = 'default' 
}: MetricCardProps) {
  const isPositiveChange = change !== undefined && change > 0;
  const isNegativeChange = change !== undefined && change < 0;
  const isNeutral = change === 0;

  return (
    <div className={cn(
      'metric-card flex flex-col gap-3',
      variantStyles[variant]
    )}>
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
          {title}
        </span>
        {Icon && <Icon className={cn('h-4 w-4', iconVariants[variant])} />}
      </div>
      
      <div className="flex items-baseline gap-1">
        <span className="text-2xl font-semibold font-mono tracking-tight">
          {typeof value === 'number' ? value.toLocaleString() : value}
        </span>
        {unit && (
          <span className="text-sm text-muted-foreground">{unit}</span>
        )}
      </div>

      {change !== undefined && (
        <div className="flex items-center gap-1.5 text-xs">
          {isPositiveChange && <ArrowUp className="h-3 w-3 text-status-critical" />}
          {isNegativeChange && <ArrowDown className="h-3 w-3 text-status-healthy" />}
          {isNeutral && <Minus className="h-3 w-3 text-muted-foreground" />}
          <span className={cn(
            isPositiveChange && 'text-status-critical',
            isNegativeChange && 'text-status-healthy',
            isNeutral && 'text-muted-foreground'
          )}>
            {Math.abs(change)}%
          </span>
          {changeLabel && (
            <span className="text-muted-foreground">{changeLabel}</span>
          )}
        </div>
      )}
    </div>
  );
}
