import type { Request, Response } from "express";
import { LettersService } from "./letters.service.js";
import { sendSuccess } from "../../common/utils/response.js";
import { getStorageAdapter } from "../../adapters/storage/index.js";

export class LettersController {
  public static async getLetterPdf(req: Request, res: Response): Promise<void> {
    const idWithExt = req.params.id as string;
    const assignmentId = idWithExt.replace(/\.pdf$/, "");

    const letter = await LettersService.getLetterByAssignmentId(assignmentId);
    const storage = getStorageAdapter();
    const storageKey = letter.s3_key || `letters/${assignmentId}.pdf`;

    try {
      const fileBuffer = await storage.downloadFile(storageKey);
      res.setHeader("Content-Type", "application/pdf");
      res.setHeader(
        "Content-Disposition",
        `attachment; filename=allocation-letter-${assignmentId}.pdf`,
      );
      res.send(fileBuffer);
    } catch {
      // Return presigned URL or download link
      const downloadUrl = await storage.getPresignedDownloadUrl(storageKey);
      res.redirect(downloadUrl);
    }
  }

  // Public verification endpoint
  public static async verifyLetterToken(req: Request, res: Response): Promise<void> {
    const token = req.params.token as string;
    const result = await LettersService.verifyToken(token);
    sendSuccess(res, result);
  }
}
