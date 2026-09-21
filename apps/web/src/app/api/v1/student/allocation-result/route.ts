/**
 * @hostelhub/web — /api/v1/student/allocation-result
 *
 * Provides authenticated student allocation result data,
 * including room details, friendly score explanation, mutual-consent
 * filtered roommate details, and letter status.
 */

import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { LetterService } from "@hostelhub/db";
import { ApiProblemError } from "@/lib/api/errors";

export async function GET(): Promise<NextResponse> {
  const session = await auth();
  if (!session?.user?.id) {
    throw new ApiProblemError({
      status: 401,
      title: "Unauthorized",
      detail: "Authentication required to view allotment results",
      code: "UNAUTHORIZED",
    });
  }

  const letterService = new LetterService();
  const result = await letterService.getStudentResult(session.user.id);

  return NextResponse.json({
    success: true,
    data: result,
  });
}
