import { motion } from "framer-motion";
import { Cloud, CloudOff, AlertCircle, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

export type SyncStatus = 'synced' | 'pending' | 'conflict' | 'syncing';

interface SyncStatusBadgeProps {
  status: SyncStatus;
  className?: string;
  showLabel?: boolean;
}

const STATUS_CONFIG = {
  synced: {
    icon: Cloud,
    label: 'Synced',
    color: 'text-pixie-sage-500 dark:text-pixie-glow-sage',
    bgColor: 'bg-pixie-sage-50 dark:bg-pixie-dusk-300',
  },
  pending: {
    icon: CloudOff,
    label: 'Pending',
    color: 'text-amber-600 dark:text-amber-500',
    bgColor: 'bg-amber-50 dark:bg-amber-900/20',
  },
  conflict: {
    icon: AlertCircle,
    label: 'Conflict',
    color: 'text-red-600 dark:text-red-500',
    bgColor: 'bg-red-50 dark:bg-red-900/20',
  },
  syncing: {
    icon: Loader2,
    label: 'Syncing',
    color: 'text-blue-600 dark:text-blue-500',
    bgColor: 'bg-blue-50 dark:bg-blue-900/20',
  },
};

export function SyncStatusBadge({ status, className, showLabel = false }: SyncStatusBadgeProps) {
  const config = STATUS_CONFIG[status];
  const Icon = config.icon;

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.8 }}
      animate={{ opacity: 1, scale: 1 }}
      className={cn(
        "inline-flex items-center gap-1.5 px-2 py-1 rounded-full text-xs",
        config.bgColor,
        config.color,
        className
      )}
    >
      <Icon className={cn("w-3 h-3", status === 'syncing' && "animate-spin")} />
      {showLabel && <span className="font-medium">{config.label}</span>}
    </motion.div>
  );
}
