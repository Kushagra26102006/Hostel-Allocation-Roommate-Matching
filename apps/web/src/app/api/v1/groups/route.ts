import { z } from "zod";
import { Types } from "mongoose";
import { apiHandler } from "@/lib/api/handler.js";
import { GroupRepository, AllocationCycleRepository, EntityNotFoundError } from "@hostelhub/db";
import { ApiProblemError } from "@/lib/api/errors.js";

const createGroupSchema = z.object({
  cycle_id: z.string().min(1),
});

export const POST = apiHandler(
  {
    body: createGroupSchema,
    operationId: "createGroup",
    summary: "Create a new roommate group for cycle",
  },
  async ({ user, institution_id, body }) => {
    if (!user) {
      throw new ApiProblemError({
        title: "Unauthorized",
        status: 401,
        detail: "User context missing",
        code: "UNAUTHORIZED",
      });
    }

    const cycleRepo = new AllocationCycleRepository(institution_id);
    const cycle = await cycleRepo.findById(body.cycle_id);
    if (!cycle) {
      throw new EntityNotFoundError(body.cycle_id, "AllocationCycle");
    }

    // Check window open
    const now = new Date();
    if (cycle.status !== "open" || now < cycle.window_open || now > cycle.window_close) {
      throw new ApiProblemError({
        title: "Window Closed",
        status: 422,
        detail: "Group creation is locked because the application window is closed.",
        code: "BAD_REQUEST",
      });
    }

    const groupRepo = new GroupRepository(institution_id);

    // Check if student already in an active group for this cycle
    const existing = await groupRepo.findByStudentInCycle(user.id, body.cycle_id);
    if (existing) {
      return existing;
    }

    // Generate unique 6-char alphanumeric invite code
    const randomChars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
    let inviteCode = "";
    for (let i = 0; i < 6; i++) {
      inviteCode += randomChars.charAt(Math.floor(Math.random() * randomChars.length));
    }

    const newGroup = await groupRepo.create({
      cycle_id: cycle._id,
      leader_id: new Types.ObjectId(user.id),
      invite_code: inviteCode,
      status: "draft",
      members: [
        {
          student_id: new Types.ObjectId(user.id),
          email: user.email ?? "student@campus.edu",
          status: "accepted",
          joined_at: new Date(),
        },
      ],
    });

    return newGroup;
  },
);
