import { NextResponse } from "next/server";
import { generateOpenApiDocument } from "@/lib/api/openapi";

export const dynamic = "force-dynamic";

export function GET(): NextResponse {
  if (process.env.NODE_ENV === "production") {
    return NextResponse.json(
      { title: "Not Found", status: 404, detail: "API documentation is disabled in production." },
      { status: 404 },
    );
  }

  const doc = generateOpenApiDocument();
  return NextResponse.json(doc, {
    status: 200,
    headers: {
      "Content-Type": "application/json",
      "Cache-Control": "public, max-age=3600",
    },
  });
}
