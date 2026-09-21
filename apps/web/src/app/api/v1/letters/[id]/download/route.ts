/**
 * @hostelhub/web — /api/v1/letters/[id]/download
 *
 * Secure download route for official allocation letters.
 * Security Invariant:
 * Students can ONLY download their own allocation letter.
 * Serves short-lived presigned URLs (15 minute TTL) pointing to MinIO.
 */

import { type NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { AllocationLetterModel } from "@hostelhub/db";
import { ApiProblemError } from "@/lib/api/errors";
import { getPresignedGetUrl } from "@/lib/storage/presigner";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
): Promise<NextResponse> {
  const session = await auth();
  if (!session?.user?.id) {
    throw new ApiProblemError({
      status: 401,
      title: "Unauthorized",
      detail: "Authentication required to download allocation letters",
      code: "UNAUTHORIZED",
    });
  }

  const { id } = await params;
  const user = session.user;
  const userRoles = (user.roles ?? ["student"]) as string[];
  const isStudent = userRoles.includes("student") && !userRoles.some((r) => r !== "student");

  const letter = await AllocationLetterModel.findById(id);
  if (!letter) {
    throw new ApiProblemError({
      status: 404,
      title: "Letter Not Found",
      detail: "Allocation letter does not exist",
      code: "NOT_FOUND",
    });
  }

  // SECURITY ENFORCEMENT: Student can ONLY download their own letter
  if (isStudent && letter.student_id.toString() !== user.id) {
    throw new ApiProblemError({
      status: 403,
      title: "Forbidden",
      detail: "You are not authorized to download this allocation letter",
      code: "FORBIDDEN",
    });
  }

  // Generate short-lived presigned GET URL (15 minutes)
  let downloadUrl: string;
  try {
    downloadUrl = await getPresignedGetUrl(letter.s3_key, 900);
  } catch {
    // In local dev without MinIO running, provide fallback direct download link
    downloadUrl = `/api/v1/letters/${letter._id.toString()}/file`;
  }

  const wantsRedirect = req.nextUrl.searchParams.get("redirect") === "true";
  if (wantsRedirect) {
    return NextResponse.redirect(downloadUrl);
  }

  return NextResponse.json({
    letter_id: letter._id.toString(),
    letter_number: letter.letter_number,
    download_url: downloadUrl,
    expires_in_seconds: 900,
  });
}
