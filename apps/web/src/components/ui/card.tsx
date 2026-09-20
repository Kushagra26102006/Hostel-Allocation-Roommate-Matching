"use client";

import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const cardVariants = cva("rounded-card text-text transition-shadow duration-180 ease-standard", {
  variants: {
    variant: {
      default: "bg-surface border border-border shadow-sm",
      elevated: "bg-surface border border-border shadow-md hover:shadow-lg",
      glass: [
        "glass",
        "shadow-md",
        "[--spotlight-x:50%] [--spotlight-y:50%]",
        "before:absolute before:inset-0 before:rounded-card before:opacity-0",
        "before:bg-[radial-gradient(400px_circle_at_var(--spotlight-x)_var(--spotlight-y),hsl(var(--brand-600)/0.12),transparent_70%)]",
        "before:transition-opacity before:duration-280 hover:before:opacity-100",
        "relative overflow-hidden",
      ],
      ghost: "bg-transparent border-none shadow-none",
    },
  },
  defaultVariants: {
    variant: "default",
  },
});

export interface CardProps
  extends React.HTMLAttributes<HTMLDivElement>, VariantProps<typeof cardVariants> {}

const Card = React.forwardRef<HTMLDivElement, CardProps>(
  ({ className, variant, onMouseMove, ...props }, ref) => {
    const cardRef = React.useRef<HTMLDivElement>(null);

    const handleMouseMove = React.useCallback(
      (e: React.MouseEvent<HTMLDivElement>) => {
        if (variant === "glass" && cardRef.current) {
          const rect = cardRef.current.getBoundingClientRect();
          const x = e.clientX - rect.left;
          const y = e.clientY - rect.top;
          cardRef.current.style.setProperty("--spotlight-x", `${x}px`);
          cardRef.current.style.setProperty("--spotlight-y", `${y}px`);
        }
        onMouseMove?.(e);
      },
      [variant, onMouseMove],
    );

    return (
      <div
        ref={cardRef ?? ref}
        className={cn(cardVariants({ variant, className }))}
        onMouseMove={handleMouseMove}
        {...props}
      />
    );
  },
);
Card.displayName = "Card";

const CardHeader = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div ref={ref} className={cn("flex flex-col space-y-1.5 p-6", className)} {...props} />
  ),
);
CardHeader.displayName = "CardHeader";

const CardTitle = React.forwardRef<HTMLParagraphElement, React.HTMLAttributes<HTMLHeadingElement>>(
  ({ className, ...props }, ref) => (
    <h3
      ref={ref}
      className={cn("font-heading font-semibold leading-none tracking-tight text-text", className)}
      {...props}
    />
  ),
);
CardTitle.displayName = "CardTitle";

const CardDescription = React.forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLParagraphElement>
>(({ className, ...props }, ref) => (
  <p ref={ref} className={cn("text-sm text-muted", className)} {...props} />
));
CardDescription.displayName = "CardDescription";

const CardContent = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div ref={ref} className={cn("p-6 pt-0", className)} {...props} />
  ),
);
CardContent.displayName = "CardContent";

const CardFooter = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div ref={ref} className={cn("flex items-center p-6 pt-0", className)} {...props} />
  ),
);
CardFooter.displayName = "CardFooter";

export { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter };
