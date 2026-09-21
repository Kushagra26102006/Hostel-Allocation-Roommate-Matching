import { describe, it, expect, vi, beforeEach } from "vitest";
import { Types } from "mongoose";
import { AuditService, AuditChainHeadModel, InstitutionModel } from "@hostelhub/db";
import { verifyAllAuditChains } from "../audit-verifier-processor.js";
import type { Queue } from "bullmq";

describe("Audit-Chain Verifier Nightly Worker Job", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("verifies all institutions successfully when chains are intact", async () => {
    const instId1 = new Types.ObjectId();
    const instId2 = new Types.ObjectId();

    vi.spyOn(AuditChainHeadModel, "distinct").mockResolvedValue([instId1, instId2] as never);
    vi.spyOn(InstitutionModel, "distinct").mockResolvedValue([] as never);

    // Mock verifyChain returning null (clean chain)
    vi.spyOn(AuditService, "verifyChain").mockResolvedValue(null);

    const mockNotificationQueue = {
      add: vi.fn(),
    } as unknown as Queue;

    const result = await verifyAllAuditChains(mockNotificationQueue);

    expect(result.verifiedCount).toBe(2);
    expect(result.failedInstitutions).toHaveLength(0);
    expect(AuditService.verifyChain).toHaveBeenCalledTimes(2);
    expect(mockNotificationQueue.add).not.toHaveBeenCalled();
  });

  it("detects a broken audit hash chain and emits auditchain.failed alert", async () => {
    const instId = new Types.ObjectId();

    vi.spyOn(AuditChainHeadModel, "distinct").mockResolvedValue([instId] as never);
    vi.spyOn(InstitutionModel, "distinct").mockResolvedValue([] as never);

    const brokenEntry = {
      sequence: 5,
      hash: "broken_hash_123",
      action: "ALLOCATION_OVERRIDE",
    };

    vi.spyOn(AuditService, "verifyChain").mockResolvedValue(brokenEntry as never);

    const mockNotificationQueue = {
      add: vi.fn().mockResolvedValue({} as never),
    } as unknown as Queue;

    const result = await verifyAllAuditChains(mockNotificationQueue);

    expect(result.verifiedCount).toBe(1);
    expect(result.failedInstitutions).toHaveLength(1);
    expect(result.failedInstitutions[0]).toEqual({
      institutionId: String(instId),
      sequence: 5,
      hash: "broken_hash_123",
    });

    expect(mockNotificationQueue.add).toHaveBeenCalledWith(
      "auditchain.failed",
      expect.objectContaining({
        eventType: "auditchain.failed",
        recipientId: "sys_admin",
        priority: "urgent",
        data: expect.objectContaining({
          institutionId: String(instId),
          brokenSequence: 5,
          brokenHash: "broken_hash_123",
        }),
      }),
    );
  });
});
