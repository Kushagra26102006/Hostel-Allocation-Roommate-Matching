import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { connectDb, StudentService } from "@hostelhub/db";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST(req: Request) {
  const session = await auth();

  if (!session?.user?.id) {
    return NextResponse.json(
      { error: "Authentication required to submit application", code: "UNAUTHORIZED" },
      { status: 401 },
    );
  }

  let body: Record<string, unknown>;
  try {
    body = (await req.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json(
      { error: "Invalid JSON request payload", code: "INVALID_BODY" },
      { status: 400 },
    );
  }

  const formData = body["formData"] as Record<string, unknown> | undefined;
  const action = body["action"] === "draft" ? "draft" : "submit";

  if (!formData || typeof formData !== "object") {
    return NextResponse.json(
      { error: "formData is required", code: "INVALID_DATA" },
      { status: 400 },
    );
  }

  try {
    await connectDb();
    const result = await StudentService.submitApplication(session.user.id, formData, action);

    if (!result) {
      return NextResponse.json(
        { error: "Student record not found", code: "NOT_FOUND" },
        { status: 404 },
      );
    }

    return NextResponse.json({
      success: true,
      message:
        action === "submit"
          ? "Application successfully submitted and locked"
          : "Application draft autosaved",
      data: result,
    });
  } catch (error) {
    return NextResponse.json(
      {
        error: (error as Error).message || "Failed to process application",
        code: "INTERNAL_ERROR",
      },
      { status: 500 },
    );
  }
}
