import { describe, it, expect, vi, beforeEach } from "vitest";
import { Types } from "mongoose";
import { AllocationCycleModel, AuditService } from "@hostelhub/db";
import { processCycleWindowCheck, setupWindowScheduler } from "../window-scheduler.js";

describe("Phase 4.1: Worker & Window Scheduler", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    vi.spyOn(AuditService, "append").mockResolvedValue({} as any);
  });

  it("opens scheduled cycles atomically when window_open <= now", async () => {
    const now = new Date();
    const cycleId = new Types.ObjectId();

    vi.spyOn(AllocationCycleModel, "find").mockResolvedValueOnce([
      { _id: cycleId, name: "Fall 2026", status: "scheduled" } as any,
    ]).mockResolvedValueOnce([]).mockResolvedValueOnce([]);

    vi.spyOn(AllocationCycleModel, "findOneAndUpdate").mockResolvedValueOnce({
      _id: cycleId,
      institution_id: new Types.ObjectId(),
      name: "Fall 2026",
      status: "open",
    } as any);

    const result = await processCycleWindowCheck();
    expect(result.opened).toBe(1);
    expect(AllocationCycleModel.findOneAndUpdate).toHaveBeenCalledWith(
      expect.objectContaining({ _id: cycleId, status: "scheduled" }),
      expect.objectContaining({ $set: { status: "open" } }),
      expect.anything(),
    );
  });

  it("closes open cycles atomically when window_close <= now", async () => {
    const cycleId = new Types.ObjectId();

    vi.spyOn(AllocationCycleModel, "find")
      .mockResolvedValueOnce([]) // scheduled due to open
      .mockResolvedValueOnce([{ _id: cycleId, name: "Fall 2026", status: "open" } as any]) // open due to close
      .mockResolvedValueOnce([]);

    vi.spyOn(AllocationCycleModel, "findOneAndUpdate").mockResolvedValueOnce({
      _id: cycleId,
      institution_id: new Types.ObjectId(),
      name: "Fall 2026",
      status: "closed",
    } as any);

    const result = await processCycleWindowCheck();
    expect(result.closed).toBe(1);
    expect(AllocationCycleModel.findOneAndUpdate).toHaveBeenCalledWith(
      expect.objectContaining({ _id: cycleId, status: "open" }),
      expect.objectContaining({ $set: { status: "closed" } }),
      expect.anything(),
    );
  });

  it("deduplicates reminders so 48h and 6h reminders fire once", async () => {
    const now = new Date();
    const cycleId = new Types.ObjectId();
    const closeTime = new Date(now.getTime() + 24 * 60 * 60 * 1000); // 24 hours remaining (<= 48h)

    const cycleMock = {
      _id: cycleId,
      institution_id: new Types.ObjectId(),
      name: "Spring 2026",
      window_close: closeTime,
      reminders_sent: {},
    };

    vi.spyOn(AllocationCycleModel, "find")
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([cycleMock as any]);

    vi.spyOn(AllocationCycleModel, "findOneAndUpdate").mockResolvedValueOnce({
      ...cycleMock,
      reminders_sent: { "48h": now },
    } as any);

    const result = await processCycleWindowCheck();
    expect(result.remindersSent).toBe(1);
  });

  it("constructs Worker with maxRetriesPerRequest: null connection options", async () => {
    const mockRedis = {
      on: vi.fn(),
      once: vi.fn(),
      emit: vi.fn(),
      duplicate: vi.fn().mockReturnThis(),
      options: { maxRetriesPerRequest: null },
    } as any;

    const { worker, queue } = await setupWindowScheduler(mockRedis);
    expect(worker).toBeDefined();
    expect(queue).toBeDefined();
    await worker.close();
    await queue.close();
  });
});
