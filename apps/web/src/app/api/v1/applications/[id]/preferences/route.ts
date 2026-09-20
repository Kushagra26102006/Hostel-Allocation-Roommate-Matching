import { z } from "zod";
import { apiHandler } from "@/lib/api/handler.js";
import {
  ApplicationRepository,
  AllocationCycleRepository,
  HostelRepository,
  PreferenceRepository,
  EntityNotFoundError,
} from "@hostelhub/db";
import { ApiProblemError } from "@/lib/api/errors.js";

const paramsSchema = z.object({
  id: z.string(),
});

const putPreferencesSchema = z.object({
  preferences: z.array(
    z.object({
      rank: z.number().min(1),
      hostel_id: z.string().min(1),
      room_type: z.enum(["single", "double", "triple"]).default("double"),
      roommate_ids: z.array(z.string()).default([]),
    }),
  ).min(1, "At least 1 preference is required"),
});

export const GET = apiHandler(
  {
    params: paramsSchema,
    operationId: "getPreferences",
    summary: "Get application preferences list",
  },
  async ({ institution_id, params }) => {
    const repo = new PreferenceRepository(institution_id);
    const preferences = await repo.findByApplication(params.id);
    return preferences;
  },
);

export const PUT = apiHandler(
  {
    params: paramsSchema,
    body: putPreferencesSchema,
    operationId: "updatePreferences",
    summary: "Replace application preferences list transactionally",
  },
  async ({ user, institution_id, params, body }) => {
    const appRepo = new ApplicationRepository(institution_id);
    const app = await appRepo.findById(params.id);
    if (!app) {
      throw new EntityNotFoundError(params.id, "Application");
    }

    if (String(app.student_id) !== String(user?.id)) {
      throw new ApiProblemError({
        title: "Forbidden",
        status: 403,
        detail: "You are not authorized to update another student's preferences.",
        code: "FORBIDDEN",
      });
    }

    // Load cycle to enforce window open status and min/max preference length
    const cycleRepo = new AllocationCycleRepository(institution_id);
    const cycle = await cycleRepo.findById(app.cycle_id);
    if (!cycle) {
      throw new EntityNotFoundError(String(app.cycle_id), "AllocationCycle");
    }

    const now = new Date();
    if (cycle.status !== "open" || now < cycle.window_open || now > cycle.window_close) {
      throw new ApiProblemError({
        title: "Window Closed",
        status: 422,
        detail: "Preference updates are locked because the application window is closed.",
        code: "BAD_REQUEST" as any,
      });
    }

    const prefs = body.preferences;

    // 1. Validate ranks are unique and gap-free (1, 2, 3...)
    const ranks = prefs.map((p) => p.rank).sort((a, b) => a - b);
    for (let i = 0; i < ranks.length; i++) {
      if (ranks[i] !== i + 1) {
        throw new ApiProblemError({
          title: "Invalid Ranks",
          status: 422,
          detail: `Preferences ranks must be unique and gap-free starting from 1 (expected rank ${i + 1}, got ${ranks[i]}).`,
          code: "VALIDATION_FAILED",
        });
      }
    }

    // 2. Validate min/max length
    const minLength = 1;
    const maxLength = 10;
    if (prefs.length < minLength || prefs.length > maxLength) {
      throw new ApiProblemError({
        title: "Invalid Preference Length",
        status: 422,
        detail: `Preferences length must be between ${minLength} and ${maxLength} choices.`,
        code: "VALIDATION_FAILED",
      });
    }

    // 3. Validate hostels exist and match tenant
    const hostelRepo = new HostelRepository(institution_id);
    for (const item of prefs) {
      const hostel = await hostelRepo.findById(item.hostel_id);
      if (!hostel) {
        throw new EntityNotFoundError(item.hostel_id, "Hostel");
      }
    }

    // Replace transactionally
    const prefRepo = new PreferenceRepository(institution_id);
    const updatedList = await prefRepo.replacePreferences(
      app._id,
      user!.id,
      prefs.map((p) => ({
        hostel_id: p.hostel_id,
        room_type: p.room_type ?? "double",
        rank: p.rank,
        roommate_ids: p.roommate_ids ?? [],
      })),
    );

    return updatedList;
  },
);
