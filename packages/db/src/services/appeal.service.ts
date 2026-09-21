/**
 * @hostelhub/db — services/appeal.service.ts
 *
 * Appeal lifecycle: submit, decide (warden/chief_warden), escalate overdue.
 * An upheld appeal creates an amendment draft (never edits the published draft).
 * Scheduled job escalates past-SLA appeals automatically.
 */

import { Types } from "mongoose";
import {
  calculateSlaDueDate,
  isSlaBreach,
  getWorkingDaysRemaining,
  type SlaConfig,
  DEFAULT_SLA_CONFIG,
  type AppealEscalationResult,
  type AppealOutcome,
} from "@hostelhub/domain";
import {
  AppealModel,
  type AppealDocument,
  type AppealModelOutcome,
} from "../models/appeal.model.js";
import { AllocationAssignmentModel } from "../models/allocation-assignment.model.js";
import { AuditService } from "./audit.service.js";
import type { WorkflowActor } from "./draft-workflow.service.js";

export class AppealServiceError extends Error {
  constructor(
    message: string,
    public readonly code: string,
    public readonly statusCode: number = 400,
  ) {
    super(message);
    this.name = "AppealServiceError";
  }
}

export class AppealService {
  constructor(private readonly auditService?: AuditService) {}

  private getAudit(institutionId: Types.ObjectId | string): AuditService {
    if (this.auditService) return this.auditService;
    return AuditService.withTenant(institutionId);
  }

  /**
   * Student submits an appeal against their allocation.
   */
  async submitAppeal(
    studentId: string,
    assignmentId: string,
    statement: string,
    evidenceKeys: string[],
    institutionId: string,
    slaConfig: SlaConfig = DEFAULT_SLA_CONFIG,
  ): Promise<AppealDocument> {
    if (!statement || statement.trim().length < 20) {
      throw new AppealServiceError(
        "Appeal statement must be at least 20 characters.",
        "INVALID_STATEMENT",
      );
    }

    // Verify assignment exists and belongs to this student
    const assignment = await AllocationAssignmentModel.findById(assignmentId);
    if (!assignment) {
      throw new AppealServiceError("Assignment not found.", "ASSIGNMENT_NOT_FOUND", 404);
    }
    if (assignment.student_id.toString() !== studentId) {
      throw new AppealServiceError("You can only appeal your own assignment.", "FORBIDDEN", 403);
    }

    // Check for existing active appeal
    const existing = await AppealModel.findOne({
      student_id: new Types.ObjectId(studentId),
      assignment_id: assignment._id,
      status: { $in: ["submitted", "warden_review", "chief_warden_review"] },
    });
    if (existing) {
      throw new AppealServiceError(
        "You already have an active appeal for this assignment.",
        "DUPLICATE_APPEAL",
        409,
      );
    }

    const nowIso = new Date().toISOString();
    const slaDueAt = calculateSlaDueDate(nowIso, slaConfig);

    const appeal = await AppealModel.create({
      institution_id: new Types.ObjectId(institutionId),
      student_id: new Types.ObjectId(studentId),
      assignment_id: assignment._id,
      draft_id: assignment.draft_id,
      statement: statement.trim(),
      evidence_keys: evidenceKeys,
      status: "warden_review",
      sla_due_at: new Date(slaDueAt),
      sla_config_days: slaConfig.workingDays,
      current_reviewer_role: "warden",
    });

    // Audit
    await this.getAudit(institutionId).append({
      actor: { user_id: studentId, email: "student", roles: ["student"] },
      action: "APPEAL_SUBMITTED",
      target: {
        appeal_id: appeal._id.toString(),
        assignment_id: assignmentId,
      },
      after: {
        statement_length: statement.trim().length,
        evidence_count: evidenceKeys.length,
        sla_due_at: slaDueAt,
        sla_working_days: slaConfig.workingDays,
      },
    });

    return appeal;
  }

  /**
   * Warden or Chief Warden decides on an appeal.
   */
  async decideAppeal(
    appealId: string,
    outcome: AppealOutcome,
    reason: string,
    actor: WorkflowActor,
    institutionId?: string,
  ): Promise<AppealDocument> {
    if (!reason || reason.trim().length < 10) {
      throw new AppealServiceError(
        "Decision reason must be at least 10 characters.",
        "INVALID_REASON",
      );
    }

    const appeal = await AppealModel.findById(appealId);
    if (!appeal) {
      throw new AppealServiceError("Appeal not found.", "NOT_FOUND", 404);
    }

    const instId = institutionId || appeal.institution_id?.toString() || "";
    const now = new Date();

    const decisionData = {
      outcome: outcome as AppealModelOutcome,
      reason: reason.trim(),
      decided_by: {
        user_id: actor.id,
        email: actor.email,
        role: actor.role,
      },
      decided_at: now,
    };

    if (appeal.status === "warden_review") {
      // Warden decides
      if (actor.role !== "warden" && actor.role !== "admin") {
        throw new AppealServiceError(
          "Only wardens can decide appeals in warden review.",
          "FORBIDDEN",
          403,
        );
      }

      appeal.warden_decision = decisionData;

      if (outcome === "upheld") {
        appeal.status = "upheld";
        appeal.final_outcome = "upheld";
      } else if (outcome === "partly_upheld") {
        appeal.status = "partly_upheld";
        appeal.final_outcome = "partly_upheld";
      } else {
        // Rejected by warden — route to chief warden for final review
        appeal.status = "chief_warden_review";
        appeal.current_reviewer_role = "chief_warden";
      }
    } else if (appeal.status === "chief_warden_review") {
      // Chief Warden decides — this is final
      if (actor.role !== "chief_warden" && actor.role !== "admin") {
        throw new AppealServiceError(
          "Only chief wardens can decide appeals in chief warden review.",
          "FORBIDDEN",
          403,
        );
      }

      appeal.chief_warden_decision = decisionData;
      appeal.status = outcome as AppealDocument["status"];
      appeal.final_outcome = outcome as AppealModelOutcome;
    } else {
      throw new AppealServiceError(
        `Appeal is in status '${appeal.status}' and cannot be decided.`,
        "INVALID_STATUS",
        409,
      );
    }

    await appeal.save();

    // Audit
    await this.getAudit(instId).append({
      actor: { user_id: actor.id, email: actor.email, roles: [actor.role] },
      action: `APPEAL_${outcome.toUpperCase()}`,
      target: { appeal_id: appealId },
      after: {
        outcome,
        reason: reason.trim(),
        reviewer_role: actor.role,
        final_status: appeal.status,
      },
    });

    return appeal;
  }

