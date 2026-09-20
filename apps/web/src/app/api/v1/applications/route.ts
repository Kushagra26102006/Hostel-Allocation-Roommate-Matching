import { z } from "zod";
import { apiHandler } from "@/lib/api/handler.js";
import { ApplicationRepository, AllocationCycleRepository, EntityNotFoundError } from "@hostelhub/db";
import { paginationQuerySchema } from "@/lib/api/pagination.js";
import { ApiProblemError } from "@/lib/api/errors.js";

const applicationQuerySchema = paginationQuerySchema.extend({
  cycle_id: z.string().optional(),
  status: z.enum(["draft", "submitted", "under_review", "approved", "rejected", "waitlisted"]).optional(),
});

const createApplicationSchema = z.object({
  cycle_id: z.string().min(1, "cycle_id is required"),
  priority_tier: z.string().default("general"),
  form_data: z.record(z.unknown()).default({}),
});

export const GET = apiHandler(
  {
    operationId: "listApplications",
    summary: "List Applications",
    query: applicationQuerySchema,
  },
  async ({ user, institution_id, query }) => {
    const repo = new ApplicationRepository(institution_id);
    const filter: Record<string, unknown> = {};

    // Object-level filter: if student, limit to student's own applications
    const isStudent = user?.roles.includes("student") && !user?.roles.some((r) => ["hostel_admin", "warden", "sys_admin"].includes(r));
    if (isStudent && user) {
      filter.student_id = user.id;
    }

    if (query.cycle_id) filter.cycle_id = query.cycle_id;
    if (query.status) filter.status = query.status;

    const result = await repo.paginate(
      filter,
      {
        ...(query.limit ? { limit: query.limit } : {}),
        ...(query.cursor ? { cursor: query.cursor } : {}),
        sortField: (query.sortField as "_id") ?? "_id",
        sortOrder: query.sortOrder ?? "desc",
      },
    );

    return result;
  },
);

export const POST = apiHandler(
  {
    body: createApplicationSchema,
    operationId: "createApplication",
    summary: "Create or get draft Application for cycle",
  },
  async ({ user, institution_id, body }) => {
    if (!user) {
      throw new ApiProblemError({
        title: "Unauthorized",
        status: 401,
        detail: "User context is missing",
        code: "UNAUTHORIZED",
      });
    }

    const cycleRepo = new AllocationCycleRepository(institution_id);
    const cycle = await cycleRepo.findById(body.cycle_id);
    if (!cycle) {
      throw new EntityNotFoundError(body.cycle_id, "AllocationCycle");
    }

    // Window enforcement check
    const now = new Date();
    if (cycle.status !== "open" || now < cycle.window_open || now > cycle.window_close) {
      throw new ApiProblemError({
        title: "Window Closed",
        status: 422,
        detail: "Allocation cycle window is closed for new applications.",
        code: "BAD_REQUEST" as any,
      });
    }

    const appRepo = new ApplicationRepository(institution_id);

    // One application per student per cycle constraint
    const existing = await appRepo.findByStudentAndCycle(user.id, body.cycle_id);
    if (existing) {
      return existing;
    }

    // Generate reference number: APP-{YEAR}-{RANDOM}
    const randSuffix = Math.floor(10000 + Math.random() * 90000);
    const refNum = `APP-${cycle.academic_year.replace(/\//g, "-")}-${randSuffix}`;

    const newApp = await appRepo.create({
      cycle_id: cycle._id,
      student_id: user.id as any,
      reference_number: refNum,
      status: "draft",
      eligibility_result: { eligible: true, reasons: [] },
      priority_tier: body.priority_tier ?? "general",
      form_data: body.form_data ?? {},
    });

    return newApp;
  },
);
