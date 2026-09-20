import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { Types } from "mongoose";
import {
  UserRepository,
  VersionConflictError,
  InstitutionModel,
} from "../index.js";
import { setupTestDatabase, teardownTestDatabase } from "./test-helper.js";

describe("BaseRepository & Multi-Tenancy", () => {
  const tenantAId = new Types.ObjectId();
  const tenantBId = new Types.ObjectId();

  beforeAll(async () => {
    await setupTestDatabase();

    await InstitutionModel.create([
      {
        _id: tenantAId,
        name: "Institution Alpha",
        code: "ALPHA",
        status: "active",
      },
      {
        _id: tenantBId,
        name: "Institution Beta",
        code: "BETA",
        status: "active",
      },
    ]);
  });

  afterAll(async () => {
    await teardownTestDatabase();
  });

  it("cross-tenant reads return nothing", async () => {
    const repoA = new UserRepository(tenantAId);
    const repoB = new UserRepository(tenantBId);

    // Create user in Tenant A
    const userA = await repoA.create({
      email: "student.alpha@nit.edu",
      name: "Alpha Student",
      roles: ["student"],
      status: "active",
    });

    expect(userA).toBeDefined();
    expect(userA.institution_id.toString()).toBe(tenantAId.toString());

    // Tenant B repository must NOT see Tenant A's user via find
    const foundByB = await repoB.find({ email: "student.alpha@nit.edu" });
    expect(foundByB).toHaveLength(0);

    // Tenant B repository must NOT see Tenant A's user via findById
    const foundByIdB = await repoB.findById(userA._id as Types.ObjectId);
    expect(foundByIdB).toBeNull();

    // Tenant A repository CAN find its own user
    const foundByA = await repoA.findById(userA._id as Types.ObjectId);
    expect(foundByA).not.toBeNull();
    expect(foundByA?.email).toBe("student.alpha@nit.edu");
  });

  it("version conflict is detected and throws VersionConflictError", async () => {
    const repo = new UserRepository(tenantAId);

    const user = await repo.create({
      email: "concurrency.test@nit.edu",
      name: "Original Name",
      roles: ["student"],
      status: "active",
    });

    expect(user.version).toBe(1);

    // First update with matching version 1 succeeds and bumps version to 2
    const updatedUser = await repo.updateWithVersion(
      user._id as Types.ObjectId,
      1,
      {
        $set: { name: "Updated Name 1" },
      },
    );

    expect(updatedUser.version).toBe(2);
    expect(updatedUser.name).toBe("Updated Name 1");

    // Stale concurrent update with version 1 must fail
    await expect(
      repo.updateWithVersion(user._id as Types.ObjectId, 1, {
        $set: { name: "Stale Concurrent Update" },
      }),
    ).rejects.toThrow(VersionConflictError);

    // Verify error properties
    try {
      await repo.updateWithVersion(user._id as Types.ObjectId, 1, {
        $set: { name: "Stale Concurrent Update 2" },
      });
      expect.unreachable("Should have thrown VersionConflictError");
    } catch (err) {
      expect(err).toBeInstanceOf(VersionConflictError);
      const conflictErr = err as VersionConflictError;
      expect(conflictErr.expectedVersion).toBe(1);
      expect(conflictErr.actualVersion).toBe(2);
    }
  });

  it("cursor-based pagination correctly retrieves sequential pages", async () => {
    const repo = new UserRepository(tenantBId);

    // Create 7 test users for Tenant B
    for (let i = 1; i <= 7; i++) {
      await repo.create({
        email: `page.user${i}@nit.edu`,
        name: `User Page ${i}`,
        roles: ["student"],
        status: "active",
      });
    }

    // Page 1: limit 3
    const page1 = await repo.paginate({}, { limit: 3, sortField: "_id", sortOrder: "asc" });
    expect(page1.items).toHaveLength(3);
    expect(page1.hasNextPage).toBe(true);
    expect(page1.nextCursor).toBeTruthy();

    // Page 2: limit 3 using cursor from page 1
    const page2 = await repo.paginate(
      {},
      { limit: 3, cursor: page1.nextCursor!, sortField: "_id", sortOrder: "asc" },
    );
    expect(page2.items).toHaveLength(3);
    expect(page2.hasNextPage).toBe(true);

    // Ensure page 1 and page 2 items are completely distinct
    const idsPage1 = page1.items.map((it) => (it._id as Types.ObjectId).toString());
    const idsPage2 = page2.items.map((it) => (it._id as Types.ObjectId).toString());
    for (const id of idsPage2) {
      expect(idsPage1).not.toContain(id);
    }

    // Page 3: final item
    const page3 = await repo.paginate(
      {},
      { limit: 3, cursor: page2.nextCursor!, sortField: "_id", sortOrder: "asc" },
    );
    expect(page3.items).toHaveLength(1);
    expect(page3.hasNextPage).toBe(false);
    expect(page3.nextCursor).toBeNull();
  });
});
