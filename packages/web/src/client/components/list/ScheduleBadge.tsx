import { CalendarClock } from "lucide-react";

interface ScheduleBadgeProps {
  schedule: string;
  roundNumber: number;
}

const SCHEDULE_LABELS: Record<string, string> = {
  weekly: "Weekly",
  biweekly: "Biweekly",
  monthly: "Monthly",
};

export function ScheduleBadge({ schedule, roundNumber }: ScheduleBadgeProps) {
  const label = SCHEDULE_LABELS[schedule] || schedule;

  return (
    <div className="inline-flex items-center gap-1.5 bg-pixie-sage-100 dark:bg-pixie-sage-900/30 text-pixie-sage-700 dark:text-pixie-glow-sage rounded-full px-2.5 py-0.5 text-xs font-medium">
      <CalendarClock className="w-3 h-3" />
      <span>{label}</span>
      {roundNumber > 0 && (
        <span className="text-pixie-sage-500 dark:text-pixie-sage-400">
          Round {roundNumber}
        </span>
      )}
    </div>
  );
}
