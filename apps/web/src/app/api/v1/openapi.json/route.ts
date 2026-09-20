import { NextResponse } from "next/server";
import { generateOpenApiDocument } from "@/lib/api/openapi";

export const dynamic = "force-dynamic";

export function GET(): NextResponse {
  const doc = generateOpenApiDocument();
  return NextResponse.json(doc, {
    status: 200,
    headers: {
      "Content-Type": "application/json",
      "Cache-Control": "public, max-age=3600",
    },
  });
}
