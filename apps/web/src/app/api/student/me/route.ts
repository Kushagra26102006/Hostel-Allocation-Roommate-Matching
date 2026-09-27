import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/auth";
import { connectDb, StudentService } from "@hostelhub/db";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const updateProfileSchema = z.object({
  fullName: z.string().trim().min(2).max(100).optional(),
  name: z.string().trim().min(2).max(100).optional(),
  phone: z.string().trim().max(25).optional(),
  rollNumber: z.string().trim().max(30).optional(),
  roll_number: z.string().trim().max(30).optional(),
  address: z.string().trim().max(300).optional(),
  emergencyContact: z.string().trim().max(150).optional(),
  emergency_contact: z.string().trim().max(150).optional(),
  programme: z.string().trim().max(100).optional(),
  department: z.string().trim().max(100).optional(),
  year: z
    .union([z.number(), z.string()])
    .transform((v) => Number(v))
    .optional(),
  semester: z.string().trim().max(50).optional(),
  category: z.string().trim().max(50).optional(),
  homeState: z.string().trim().max(50).optional(),
  home_state: z.string().trim().max(50).optional(),
  cgpa: z.string().trim().max(10).optional(),
});

export async function GET() {
  const session = await auth();

  if (!session?.user?.id) {
    return NextResponse.json(
      { error: "Authentication required to access student profile", code: "UNAUTHORIZED" },
      { status: 401 },
    );
  }

  try {
    await connectDb();
    const profile = await StudentService.getStudentProfile(session.user.id);

    if (!profile) {
      return NextResponse.json(
        { error: "Student record not found in database", code: "NOT_FOUND" },
        { status: 404 },
      );
    }

    return NextResponse.json({
      success: true,
      data: profile,
    });
  } catch (error) {
    return NextResponse.json(
      { error: (error as Error).message || "Internal database error", code: "INTERNAL_ERROR" },
      { status: 500 },
    );
  }
}

export async function PATCH(req: Request) {
  const session = await auth();

  if (!session?.user?.id) {
    return NextResponse.json(
      { error: "Authentication required to update student profile", code: "UNAUTHORIZED" },
      { status: 401 },
    );
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json(
      { error: "Invalid JSON request payload", code: "INVALID_BODY" },
      { status: 400 },
    );
  }

  const parsed = updateProfileSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", issues: parsed.error.issues, code: "VALIDATION_ERROR" },
      { status: 400 },
    );
  }

  try {
    await connectDb();
    const updated = await StudentService.updateStudentProfile(session.user.id, parsed.data);

    if (!updated) {
      return NextResponse.json(
        { error: "Student record not found in database", code: "NOT_FOUND" },
        { status: 404 },
      );
    }

    return NextResponse.json({
      success: true,
      message: "Student profile updated successfully",
      data: updated,
    });
  } catch (error) {
    return NextResponse.json(
      { error: (error as Error).message || "Internal database error", code: "INTERNAL_ERROR" },
      { status: 500 },
    );
  }
}
