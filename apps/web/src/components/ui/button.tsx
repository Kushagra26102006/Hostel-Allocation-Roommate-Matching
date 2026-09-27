"use client";

import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  [
    "inline-flex items-center justify-center gap-2 whitespace-nowrap",
    "rounded-ctrl text-sm font-medium",
    "ring-offset-background",
    "transition-all duration-180 ease-standard",
    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
    "disabled:pointer-events-none disabled:opacity-50 select-none",
    "[&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0",
  ],
  {
    variants: {
      variant: {
        /** Primary: Single Dominant Electric Indigo */
        primary: [
          "bg-brand-500 text-white shadow-sm",
          "hover:bg-brand-600 hover:shadow hover:-translate-y-[1px]",
          "active:scale-[0.97] active:translate-y-0",
        ],
        /** Secondary: Clean neutral surface with subtle border */
        secondary: [
          "bg-surface text-foreground border border-border/80 shadow-xs",
          "hover:bg-surface-muted hover:border-border",
          "active:scale-[0.97]",
        ],
        /** Ghost: transparent, shows on hover */
        ghost: [
          "text-foreground/80 hover:bg-muted/10 hover:text-foreground",
          "active:scale-[0.97]",
        ],
        /** Destructive: danger semantic colour */
        destructive: [
          "bg-danger text-white shadow-sm",
          "hover:bg-danger/90 hover:shadow hover:-translate-y-[1px]",
          "active:scale-[0.97] active:translate-y-0",
        ],
        /** Outline: bordered, clean neutral hover */
        outline: [
          "border border-border/70 bg-transparent text-foreground",
          "hover:bg-surface-muted hover:border-brand-500/40",
          "active:scale-[0.97]",
        ],
        /** Link: inline text button */
        link: [
          "text-brand-600 dark:text-brand-400 underline-offset-4",
          "hover:underline active:opacity-80",
        ],
      },
      size: {
        sm: "h-8 px-3 text-xs rounded-md",
        default: "h-10 px-4 py-2",
        lg: "h-11 px-6 text-base",
        xl: "h-12 px-8 text-base",
        icon: "h-10 w-10 min-target-size",
      },
    },
    defaultVariants: {
      variant: "primary",
      size: "default",
    },
  },
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>, VariantProps<typeof buttonVariants> {
  asChild?: boolean;
  loading?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  (
    { className, variant, size, asChild = false, loading = false, disabled, children, ...props },
    ref,
  ) => {
    if (asChild) {
      return (
        <Slot className={cn(buttonVariants({ variant, size, className }))} ref={ref} {...props}>
          {children}
        </Slot>
      );
    }

    return (
      <button
        ref={ref}
        disabled={disabled || loading}
        className={cn(buttonVariants({ variant, size, className }))}
        {...props}
      >
        {loading ? (
          <>
            <Loader2 className="size-4 animate-spin text-current" aria-hidden="true" />
            <span className="opacity-90">{children}</span>
          </>
        ) : (
          children
        )}
      </button>
    );
  },
);
Button.displayName = "Button";

export interface IconButtonProps extends Omit<ButtonProps, "size"> {
  size?: "sm" | "default" | "lg";
  "aria-label": string;
}

const IconButton = React.forwardRef<HTMLButtonElement, IconButtonProps>(
  ({ className, size = "default", ...props }, ref) => {
    const sizeMap = {
      sm: "h-8 w-8 min-target-size",
      default: "h-10 w-10 min-target-size",
      lg: "h-11 w-11 min-target-size",
    };
    return <Button ref={ref} className={cn("p-0 shrink-0", sizeMap[size], className)} {...props} />;
  },
);
IconButton.displayName = "IconButton";

export { Button, IconButton, buttonVariants };
