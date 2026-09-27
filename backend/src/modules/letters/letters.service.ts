import { Types } from "mongoose";
import { AllocationLetterModel, type IAllocationLetter } from "@hostelhub/db";
import { NotFoundError } from "../../common/errors/app-error.js";
import { verifyHmacSignature } from "../../common/security/signatures.js";
import { env } from "../../config/env.js";

export class LettersService {
  public static async getLetterByAssignmentId(assignmentId: string): Promise<IAllocationLetter> {
    const letter = await AllocationLetterModel.findOne({
      assignment_id: new Types.ObjectId(assignmentId),
    }).lean<IAllocationLetter>();
    if (!letter) {
      throw new NotFoundError(
        "Allocation letter not found or not yet generated",
        "LETTER_NOT_FOUND",
      );
    }
    return letter;
  }

  public static async verifyToken(token: string): Promise<{
    valid: boolean;
    hostelName?: string;
    roomNumber?: string;
    bedNumber?: string;
    issuedAt?: string;
  }> {
    try {
      const decodedJson = Buffer.from(token, "base64url").toString("utf-8");
      const payload = JSON.parse(decodedJson);

      const { sig, ...dataWithoutSig } = payload;
      const isValid = verifyHmacSignature(dataWithoutSig, env.JWT_SECRET, sig);

      if (!isValid) {
        return { valid: false };
      }

      return {
        valid: true,
        hostelName: payload.hostelName,
        roomNumber: payload.roomNumber,
        bedNumber: payload.bedNumber,
        issuedAt: payload.issuedAt,
      };
    } catch {
      return { valid: false };
    }
  }
}
