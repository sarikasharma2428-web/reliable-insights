import { useState } from 'react';
import { useSLOs } from '@/hooks/useSLOs';
import { useServices } from '@/hooks/useServices';
import { cn } from '@/lib/utils';
import { Target, TrendingUp, TrendingDown, AlertTriangle, Plus } from 'lucide-react';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';

export default function SLOs() {
  const { slos, loading, createSLO, breachingCount, budgetExhaustedCount } = useSLOs();
  const { services } = useServices();
  const { toast } = useToast();

  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [name, setName] = useState('');
  const [serviceId, setServiceId] = useState('');
  const [targetAvailability, setTargetAvailability] = useState('99.9');
  const [targetLatency, setTargetLatency] = useState('500');
  const [errorBudget, setErrorBudget] = useState('0.1');

  const handleCreateSLO = async () => {
    if (!name.trim()) return;

    try {
      await createSLO({
        name,
        service_id: serviceId || undefined,
        target_availability: parseFloat(targetAvailability),
        target_latency_p99: parseInt(targetLatency),
        error_budget: parseFloat(errorBudget),
        period: '30d'
      });
      toast({ title: 'SLO created', description: `${name} has been added.` });
      setName('');
      setServiceId('');
      setTargetAvailability('99.9');
      setTargetLatency('500');
      setErrorBudget('0.1');
      setIsDialogOpen(false);
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to create SLO.',
        variant: 'destructive'
      });
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-64" />
        <div className="grid grid-cols-2 gap-6">
          {[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-64" />)}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Service Level Objectives</h1>
          <p className="text-sm text-muted-foreground">
            Track SLIs and error budgets for your services
          </p>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 text-sm">
            {breachingCount > 0 && (
              <span className="text-status-critical font-mono">{breachingCount} breaching</span>
            )}
            {budgetExhaustedCount > 0 && (
              <>
                <span className="text-muted-foreground">•</span>
                <span className="text-status-warning font-mono">{budgetExhaustedCount} budget exhausted</span>
              </>
            )}
          </div>
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button className="gap-2">
                <Plus className="h-4 w-4" />
                Create SLO
              </Button>
            </DialogTrigger>
            <DialogContent className="bg-card">
              <DialogHeader>
                <DialogTitle>Create SLO</DialogTitle>
                <DialogDescription>
                  Define a new Service Level Objective.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 pt-4">
                <div className="space-y-2">
                  <Label>Name</Label>
                  <Input
                    placeholder="e.g., API Availability"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="bg-secondary/50"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Service (optional)</Label>
                  <Select value={serviceId} onValueChange={setServiceId}>
                    <SelectTrigger className="bg-secondary/50">
                      <SelectValue placeholder="Select service" />
                    </SelectTrigger>
                    <SelectContent>
                      {services.map(s => (
                        <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label>Target Availability %</Label>
                    <Input
                      type="number"
                      step="0.01"
                      value={targetAvailability}
                      onChange={(e) => setTargetAvailability(e.target.value)}
                      className="bg-secondary/50"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Target Latency (ms)</Label>
                    <Input
                      type="number"
                      value={targetLatency}
                      onChange={(e) => setTargetLatency(e.target.value)}
                      className="bg-secondary/50"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Error Budget %</Label>
                    <Input
                      type="number"
                      step="0.01"
                      value={errorBudget}
                      onChange={(e) => setErrorBudget(e.target.value)}
                      className="bg-secondary/50"
                    />
                  </div>
                </div>
                <Button onClick={handleCreateSLO} className="w-full">
                  Create SLO
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {slos.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          <Target className="h-12 w-12 mx-auto mb-4 opacity-50" />
          <p className="text-lg font-medium">No SLOs defined</p>
          <p className="text-sm">Create your first SLO to start tracking service reliability.</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-6">
          {slos.map((slo) => {
            const errorBudget = slo.error_budget || 0.1;
            const consumed = slo.error_budget_consumed || 0;
            const budgetRemaining = Math.max(0, 100 - (consumed / errorBudget) * 100);
            const isBudgetCritical = budgetRemaining < 20;
            const isBudgetWarning = budgetRemaining < 50 && !isBudgetCritical;
            const isAvailabilityMet = slo.current_availability >= slo.target_availability;
            const isLatencyMet = slo.target_latency_p99 
              ? (slo.current_latency_p99 || 0) <= slo.target_latency_p99 
              : true;

            return (
              <div key={slo.id} className="metric-card space-y-6">
                {/* Header */}
                <div className="flex items-start justify-between">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <Target className="h-4 w-4 text-primary" />
                      <span className="font-semibold">{slo.name}</span>
                    </div>
                    <span className="text-sm text-muted-foreground font-mono">
                      {slo.services?.name || 'All services'}
                    </span>
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
                  {/* Availability SLI */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">Availability</span>
                      <div className="flex items-center gap-2">
                        <span className={cn(
                          'font-mono font-medium',
                          isAvailabilityMet ? 'text-status-healthy' : 'text-status-critical'
                        )}>
                          {slo.current_availability.toFixed(2)}%
                        </span>
                        <span className="text-muted-foreground">/</span>
                        <span className="font-mono text-muted-foreground">{slo.target_availability}%</span>
                        {isAvailabilityMet ? (
                          <TrendingUp className="h-4 w-4 text-status-healthy" />
                        ) : (
                          <TrendingDown className="h-4 w-4 text-status-critical" />
                        )}
                      </div>
                    </div>
                    <Progress
                      value={(slo.current_availability / slo.target_availability) * 100}
                      className={cn(
                        'h-2',
                        isAvailabilityMet ? '[&>div]:bg-status-healthy' : '[&>div]:bg-status-critical'
                      )}
                    />
                  </div>

                  {/* Latency SLI */}
                  {slo.target_latency_p99 && (
                    <div className="space-y-2">
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground">Latency P99 ≤ {slo.target_latency_p99}ms</span>
                        <div className="flex items-center gap-2">
                          <span className={cn(
                            'font-mono font-medium',
                            isLatencyMet ? 'text-status-healthy' : 'text-status-critical'
                          )}>
                            {slo.current_latency_p99 || 0}ms
                          </span>
                          {isLatencyMet ? (
                            <TrendingUp className="h-4 w-4 text-status-healthy" />
                          ) : (
                            <TrendingDown className="h-4 w-4 text-status-critical" />
                          )}
                        </div>
                      </div>
                      <Progress
                        value={Math.min(100, 100 - ((slo.current_latency_p99 || 0) / slo.target_latency_p99) * 100 + 100)}
                        className={cn(
                          'h-2',
                          isLatencyMet ? '[&>div]:bg-status-healthy' : '[&>div]:bg-status-critical'
                        )}
                      />
                    </div>
                  )}
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
                    <span>Consumed: {consumed.toFixed(2)}%</span>
                    <span>Budget: {errorBudget}%</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
