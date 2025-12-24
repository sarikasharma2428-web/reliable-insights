import { useState } from 'react';
import { useLogs } from '@/hooks/useLogs';
import { useServices } from '@/hooks/useServices';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Search, Filter, RefreshCw } from 'lucide-react';
import { LogViewer } from '@/components/sre/LogViewer';
import { Skeleton } from '@/components/ui/skeleton';

export default function Logs() {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedService, setSelectedService] = useState<string>('all');
  const [selectedLevel, setSelectedLevel] = useState<string>('all');
  
  const { logs, loading } = useLogs(200);
  const { services } = useServices();

  const filteredLogs = logs.filter((log) => {
    const matchesSearch = log.message.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          (log.services?.name || '').toLowerCase().includes(searchQuery.toLowerCase());
    const matchesService = selectedService === 'all' || log.services?.name === selectedService;
    const matchesLevel = selectedLevel === 'all' || log.level === selectedLevel;
    return matchesSearch && matchesService && matchesLevel;
  });

  const logLevels = ['error', 'warn', 'info', 'debug'];
  const errorCount = logs.filter((l) => l.level === 'error').length;
  const warnCount = logs.filter((l) => l.level === 'warn').length;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Logs Explorer</h1>
          <p className="text-sm text-muted-foreground">
            Real-time logs from all services
          </p>
        </div>
        <div className="flex items-center gap-2 text-sm">
          <span className="text-terminal-error font-mono">{errorCount} errors</span>
          <span className="text-muted-foreground">•</span>
          <span className="text-terminal-warning font-mono">{warnCount} warnings</span>
        </div>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search logs..."
            className="pl-9 bg-secondary/50 border-border font-mono"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        <Select value={selectedService} onValueChange={setSelectedService}>
          <SelectTrigger className="w-48 bg-secondary/50">
            <Filter className="h-4 w-4 mr-2" />
            <SelectValue placeholder="All services" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All services</SelectItem>
            {services.map((service) => (
              <SelectItem key={service.id} value={service.name}>
                {service.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={selectedLevel} onValueChange={setSelectedLevel}>
          <SelectTrigger className="w-36 bg-secondary/50">
            <SelectValue placeholder="All levels" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All levels</SelectItem>
            {logLevels.map((level) => (
              <SelectItem key={level} value={level}>
                {level.toUpperCase()}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Button variant="outline" size="icon" className="shrink-0">
          <RefreshCw className="h-4 w-4" />
        </Button>
      </div>

      {/* Log Viewer */}
      {loading ? (
        <Skeleton className="h-[500px]" />
      ) : (
        <LogViewer logs={filteredLogs} maxHeight="calc(100vh - 280px)" />
      )}
    </div>
  );
}
