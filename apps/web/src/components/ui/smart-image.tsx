"use client";

import * as React from "react";
import Image, { type ImageProps } from "next/image";
import { Building2 } from "lucide-react";
import { cn } from "@/lib/utils";

export interface SmartImageProps extends Omit<ImageProps, "onError" | "onLoad"> {
  fallbackSrc?: string;
  fallbackIcon?: React.ReactNode;
  aspectRatio?: "16/9" | "4/3" | "1/1" | "21/9" | "3/2" | "auto";
  containerClassName?: string;
}

export function SmartImage({
  src,
  alt,
  className,
  containerClassName,
  aspectRatio = "16/9",
  fallbackSrc: _fallbackSrc,
  fallbackIcon,
  fill,
  width,
  height,
  priority = false,
  ...props
}: SmartImageProps) {
  const [isLoading, setIsLoading] = React.useState(true);
  const [hasError, setHasError] = React.useState(false);

  const aspectRatioClass = {
    "16/9": "aspect-[16/9]",
    "4/3": "aspect-[4/3]",
    "1/1": "aspect-square",
    "21/9": "aspect-[21/9]",
    "3/2": "aspect-[3/2]",
    auto: "",
  }[aspectRatio];

  if (hasError || !src) {
    return (
      <div
        className={cn(
          "relative flex items-center justify-center overflow-hidden rounded-lg bg-surface-muted border border-border/60 text-muted",
          aspectRatioClass,
          containerClassName,
        )}
        role="img"
        aria-label={alt || "Image placeholder"}
      >
        {fallbackIcon ?? (
          <div className="flex flex-col items-center gap-2 p-4 text-center">
            <Building2 className="h-8 w-8 text-muted/60 stroke-[1.5]" />
            <span className="text-xs text-muted/80 line-clamp-1">{alt || "Hostel Facility"}</span>
          </div>
        )}
      </div>
    );
  }

  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-lg bg-surface-muted",
        aspectRatioClass,
        containerClassName,
      )}
    >
      {/* Loading Skeleton Shimmer */}
      {isLoading && <div className="absolute inset-0 z-10 animate-pulse bg-muted/15" />}

      {fill ? (
        <Image
          src={src}
          alt={alt}
          fill
          priority={priority}
          onLoad={() => setIsLoading(false)}
          onError={() => {
            setIsLoading(false);
            setHasError(true);
          }}
          className={cn(
            "object-cover transition-all duration-300",
            isLoading ? "scale-105 blur-sm opacity-0" : "scale-100 blur-0 opacity-100",
            className,
          )}
          {...props}
        />
      ) : (
        <Image
          src={src}
          alt={alt}
          width={width ?? 600}
          height={height ?? 400}
          priority={priority}
          onLoad={() => setIsLoading(false)}
          onError={() => {
            setIsLoading(false);
            setHasError(true);
          }}
          className={cn(
            "object-cover transition-all duration-300",
            isLoading ? "scale-105 blur-sm opacity-0" : "scale-100 blur-0 opacity-100",
            className,
          )}
          {...props}
        />
      )}
    </div>
  );
}
