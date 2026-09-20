"use client";

import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  // Base styles — no hard-coded colours
  [
    "inline-flex items-center justify-center gap-2 whitespace-nowrap",
    "rounded-ctrl text-sm font-medium",
    "ring-offset-background",
    "transition-all duration-180 ease-standard",
    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
    "disabled:pointer-events-none disabled:opacity-50",
    "[&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0",
  ],
  {
    variants: {
      variant: {
        /** Primary: brand gradient */
        primary: [
          "bg-gradient-brand text-white shadow-md",
          "hover:opacity-90 hover:shadow-lg hover:-translate-y-0.5",
          "active:translate-y-0 active:opacity-100",
        ],
        /** Secondary: subtle brand tint */
        secondary: [
          "bg-brand-100 text-brand-700 dark:bg-brand-900/40 dark:text-brand-300",
          "hover:bg-brand-200 dark:hover:bg-brand-800/60",
          "border border-brand-200 dark:border-brand-700",
        ],
        /** Ghost: transparent, shows on hover */
        ghost: [
          "text-text hover:bg-surface/80 hover:text-text",
          "dark:hover:bg-surface/20",
        ],
        /** Destructive: danger semantic colour */
        destructive: [
          "bg-danger text-white shadow-md",
          "hover:bg-danger/90 hover:shadow-lg hover:-translate-y-0.5",
        ],
        /** Outline: bordered, no fill */
        outline: [
          "border border-border bg-transparent text-text",
          "hover:bg-surface/60 hover:border-brand-400",
        ],
        /** Link: inline text button */
        link: [
          "text-brand-600 dark:text-brand-400 underline-offset-4",
          "hover:underline",
        ],
      },
      size: {
        sm:      "h-9  px-3 text-xs",
        default: "h-10 px-4 py-2",
        lg:      "h-11 px-8 text-base",
        xl:      "h-12 px-10 text-base",
        icon:    "h-10 w-10",
      },
    },
    defaultVariants: {
      variant: "primary",
      size: "default",
    },
  },
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    );
  },
);
Button.displayName = "Button";

export { Button, buttonVariants };
