/**
 * Web Vitals Telemetry & Sentry Reporting
 * Captures core web vitals (LCP, CLS, INP, FCP, TTFB) and reports them to Sentry and Beacon.
 */

export interface WebVitalMetric {
  id: string;
  name: "CLS" | "FCP" | "FID" | "INP" | "LCP" | "TTFB";
  value: number;
  label?: "web-vital" | "custom";
  rating?: "good" | "needs-improvement" | "poor";
  navigationType?: string;
}

export function reportWebVitalsToSentry(metric: WebVitalMetric) {
  // 1. Log in development mode for developer feedback
  if (process.env.NODE_ENV === "development") {
    console.debug(
      `[Web-Vitals] ${metric.name}: ${metric.value.toFixed(2)} (${metric.rating ?? "unrated"})`,
    );
  }

  // 2. Dispatch to Sentry if available in runtime
  if (typeof window !== "undefined") {
    const win = window as unknown as {
      Sentry?: {
        metrics?: {
          distribution: (name: string, value: number, options?: Record<string, unknown>) => void;
        };
        captureMessage?: (msg: string, context?: Record<string, unknown>) => void;
        addBreadcrumb?: (crumb: Record<string, unknown>) => void;
      };
    };

    if (win.Sentry?.metrics?.distribution) {
      win.Sentry.metrics.distribution(`web_vitals.${metric.name.toLowerCase()}`, metric.value, {
        unit: metric.name === "CLS" ? "ratio" : "millisecond",
        tags: {
          rating: metric.rating || "unknown",
          vital: metric.name,
        },
      });
    } else if (win.Sentry?.addBreadcrumb) {
      win.Sentry.addBreadcrumb({
        category: "web-vitals",
        message: `${metric.name}: ${metric.value}`,
        level: metric.rating === "poor" ? "warning" : "info",
        data: metric,
      });
    }

    // 3. Fallback to Navigator Beacon endpoint if configured
    if (typeof navigator !== "undefined" && typeof navigator.sendBeacon === "function") {
      try {
        const payload = JSON.stringify({
          vital: metric.name,
          value: metric.value,
          id: metric.id,
          rating: metric.rating,
          timestamp: Date.now(),
          url: window.location.pathname,
        });
        navigator.sendBeacon("/api/v1/telemetry/vitals", payload);
      } catch {
        // Beacon optional
      }
    }
  }
}
