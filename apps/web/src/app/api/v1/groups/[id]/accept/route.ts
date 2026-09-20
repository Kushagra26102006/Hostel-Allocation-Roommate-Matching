import { z } from "zod";
import { apiHandler } from "@/lib/api/handler.js";
import { GroupRepository, AllocationCycleRepository, EntityNotFoundError } from "@hostelhub/db";
import { ApiProblemError } from "@/lib/api/errors.js";

const paramsSchema = z.object({
  id: z.string(),
});

export const POST = apiHandler(
  {
    params: paramsSchema,
    operationId: "acceptGroupInvite",
    summary: "Accept roommate group invitation",
  },
  async ({ user, institution_id, params }) => {
    if (!user) {
      throw new ApiProblemError({
        title: "Unauthorized",
        status: 401,
        detail: "User context missing",
        code: "UNAUTHORIZED",
      });
    }

    const groupRepo = new GroupRepository(institution_id);
    const group = await groupRepo.findById(params.id);
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
        code: "BAD_REQUEST",
      });
    }

    // Update status of user's member record to accepted
    let found = false;
    group.members.forEach((m) => {
      if (String(m.student_id) === String(user.id)) {
        m.status = "accepted";
        found = true;
      }
    });

    if (!found) {
      throw new ApiProblemError({
        title: "Not Member",
        status: 400,
        detail: "You are not a member of this group.",
        code: "BAD_REQUEST",
      });
    }

    // Mutual request rule: A group is confirmed only when all members accept
    const allAccepted = group.members.every((m) => m.status === "accepted");
    if (allAccepted && group.members.length > 1) {
      group.status = "confirmed";
    }

    await group.save();
    return group;
  },
);
