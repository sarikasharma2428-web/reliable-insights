import { ServiceCard } from '@/components/sre/ServiceCard';
import { useServices } from '@/hooks/useServices';
import { Server, CheckCircle, AlertTriangle, XCircle, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
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
import { useState } from 'react';
import { useToast } from '@/hooks/use-toast';

export default function Services() {
  const { services, loading, addService } = useServices();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [newServiceName, setNewServiceName] = useState('');
  const [newServiceDesc, setNewServiceDesc] = useState('');
  const { toast } = useToast();

  const healthyCount = services.filter((s) => s.status === 'healthy').length;
  const degradedCount = services.filter((s) => s.status === 'degraded').length;
  const criticalCount = services.filter((s) => s.status === 'critical').length;

  const handleAddService = async () => {
    if (!newServiceName.trim()) return;
    
    try {
      await addService({
        name: newServiceName.toLowerCase().replace(/\s+/g, '-'),
        description: newServiceDesc || null,
        status: 'healthy',
        uptime: 100,
        latency_p50: 0,
        latency_p99: 0,
        error_rate: 0,
        requests_per_second: 0,
        cpu_usage: 0,
        memory_usage: 0
      });
      toast({ title: 'Service added', description: `${newServiceName} has been registered.` });
      setNewServiceName('');
      setNewServiceDesc('');
      setIsDialogOpen(false);
    } catch (error) {
      toast({ 
        title: 'Error', 
        description: 'Failed to add service. Name may already exist.',
        variant: 'destructive'
      });
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Services</h1>
          <p className="text-sm text-muted-foreground">
            Monitor all registered services and their health status
          </p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button className="gap-2">
              <Plus className="h-4 w-4" />
              Add Service
            </Button>
          </DialogTrigger>
          <DialogContent className="bg-card">
            <DialogHeader>
              <DialogTitle>Register New Service</DialogTitle>
              <DialogDescription>
                Add a new service to monitor in the platform.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 pt-4">
              <div className="space-y-2">
                <Label htmlFor="service-name">Service Name</Label>
                <Input
                  id="service-name"
                  placeholder="e.g., api-gateway"
                  value={newServiceName}
                  onChange={(e) => setNewServiceName(e.target.value)}
                  className="bg-secondary/50"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="service-desc">Description (optional)</Label>
                <Input
                  id="service-desc"
                  placeholder="e.g., Main API Gateway"
                  value={newServiceDesc}
                  onChange={(e) => setNewServiceDesc(e.target.value)}
                  className="bg-secondary/50"
                />
              </div>
              <Button onClick={handleAddService} className="w-full">
                Register Service
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-4 gap-4">
        <div className="metric-card flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-md bg-secondary">
            <Server className="h-5 w-5 text-foreground" />
          </div>
          <div>
            <div className="text-2xl font-semibold font-mono">{services.length}</div>
            <div className="text-xs text-muted-foreground uppercase tracking-wider">Total Services</div>
          </div>
        </div>
        <div className="metric-card flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-md bg-status-healthy/20">
            <CheckCircle className="h-5 w-5 text-status-healthy" />
          </div>
          <div>
            <div className="text-2xl font-semibold font-mono text-status-healthy">{healthyCount}</div>
            <div className="text-xs text-muted-foreground uppercase tracking-wider">Healthy</div>
          </div>
        </div>
        <div className="metric-card flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-md bg-status-warning/20">
            <AlertTriangle className="h-5 w-5 text-status-warning" />
          </div>
          <div>
            <div className="text-2xl font-semibold font-mono text-status-warning">{degradedCount}</div>
            <div className="text-xs text-muted-foreground uppercase tracking-wider">Degraded</div>
          </div>
        </div>
        <div className="metric-card flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-md bg-status-critical/20">
            <XCircle className="h-5 w-5 text-status-critical" />
          </div>
          <div>
            <div className="text-2xl font-semibold font-mono text-status-critical">{criticalCount}</div>
            <div className="text-xs text-muted-foreground uppercase tracking-wider">Critical</div>
          </div>
        </div>
      </div>

      {/* Services Grid */}
      {loading ? (
        <div className="grid grid-cols-3 gap-4">
          {[1, 2, 3, 4, 5, 6].map(i => (
            <Skeleton key={i} className="h-40" />
          ))}
        </div>
      ) : services.length > 0 ? (
        <div className="grid grid-cols-3 gap-4">
          {services.map((service) => (
            <ServiceCard key={service.id} service={service} />
          ))}
        </div>
      ) : (
        <div className="text-center py-12 text-muted-foreground">
          <Server className="h-12 w-12 mx-auto mb-4 opacity-50" />
          <p className="text-lg font-medium">No services registered</p>
          <p className="text-sm">Add your first service to start monitoring.</p>
        </div>
      )}
    </div>
  );
}
