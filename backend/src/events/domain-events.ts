import { EventEmitter } from "events";
import { logger } from "../config/logger.js";

export type DomainEventType =
  | "application.submitted"
  | "run.completed"
  | "draft.approved"
  | "draft.rejected"
  | "draft.changes_requested"
  | "allocation.published"
  | "waitlist.promoted"
  | "room.changed"
  | "appeal.submitted"
  | "appeal.decided";

export interface DomainEvent<T = unknown> {
  type: DomainEventType;
  institutionId: string;
  timestamp: Date;
  payload: T;
  actor?:
    | {
        userId: string;
        email: string;
        role: string;
      }
    | undefined;
}

class DomainEventEmitter extends EventEmitter {
  public publish<T>(event: DomainEvent<T>): void {
    logger.info(
      { eventType: event.type, institutionId: event.institutionId },
      "Domain event emitted",
    );
    this.emit(event.type, event);
    this.emit("*", event);
  }

  public subscribe<T>(
    eventType: DomainEventType | "*",
    handler: (event: DomainEvent<T>) => Promise<void> | void,
  ): void {
    this.on(eventType, (event: DomainEvent<T>) => {
      Promise.resolve(handler(event)).catch((err) => {
        logger.error({ err, eventType }, "Error executing domain event listener");
      });
    });
  }
}

export const eventBus = new DomainEventEmitter();
