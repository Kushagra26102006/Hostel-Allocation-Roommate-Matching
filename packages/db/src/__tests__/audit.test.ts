import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { Types } from "mongoose";
import {
  AuditService,
  AuditEntryModel,
  ImmutableAuditError,
} from "../index.js";
import { setupTestDatabase, teardownTestDatabase } from "./test-helper.js";

describe("AuditService & Cryptographic Hash Chain", () => {
  beforeAll(async () => {
    await setupTestDatabase();
  });

  afterAll(async () => {
    await teardownTestDatabase();
  });

  it("audit chain verifies after sequential appends", async () => {
    const institutionId = new Types.ObjectId();

    // Append 5 sequential audit records
    for (let i = 1; i <= 5; i++) {
      const entry = await AuditService.append({
        institution_id: institutionId,
        actor: { id: `user_${i}`, role: "warden" },
        action: `ROOM_ALLOCATE_STEP_${i}`,
        target: { room_id: `R-${100 + i}` },
        before: null,
        after: { allocated: true },
        ip: "127.0.0.1",
      });

      expect(entry).toBeDefined();
      expect(entry.sequence).toBe(i);
      expect(entry.prev_hash).toBeTruthy();
      expect(entry.hash).toBeTruthy();
    }

    // Verify chain is valid (returns null for no broken entry)
    const brokenEntry = await AuditService.verifyChain(institutionId);
    expect(brokenEntry).toBeNull();
  });

  it("editing one stored audit entry makes verifyChain report the exact broken entry", async () => {
    const institutionId = new Types.ObjectId();

    // Create 4 entries
    const entries = [];
    for (let i = 1; i <= 4; i++) {
      const entry = await AuditService.append({
        institution_id: institutionId,
        actor: { id: `admin_${i}` },
        action: `ACTION_${i}`,
        target: `TARGET_${i}`,
        before: { val: i },
        after: { val: i + 1 },
      });
      entries.push(entry);
    }

    // Intact check
    expect(await AuditService.verifyChain(institutionId)).toBeNull();

    // Tamper with entry 2 in raw collection to simulate storage breach
    const targetEntry = entries[1]!;
    expect(targetEntry.sequence).toBe(2);

    await AuditEntryModel.collection.updateOne(
      { _id: targetEntry._id },
      { $set: { action: "TAMPERED_ACTION_HACK" } },
    );

    // verifyChain must identify targetEntry as the broken entry
    const detectedBroken = await AuditService.verifyChain(institutionId);
    expect(detectedBroken).not.toBeNull();
    expect(detectedBroken?.sequence).toBe(2);
    expect((detectedBroken?._id as Types.ObjectId).toString()).toBe(
      (targetEntry._id as Types.ObjectId).toString(),
    );
  });

  it("blocks update and delete operations via Mongoose schema hooks", async () => {
    const institutionId = new Types.ObjectId();

    const entry = await AuditService.append({
      institution_id: institutionId,
      actor: "system",
      action: "IMMUTABLE_CHECK",
    });

    // Attempting updateOne via model must throw ImmutableAuditError
    await expect(
      AuditEntryModel.updateOne(
        { _id: entry._id },
        { $set: { action: "MODIFIED" } },
      ),
    ).rejects.toThrow(ImmutableAuditError);

    // Attempting deleteOne via model must throw ImmutableAuditError
    await expect(
      AuditEntryModel.deleteOne({ _id: entry._id }),
    ).rejects.toThrow(ImmutableAuditError);
  });

  it("50 concurrent appends still form a valid chain", async () => {
    const institutionId = new Types.ObjectId();

    // Fire 50 appends concurrently
    const appendPromises = Array.from({ length: 50 }, (_, i) =>
      AuditService.append({
        institution_id: institutionId,
        actor: { id: `concurrent_user_${i + 1}` },
        action: `CONCURRENT_ACTION_${i + 1}`,
        target: { index: i + 1 },
        before: null,
        after: { timestamp: Date.now() },
      }),
    );

    const results = await Promise.all(appendPromises);
    expect(results).toHaveLength(50);

    // Chain verification must report zero broken entries
    const brokenEntry = await AuditService.verifyChain(institutionId);
    expect(brokenEntry).toBeNull();

    // Verify all 50 entries have contiguous sequence 1..50
    const allEntries = await AuditEntryModel.find({
      institution_id: institutionId,
    })
      .sort({ sequence: 1 })
      .exec();

    expect(allEntries).toHaveLength(50);

    for (let i = 0; i < 50; i++) {
      expect(allEntries[i]?.sequence).toBe(i + 1);
    }
  });
});
