/**
 * @hostelhub/web — /api/v1/drafts/[id]/letters
 *
 * Staff endpoints to trigger and monitor batch allocation letter generation.
 */

import { type NextRequest, NextResponse } from "next/server";
import { Queue } from "bullmq";
import { auth } from "@/auth";
import { LetterService, AllocationDraftModel } from "@hostelhub/db";
import { ApiProblemError } from "@/lib/api/errors";
import { getRedis } from "@/lib/redis";
import { LETTERS_QUEUE_NAME, type LettersJobPayload } from "@hostelhub/shared";

const STAFF_ROLES = ["warden", "chief_warden", "hostel_admin", "dean", "sys_admin", "admin"];

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
): Promise<NextResponse> {
  const session = await auth();
  if (!session?.user) {
    throw new ApiProblemError({
      status: 401,
      title: "Unauthorized",
      detail: "Authentication required",
      code: "UNAUTHORIZED",
    });
  }

  const userRoles = (session.user.roles ?? []) as string[];
  const isStaff = userRoles.some((r) => STAFF_ROLES.includes(r));
  if (!isStaff) {
    throw new ApiProblemError({
      status: 403,
      title: "Forbidden",
      detail: "Only staff members can monitor letter batch progress",
      code: "FORBIDDEN",
    });
  }

  const { id } = await params;
  const letterService = new LetterService();
  const progress = await letterService.getBatchProgress(id);

  return NextResponse.json({
    success: true,
    progress,
  });
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
): Promise<NextResponse> {
  const session = await auth();
  if (!session?.user) {
    throw new ApiProblemError({
      status: 401,
      title: "Unauthorized",
      detail: "Authentication required",
      code: "UNAUTHORIZED",
    });
  }

  const userRoles = (session.user.roles ?? []) as string[];
  const isStaff = userRoles.some((r) => STAFF_ROLES.includes(r));
  if (!isStaff) {
    throw new ApiProblemError({
      status: 403,
      title: "Forbidden",
      detail: "Only staff members can trigger letter generation",
      code: "FORBIDDEN",
    });
  }

  const { id } = await params;
  const draft = await AllocationDraftModel.findById(id);
  if (!draft) {
    throw new ApiProblemError({
      status: 404,
      title: "Draft Not Found",
      detail: "Allocation draft does not exist",
      code: "NOT_FOUND",
    });
  }

  const letterService = new LetterService();

  // Initialize or resume batch records
  const { progress } = await letterService.initOrResumeBatch(draft._id, draft.institution_id, {
    chunkSize: 200,
  });

  // Queue background worker BullMQ job if Redis is available
  const redis = getRedis();
  if (redis) {
    const lettersQueue = new Queue<LettersJobPayload>(LETTERS_QUEUE_NAME, {
      connection: redis,
    });

    await lettersQueue.add(
      `letters-draft-${id}`,
      {
        draftId: id,
        institutionId: draft.institution_id.toString(),
        chunkSize: 200,
      },
      {
        jobId: `letters-draft-${id}`,
      },
    );
  }

  return NextResponse.json({
    success: true,
    message: "Letters batch job queued successfully in chunks of 200",
    progress,
  });
}
