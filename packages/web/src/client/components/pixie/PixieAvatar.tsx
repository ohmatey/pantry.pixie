import { Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";

interface PixieAvatarProps {
  size?: "sm" | "md" | "lg";
  animate?: boolean;
}

const sizes = {
  sm: "w-8 h-8",
  md: "w-12 h-12",
  lg: "w-24 h-24",
};

const iconSizes = {
  sm: "w-4 h-4",
  md: "w-6 h-6",
  lg: "w-10 h-10",
};

export function PixieAvatar({
  size = "md",
  animate = false,
}: PixieAvatarProps) {
  return (
    <div
      className={cn(
        "rounded-full bg-pixie-sage-100 dark:bg-pixie-dusk-200 flex items-center justify-center",
        sizes[size],
        animate && "animate-sparkle",
      )}
    >
      <Sparkles
        className={cn(
          "text-pixie-sage-500 dark:text-pixie-glow-sage",
          iconSizes[size],
        )}
      />
    </div>
  );
}
