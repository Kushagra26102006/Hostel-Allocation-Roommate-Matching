import { describe, it, expect, beforeEach, beforeAll, afterAll } from "vitest";
import { generateSyntheticData } from "../seed/synthetic.js";
import { connectDb, disconnectDb } from "../connection.js";
import { UserModel } from "../models/user.model.js";
import { InstitutionModel } from "../models/institution.model.js";

describe("Module M14: Deterministic Synthetic Data Generator & Test Fixtures", () => {
  beforeAll(async () => {
    await connectDb();
  });

  afterAll(async () => {
    await disconnectDb();
  });

  it("produces identical output and hash when run with the same seed", async () => {
    // Generate small sample with seed 42
    const run1 = await generateSyntheticData({
      applicants: 100,
      beds: 100,
      seed: 42,
      reset: true,
      silent: true,
    });

    // Generate again with seed 42
    const run2 = await generateSyntheticData({
      applicants: 100,
      beds: 100,
      seed: 42,
      reset: true,
      silent: true,
    });

    expect(run1.dataHash).toBe(run2.dataHash);
    expect(run1.counts).toEqual(run2.counts);
    expect(run1.edgeCases).toEqual(run2.edgeCases);
  });

  it("produces different hashes when run with different seeds", async () => {
    const runA = await generateSyntheticData({
      applicants: 50,
      beds: 50,
      seed: 101,
      reset: true,
      silent: true,
    });

    const runB = await generateSyntheticData({
      applicants: 50,
      beds: 50,
      seed: 202,
      reset: true,
      silent: true,
    });

    expect(runA.dataHash).not.toBe(runB.dataHash);
  });

  it("--reset clears ONLY synthetic data without affecting existing non-synthetic users", async () => {
    // Create non-synthetic user under NIT-DEMO
    const demoInst = await InstitutionModel.findOneAndUpdate(
      { code: "NIT-DEMO-TEST" },
      { name: "Demo Test Institute", code: "NIT-DEMO-TEST", status: "active", domain: "nitdemo.edu" },
      { upsert: true, new: true },
    );

    await UserModel.findOneAndUpdate(
      { email: "real.user.test@nitdemo.edu" },
      {
        institution_id: demoInst._id,
        email: "real.user.test@nitdemo.edu",
        name: "Real User",
        roles: ["student"],
        is_synthetic: false,
      },
      { upsert: true, new: true },
    );

    // Run synthetic seed with --reset
    await generateSyntheticData({
      applicants: 50,
      beds: 50,
      seed: 42,
      reset: true,
      silent: true,
    });

    // Non-synthetic demo user should STILL exist
    const nonSyntheticUser = await UserModel.findOne({ email: "real.user.test@nitdemo.edu" });
    expect(nonSyntheticUser).not.toBeNull();
    expect(nonSyntheticUser?.name).toBe("Real User");
  });

  it("seeds deliberate edge cases (priority ties, oversized group, dealbreaker pair)", async () => {
    const result = await generateSyntheticData({
      applicants: 100,
      beds: 100,
      seed: 42,
      reset: true,
      silent: true,
    });

    expect(result.edgeCases.exactPriorityTiesCount).toBeGreaterThanOrEqual(5);
    expect(result.edgeCases.oversizedGroupSize).toBe(5);
    expect(result.edgeCases.dealBreakerPairCount).toBe(1);
    expect(result.edgeCases.unmetAccessibilityApplicantId).toBeDefined();
  });
});
