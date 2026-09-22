/**
 * Example Webhook Consumer Script
 *
 * Demonstrates how an external system (e.g., P04 Hostel Room Exchange) verifies
 * HostelHub HMAC-SHA256 signatures, prevents replay attacks via timestamps,
 * and processes incoming event payloads safely.
 *
 * Usage:
 *   WEBHOOK_SECRET=your_secret_here npx tsx scripts/example-webhook-consumer.ts
 */

import http from "node:http";
import crypto from "node:crypto";

const PORT = parseInt(process.env["PORT"] || "9099", 10);
const SECRET = process.env["WEBHOOK_SECRET"] || "whsec_demo_secret_for_room_exchange";
const MAX_AGE_SECONDS = 300; // 5-minute replay prevention window

function verifyHostelHubSignature(
  secret: string,
  signature: string,
  timestamp: string,
  rawBody: string,
): { valid: boolean; reason?: string } {
  const ts = parseInt(timestamp, 10);
  if (isNaN(ts)) {
    return { valid: false, reason: "Malformed X-Signature-Timestamp header" };
  }

  // 1. Replay prevention: verify timestamp freshness
  const now = Math.floor(Date.now() / 1000);
  const normalizedTs = ts > 1e11 ? Math.floor(ts / 1000) : ts;
  if (Math.abs(now - normalizedTs) > MAX_AGE_SECONDS) {
    return {
      valid: false,
      reason: `Timestamp outside acceptable window (${MAX_AGE_SECONDS}s). Possible replay attack.`,
    };
  }

  // 2. Compute expected HMAC-SHA256 digest over `${timestamp}.${rawBody}`
  const expectedSignature = crypto
    .createHmac("sha256", secret)
    .update(`${timestamp}.${rawBody}`)
    .digest("hex");

  // 3. Timing-safe comparison to prevent timing side-channel attacks
  const sigBuffer = Buffer.from(signature, "hex");
  const expectedBuffer = Buffer.from(expectedSignature, "hex");

  if (sigBuffer.length !== expectedBuffer.length) {
    return { valid: false, reason: "Signature length mismatch" };
  }

  const matches = crypto.timingSafeEqual(sigBuffer, expectedBuffer);
  return matches ? { valid: true } : { valid: false, reason: "Invalid HMAC signature" };
}

const server = http.createServer((req, res) => {
  if (req.method !== "POST") {
    res.writeHead(405, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ error: "Method Not Allowed. Send POST requests." }));
    return;
  }

  let rawBody = "";
  req.on("data", (chunk) => {
    rawBody += chunk;
  });

  req.on("end", () => {
    const signature = (req.headers["x-signature"] as string) || "";
    const timestamp =
      (req.headers["x-signature-timestamp"] as string) ||
      (req.headers["x-timestamp"] as string) ||
      "";
    const eventType = (req.headers["x-hostelhub-event"] as string) || "unknown";

    console.log(`\n────────────────────────────────────────────────────────────`);
    console.log(`[Webhook Inbound] Event: ${eventType} | Time: ${new Date().toISOString()}`);
    console.log(`Headers: X-Signature=${signature.slice(0, 16)}... | X-Timestamp=${timestamp}`);

    if (!signature || !timestamp) {
      console.error(`❌ [REJECTED] Missing X-Signature or X-Signature-Timestamp header.`);
      res.writeHead(400, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ error: "Missing required signature headers" }));
      return;
    }

    // Verify HMAC and freshness
    const verification = verifyHostelHubSignature(SECRET, signature, timestamp, rawBody);

    if (!verification.valid) {
      console.error(`❌ [VERIFICATION FAILED] Reason: ${verification.reason}`);
      res.writeHead(401, { "Content-Type": "application/json" });
      res.end(
        JSON.stringify({ error: "Signature verification failed", reason: verification.reason }),
      );
      return;
    }

    // Successfully verified!
    console.log(`✅ [SIGNATURE VERIFIED] Authenticity & Integrity guaranteed via HMAC-SHA256.`);
    try {
      const parsed = JSON.parse(rawBody);
      console.log(`📦 Payload:`, JSON.stringify(parsed, null, 2));

      // Example integration logic (e.g., P04 Hostel Room Exchange handling allocations)
      if (eventType === "allocation.published" || parsed.event === "allocation.published") {
        console.log(
          `🔔 Action: Syncing newly published allocations into Room Exchange database...`,
        );
      } else if (eventType === "room.changed" || parsed.event === "room.changed") {
        console.log(`🔔 Action: Updating room availability and resident rosters...`);
      }

      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(
        JSON.stringify({
          success: true,
          message: "Webhook received and verified",
          event: eventType,
        }),
      );
    } catch {
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ success: true, message: "Raw webhook verified" }));
    }
  });
});

server.listen(PORT, () => {
  console.log(`============================================================`);
  console.log(`🚀 HostelHub Example Webhook Consumer running on port ${PORT}`);
  console.log(`🔑 Configured Secret: ${SECRET.slice(0, 10)}...`);
  console.log(`📡 Ready to receive signed webhooks at http://localhost:${PORT}/webhook`);
  console.log(`============================================================`);
});
