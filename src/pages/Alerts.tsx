import { AlertRow } from '@/components/sre/AlertRow';
import { useAlerts } from '@/hooks/useAlerts';
import { useServices } from '@/hooks/useServices';
import { Button } from '@/components/ui/button';
import { Bell, BellOff, AlertTriangle, Info, Plus } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
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
import { useState } from 'react';
import { useToast } from '@/hooks/use-toast';

export default function Alerts() {
  const { alerts, loading, createAlert, acknowledgeAlert } = useAlerts();
  const { services } = useServices();
  const { toast } = useToast();
  
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [name, setName] = useState('');
  const [severity, setSeverity] = useState('warning');
  const [message, setMessage] = useState('');
  const [metricName, setMetricName] = useState('');
  const [threshold, setThreshold] = useState('');
  const [currentValue, setCurrentValue] = useState('');
  const [serviceId, setServiceId] = useState('');

  const criticalAlerts = alerts.filter((a) => a.severity === 'critical');
  const warningAlerts = alerts.filter((a) => a.severity === 'warning');
  const infoAlerts = alerts.filter((a) => a.severity === 'info');

  const handleCreateAlert = async () => {
    if (!name || !message || !metricName || !threshold || !currentValue) return;
    
    try {
      await createAlert({
        name,
        severity,
        message,
        metric_name: metricName,
        threshold: parseFloat(threshold),
        current_value: parseFloat(currentValue),
        service_id: serviceId || undefined
      });
      toast({ title: 'Alert created' });
      setName('');
      setMessage('');
      setMetricName('');
      setThreshold('');
      setCurrentValue('');
      setServiceId('');
      setIsDialogOpen(false);
    } catch (error) {
      toast({ title: 'Error', description: 'Failed to create alert', variant: 'destructive' });
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Alerts</h1>
          <p className="text-sm text-muted-foreground">
            View and manage alert rules and fired alerts
          </p>
        </div>
        <div className="flex gap-2">
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button className="gap-2">
                <Plus className="h-4 w-4" />
                Create Alert
              </Button>
            </DialogTrigger>
            <DialogContent className="bg-card">
              <DialogHeader>
                <DialogTitle>Create Alert</DialogTitle>
                <DialogDescription>
                  Manually fire an alert for testing or manual escalation.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 pt-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Alert Name</Label>
                    <Input
                      placeholder="e.g., High CPU Alert"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      className="bg-secondary/50"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Severity</Label>
                    <Select value={severity} onValueChange={setSeverity}>
                      <SelectTrigger className="bg-secondary/50">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="critical">Critical</SelectItem>
                        <SelectItem value="warning">Warning</SelectItem>
                        <SelectItem value="info">Info</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Message</Label>
                  <Input
                    placeholder="e.g., CPU usage exceeded threshold"
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    className="bg-secondary/50"
                  />
                </div>
                <div className="grid grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label>Metric Name</Label>
                    <Input
                      placeholder="cpu_usage"
                      value={metricName}
                      onChange={(e) => setMetricName(e.target.value)}
                      className="bg-secondary/50"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Threshold</Label>
                    <Input
                      type="number"
                      placeholder="85"
                      value={threshold}
                      onChange={(e) => setThreshold(e.target.value)}
                      className="bg-secondary/50"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Current Value</Label>
                    <Input
                      type="number"
                      placeholder="92"
                      value={currentValue}
                      onChange={(e) => setCurrentValue(e.target.value)}
                      className="bg-secondary/50"
                    />
                  </div>
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
                <Button onClick={handleCreateAlert} className="w-full">
                  Fire Alert
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-3 gap-4">
        <div className="metric-card flex items-center gap-3 border-status-critical/30">
          <div className="flex h-10 w-10 items-center justify-center rounded-md bg-status-critical/20">
            <AlertTriangle className="h-5 w-5 text-status-critical" />
          </div>
          <div>
            <div className="text-2xl font-semibold font-mono text-status-critical">{criticalAlerts.length}</div>
            <div className="text-xs text-muted-foreground uppercase tracking-wider">Critical</div>
          </div>
        </div>
        <div className="metric-card flex items-center gap-3 border-status-warning/30">
          <div className="flex h-10 w-10 items-center justify-center rounded-md bg-status-warning/20">
            <AlertTriangle className="h-5 w-5 text-status-warning" />
          </div>
          <div>
            <div className="text-2xl font-semibold font-mono text-status-warning">{warningAlerts.length}</div>
            <div className="text-xs text-muted-foreground uppercase tracking-wider">Warning</div>
          </div>
        </div>
        <div className="metric-card flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-md bg-primary/20">
            <Info className="h-5 w-5 text-primary" />
          </div>
          <div>
            <div className="text-2xl font-semibold font-mono">{infoAlerts.length}</div>
            <div className="text-xs text-muted-foreground uppercase tracking-wider">Info</div>
          </div>
        </div>
      </div>

      {/* Alert List */}
      <div>
        <h2 className="text-sm font-medium text-muted-foreground uppercase tracking-wider mb-4">
          Active Alerts ({alerts.length})
        </h2>
        <div className="rounded-md border border-border bg-card overflow-hidden">
          {loading ? (
            <div className="p-4 space-y-3">
              {[1, 2, 3].map(i => <Skeleton key={i} className="h-16" />)}
            </div>
          ) : alerts.length > 0 ? (
            alerts.map((alert) => (
              <AlertRow key={alert.id} alert={alert} />
            ))
          ) : (
            <div className="p-8 text-center text-muted-foreground">
              <Bell className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p>No alerts</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
