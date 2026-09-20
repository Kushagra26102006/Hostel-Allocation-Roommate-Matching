export interface MagicByteValidationResult {
  valid: boolean;
  detectedMime?: string | undefined;
  reason?: string | undefined;
}

const MAGIC_PATTERNS: Array<{
  mime: string;
  extensions: string[];
  check: (buffer: Buffer) => boolean;
}> = [
  {
    mime: "application/pdf",
    extensions: [".pdf"],
    check: (buf) =>
      buf.length >= 4 &&
      buf[0] === 0x25 && // %
      buf[1] === 0x50 && // P
      buf[2] === 0x44 && // D
      buf[3] === 0x46, // F
  },
  {
    mime: "image/png",
    extensions: [".png"],
    check: (buf) =>
      buf.length >= 8 &&
      buf[0] === 0x89 &&
      buf[1] === 0x50 && // P
      buf[2] === 0x4e && // N
      buf[3] === 0x47 && // G
      buf[4] === 0x0d &&
      buf[5] === 0x0a &&
      buf[6] === 0x1a &&
      buf[7] === 0x0a,
  },
  {
    mime: "image/jpeg",
    extensions: [".jpg", ".jpeg"],
    check: (buf) => buf.length >= 3 && buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff,
  },
];

const ALLOWED_EXTENSIONS = new Set([".pdf", ".png", ".jpg", ".jpeg"]);
const MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024; // 5 MB

export function validateMagicBytes(
  buffer: Buffer,
  fileName: string,
  declaredMimeType: string,
): MagicByteValidationResult {
  if (!buffer || buffer.length === 0) {
    return { valid: false, reason: "File buffer is empty" };
  }

  if (buffer.length > MAX_FILE_SIZE_BYTES) {
    return {
      valid: false,
      reason: `File size (${(buffer.length / (1024 * 1024)).toFixed(2)} MB) exceeds the maximum allowed limit of 5 MB`,
    };
  }

  const extIndex = fileName.lastIndexOf(".");
  if (extIndex === -1) {
    return { valid: false, reason: "File lacks an extension" };
  }
  const extension = fileName.slice(extIndex).toLowerCase();

  if (!ALLOWED_EXTENSIONS.has(extension)) {
    return {
      valid: false,
      reason: `Extension '${extension}' is not allowed. Only .pdf, .png, .jpg, .jpeg are accepted.`,
    };
  }

  let matchedPattern = MAGIC_PATTERNS.find((pattern) => pattern.check(buffer));

  if (!matchedPattern) {
    return {
      valid: false,
      reason: "File headers do not match any recognized valid format (magic-byte check failed).",
    };
  }

  if (!matchedPattern.extensions.includes(extension)) {
    return {
      valid: false,
      detectedMime: matchedPattern.mime,
      reason: `File extension '${extension}' does not match detected file format '${matchedPattern.mime}'`,
    };
  }

  if (declaredMimeType && matchedPattern.mime !== declaredMimeType) {
    return {
      valid: false,
      detectedMime: matchedPattern.mime,
      reason: `Declared MIME type '${declaredMimeType}' does not match detected format '${matchedPattern.mime}'`,
    };
  }

  return {
    valid: true,
    detectedMime: matchedPattern.mime,
  };
}
