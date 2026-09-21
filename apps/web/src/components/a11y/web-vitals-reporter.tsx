"use client";

import { useReportWebVitals } from "next/web-vitals";
import { reportWebVitalsToSentry, type WebVitalMetric } from "@/lib/telemetry/web-vitals";

export function WebVitalsReporter() {
  useReportWebVitals((metric) => {
    reportWebVitalsToSentry(metric as WebVitalMetric);
  });

  return null;
}