  /**
   * Scheduled job: escalate overdue warden_review appeals to chief_warden.
   * Called by the BullMQ repeatable job every hour.
   */
  async escalateOverdueAppeals(nowIso: string): Promise<AppealEscalationResult[]> {
    const now = new Date(nowIso);
    const overdueAppeals = await AppealModel.find({
      status: "warden_review",
      sla_due_at: { $lte: now },
    });

    const results: AppealEscalationResult[] = [];

    for (const appeal of overdueAppeals) {
      const previousStatus = appeal.status;
      appeal.status = "chief_warden_review";
      appeal.current_reviewer_role = "chief_warden";
      appeal.escalated_at = now;
      appeal.escalation_reason = `SLA breach: warden review deadline (${appeal.sla_config_days} working days) exceeded.`;
      await appeal.save();

      const instId = appeal.institution_id?.toString() || "";
      await this.getAudit(instId).append({
        actor: {
          user_id: "system-sla-escalation",
          email: "system@hostelhub.internal",
          roles: ["system"],
        },
        action: "APPEAL_SLA_ESCALATED",
        target: { appeal_id: appeal._id.toString() },
        after: {
          previous_status: previousStatus,
          new_status: "chief_warden_review",
          sla_due_at: appeal.sla_due_at?.toISOString(),
          escalated_at: now.toISOString(),
        },
      });

      results.push({
        appealId: appeal._id.toString(),
        previousStatus: previousStatus as AppealEscalationResult["previousStatus"],
        newStatus: "chief_warden_review",
        reason: appeal.escalation_reason,
        escalatedAt: now.toISOString(),
      });
    }

    return results;
  }

  /**
   * Get appeal with the stored allocation explanation for the student.
   */
  async getAppealWithExplanation(
    appealId: string,
    userId: string,
    role: string,
  ): Promise<{
    appeal: AppealDocument;
    explanation: string | null;
    slaInfo: { breached: boolean; daysRemaining: number };
  }> {
    const appeal = await AppealModel.findById(appealId);
    if (!appeal) {
      throw new AppealServiceError("Appeal not found.", "NOT_FOUND", 404);
    }

    // Student isolation
    if (role === "student" && appeal.student_id.toString() !== userId) {
      throw new AppealServiceError("You cannot view other students' appeals.", "FORBIDDEN", 403);
    }

    // Get the explanation from the original assignment
    const assignment = await AllocationAssignmentModel.findById(appeal.assignment_id).lean();
    const explanation =
      ((assignment as Record<string, unknown>)?.explanation as string | null) ?? null;

    const nowIso = new Date().toISOString();
    const slaDueIso = appeal.sla_due_at.toISOString();
    const breached = isSlaBreach(slaDueIso, nowIso);
    const daysRemaining = getWorkingDaysRemaining(slaDueIso, nowIso);

    return {
      appeal,
      explanation,
      slaInfo: { breached, daysRemaining },
    };
  }

  /**
   * List appeals with role-based filtering.
   */
  async listAppeals(
    filters: {
      studentId?: string;
      draftId?: string;
      status?: string;
      reviewerRole?: string;
      page?: number;
      limit?: number;
    },
    role: string,
  ): Promise<{
    appeals: AppealDocument[];
    total: number;
    page: number;
    limit: number;
  }> {
    const query: Record<string, unknown> = {};
    const page = filters.page ?? 1;
    const limit = Math.min(filters.limit ?? 20, 100);

    // Student isolation
    if (role === "student" && filters.studentId) {
      query.student_id = new Types.ObjectId(filters.studentId);
    }

    // Warden sees warden_review, chief_warden sees chief_warden_review
    if (filters.reviewerRole === "warden") {
      query.current_reviewer_role = "warden";
      query.status = { $in: ["warden_review"] };
    } else if (filters.reviewerRole === "chief_warden") {
      query.current_reviewer_role = "chief_warden";
      query.status = { $in: ["chief_warden_review"] };
    }

    if (filters.draftId) {
      query.draft_id = new Types.ObjectId(filters.draftId);
    }

    if (filters.status && !filters.reviewerRole) {
      query.status = filters.status;
    }

    const [appeals, total] = await Promise.all([
      AppealModel.find(query)
        .sort({ sla_due_at: 1, createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .lean(),
      AppealModel.countDocuments(query),
    ]);

    return {
      appeals: appeals as unknown as AppealDocument[],
      total,
      page,
      limit,
    };
  }
}
