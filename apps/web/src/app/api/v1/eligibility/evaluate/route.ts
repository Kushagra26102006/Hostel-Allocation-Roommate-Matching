import { z } from "zod";
import { apiHandler } from "@/lib/api/handler.js";
import { ApplicationRepository, PolicyRuleSetRepository, EntityNotFoundError } from "@hostelhub/db";
import {
  evaluate,
  CsvErpAdapter,
  type ApplicantFacts,
  type PolicyRuleSet,
} from "@hostelhub/domain";

const evaluateSchema = z.object({
  application_id: z.string().optional(),
  rule_set_id: z.string().optional(),
  facts: z.record(z.unknown()).optional(),
});

export const POST = apiHandler(
  {
    body: evaluateSchema,
    operationId: "evaluateEligibility",
    summary: "Evaluate application or facts against Policy Rule Set",
  },
  async ({ user, institution_id, body }) => {
    let application;
    if (body.application_id) {
      const appRepo = new ApplicationRepository(institution_id);
      application = await appRepo.findById(body.application_id);
      if (!application) {
        throw new EntityNotFoundError(body.application_id, "Application");
      }
    }

    // Load active or requested rule set
    const ruleSetRepo = new PolicyRuleSetRepository(institution_id);
    let ruleSetDoc = body.rule_set_id
      ? await ruleSetRepo.findById(body.rule_set_id)
      : await ruleSetRepo.findLatestActive();

    // Fallback default rule set if none stored in DB yet
    const ruleSet: PolicyRuleSet = ruleSetDoc
      ? {
          id: String(ruleSetDoc._id),
          name: ruleSetDoc.name,
          version: ruleSetDoc.version,
          isLocked: ruleSetDoc.is_locked,
          rules: ruleSetDoc.rules,
        }
      : {
          id: "default_ruleset",
          name: "Standard Academic Eligibility Policy",
          version: 1,
          isLocked: false,
          rules: [
            {
              id: "r_1",
              name: "Level & Year Requirement",
              expression: { op: "equals", fact: "level", value: "UG" },
              reasonTemplate:
                "Only Undergraduate (UG) programme students are eligible for this cycle.",
              policyRef: "POL-2026-01",
              owner: "hostel_admin",
              effectiveFrom: new Date(),
              version: 1,
            },
            {
              id: "r_2",
              name: "No Academic Hold",
              expression: { op: "equals", fact: "hasHold", value: false },
              reasonTemplate: "Your student record has active fee or academic holds.",
              policyRef: "POL-2026-02",
              owner: "hostel_admin",
              effectiveFrom: new Date(),
              version: 1,
            },
            {
              id: "r_3",
              name: "Distance Threshold",
              expression: { op: "gte", fact: "distanceKm", value: 50 },
              reasonTemplate:
                "Your permanent residence distance ({distanceKm} km) is below the minimum 50 km cutoff.",
              policyRef: "POL-2026-03",
              owner: "hostel_admin",
              effectiveFrom: new Date(),
              version: 1,
            },
          ],
        };

    // Gather applicant facts from ERP adapter + application form data + request facts
    const erp = new CsvErpAdapter();
    const studentId = application ? String(application.student_id) : (user?.id ?? "usr_student");
    const erpFacts = (await erp.getStudentFacts(studentId)) || {};

    const appFormData = (application?.form_data as Record<string, unknown>) || {};
    const profileData = (appFormData["profile"] as Record<string, unknown>) || {};
    const questionnaireData = (appFormData["questionnaire"] as Record<string, unknown>) || {};

    const facts: ApplicantFacts = {
      ...erpFacts,
      ...profileData,
      ...questionnaireData,
      ...(body.facts || {}),
    };

    // Evaluate using pure domain function
    const evalOutput = evaluate(facts, ruleSet);

    // If evaluating a persistent application, record the result & rule set version
    if (application) {
      const failedReasons = evalOutput.results.filter((r) => !r.passed).map((r) => r.reason);
      const appRepo = new ApplicationRepository(institution_id);
      await appRepo.updateEligibilityResult(application._id, evalOutput.eligible, failedReasons);
    }

    return {
      eligible: evalOutput.eligible,
      results: evalOutput.results,
      rule_set_id: ruleSet.id,
      rule_set_version: ruleSet.version,
    };
  },
);
