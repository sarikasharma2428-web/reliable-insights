import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useServices } from '@/hooks/useServices';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Server,
  Activity,
  FileText,
  AlertTriangle,
  Flame,
  Target,
  Bell,
  Zap,
  RefreshCw,
  Trash2,
  Play,
  CheckCircle,
  XCircle,
} from 'lucide-react';
import { Separator } from '@/components/ui/separator';

// Development mode check
const isDev = import.meta.env.DEV;

export default function TestPanel() {
  const { services, addService, refetch: refetchServices } = useServices();
  const { toast } = useToast();

  // State for each section
  const [loading, setLoading] = useState<string | null>(null);
  
  // Service generator
  const [serviceName, setServiceName] = useState('');
  const [serviceDesc, setServiceDesc] = useState('');

  // Metrics injector
  const [selectedService, setSelectedService] = useState('');
  const [cpuValue, setCpuValue] = useState('50');
  const [memoryValue, setMemoryValue] = useState('60');
  const [latencyP99, setLatencyP99] = useState('150');
  const [errorRate, setErrorRate] = useState('0.5');
  const [rps, setRps] = useState('500');

  // Log injector
  const [logService, setLogService] = useState('');
  const [logLevel, setLogLevel] = useState('info');
  const [logMessage, setLogMessage] = useState('');

  // Alert trigger
  const [alertService, setAlertService] = useState('');
  const [alertSeverity, setAlertSeverity] = useState('warning');
  const [alertName, setAlertName] = useState('');
  const [alertMessage, setAlertMessage] = useState('');

  // Incident trigger
  const [incidentService, setIncidentService] = useState('');
  const [incidentSeverity, setIncidentSeverity] = useState('medium');
  const [incidentTitle, setIncidentTitle] = useState('');
  const [incidentDesc, setIncidentDesc] = useState('');

  // SLO controls
  const [sloService, setSloService] = useState('');
  const [sloName, setSloName] = useState('');
  const [sloTarget, setSloTarget] = useState('99.9');
  const [sloCurrent, setSloCurrent] = useState('99.5');

  // Block production access
  if (!isDev) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Card className="max-w-md">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-status-critical">
              <XCircle className="h-5 w-5" />
              Access Denied
            </CardTitle>
            <CardDescription>
              Test Panel is only available in development mode. 
              This panel is disabled in production builds for security.
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  // ============ Handler Functions ============

  const handleCreateService = async () => {
    if (!serviceName.trim()) return;
    setLoading('service');
    try {
      await addService({ name: serviceName, description: serviceDesc });
      toast({ title: 'Service created', description: `${serviceName} added successfully.` });
      setServiceName('');
      setServiceDesc('');
    } catch (error) {
      toast({ title: 'Error', description: 'Failed to create service.', variant: 'destructive' });
    } finally {
      setLoading(null);
    }
  };

  const handleInjectMetrics = async () => {
    if (!selectedService) return;
    setLoading('metrics');
    try {
      // Update service with new metrics
      const { error: updateError } = await supabase
        .from('services')
        .update({
          cpu_usage: parseFloat(cpuValue),
          memory_usage: parseFloat(memoryValue),
          latency_p99: parseInt(latencyP99),
          latency_p50: Math.round(parseInt(latencyP99) * 0.5),
          error_rate: parseFloat(errorRate),
          requests_per_second: parseInt(rps),
          status: parseFloat(errorRate) > 5 || parseFloat(cpuValue) > 90 ? 'critical' 
                 : parseFloat(errorRate) > 2 || parseFloat(cpuValue) > 75 ? 'degraded' 
                 : 'healthy',
          last_checked_at: new Date().toISOString()
        })
        .eq('id', selectedService);

      if (updateError) throw updateError;

      // Record metrics
      const metrics = [
        { service_id: selectedService, metric_name: 'cpu_usage', value: parseFloat(cpuValue), unit: 'percent' },
        { service_id: selectedService, metric_name: 'memory_usage', value: parseFloat(memoryValue), unit: 'percent' },
        { service_id: selectedService, metric_name: 'latency_p99', value: parseInt(latencyP99), unit: 'ms' },
        { service_id: selectedService, metric_name: 'error_rate', value: parseFloat(errorRate), unit: 'percent' },
        { service_id: selectedService, metric_name: 'requests_per_second', value: parseInt(rps), unit: 'rps' },
      ];

      const { error: metricsError } = await supabase.from('metrics').insert(metrics);
      if (metricsError) throw metricsError;

      toast({ title: 'Metrics injected', description: `5 metrics recorded for service.` });
      refetchServices();
    } catch (error) {
      toast({ title: 'Error', description: 'Failed to inject metrics.', variant: 'destructive' });
    } finally {
      setLoading(null);
    }
  };

  const handleInjectLog = async () => {
    if (!logMessage.trim()) return;
    setLoading('log');
    try {
      const { error } = await supabase.from('logs').insert([{
        service_id: logService || null,
        level: logLevel,
        message: logMessage,
        trace_id: `trace-${Date.now().toString(36)}`,
        metadata: { source: 'test-panel', injected_at: new Date().toISOString() }
      }]);

      if (error) throw error;
      toast({ title: 'Log injected', description: `${logLevel.toUpperCase()} log added.` });
      setLogMessage('');
    } catch (error) {
      toast({ title: 'Error', description: 'Failed to inject log.', variant: 'destructive' });
    } finally {
      setLoading(null);
    }
  };

  const handleTriggerAlert = async () => {
    if (!alertName.trim() || !alertMessage.trim()) return;
    setLoading('alert');
    try {
      const { error } = await supabase.from('alerts').insert([{
        name: alertName,
        message: alertMessage,
        severity: alertSeverity,
        service_id: alertService || null,
        metric_name: 'test_metric',
        threshold: 100,
        current_value: 150,
        fired_at: new Date().toISOString()
      }]);

      if (error) throw error;
      toast({ title: 'Alert triggered', description: `${alertSeverity} alert created.` });
      setAlertName('');
      setAlertMessage('');
    } catch (error) {
      toast({ title: 'Error', description: 'Failed to trigger alert.', variant: 'destructive' });
    } finally {
      setLoading(null);
    }
  };

  const handleCreateIncident = async () => {
    if (!incidentTitle.trim()) return;
    setLoading('incident');
    try {
      const incidentNumber = `INC-${Date.now().toString(36).toUpperCase()}`;
      
      const { data, error } = await supabase.from('incidents').insert([{
        incident_number: incidentNumber,
        title: incidentTitle,
        description: incidentDesc || null,
        severity: incidentSeverity,
        status: 'open',
        service_id: incidentService || null,
        triggered_by: 'Test Panel',
        started_at: new Date().toISOString()
      }]).select().single();

      if (error) throw error;

      // Add initial event
      await supabase.from('incident_events').insert([{
        incident_id: data.id,
        event_type: 'triggered',
        message: `Incident triggered from Test Panel: ${incidentTitle}`
      }]);

      toast({ title: 'Incident created', description: `${incidentNumber} declared.` });
      setIncidentTitle('');
      setIncidentDesc('');
    } catch (error) {
      toast({ title: 'Error', description: 'Failed to create incident.', variant: 'destructive' });
    } finally {
      setLoading(null);
    }
  };

  const handleResolveAllIncidents = async () => {
    setLoading('resolve');
    try {
      const { error } = await supabase
        .from('incidents')
        .update({ 
          status: 'resolved', 
          resolved_at: new Date().toISOString() 
        })
        .in('status', ['open', 'acknowledged']);

      if (error) throw error;
      toast({ title: 'Incidents resolved', description: 'All active incidents marked resolved.' });
    } catch (error) {
      toast({ title: 'Error', description: 'Failed to resolve incidents.', variant: 'destructive' });
    } finally {
      setLoading(null);
    }
  };

  const handleCreateSLO = async () => {
    if (!sloName.trim()) return;
    setLoading('slo');
    try {
      const { error } = await supabase.from('slos').insert([{
        name: sloName,
        service_id: sloService || null,
        target_availability: parseFloat(sloTarget),
        current_availability: parseFloat(sloCurrent),
        target_latency_p99: 500,
        current_latency_p99: 200,
        error_budget: 100 - parseFloat(sloTarget),
        error_budget_consumed: parseFloat(sloTarget) - parseFloat(sloCurrent),
        period: '30d'
      }]);

      if (error) throw error;
      toast({ title: 'SLO created', description: `${sloName} added.` });
      setSloName('');
    } catch (error) {
      toast({ title: 'Error', description: 'Failed to create SLO.', variant: 'destructive' });
    } finally {
      setLoading(null);
    }
  };

  const handleBreachSLO = async () => {
    setLoading('breach');
    try {
      const { error } = await supabase
        .from('slos')
        .update({ 
          current_availability: 95.0,
          error_budget_consumed: 5.0 
        })
        .neq('id', '');

      if (error) throw error;
      toast({ title: 'SLOs breached', description: 'All SLOs set to breach state.' });
    } catch (error) {
      toast({ title: 'Error', description: 'Failed to breach SLOs.', variant: 'destructive' });
    } finally {
      setLoading(null);
    }
  };

  const handleRecoverSLO = async () => {
    setLoading('recover');
    try {
      const { data: slos } = await supabase.from('slos').select('id, target_availability');
      if (slos) {
        for (const slo of slos) {
          await supabase
            .from('slos')
            .update({ 
              current_availability: slo.target_availability + 0.05,
              error_budget_consumed: 0 
            })
            .eq('id', slo.id);
        }
      }
      toast({ title: 'SLOs recovered', description: 'All SLOs restored to healthy state.' });
    } catch (error) {
      toast({ title: 'Error', description: 'Failed to recover SLOs.', variant: 'destructive' });
    } finally {
      setLoading(null);
    }
  };

  const handleRunSimulation = async () => {
    setLoading('simulate');
    try {
      const response = await supabase.functions.invoke('simulate-metrics');
      if (response.error) throw response.error;
      
      const data = response.data;
      toast({ 
        title: 'Simulation complete', 
        description: `${data.servicesUpdated} services, ${data.metricsRecorded} metrics, ${data.alertsCreated} alerts, ${data.incidentsCreated} incidents` 
      });
      refetchServices();
    } catch (error) {
      toast({ title: 'Error', description: 'Failed to run simulation.', variant: 'destructive' });
    } finally {
      setLoading(null);
    }
  };

  const handleClearAllData = async () => {
    if (!confirm('Are you sure? This will delete ALL data from the system.')) return;
    setLoading('clear');
    try {
      await supabase.from('incident_events').delete().neq('id', '');
      await supabase.from('incidents').delete().neq('id', '');
      await supabase.from('alerts').delete().neq('id', '');
      await supabase.from('logs').delete().neq('id', '');
      await supabase.from('metrics').delete().neq('id', '');
      await supabase.from('slos').delete().neq('id', '');
      await supabase.from('services').delete().neq('id', '');
      
      toast({ title: 'Data cleared', description: 'All system data has been removed.' });
      refetchServices();
    } catch (error) {
      toast({ title: 'Error', description: 'Failed to clear data.', variant: 'destructive' });
    } finally {
      setLoading(null);
    }
  };

  const handleStressTest = async () => {
    setLoading('stress');
    try {
      // Run simulation 5 times rapidly
      for (let i = 0; i < 5; i++) {
        await supabase.functions.invoke('simulate-metrics');
        await new Promise(r => setTimeout(r, 500));
      }
      toast({ title: 'Stress test complete', description: '5 simulation cycles executed.' });
      refetchServices();
    } catch (error) {
      toast({ title: 'Error', description: 'Stress test failed.', variant: 'destructive' });
    } finally {
      setLoading(null);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-semibold">Test Control Panel</h1>
            <Badge variant="outline" className="text-status-warning border-status-warning">
              DEV ONLY
            </Badge>
          </div>
          <p className="text-sm text-muted-foreground">
            Inject test data through production code paths
          </p>
        </div>
        <div className="flex gap-2">
          <Button 
            variant="outline" 
            onClick={handleRunSimulation}
            disabled={loading === 'simulate'}
          >
            <Zap className="h-4 w-4 mr-2" />
            Run Simulation
          </Button>
          <Button 
            variant="destructive" 
            onClick={handleClearAllData}
            disabled={loading === 'clear'}
          >
            <Trash2 className="h-4 w-4 mr-2" />
            Clear All Data
          </Button>
        </div>
      </div>

      <Tabs defaultValue="services" className="space-y-4">
        <TabsList className="grid w-full grid-cols-6">
          <TabsTrigger value="services" className="gap-2">
            <Server className="h-4 w-4" />
            Services
          </TabsTrigger>
          <TabsTrigger value="metrics" className="gap-2">
            <Activity className="h-4 w-4" />
            Metrics
          </TabsTrigger>
          <TabsTrigger value="logs" className="gap-2">
            <FileText className="h-4 w-4" />
            Logs
          </TabsTrigger>
          <TabsTrigger value="alerts" className="gap-2">
            <Bell className="h-4 w-4" />
            Alerts
          </TabsTrigger>
          <TabsTrigger value="incidents" className="gap-2">
            <Flame className="h-4 w-4" />
            Incidents
          </TabsTrigger>
          <TabsTrigger value="slos" className="gap-2">
            <Target className="h-4 w-4" />
            SLOs
          </TabsTrigger>
        </TabsList>

        {/* Services Tab */}
        <TabsContent value="services">
          <Card>
            <CardHeader>
              <CardTitle>Generate Test Services</CardTitle>
              <CardDescription>
                Create new services that will be monitored by the system.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Service Name</Label>
                  <Input
                    placeholder="e.g., test-api"
                    value={serviceName}
                    onChange={(e) => setServiceName(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Description</Label>
                  <Input
                    placeholder="e.g., Test API Service"
                    value={serviceDesc}
                    onChange={(e) => setServiceDesc(e.target.value)}
                  />
                </div>
              </div>
              <Button onClick={handleCreateService} disabled={loading === 'service'}>
                <Play className="h-4 w-4 mr-2" />
                Create Service
              </Button>
              
              <Separator />
              
              <div>
                <h4 className="font-medium mb-2">Existing Services ({services.length})</h4>
                <div className="flex flex-wrap gap-2">
                  {services.map(s => (
                    <Badge key={s.id} variant="secondary">{s.name}</Badge>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Metrics Tab */}
        <TabsContent value="metrics">
          <Card>
            <CardHeader>
              <CardTitle>Inject Metrics</CardTitle>
              <CardDescription>
                Emit metrics into the real metrics pipeline.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Target Service</Label>
                <Select value={selectedService} onValueChange={setSelectedService}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select service" />
                  </SelectTrigger>
                  <SelectContent>
                    {services.map(s => (
                      <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-5 gap-4">
                <div className="space-y-2">
                  <Label>CPU %</Label>
                  <Input type="number" value={cpuValue} onChange={(e) => setCpuValue(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label>Memory %</Label>
                  <Input type="number" value={memoryValue} onChange={(e) => setMemoryValue(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label>Latency P99 (ms)</Label>
                  <Input type="number" value={latencyP99} onChange={(e) => setLatencyP99(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label>Error Rate %</Label>
                  <Input type="number" step="0.1" value={errorRate} onChange={(e) => setErrorRate(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label>RPS</Label>
                  <Input type="number" value={rps} onChange={(e) => setRps(e.target.value)} />
                </div>
              </div>
              <Button onClick={handleInjectMetrics} disabled={loading === 'metrics' || !selectedService}>
                <Activity className="h-4 w-4 mr-2" />
                Inject Metrics
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Logs Tab */}
        <TabsContent value="logs">
          <Card>
            <CardHeader>
              <CardTitle>Inject Logs</CardTitle>
              <CardDescription>
                Write log entries directly to the logging system.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Service (optional)</Label>
                  <Select value={logService} onValueChange={setLogService}>
                    <SelectTrigger>
                      <SelectValue placeholder="Any service" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">Any</SelectItem>
                      {services.map(s => (
                        <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Level</Label>
                  <Select value={logLevel} onValueChange={setLogLevel}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="debug">DEBUG</SelectItem>
                      <SelectItem value="info">INFO</SelectItem>
                      <SelectItem value="warn">WARN</SelectItem>
                      <SelectItem value="error">ERROR</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-2">
                <Label>Message</Label>
                <Textarea
                  placeholder="Log message..."
                  value={logMessage}
                  onChange={(e) => setLogMessage(e.target.value)}
                />
              </div>
              <Button onClick={handleInjectLog} disabled={loading === 'log' || !logMessage}>
                <FileText className="h-4 w-4 mr-2" />
                Inject Log
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Alerts Tab */}
        <TabsContent value="alerts">
          <Card>
            <CardHeader>
              <CardTitle>Trigger Alerts</CardTitle>
              <CardDescription>
                Fire alerts at different severity levels.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Alert Name</Label>
                  <Input
                    placeholder="e.g., High CPU Alert"
                    value={alertName}
                    onChange={(e) => setAlertName(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Severity</Label>
                  <Select value={alertSeverity} onValueChange={setAlertSeverity}>
                    <SelectTrigger>
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
                <Label>Service (optional)</Label>
                <Select value={alertService} onValueChange={setAlertService}>
                  <SelectTrigger>
                    <SelectValue placeholder="Any service" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">Any</SelectItem>
                    {services.map(s => (
                      <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Message</Label>
                <Input
                  placeholder="Alert message..."
                  value={alertMessage}
                  onChange={(e) => setAlertMessage(e.target.value)}
                />
              </div>
              <Button onClick={handleTriggerAlert} disabled={loading === 'alert' || !alertName || !alertMessage}>
                <AlertTriangle className="h-4 w-4 mr-2" />
                Trigger Alert
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Incidents Tab */}
        <TabsContent value="incidents">
          <Card>
            <CardHeader>
              <CardTitle>Manage Incidents</CardTitle>
              <CardDescription>
                Create and resolve incidents.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Title</Label>
                  <Input
                    placeholder="e.g., Database outage"
                    value={incidentTitle}
                    onChange={(e) => setIncidentTitle(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Severity</Label>
                  <Select value={incidentSeverity} onValueChange={setIncidentSeverity}>
                    <SelectTrigger>
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
              </div>
              <div className="space-y-2">
                <Label>Service (optional)</Label>
                <Select value={incidentService} onValueChange={setIncidentService}>
                  <SelectTrigger>
                    <SelectValue placeholder="Any service" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">Any</SelectItem>
                    {services.map(s => (
                      <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Description</Label>
                <Textarea
                  placeholder="Incident description..."
                  value={incidentDesc}
                  onChange={(e) => setIncidentDesc(e.target.value)}
                />
              </div>
              <div className="flex gap-2">
                <Button onClick={handleCreateIncident} disabled={loading === 'incident' || !incidentTitle}>
                  <Flame className="h-4 w-4 mr-2" />
                  Create Incident
                </Button>
                <Button variant="outline" onClick={handleResolveAllIncidents} disabled={loading === 'resolve'}>
                  <CheckCircle className="h-4 w-4 mr-2" />
                  Resolve All
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* SLOs Tab */}
        <TabsContent value="slos">
          <Card>
            <CardHeader>
              <CardTitle>SLO Controls</CardTitle>
              <CardDescription>
                Create SLOs and simulate breach/recovery scenarios.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-4 gap-4">
                <div className="space-y-2">
                  <Label>SLO Name</Label>
                  <Input
                    placeholder="e.g., API Availability"
                    value={sloName}
                    onChange={(e) => setSloName(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Service</Label>
                  <Select value={sloService} onValueChange={setSloService}>
                    <SelectTrigger>
                      <SelectValue placeholder="Any" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">Any</SelectItem>
                      {services.map(s => (
                        <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Target %</Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={sloTarget}
                    onChange={(e) => setSloTarget(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Current %</Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={sloCurrent}
                    onChange={(e) => setSloCurrent(e.target.value)}
                  />
                </div>
              </div>
              <div className="flex gap-2">
                <Button onClick={handleCreateSLO} disabled={loading === 'slo' || !sloName}>
                  <Target className="h-4 w-4 mr-2" />
                  Create SLO
                </Button>
                <Button variant="destructive" onClick={handleBreachSLO} disabled={loading === 'breach'}>
                  <XCircle className="h-4 w-4 mr-2" />
                  Breach All SLOs
                </Button>
                <Button variant="outline" onClick={handleRecoverSLO} disabled={loading === 'recover'}>
                  <CheckCircle className="h-4 w-4 mr-2" />
                  Recover All SLOs
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Stress Test Section */}
      <Card>
        <CardHeader>
          <CardTitle>Stress Testing</CardTitle>
          <CardDescription>
            Run multiple simulation cycles to test system health calculation.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex gap-4">
          <Button onClick={handleStressTest} disabled={loading === 'stress'}>
            <RefreshCw className={`h-4 w-4 mr-2 ${loading === 'stress' ? 'animate-spin' : ''}`} />
            Run Stress Test (5 cycles)
          </Button>
          <Button variant="outline" onClick={refetchServices}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh Data
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
