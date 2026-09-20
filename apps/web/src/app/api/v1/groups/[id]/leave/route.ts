import { z } from "zod";
import { apiHandler } from "@/lib/api/handler.js";
import { GroupRepository, AllocationCycleRepository, EntityNotFoundError } from "@hostelhub/db";
import { ApiProblemError } from "@/lib/api/errors.js";

const paramsSchema = z.object({
  id: z.string(),
});

export const DELETE = apiHandler(
  {
    params: paramsSchema,
    operationId: "leaveGroup",
    summary: "Leave roommate group",
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

    // Remove user from members array
    group.members = group.members.filter((m) => String(m.student_id) !== String(user.id));

    if (group.members.length === 0) {
      group.status = "disbanded";
    } else {
      // Re-evaluate confirmation status
      const allAccepted = group.members.every((m) => m.status === "accepted");
      group.status = allAccepted && group.members.length > 1 ? "confirmed" : "draft";
    }

    await group.save();
    return {
      message: "Successfully left the group",
      group_id: group._id,
      remaining_members: group.members.length,
    };
  },
);
