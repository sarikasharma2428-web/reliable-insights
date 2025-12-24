import { Activity, Pause, Play, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useRealtimeSimulation } from '@/hooks/useRealtimeSimulation';
import { useState } from 'react';

export const SimulationControl = () => {
  const [enabled, setEnabled] = useState(true);
  const { isRunning, lastUpdate, stats, startSimulation, stopSimulation, runSimulation } = useRealtimeSimulation(enabled, 5000);

  const toggleSimulation = () => {
    if (isRunning) {
      stopSimulation();
      setEnabled(false);
    } else {
      setEnabled(true);
      startSimulation();
    }
  };

  return (
    <div className="flex items-center gap-3 bg-card border border-border rounded-lg px-4 py-2">
      <div className="flex items-center gap-2">
        <Activity className={`h-4 w-4 ${isRunning ? 'text-green-500 animate-pulse' : 'text-muted-foreground'}`} />
        <span className="text-sm font-medium">Real-time Simulation</span>
      </div>
      
      <Badge variant={isRunning ? "default" : "secondary"} className="text-xs">
        {isRunning ? 'LIVE' : 'PAUSED'}
      </Badge>

      <div className="flex items-center gap-1 ml-auto">
        <Button
          variant="ghost"
          size="sm"
          onClick={runSimulation}
          disabled={!isRunning}
          title="Force refresh"
        >
          <RefreshCw className="h-4 w-4" />
        </Button>
        <Button
          variant={isRunning ? "destructive" : "default"}
          size="sm"
          onClick={toggleSimulation}
        >
          {isRunning ? (
            <>
              <Pause className="h-4 w-4 mr-1" />
              Pause
            </>
          ) : (
            <>
              <Play className="h-4 w-4 mr-1" />
              Start
            </>
          )}
        </Button>
      </div>

      {lastUpdate && (
        <span className="text-xs text-muted-foreground">
          Updated: {lastUpdate.toLocaleTimeString()}
        </span>
      )}
    </div>
  );
};
