import { NextResponse } from "next/server";

export async function POST(req: Request) {
  try {
    // Acknowledge web vitals beacon without blocking
    await req.text().catch(() => null);
    return new NextResponse(null, { status: 204 });
  } catch {
    return new NextResponse(null, { status: 204 });
  }
}
