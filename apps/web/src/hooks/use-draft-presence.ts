"use client";

import { useEffect, useState, useRef } from "react";
import { toast } from "sonner";
import type { ReviewerPresence, DraftEvent } from "@/lib/queue/draft-events";

interface UseDraftPresenceOptions {
  draftId: string;
  floor: number;
  onOverrideEvent?: (data: unknown) => void;
  onStatusChange?: (data: unknown) => void;
}

export function useDraftPresence({
  draftId,
  floor,
  onOverrideEvent,
  onStatusChange,
}: UseDraftPresenceOptions) {
  const [reviewers, setReviewers] = useState<ReviewerPresence[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  const floorRef = useRef(floor);
  floorRef.current = floor;

  // 1. Report presence heartbeat every 20 seconds
  useEffect(() => {
    if (!draftId) return;

    const reportHeartbeat = async () => {
      try {
        const res = await fetch(`/api/v1/drafts/${draftId}/presence`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ floor: floorRef.current }),
        });
        if (res.ok) {
          const data = (await res.json()) as { reviewers?: ReviewerPresence[] };
          if (data.reviewers) {
            setReviewers(data.reviewers);
          }
        }
      } catch {
        // Network failure
      }
    };

    void reportHeartbeat();
    const interval = setInterval(reportHeartbeat, 20000);
    return () => clearInterval(interval);
  }, [draftId]);

  // 2. Subscribe to SSE events
  useEffect(() => {
    if (!draftId) return;

    let eventSource: EventSource | null = null;
    let isCancelled = false;

    const connectSSE = () => {
      if (isCancelled) return;
      eventSource = new EventSource(`/api/v1/drafts/${draftId}/events`);

      eventSource.onopen = () => {
        setIsConnected(true);
      };

      eventSource.onmessage = (event) => {
        try {
          const parsed = JSON.parse(event.data) as DraftEvent;

          if (parsed.type === "presence") {
            const payload = parsed.data as { reviewers?: ReviewerPresence[] };
            if (payload?.reviewers) {
              setReviewers(payload.reviewers);
            }
          } else if (parsed.type === "override") {
            const data = parsed.data as {
              actorEmail?: string;
              reason?: string;
              toBedId?: string;
            };
            toast.info("Bed Assignment Modified", {
              description: `${data.actorEmail ?? "A reviewer"} modified a bed assignment: "${data.reason ?? "Manual override"}"`,
            });
            onOverrideEvent?.(parsed.data);
          } else if (parsed.type === "status_change") {
            const data = parsed.data as { to?: string };
            toast.success("Draft Status Updated", {
              description: `Draft transitioned to ${data.to ?? "updated state"}.`,
            });
            onStatusChange?.(parsed.data);
          }
        } catch {
          // heartbeat or unparseable
        }
      };

      eventSource.onerror = () => {
        setIsConnected(false);
        eventSource?.close();
        // Reconnect with backoff
        setTimeout(connectSSE, 5000);
      };
    };

    connectSSE();

    return () => {
      isCancelled = true;
      setIsConnected(false);
      eventSource?.close();
    };
  }, [draftId, onOverrideEvent, onStatusChange]);

  return {
    reviewers,
    isConnected,
  };
}
