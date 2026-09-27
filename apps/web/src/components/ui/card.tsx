"use client";

import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const cardVariants = cva("rounded-card text-foreground transition-all duration-200 ease-standard", {
  variants: {
    variant: {
      default: [
        "bg-surface border border-border/70 shadow-xs",
        "hover:border-border hover:shadow-sm",
      ],
      interactive: [
        "bg-surface border border-border/70 shadow-xs cursor-pointer",
        "hover:-translate-y-[2px] hover:border-brand-500/40 hover:shadow-md",
        "active:translate-y-0 active:scale-[0.99]",
      ],
      elevated: [
        "bg-surface border border-border/60 shadow-sm",
        "hover:-translate-y-[2px] hover:shadow-md hover:border-border",
      ],
      subtle: [
        "bg-surface-muted/60 border border-border/50 shadow-none",
        "hover:bg-surface-muted/90",
      ],
      glass: [
        "bg-surface/85 backdrop-blur-md border border-border/70 shadow-sm",
        "hover:border-brand-500/30 hover:shadow-md",
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
  ({ className, variant, ...props }, ref) => {
    return <div ref={ref} className={cn(cardVariants({ variant, className }))} {...props} />;
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
      className={cn(
        "font-heading font-semibold text-base sm:text-lg leading-snug tracking-tight text-foreground",
        className,
      )}
      {...props}
    />
  ),
);
CardTitle.displayName = "CardTitle";

const CardDescription = React.forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLParagraphElement>
>(({ className, ...props }, ref) => (
  <p
    ref={ref}
    className={cn("text-xs sm:text-sm text-muted leading-relaxed", className)}
    {...props}
  />
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
    <div
      ref={ref}
      className={cn("flex items-center p-6 pt-0 border-t border-border/40 mt-auto", className)}
      {...props}
    />
  ),
);
CardFooter.displayName = "CardFooter";

export { Card, CardHeader, CardFooter, CardTitle, CardDescription, CardContent, cardVariants };
