import { LucideIcon } from "lucide-react";

interface MetricCardProps {
  icon: LucideIcon;
  label: string;
  value: string | number;
  unit: string;
  isActive?: boolean;
}

const MetricCard = ({ icon: Icon, label, value, unit, isActive = false }: MetricCardProps) => {
  return (
    <div className={`
      flex flex-col items-center p-6 rounded-xl
      bg-card border border-border
      transition-all duration-300
      ${isActive ? 'glow-primary border-primary/50' : 'hover:border-primary/30'}
    `}>
      <Icon className={`w-6 h-6 mb-2 ${isActive ? 'text-primary' : 'text-muted-foreground'} transition-colors`} />
      <span className="text-muted-foreground text-sm mb-1">{label}</span>
      <div className="flex items-baseline gap-1">
        <span className={`font-mono text-2xl font-semibold ${isActive ? 'text-primary' : 'text-foreground'}`}>
          {value}
        </span>
        <span className="text-muted-foreground text-sm">{unit}</span>
      </div>
    </div>
  );
};

export default MetricCard;
