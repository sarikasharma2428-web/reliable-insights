import { slos } from '@/data/mockData';
import { cn } from '@/lib/utils';
import { Target, TrendingUp, TrendingDown, AlertTriangle } from 'lucide-react';
import { Progress } from '@/components/ui/progress';

export default function SLOs() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Service Level Objectives</h1>
        <p className="text-sm text-muted-foreground">
          Track SLIs and error budgets for your services
        </p>
      </div>

      <div className="grid grid-cols-2 gap-6">
        {slos.map((slo) => {
          const budgetRemaining = Math.max(0, 100 - (slo.errorBudgetConsumed / slo.errorBudget) * 100);
          const isBudgetCritical = budgetRemaining < 20;
          const isBudgetWarning = budgetRemaining < 50 && !isBudgetCritical;

          return (
            <div key={slo.id} className="metric-card space-y-6">
              {/* Header */}
              <div className="flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <Target className="h-4 w-4 text-primary" />
                    <span className="font-semibold">{slo.name}</span>
                  </div>
                  <span className="text-sm text-muted-foreground font-mono">{slo.service}</span>
                </div>
                {isBudgetCritical && (
                  <div className="flex items-center gap-1 text-status-critical text-xs font-medium">
                    <AlertTriangle className="h-3 w-3" />
                    Budget Exhausted
                  </div>
                )}
              </div>

              {/* SLIs */}
              <div className="space-y-4">
                {slo.slis.map((sli) => {
                  const isMet = sli.current >= sli.target;
                  return (
                    <div key={sli.name} className="space-y-2">
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground">{sli.name}</span>
                        <div className="flex items-center gap-2">
                          <span className={cn(
                            'font-mono font-medium',
                            isMet ? 'text-status-healthy' : 'text-status-critical'
                          )}>
                            {sli.current.toFixed(2)}%
                          </span>
                          <span className="text-muted-foreground">/</span>
                          <span className="font-mono text-muted-foreground">{sli.target}%</span>
                          {isMet ? (
                            <TrendingUp className="h-4 w-4 text-status-healthy" />
                          ) : (
                            <TrendingDown className="h-4 w-4 text-status-critical" />
                          )}
                        </div>
                      </div>
                      <Progress 
                        value={(sli.current / sli.target) * 100} 
                        className={cn(
                          'h-2',
                          isMet ? '[&>div]:bg-status-healthy' : '[&>div]:bg-status-critical'
                        )}
                      />
                    </div>
                  );
                })}
              </div>

              {/* Error Budget */}
              <div className="pt-4 border-t border-border">
                <div className="flex items-center justify-between text-sm mb-2">
                  <span className="text-muted-foreground">Error Budget</span>
                  <span className={cn(
                    'font-mono font-medium',
                    isBudgetCritical && 'text-status-critical',
                    isBudgetWarning && 'text-status-warning',
                    !isBudgetCritical && !isBudgetWarning && 'text-status-healthy'
                  )}>
                    {budgetRemaining.toFixed(1)}% remaining
                  </span>
                </div>
                <div className="relative h-3 bg-secondary rounded-full overflow-hidden">
                  <div 
                    className={cn(
                      'h-full transition-all duration-500',
                      isBudgetCritical && 'bg-status-critical',
                      isBudgetWarning && 'bg-status-warning',
                      !isBudgetCritical && !isBudgetWarning && 'bg-status-healthy'
                    )}
                    style={{ width: `${budgetRemaining}%` }}
                  />
                </div>
                <div className="flex justify-between text-xs text-muted-foreground mt-1">
                  <span>Consumed: {slo.errorBudgetConsumed.toFixed(2)}%</span>
                  <span>Budget: {slo.errorBudget}%</span>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
