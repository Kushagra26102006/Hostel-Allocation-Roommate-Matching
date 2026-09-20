import { describe, it, expect, vi } from "vitest";
import { objectIdSchema } from "@/lib/api/validation";
import { PATCH as updateAppRoute } from "@/app/api/v1/applications/[id]/route";
import { evaluateRuleSet } from "@hostelhub/domain";
import {
  TenantRequiredError,
  BaseRepository,
  ApplicationRepository,
  type BaseTenantDocument,
} from "@hostelhub/db";

vi.mock("@/auth", () => ({
  auth: vi.fn().mockResolvedValue({
    user: {
      id: "507f1f77bcf86cd799439012",
      email: "student@campus.edu",
      roles: ["student"],
      institution_id: "507f1f77bcf86cd799439010",
      mfaPending: false,
    },
  }),
}));

describe("Phase 2 Data Integrity & Authorization Tests", () => {
  describe("2.1 Application Schema & Validation", () => {
    it("validates ObjectId using objectIdSchema returning 422 for invalid hex strings", () => {
      const valid = objectIdSchema.safeParse("507f1f77bcf86cd799439011");
      expect(valid.success).toBe(true);

      const invalid = objectIdSchema.safeParse("invalid-id-123");
      expect(invalid.success).toBe(false);
    });

    it("rejects student setting status via PATCH", async () => {
      vi.spyOn(ApplicationRepository.prototype, "findById").mockResolvedValue({
        _id: "507f1f77bcf86cd799439011",
        student_id: "507f1f77bcf86cd799439012",
        institution_id: "507f1f77bcf86cd799439010",
        status: "draft",
        version: 1,
      } as never);

      vi.spyOn(ApplicationRepository.prototype, "updateWithVersion").mockResolvedValue({
        _id: "507f1f77bcf86cd799439011",
        status: "draft",
      } as never);

      const mockReq = new Request(
        "http://localhost:3000/api/v1/applications/507f1f77bcf86cd799439011",
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ status: "approved" }),
        },
      );

      // Pass route parameters and user context
      const response = await updateAppRoute(mockReq, {
        params: Promise.resolve({ id: "507f1f77bcf86cd799439011" }),
      });

      // Status change via PATCH by student or invalid schema must fail with 400 / 422
      expect([400, 422]).toContain(response.status);
    });
  });

  describe("2.3 Eligibility Evaluator Edge Cases", () => {
    it("gte and lte operator fail when compared against non-finite numbers (null, '', false, array)", () => {
      const ruleSet = {
        id: "rs_1",
        name: "Distance Check",
        version: "1.0",
        rules: [
          {
            id: "rule_dist",
            name: "Min Distance",
            expression: {
              field: "distanceKm",
              operator: "gte" as const,
              value: 50,
            },
            reasonTemplate: "Distance too low",
          },
        ],
      };

      // null fact
      const resultNull = evaluateRuleSet(
        { distanceKm: null as unknown as number },
        ruleSet as never,
      );
      expect(resultNull.eligible).toBe(false);
      expect(resultNull.results[0]?.passed).toBe(false);

      // empty string fact
      const resultEmptyStr = evaluateRuleSet(
        { distanceKm: "" as unknown as number },
        ruleSet as never,
      );
      expect(resultEmptyStr.eligible).toBe(false);
      expect(resultEmptyStr.results[0]?.passed).toBe(false);

      // boolean false fact
      const resultFalse = evaluateRuleSet(
        { distanceKm: false as unknown as number },
        ruleSet as never,
      );
      expect(resultFalse.eligible).toBe(false);

      // array fact
      const resultArray = evaluateRuleSet(
        { distanceKm: [50] as unknown as number },
        ruleSet as never,
      );
      expect(resultArray.eligible).toBe(false);
    });

    it("not operator over missing fact fails closed", () => {
      const ruleSet = {
        id: "rs_not",
        name: "Hold Check",
        version: "1.0",
        rules: [
          {
            id: "rule_no_hold",
            name: "No Academic Hold",
            expression: {
              operator: "not" as const,
              operand: {
                field: "hasHold",
                operator: "equals" as const,
                value: true,
              },
            },
            reasonTemplate: "Student has hold",
          },
        ],
      };

      // Missing fact 'hasHold' under 'not' should fail closed if fact is required/missing
      const resultMissing = evaluateRuleSet({}, ruleSet as never);
      expect(resultMissing.eligible).toBe(false);
    });

    it("honors effectiveFrom and effectiveTo window for policy rules", () => {
      const pastRuleSet = {
        id: "rs_expired",
        name: "Expired RuleSet",
        version: "1.0",
        effectiveTo: "2020-01-01T00:00:00.000Z",
        rules: [
          {
            id: "rule_1",
            name: "Always True",
            expression: { field: "level", operator: "equals" as const, value: "UG" },
            reasonTemplate: "Passed",
          },
        ],
      };

      const resultExpired = evaluateRuleSet({ level: "UG" }, pastRuleSet as never);
      expect(resultExpired.eligible).toBe(false);
    });
  });

  describe("2.4 Repository Tenant Safety", () => {
    it("throws TenantRequiredError when institutionId is empty or not provided", () => {
      class TestRepo extends BaseRepository<BaseTenantDocument> {
        protected model = {} as never;
        public testGetInstitutionId() {
          return this.getInstitutionId();
        }
      }

      const repoWithoutTenant = new TestRepo(undefined as never);
      expect(() => repoWithoutTenant.testGetInstitutionId()).toThrow(TenantRequiredError);
    });
  });
});
