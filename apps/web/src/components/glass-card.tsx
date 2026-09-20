"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import { useMotionPreference } from "@/hooks/use-motion-preference";

interface GlassCardProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Enable cursor spotlight. Disabled automatically when reduced motion is active. */
  spotlight?: boolean;
}

/**
 * A glass-morphism card with an optional cursor-spotlight highlight.
 * The spotlight is a radial gradient that follows the mouse — respects
 * prefers-reduced-motion by disabling the effect entirely.
 */
export const GlassCard = React.forwardRef<HTMLDivElement, GlassCardProps>(
  ({ className, children, spotlight = true, onMouseMove, style, ...props }, ref) => {
    const { prefersReducedMotion } = useMotionPreference();
    const cardRef = React.useRef<HTMLDivElement>(null);
    const [spotlightPos, setSpotlightPos] = React.useState({ x: -200, y: -200 });

    const handleMouseMove = React.useCallback(
      (e: React.MouseEvent<HTMLDivElement>) => {
        if (spotlight && !prefersReducedMotion && cardRef.current) {
          const rect = cardRef.current.getBoundingClientRect();
          setSpotlightPos({
            x: e.clientX - rect.left,
            y: e.clientY - rect.top,
          });
        }
        onMouseMove?.(e);
      },
      [spotlight, prefersReducedMotion, onMouseMove],
    );

    const handleMouseLeave = React.useCallback(() => {
      setSpotlightPos({ x: -200, y: -200 });
    }, []);

    const showSpotlight = spotlight && !prefersReducedMotion;

    return (
      <div
        ref={cardRef ?? ref}
        className={cn(
          "relative overflow-hidden rounded-card",
          "glass",
          "transition-transform duration-280 ease-standard",
          className,
        )}
        style={
          showSpotlight
            ? {
                ...style,
                ["--spotlight-x" as string]: `${spotlightPos.x}px`,
                ["--spotlight-y" as string]: `${spotlightPos.y}px`,
              }
            : style
        }
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
        {...props}
      >
        {/* Spotlight layer */}
        {showSpotlight && (
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-0 rounded-card opacity-100 transition-opacity duration-180"
            style={{
              background: `radial-gradient(350px circle at ${spotlightPos.x}px ${spotlightPos.y}px, hsl(var(--brand-600)/0.15), transparent 70%)`,
            }}
          />
        )}
        {children}
      </div>
    );
  },
);
GlassCard.displayName = "GlassCard";
