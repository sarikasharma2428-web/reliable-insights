import { AlertRow } from '@/components/sre/AlertRow';
import { alerts } from '@/data/mockData';
import { Button } from '@/components/ui/button';
import { Bell, BellOff, AlertTriangle, Info } from 'lucide-react';

export default function Alerts() {
  const criticalAlerts = alerts.filter((a) => a.severity === 'critical');
  const warningAlerts = alerts.filter((a) => a.severity === 'warning');
  const infoAlerts = alerts.filter((a) => a.severity === 'info');

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
          <Button variant="outline" className="gap-2">
            <BellOff className="h-4 w-4" />
            Silence All
          </Button>
          <Button className="gap-2">
            <Bell className="h-4 w-4" />
            New Alert Rule
          </Button>
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
          {alerts.map((alert) => (
            <AlertRow key={alert.id} alert={alert} />
          ))}
        </div>
      </div>
    </div>
  );
}
