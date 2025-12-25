import { Play, Square, Download, Upload, Wifi, Activity } from "lucide-react";
import { Button } from "@/components/ui/button";
import SpeedGauge from "./SpeedGauge";
import MetricCard from "./MetricCard";
import { useSpeedTest } from "@/hooks/useSpeedTest";

const SpeedTest = () => {
  const {
    phase,
    progress,
    currentSpeed,
    results,
    startTest,
    stopTest,
    isRunning,
  } = useSpeedTest();

  const getPhaseLabel = () => {
    switch (phase) {
      case "ping": return "Testing Latency...";
      case "download": return "Download Speed";
      case "upload": return "Upload Speed";
      case "complete": return "Test Complete";
      default: return "Ready to Test";
    }
  };

  const getDisplaySpeed = () => {
    if (phase === "complete") {
      return results.download;
    }
    return currentSpeed;
  };

  return (
    <div className="flex flex-col items-center gap-8 w-full max-w-2xl mx-auto">
      {/* Main Gauge */}
      <div className="relative">
        <SpeedGauge
          speed={getDisplaySpeed()}
          maxSpeed={300}
          isActive={isRunning}
          label={getPhaseLabel()}
        />
        
        {/* Progress ring around gauge when active */}
        {isRunning && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div className="w-72 h-72 rounded-full border-2 border-primary/20 animate-pulse-glow" />
          </div>
        )}
      </div>

      {/* Start/Stop Button */}
      <Button
        onClick={isRunning ? stopTest : startTest}
        size="lg"
        className={`
          w-20 h-20 rounded-full
          transition-all duration-300
          ${isRunning 
            ? 'bg-destructive hover:bg-destructive/90' 
            : 'bg-primary hover:bg-primary/90 glow-primary'
          }
        `}
      >
        {isRunning ? (
          <Square className="w-8 h-8" />
        ) : (
          <Play className="w-8 h-8 ml-1" />
        )}
      </Button>

      {/* Progress bar */}
      {isRunning && (
        <div className="w-full max-w-md">
          <div className="h-1 bg-muted rounded-full overflow-hidden">
            <div 
              className="h-full bg-primary transition-all duration-300 ease-out"
              style={{ width: `${progress}%` }}
            />
          </div>
          <p className="text-muted-foreground text-sm text-center mt-2">
            {progress.toFixed(0)}% complete
          </p>
        </div>
      )}

      {/* Metrics Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 w-full mt-4">
        <MetricCard
          icon={Wifi}
          label="Ping"
          value={results.ping.toFixed(0)}
          unit="ms"
          isActive={phase === "ping"}
        />
        <MetricCard
          icon={Activity}
          label="Jitter"
          value={results.jitter.toFixed(1)}
          unit="ms"
          isActive={phase === "ping"}
        />
        <MetricCard
          icon={Download}
          label="Download"
          value={results.download.toFixed(1)}
          unit="Mbps"
          isActive={phase === "download"}
        />
        <MetricCard
          icon={Upload}
          label="Upload"
          value={results.upload.toFixed(1)}
          unit="Mbps"
          isActive={phase === "upload"}
        />
      </div>

      {/* Speed quality indicator */}
      {phase === "complete" && (
        <div className="text-center p-6 bg-card rounded-xl border border-border w-full">
          <p className="text-muted-foreground mb-2">Connection Quality</p>
          <p className={`text-2xl font-semibold ${
            results.download >= 100 ? 'text-speed-good' :
            results.download >= 30 ? 'text-speed-medium' : 'text-speed-slow'
          }`}>
            {results.download >= 100 ? 'Excellent' :
             results.download >= 50 ? 'Very Good' :
             results.download >= 30 ? 'Good' :
             results.download >= 10 ? 'Fair' : 'Poor'}
          </p>
          <p className="text-muted-foreground text-sm mt-2">
            {results.download >= 50 
              ? 'Great for 4K streaming, gaming, and large downloads'
              : results.download >= 25
              ? 'Suitable for HD streaming and video calls'
              : 'May experience issues with high-bandwidth activities'}
          </p>
        </div>
      )}

      {/* Info notice */}
      <p className="text-muted-foreground text-xs text-center max-w-md">
        Speed test uses Cloudflare's servers to measure your actual connection speed.
      </p>
    </div>
  );
};

export default SpeedTest;
