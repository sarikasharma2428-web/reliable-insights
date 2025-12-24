import { useState } from 'react';
import { IncidentRow } from '@/components/sre/IncidentRow';
import { StatusBadge } from '@/components/sre/StatusBadge';
import { incidents } from '@/data/mockData';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { AlertTriangle, Clock, CheckCircle } from 'lucide-react';

export default function Incidents() {
  const [activeTab, setActiveTab] = useState('active');

  const activeIncidents = incidents.filter((i) => i.status !== 'resolved');
  const resolvedIncidents = incidents.filter((i) => i.status === 'resolved');

  const criticalCount = incidents.filter((i) => i.severity === 'critical' && i.status !== 'resolved').length;
  const highCount = incidents.filter((i) => i.severity === 'high' && i.status !== 'resolved').length;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Incidents</h1>
          <p className="text-sm text-muted-foreground">
            Track and manage system incidents
          </p>
        </div>
        <Button className="gap-2">
          <AlertTriangle className="h-4 w-4" />
          Declare Incident
        </Button>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-4 gap-4">
        <div className="metric-card flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-md bg-status-warning/20">
            <Clock className="h-5 w-5 text-status-warning" />
          </div>
          <div>
            <div className="text-2xl font-semibold font-mono">{activeIncidents.length}</div>
            <div className="text-xs text-muted-foreground uppercase tracking-wider">Active</div>
          </div>
        </div>
        <div className="metric-card flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-md bg-status-critical/20">
            <AlertTriangle className="h-5 w-5 text-status-critical" />
          </div>
          <div>
            <div className="text-2xl font-semibold font-mono text-status-critical">{criticalCount}</div>
            <div className="text-xs text-muted-foreground uppercase tracking-wider">Critical</div>
          </div>
        </div>
        <div className="metric-card flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-md bg-status-warning/20">
            <AlertTriangle className="h-5 w-5 text-status-warning" />
          </div>
          <div>
            <div className="text-2xl font-semibold font-mono text-status-warning">{highCount}</div>
            <div className="text-xs text-muted-foreground uppercase tracking-wider">High</div>
          </div>
        </div>
        <div className="metric-card flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-md bg-status-healthy/20">
            <CheckCircle className="h-5 w-5 text-status-healthy" />
          </div>
          <div>
            <div className="text-2xl font-semibold font-mono">{resolvedIncidents.length}</div>
            <div className="text-xs text-muted-foreground uppercase tracking-wider">Resolved (30d)</div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="bg-secondary/50">
          <TabsTrigger value="active" className="gap-2">
            Active
            <span className="rounded-full bg-status-warning/20 px-2 py-0.5 text-xs font-mono">
              {activeIncidents.length}
            </span>
          </TabsTrigger>
          <TabsTrigger value="resolved" className="gap-2">
            Resolved
            <span className="rounded-full bg-muted px-2 py-0.5 text-xs font-mono">
              {resolvedIncidents.length}
            </span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="active" className="mt-4">
          <div className="rounded-md border border-border bg-card overflow-hidden">
            {activeIncidents.length > 0 ? (
              activeIncidents.map((incident) => (
                <IncidentRow key={incident.id} incident={incident} />
              ))
            ) : (
              <div className="p-12 text-center text-muted-foreground">
                <CheckCircle className="h-12 w-12 mx-auto mb-4 text-status-healthy opacity-50" />
                <p className="text-lg font-medium">All clear!</p>
                <p className="text-sm">No active incidents at this time.</p>
              </div>
            )}
          </div>
        </TabsContent>

        <TabsContent value="resolved" className="mt-4">
          <div className="rounded-md border border-border bg-card overflow-hidden">
            {resolvedIncidents.map((incident) => (
              <IncidentRow key={incident.id} incident={incident} />
            ))}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
