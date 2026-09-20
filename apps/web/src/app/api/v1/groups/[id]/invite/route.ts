import { z } from "zod";
import { apiHandler } from "@/lib/api/handler.js";
import { GroupRepository, GroupModel, AllocationCycleRepository, EntityNotFoundError } from "@hostelhub/db";
import { ApiProblemError } from "@/lib/api/errors.js";

const paramsSchema = z.object({
  id: z.string(),
});

const inviteSchema = z.object({
  invite_code: z.string().optional(),
  email: z.string().optional(),
});

export const POST = apiHandler(
  {
    params: paramsSchema,
    body: inviteSchema,
    operationId: "joinOrInviteGroup",
    summary: "Join or invite member to roommate group",
  },
  async ({ user, institution_id, params, body }) => {
    if (!user) {
      throw new ApiProblemError({
        title: "Unauthorized",
        status: 401,
        detail: "User context missing",
        code: "UNAUTHORIZED",
      });
    }

    const groupRepo = new GroupRepository(institution_id);
    let group = params.id !== "join" ? await groupRepo.findById(params.id) : null;

    if (!group && body.invite_code) {
      group = await groupRepo.findByInviteCode(body.invite_code);
    }

    if (!group) {
      throw new EntityNotFoundError(params.id, "Group");
    }

    // Check window open
    const cycleRepo = new AllocationCycleRepository(institution_id);
    const cycle = await cycleRepo.findById(group.cycle_id);
    if (!cycle) {
      throw new EntityNotFoundError(String(group.cycle_id), "AllocationCycle");
    }

    const now = new Date();
    if (cycle.status !== "open" || now < cycle.window_open || now > cycle.window_close) {
      throw new ApiProblemError({
        title: "Window Closed",
        status: 422,
        detail: "Group modification is locked because the application window is closed.",
        code: "BAD_REQUEST" as any,
      });
    }

    // Room capacity limit (max 4 members per group)
    if (group.members.length >= 4) {
      throw new ApiProblemError({
        title: "Group Full",
        status: 422,
        detail: "Group size cannot exceed the maximum room capacity limit of 4 members.",
        code: "BAD_REQUEST" as any,
      });
    }

    // Check if user is already in members array
    const isMember = group.members.some((m) => String(m.student_id) === String(user.id));
    if (!isMember) {
      group.members.push({
        student_id: user.id as any,
        email: user.email ?? body.email ?? "student@campus.edu",
        status: "pending",
        joined_at: new Date(),
      });
      await group.save();
    }

    return group;
  },
);
