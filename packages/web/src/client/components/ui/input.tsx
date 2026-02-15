import * as React from "react";
import { cn } from "@/lib/utils";

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type, ...props }, ref) => {
    return (
      <input
        type={type}
        className={cn(
          "flex h-10 w-full rounded-xl border border-pixie-cream-300 bg-pixie-cream-50 px-3 py-2 text-sm ring-offset-pixie-cream-50 file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-pixie-charcoal-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pixie-sage-400 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 dark:border-pixie-dusk-300 dark:bg-pixie-dusk-100 dark:ring-offset-pixie-dusk-50 dark:placeholder:text-pixie-mist-300 dark:focus-visible:ring-pixie-glow-sage",
          className
        )}
        ref={ref}
        {...props}
      />
    );
  }
);
Input.displayName = "Input";

export { Input };
