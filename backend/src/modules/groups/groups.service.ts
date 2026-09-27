import crypto from "crypto";
import { Types } from "mongoose";
import { GroupModel, UserModel, type IGroup, type GroupDocument } from "@hostelhub/db";
import {
  NotFoundError,
  ConflictError,
  BadRequestError,
  ForbiddenError,
} from "../../common/errors/app-error.js";
import { AuditService } from "../audit/audit.service.js";

export class GroupsService {
  public static async listGroups(institutionId: string, cycleId?: string): Promise<IGroup[]> {
    const filter: Record<string, unknown> = { institution_id: new Types.ObjectId(institutionId) };
    if (cycleId) filter.cycle_id = new Types.ObjectId(cycleId);
    return GroupModel.find(filter).lean<IGroup[]>();
  }

  public static async getStudentGroup(
    institutionId: string,
    studentId: string,
  ): Promise<IGroup | null> {
    return GroupModel.findOne({
      institution_id: new Types.ObjectId(institutionId),
      "members.student_id": new Types.ObjectId(studentId),
      status: { $in: ["draft", "confirmed"] },
    }).lean<IGroup | null>();
  }

  public static async createGroup(
    institutionId: string,
    cycleId: string,
    leaderId: string,
    name: string,
    actor: { userId: string; email: string; role: string },
  ): Promise<GroupDocument> {
    const instId = new Types.ObjectId(institutionId);
    const cycleObjectId = new Types.ObjectId(cycleId);
    const leaderObjectId = new Types.ObjectId(leaderId);

    const existing = await GroupModel.findOne({
      institution_id: instId,
      cycle_id: cycleObjectId,
      "members.student_id": leaderObjectId,
      status: { $in: ["draft", "confirmed"] },
    });
    if (existing) {
      throw new ConflictError(
        "You are already part of an active roommate group",
        "ALREADY_IN_GROUP",
      );
    }

    const inviteCode = crypto.randomBytes(4).toString("hex").toUpperCase();

    const group = await GroupModel.create({
      institution_id: instId,
      cycle_id: cycleObjectId,
      leader_id: leaderObjectId,
      invite_code: inviteCode,
      status: "draft",
      members: [
        {
          student_id: leaderObjectId,
          email: actor.email,
          status: "accepted",
          joined_at: new Date(),
        },
      ],
    });

    await AuditService.record({
      institutionId,
      actor,
      action: "groups.create",
      target: { resourceType: "Group", resourceId: group._id.toString() },
      after: { inviteCode, leaderId },
    });

    return group;
  }

  public static async inviteMember(
    institutionId: string,
    groupId: string,
    leaderId: string,
    inviteeEmail: string,
    actor: { userId: string; email: string; role: string },
  ): Promise<GroupDocument> {
    const group = await GroupModel.findOne({
      _id: new Types.ObjectId(groupId),
      institution_id: new Types.ObjectId(institutionId),
    });
    if (!group) throw new NotFoundError("Group not found", "GROUP_NOT_FOUND");
    if (group.leader_id.toString() !== leaderId) {
      throw new ForbiddenError("Only the group leader can invite members", "NOT_GROUP_LEADER");
    }

    const invitee = await UserModel.findOne({
      email: inviteeEmail.toLowerCase(),
      institution_id: new Types.ObjectId(institutionId),
    });
    if (!invitee) {
      throw new NotFoundError("Invited student not found", "STUDENT_NOT_FOUND");
    }

    const alreadyMember = group.members.some(
      (m) => m.student_id.toString() === invitee._id.toString(),
    );
    if (alreadyMember) {
      throw new ConflictError(
        "Student is already invited or a member of this group",
        "ALREADY_INVITED",
      );
    }

    if (group.members.length >= 4) {
      throw new BadRequestError("Maximum group capacity of 4 reached", "GROUP_FULL");
    }

    group.members.push({
      student_id: invitee._id,
      email: invitee.email,
      status: "pending",
      joined_at: new Date(),
    });

    await group.save();

    await AuditService.record({
      institutionId,
      actor,
      action: "groups.invite",
      target: { resourceType: "Group", resourceId: group._id.toString() },
      after: { inviteeEmail },
    });

    return group;
  }

  public static async acceptInvite(
    institutionId: string,
    groupId: string,
    studentId: string,
    actor: { userId: string; email: string; role: string },
  ): Promise<GroupDocument> {
    const group = await GroupModel.findOne({
      _id: new Types.ObjectId(groupId),
      institution_id: new Types.ObjectId(institutionId),
    });
    if (!group) throw new NotFoundError("Group not found", "GROUP_NOT_FOUND");

    const member = group.members.find((m) => m.student_id.toString() === studentId);
    if (!member) {
      throw new ForbiddenError("You do not have an invitation to this group", "NO_INVITATION");
    }

    member.status = "accepted";
    member.joined_at = new Date();

    const allAccepted = group.members.every((m) => m.status === "accepted");
    if (allAccepted && group.members.length >= 2) {
      group.status = "confirmed";
    }

    await group.save();

    await AuditService.record({
      institutionId,
      actor,
      action: "groups.accept_invite",
      target: { resourceType: "Group", resourceId: group._id.toString() },
      after: { groupId, studentId },
    });

    return group;
  }

  public static async leaveOrDissolveGroup(
    institutionId: string,
    groupId: string,
    userId: string,
    actor: { userId: string; email: string; role: string },
  ): Promise<{ success: boolean }> {
    const group = await GroupModel.findOne({
      _id: new Types.ObjectId(groupId),
      institution_id: new Types.ObjectId(institutionId),
    });
    if (!group) throw new NotFoundError("Group not found", "GROUP_NOT_FOUND");

    if (group.leader_id.toString() === userId) {
      group.status = "disbanded";
      await group.save();
    } else {
      group.members = group.members.filter((m) => m.student_id.toString() !== userId);
      await group.save();
    }

    await AuditService.record({
      institutionId,
      actor,
      action: "groups.leave_or_dissolve",
      target: { resourceType: "Group", resourceId: group._id.toString() },
      after: { status: group.status },
    });

    return { success: true };
  }
}
