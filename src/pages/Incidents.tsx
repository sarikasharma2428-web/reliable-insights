import { useState } from 'react';
import { IncidentRow } from '@/components/sre/IncidentRow';
import { useIncidents } from '@/hooks/useIncidents';
import { useServices } from '@/hooks/useServices';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { AlertTriangle, Clock, CheckCircle, Plus } from 'lucide-react';
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
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';

export default function Incidents() {
  const [activeTab, setActiveTab] = useState('active');
  const { incidents, loading, createIncident } = useIncidents();
  const { services } = useServices();
  const { toast } = useToast();
  
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [severity, setSeverity] = useState('medium');
  const [serviceId, setServiceId] = useState('');

  const activeIncidents = incidents.filter((i) => i.status !== 'resolved');
  const resolvedIncidents = incidents.filter((i) => i.status === 'resolved');

  const criticalCount = incidents.filter((i) => i.severity === 'critical' && i.status !== 'resolved').length;
  const highCount = incidents.filter((i) => i.severity === 'high' && i.status !== 'resolved').length;

  const handleCreateIncident = async () => {
    if (!title.trim()) return;
    
    try {
      await createIncident({
        title,
        description: description || undefined,
        severity,
        service_id: serviceId || undefined,
        triggered_by: 'Manual declaration'
      });
      toast({ title: 'Incident declared', description: 'New incident has been created.' });
      setTitle('');
      setDescription('');
      setSeverity('medium');
      setServiceId('');
      setIsDialogOpen(false);
    } catch (error) {
      toast({ 
        title: 'Error', 
        description: 'Failed to create incident.',
        variant: 'destructive'
      });
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Incidents</h1>
          <p className="text-sm text-muted-foreground">
            Track and manage system incidents
          </p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button className="gap-2">
              <Plus className="h-4 w-4" />
              Declare Incident
            </Button>
          </DialogTrigger>
          <DialogContent className="bg-card">
            <DialogHeader>
              <DialogTitle>Declare New Incident</DialogTitle>
              <DialogDescription>
                Create a new incident to track and resolve.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 pt-4">
              <div className="space-y-2">
                <Label htmlFor="incident-title">Title</Label>
                <Input
                  id="incident-title"
                  placeholder="e.g., High latency in API"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="bg-secondary/50"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="incident-desc">Description</Label>
                <Textarea
                  id="incident-desc"
                  placeholder="Describe the incident..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="bg-secondary/50"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Severity</Label>
                  <Select value={severity} onValueChange={setSeverity}>
                    <SelectTrigger className="bg-secondary/50">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="critical">Critical</SelectItem>
                      <SelectItem value="high">High</SelectItem>
                      <SelectItem value="medium">Medium</SelectItem>
                      <SelectItem value="low">Low</SelectItem>
                    </SelectContent>
                  </Select>
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
              </div>
              <Button onClick={handleCreateIncident} className="w-full">
                Declare Incident
              </Button>
            </div>
          </DialogContent>
        </Dialog>
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
            <div className="text-xs text-muted-foreground uppercase tracking-wider">Resolved</div>
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
            {loading ? (
              <div className="p-4 space-y-3">
                {[1, 2, 3].map(i => <Skeleton key={i} className="h-20" />)}
              </div>
            ) : activeIncidents.length > 0 ? (
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
            {resolvedIncidents.length > 0 ? (
              resolvedIncidents.map((incident) => (
                <IncidentRow key={incident.id} incident={incident} />
              ))
            ) : (
              <div className="p-8 text-center text-muted-foreground">
                <p>No resolved incidents</p>
              </div>
            )}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
