import { describe, it, expect, beforeAll, afterAll } from "vitest";
import {
  runInTransaction,
  getConnection,
  seedDatabase,
  InstitutionModel,
  UserModel,
} from "../index.js";
import { setupTestDatabase, teardownTestDatabase } from "./test-helper.js";

describe("Connection & Transactions & Seed", () => {
  beforeAll(async () => {
    await setupTestDatabase();
  });

  afterAll(async () => {
    await teardownTestDatabase();
  });

  it("provides an active mongoose connection", () => {
    const conn = getConnection();
    expect(conn.readyState).toBe(1); // 1 = connected
  });

  it("runInTransaction commits operations successfully", async () => {
    const uniqueCode = "TX_COMMIT_" + Date.now();

    await runInTransaction(async (session) => {
      await InstitutionModel.create(
        [
          {
            name: "Transaction Test Institute",
            code: uniqueCode,
            status: "active",
          },
        ],
        { session },
      );
    });

    const found = await InstitutionModel.findOne({ code: uniqueCode });
    expect(found).not.toBeNull();
    expect(found?.name).toBe("Transaction Test Institute");
  });

  it("runInTransaction aborts and rolls back on error", async () => {
    const uniqueCode = "TX_ROLLBACK_" + Date.now();

    await expect(
      runInTransaction(async (session) => {
        await InstitutionModel.create(
          [
            {
              name: "Rollback Institute",
              code: uniqueCode,
              status: "active",
            },
          ],
          { session },
        );

        throw new Error("Deliberate transaction failure to test rollback");
      }),
    ).rejects.toThrow("Deliberate transaction failure to test rollback");

    // Document must not exist
    const found = await InstitutionModel.findOne({ code: uniqueCode });
    expect(found).toBeNull();
  });

  it("seedDatabase runs idempotently without errors or duplicates", async () => {
    // First run
    const result1 = await seedDatabase();
    expect(result1.institutionCode).toBe("NIT-DEMO");
    expect(result1.usersCreatedOrUpdated).toBe(6);

    const instCount1 = await InstitutionModel.countDocuments({ code: "NIT-DEMO" });
    const userCount1 = await UserModel.countDocuments({ institution_id: result1.institutionId });
    expect(instCount1).toBe(1);
    expect(userCount1).toBe(6);

    // Second run (idempotency check)
    const result2 = await seedDatabase();
    expect(result2.institutionId.toString()).toBe(result1.institutionId.toString());

    const instCount2 = await InstitutionModel.countDocuments({ code: "NIT-DEMO" });
    const userCount2 = await UserModel.countDocuments({ institution_id: result1.institutionId });
    expect(instCount2).toBe(1);
    expect(userCount2).toBe(6);
  });
});
