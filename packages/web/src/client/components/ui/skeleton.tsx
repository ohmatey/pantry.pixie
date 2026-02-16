import { cn } from "@/lib/utils";

interface SkeletonProps {
  className?: string;
}

export function Skeleton({ className }: SkeletonProps) {
  return (
    <div
      className={cn(
        "animate-pulse rounded-md bg-pixie-sage-100/50 dark:bg-pixie-dusk-200/50",
        className,
      )}
    />
  );
}
