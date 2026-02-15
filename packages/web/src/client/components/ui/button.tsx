import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center whitespace-nowrap rounded-xl text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pixie-sage-400 focus-visible:ring-offset-2 focus-visible:ring-offset-pixie-cream-50 dark:focus-visible:ring-pixie-glow-sage dark:focus-visible:ring-offset-pixie-dusk-50 disabled:pointer-events-none disabled:opacity-50",
  {
    variants: {
      variant: {
        default: "bg-pixie-sage-600 text-white hover:bg-pixie-sage-700 dark:bg-pixie-glow-sage dark:text-pixie-dusk-50 dark:hover:bg-pixie-sage-400",
        destructive: "bg-red-500 text-white hover:bg-red-600",
        outline: "border border-pixie-cream-300 bg-pixie-cream-50 hover:bg-pixie-cream-200 hover:text-pixie-charcoal-400 dark:border-pixie-dusk-300 dark:bg-pixie-dusk-100 dark:hover:bg-pixie-dusk-200 dark:text-pixie-mist-100",
        secondary: "bg-pixie-cream-200 text-pixie-charcoal-300 hover:bg-pixie-cream-300 dark:bg-pixie-dusk-200 dark:text-pixie-mist-100 dark:hover:bg-pixie-dusk-300",
        ghost: "hover:bg-pixie-sage-50 hover:text-pixie-charcoal-400 dark:hover:bg-pixie-dusk-200 dark:hover:text-pixie-mist-100",
        link: "text-pixie-sage-600 underline-offset-4 hover:underline dark:text-pixie-glow-sage",
      },
      size: {
        default: "h-11 px-4 py-2",
        sm: "h-11 rounded-xl px-3",
        lg: "h-12 rounded-xl px-8",
        icon: "h-11 w-11",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, ...props }, ref) => {
    return (
      <button
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    );
  }
);
Button.displayName = "Button";

export { Button, buttonVariants };
