import { Types } from "mongoose";
import { CompatibilityResponseModel } from "../models/compatibility-response.model.js";
import { decryptPayload } from "@hostelhub/shared";
import type { QuestionnaireAnswers } from "@hostelhub/domain";

/**
 * Service designated specifically for reading and decrypting student compatibility responses
 * for use inside background allocation worker engine.
 */
export class CompatibilityReader {
  constructor(private readonly institutionId: string | Types.ObjectId) {}

  public async getDecryptedAnswers(
    studentId: string | Types.ObjectId,
  ): Promise<QuestionnaireAnswers | null> {
    const studentObjId = typeof studentId === "string" ? new Types.ObjectId(studentId) : studentId;
    const instObjId = typeof this.institutionId === "string" ? new Types.ObjectId(this.institutionId) : this.institutionId;

    const record = await CompatibilityResponseModel.findOne({
      institution_id: instObjId,
      student_id: studentObjId,
    }).exec();

    if (!record) return null;

    try {
      const answers = decryptPayload<QuestionnaireAnswers>(
        {
          keyId: record.key_id,
          iv: record.iv,
          authTag: record.auth_tag,
          ciphertext: record.ciphertext,
        },
        instObjId.toString(),
        studentObjId.toString(),
      );
      return answers;
    } catch (err) {
      return null;
    }
  }

  public static async getDecryptedAnswersForStudent(
    studentId: string | Types.ObjectId,
    institutionId: string | Types.ObjectId,
  ): Promise<QuestionnaireAnswers | null> {
    const reader = new CompatibilityReader(institutionId);
    return reader.getDecryptedAnswers(studentId);
  }
}

