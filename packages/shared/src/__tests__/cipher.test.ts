import { describe, it, expect } from "vitest";
import { encryptPayload, decryptPayload, registerMasterKey } from "../security/cipher.js";

describe("Phase 4.3: Cryptographic Cipher & AAD Binding", () => {
  it("binds ciphertext with AAD (institutionId + studentId + keyId) and rejects wrong tenant", () => {
    const data = { secret: "confidential_questionnaire" };
    const instA = "inst_tenant_A";
    const instB = "inst_tenant_B";
    const student = "usr_student_123";

    const encrypted = encryptPayload(data, instA, student);

    // Decrypting with wrong tenant must throw error
    expect(() => decryptPayload(encrypted, instB, student)).toThrow();

    // Decrypting with wrong studentId must throw error
    expect(() => decryptPayload(encrypted, instA, "usr_student_wrong")).toThrow();

    // Decrypting with correct tenant and student must succeed
    const decrypted = decryptPayload<{ secret: string }>(encrypted, instA, student);
    expect(decrypted.secret).toBe("confidential_questionnaire");
  });

  it("supports key rotation via key registry", () => {
    const rotationKeyId = "v2_key";
    const rotationSecret = "second_master_secret_32_chars_long!";
    registerMasterKey(rotationKeyId, rotationSecret);

    const data = { role: "student" };
    const encrypted = encryptPayload(data, "inst_1", "usr_1", rotationKeyId);

    expect(encrypted.keyId).toBe(rotationKeyId);

    const decrypted = decryptPayload<{ role: string }>(encrypted, "inst_1", "usr_1");
    expect(decrypted.role).toBe("student");
  });

  it("detects ciphertext tampering and fails decryption", () => {
    const data = { test: true };
    const encrypted = encryptPayload(data, "inst_1", "usr_1");

    // Tamper with ciphertext
    const tampered = {
      ...encrypted,
      ciphertext: Buffer.from("tampered_content").toString("base64"),
    };

    expect(() => decryptPayload(tampered, "inst_1", "usr_1")).toThrow();
  });
});
