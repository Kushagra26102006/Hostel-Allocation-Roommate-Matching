import { NextResponse } from "next/server";
import { auth } from "@/auth";

// Public VAPID key for web push subscriptions
// Fallback is a standard dev/test uncompressed P-256 public key
const FALLBACK_VAPID_PUBLIC_KEY =
  "BEl62iUYgUivxIkv69yViEuiBIa-Ib9-SkvMeAtA3LFgDzkrxZJjSgSnfckjBJuBkr3qBUYIHBQFLXYp5Nksh8U";

export async function GET(): Promise<NextResponse> {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const publicKey =
    process.env["VAPID_PUBLIC_KEY"] ||
    process.env["NEXT_PUBLIC_VAPID_PUBLIC_KEY"] ||
    FALLBACK_VAPID_PUBLIC_KEY;

  return NextResponse.json({
    publicKey,
    configured: Boolean(
      process.env["VAPID_PUBLIC_KEY"] || process.env["NEXT_PUBLIC_VAPID_PUBLIC_KEY"],
    ),
  });
}
