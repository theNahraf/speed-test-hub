import { useEffect, useState } from "react";

interface SpeedGaugeProps {
  speed: number;
  maxSpeed: number;
  isActive: boolean;
  label: string;
}

const SpeedGauge = ({ speed, maxSpeed, isActive, label }: SpeedGaugeProps) => {
  const [displaySpeed, setDisplaySpeed] = useState(0);
  
  useEffect(() => {
    if (isActive) {
      const interval = setInterval(() => {
        setDisplaySpeed(prev => {
          const diff = speed - prev;
          return prev + diff * 0.1;
        });
      }, 50);
      return () => clearInterval(interval);
    } else {
      setDisplaySpeed(speed);
    }
  }, [speed, isActive]);

  const percentage = Math.min((displaySpeed / maxSpeed) * 100, 100);
  const circumference = 2 * Math.PI * 120;
  const strokeDashoffset = circumference - (percentage / 100) * circumference * 0.75;

  const getSpeedColor = () => {
    if (displaySpeed >= 100) return "stroke-speed-good";
    if (displaySpeed >= 30) return "stroke-speed-medium";
    return "stroke-speed-slow";
  };

  return (
    <div className="relative flex flex-col items-center">
      <svg 
        width="280" 
        height="200" 
        viewBox="0 0 280 200" 
        className="drop-shadow-2xl"
      >
        {/* Background arc */}
        <path
          d="M 20 180 A 120 120 0 0 1 260 180"
          fill="none"
          stroke="hsl(var(--muted))"
          strokeWidth="12"
          strokeLinecap="round"
        />
        
        {/* Progress arc */}
        <path
          d="M 20 180 A 120 120 0 0 1 260 180"
          fill="none"
          className={`${getSpeedColor()} transition-all duration-300`}
          strokeWidth="12"
          strokeLinecap="round"
          strokeDasharray={circumference * 0.75}
          strokeDashoffset={strokeDashoffset}
          style={{
            filter: isActive ? 'drop-shadow(0 0 10px currentColor)' : 'none',
            transition: 'stroke-dashoffset 0.3s ease-out'
          }}
        />
        
        {/* Tick marks */}
        {[0, 25, 50, 75, 100].map((tick, i) => {
          const angle = -180 + (tick / 100) * 180;
          const radians = (angle * Math.PI) / 180;
          const x1 = 140 + 100 * Math.cos(radians);
          const y1 = 180 + 100 * Math.sin(radians);
          const x2 = 140 + 110 * Math.cos(radians);
          const y2 = 180 + 110 * Math.sin(radians);
          
          return (
            <line
              key={i}
              x1={x1}
              y1={y1}
              x2={x2}
              y2={y2}
              stroke="hsl(var(--muted-foreground))"
              strokeWidth="2"
            />
          );
        })}
      </svg>
      
      {/* Speed display */}
      <div className="absolute top-16 flex flex-col items-center">
        <span className={`font-mono text-6xl font-bold ${isActive ? 'glow-text text-gradient' : 'text-foreground'} transition-all duration-300`}>
          {displaySpeed.toFixed(1)}
        </span>
        <span className="text-muted-foreground text-lg mt-1">Mbps</span>
        <span className="text-primary text-sm font-medium mt-2">{label}</span>
      </div>
    </div>
  );
};

export default SpeedGauge;
