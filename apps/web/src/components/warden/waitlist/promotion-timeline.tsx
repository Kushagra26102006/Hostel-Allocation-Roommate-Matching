"use client";

import * as React from "react";
import { Badge } from "@/components/ui/badge";
import { History, CheckCircle2, Clock, BedDouble } from "lucide-react";

export interface PromotionEvent {
  id: string;
  studentName: string;
  referenceNumber: string;
  bedName: string;
  roomNumber: string;
  hostelName: string;
  trigger: string;
  policy: "auto_confirm" | "proposal_required" | "manual";
  amendmentVersion?: number;
  timestamp: string;
  actor: string;
}

interface PromotionTimelineProps {
  events: PromotionEvent[];
}

export function PromotionTimeline({ events }: PromotionTimelineProps) {
  if (events.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-10 text-muted-foreground border rounded-xl bg-card">
        <History className="w-8 h-8 stroke-1 text-muted-foreground/60 mb-2" />
        <p className="text-sm font-medium text-foreground">No Promotions Recorded Yet</p>
        <p className="text-xs text-muted-foreground mt-0.5">
          Vacated beds will trigger automated promotions and log an audit chain timeline here.
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-xl border bg-card p-5 space-y-4 shadow-sm">
      <div className="flex items-center justify-between pb-3 border-b">
        <div className="flex items-center gap-2">
          <History className="w-4 h-4 text-primary" />
          <h3 className="text-sm font-semibold text-foreground">Promotion History Timeline</h3>
        </div>
        <Badge variant="secondary" className="text-xs font-mono">
          {events.length} Event{events.length > 1 ? "s" : ""}
        </Badge>
      </div>

      <div className="relative pl-6 space-y-6 before:absolute before:left-2.5 before:top-2 before:bottom-2 before:w-0.5 before:bg-muted-foreground/20">
        {events.map((event) => {
          const formattedDate = new Date(event.timestamp).toLocaleDateString("en-US", {
            month: "short",
            day: "numeric",
            hour: "2-digit",
            minute: "2-digit",
          });

          return (
            <div key={event.id} className="relative group">
              {/* Dot */}
              <div className="absolute -left-6 top-1 flex h-5 w-5 items-center justify-center rounded-full bg-background border-2 border-emerald-500 text-emerald-500 shadow-sm">
                <CheckCircle2 className="w-3 h-3" />
              </div>

              <div className="rounded-lg border bg-muted/20 hover:bg-muted/40 transition-colors p-3.5 space-y-2">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-sm text-foreground">
                      {event.studentName}
                    </span>
                    <span className="text-xs text-muted-foreground font-mono">
                      ({event.referenceNumber})
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    <Badge
                      variant="outline"
                      className="text-[10px] uppercase font-bold tracking-wider"
                    >
                      {event.trigger.replace("_", " ")}
                    </Badge>

                    {event.amendmentVersion && (
                      <Badge className="bg-primary/10 text-primary border-primary/20 text-[10px] font-mono">
                        v{event.amendmentVersion} Amendment
                      </Badge>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-3 text-xs text-muted-foreground">
                  <span className="inline-flex items-center gap-1">
                    <BedDouble className="w-3.5 h-3.5 text-emerald-500" />
                    Promoted to Room {event.roomNumber}, Bed {event.bedName} ({event.hostelName})
                  </span>
                </div>

                <div className="flex items-center justify-between text-[11px] text-muted-foreground/80 pt-1 border-t border-border/50">
                  <span>Actor: {event.actor}</span>
                  <span className="inline-flex items-center gap-1 font-mono">
                    <Clock className="w-3 h-3" />
                    {formattedDate}
                  </span>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
