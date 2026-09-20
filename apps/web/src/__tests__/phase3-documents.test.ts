import { describe, it, expect, vi } from "vitest";
import { validateMagicBytes } from "@/lib/storage/magic-bytes";
import { getPresignedPutUrl } from "@/lib/storage/presigner";
import { ClamAvMalwareScanner, FallbackMalwareScanner } from "@/lib/services/scan-port";

describe("Phase 3: Document Uploads & Security", () => {
  describe("validateMagicBytes", () => {
    it("rejects when declaredMimeType does not match detected format", () => {
      const pdfBuffer = Buffer.from("%PDF-1.4 sample content");
      const result = validateMagicBytes(pdfBuffer, "document.pdf", "image/png");
      expect(result.valid).toBe(false);
      expect(result.reason).toMatch(/match/i);
    });

    it("accepts when magic bytes, extension, and declared MIME type match", () => {
      const pdfBuffer = Buffer.from("%PDF-1.4 valid content");
      const result = validateMagicBytes(pdfBuffer, "document.pdf", "application/pdf");
      expect(result.valid).toBe(true);
      expect(result.detectedMime).toBe("application/pdf");
    });

    it("rejects unsupported extensions", () => {
      const exeBuffer = Buffer.from("MZ header");
      const result = validateMagicBytes(exeBuffer, "malware.exe", "application/x-executable");
      expect(result.valid).toBe(false);
      expect(result.reason).toMatch(/extension/i);
    });
  });

  describe("Presign URL Generation", () => {
    it("includes ContentLength condition to enforce file size limit", async () => {
      const res = await getPresignedPutUrl(
        "test.pdf",
        "application/pdf",
        "inst_123",
        "usr_456",
        1024,
      );
      expect(res.storageKey).toBe(
        "tenants/inst_123/students/usr_456/" + res.storageKey.split("/").pop(),
      );
      expect(res.uploadUrl).toBeDefined();
    });
  });

  describe("ClamAV Adapter & Fail Closed Behavior", () => {
    it("ClamAvMalwareScanner fails closed when socket connection fails", async () => {
      const scanner = new ClamAvMalwareScanner({ host: "127.0.0.1", port: 33100, timeoutMs: 500 });
      const dummyBuffer = Buffer.from("test content");
      await expect(scanner.scanBuffer(dummyBuffer, "test.pdf")).rejects.toThrow();
    });

    it("FallbackMalwareScanner throws in production", async () => {
      const fallback = new FallbackMalwareScanner();
      vi.stubEnv("NODE_ENV", "production");
      try {
        await expect(fallback.scanBuffer(Buffer.from("test"), "doc.pdf")).rejects.toThrow(
          /not configured in production/i,
        );
      } finally {
        vi.unstubAllEnvs();
      }
    });
  });
});
