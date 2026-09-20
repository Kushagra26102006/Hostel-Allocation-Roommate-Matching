"use client";

import * as React from "react";
import type { AllocationProgressEvent } from "@hostelhub/shared";

interface UseRunEventsOptions {
  runId: string;
  /** Poll interval in ms when SSE is unavailable. Default 3000. */
  pollInterval?: number;
  onComplete?: (event: AllocationProgressEvent) => void;
  onError?: (event: AllocationProgressEvent) => void;
}

interface UseRunEventsResult {
  events: AllocationProgressEvent[];
  latest: AllocationProgressEvent | null;
  isConnected: boolean;
  isPolling: boolean;
  isTerminal: boolean;
}

/**
 * useRunEvents — consumes Server-Sent Events from GET /api/v1/runs/:id/events.
 * Falls back to polling GET /api/v1/runs/:id every `pollInterval` ms if SSE
 * connection is refused or fails (e.g. edge-runtime, proxy stripping keep-alive).
 *
 * Respects reduced-motion preference: returns data at the same frequency but
 * callers should use `prefersReducedMotion` from `use-motion-preference` for
 * rendering decisions.
 */
export function useRunEvents({
  runId,
  pollInterval = 3000,
  onComplete,
  onError,
}: UseRunEventsOptions): UseRunEventsResult {
  const [events, setEvents] = React.useState<AllocationProgressEvent[]>([]);
  const [latest, setLatest] = React.useState<AllocationProgressEvent | null>(null);
  const [isConnected, setIsConnected] = React.useState(false);
  const [isPolling, setIsPolling] = React.useState(false);
  const [isTerminal, setIsTerminal] = React.useState(false);

  // Refs to avoid stale closures and allow cleanup
  const esRef = React.useRef<EventSource | null>(null);
  const pollRef = React.useRef<ReturnType<typeof setInterval> | null>(null);
  const terminalRef = React.useRef(false);

  const addEvent = React.useCallback(
    (evt: AllocationProgressEvent) => {
      setEvents((prev) => [...prev, evt]);
      setLatest(evt);
      if (evt.completed || evt.cancelled || evt.error) {
        terminalRef.current = true;
        setIsTerminal(true);
        if (evt.completed || evt.cancelled) onComplete?.(evt);
        if (evt.error) onError?.(evt);
      }
    },
    [onComplete, onError],
  );

  // Polling fallback: fetches /api/v1/runs/:id and synthesizes a progress event
  const startPolling = React.useCallback(() => {
    if (pollRef.current) return;
    setIsPolling(true);
    pollRef.current = setInterval(async () => {
      if (terminalRef.current) {
        if (pollRef.current) clearInterval(pollRef.current);
        pollRef.current = null;
        setIsPolling(false);
        return;
      }
      try {
        const res = await fetch(`/api/v1/runs/${runId}`);
        if (!res.ok) return;
        const data = (await res.json()) as {
          run: {
            status: string;
            progress?: { stage?: string; percent?: number; message?: string };
            metrics?: unknown;
            error?: string;
          };
        };
        const { run } = data;
        const evt: AllocationProgressEvent = {
          runId,
          stageCode: (run.progress?.stage ?? "freeze") as AllocationProgressEvent["stageCode"],
          stageLabel: run.progress?.stage ?? "freeze",
          percent: run.progress?.percent ?? 0,
          message: run.progress?.message ?? `Status: ${run.status}`,
          timestamp: new Date().toISOString(),
          metrics: run.metrics,
          completed: run.status === "completed",
          cancelled: run.status === "cancelled",
          error: run.status === "failed" ? (run.error ?? "Run failed") : undefined,
        };
        addEvent(evt);
      } catch {
        // Network error; keep retrying
      }
    }, pollInterval);
  }, [runId, pollInterval, addEvent]);

  React.useEffect(() => {
    if (!runId) return;
    terminalRef.current = false;
    setIsTerminal(false);
    setEvents([]);
    setLatest(null);

    // Try SSE first
    let sseConnected = false;
    let sseErrorCount = 0;

    const es = new EventSource(`/api/v1/runs/${runId}/events`);
    esRef.current = es;

    es.onopen = () => {
      sseConnected = true;
      setIsConnected(true);
    };

    es.onmessage = (e) => {
      try {
        const parsed = JSON.parse(e.data as string) as AllocationProgressEvent;
        addEvent(parsed);
        if (terminalRef.current) {
          es.close();
          setIsConnected(false);
        }
      } catch {
        // Ignore parse error (keep-alive comment etc.)
      }
    };

    es.onerror = () => {
      sseErrorCount++;
      if (!sseConnected || sseErrorCount > 2) {
        // SSE not available; fall back to polling
        es.close();
        setIsConnected(false);
        startPolling();
      }
    };

    return () => {
      es.close();
      esRef.current = null;
      setIsConnected(false);
      if (pollRef.current) {
        clearInterval(pollRef.current);
        pollRef.current = null;
        setIsPolling(false);
      }
    };
  }, [runId, addEvent, startPolling]);

  return { events, latest, isConnected, isPolling, isTerminal };
}
