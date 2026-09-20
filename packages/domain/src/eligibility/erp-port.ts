import Papa from "papaparse";
import type { ApplicantFacts } from "./dsl.js";

export interface ErpPort {
  getStudentFacts(studentId: string): Promise<ApplicantFacts | null>;
}

/**
 * ERP Adapter that reads student records from CSV input data.
 */
export class CsvErpAdapter implements ErpPort {
  private studentMap = new Map<string, ApplicantFacts>();

  constructor(csvData?: string) {
    if (csvData) {
      this.parseCsv(csvData);
    }
  }

  public parseCsv(csvData: string): void {
    const parsed = Papa.parse<Record<string, string>>(csvData, {
      header: true,
      skipEmptyLines: true,
    });

    for (let i = 0; i < parsed.data.length; i++) {
      const record = parsed.data[i]!;
      const parseBool = (val: unknown): boolean => {
        if (typeof val === "boolean") return val;
        if (typeof val === "string") {
          const s = val.trim().toLowerCase();
          return s === "true" || s === "1" || s === "yes";
        }
        return false;
      };

      const studentId = String(record["studentId"] || record["student_id"] || `student_${i + 1}`);
      const facts: ApplicantFacts = {
        studentId,
        programme: String(record["programme"] ?? "General"),
        level: (record["level"] as any) ?? "UG",
        year: Number(record["year"] ?? 1),
        feeCategory: String(record["feeCategory"] ?? "General"),
        hasHold: parseBool(record["hasHold"]),
        distanceKm: Number(record["distanceKm"] ?? 0),
        documentsVerified: parseBool(record["documentsVerified"]),
        accessibilityNeed: parseBool(record["accessibilityNeed"]),
      };

      this.studentMap.set(studentId, facts);
    }
  }

  public async getStudentFacts(studentId: string): Promise<ApplicantFacts | null> {
    const facts = this.studentMap.get(studentId);
    return facts ?? null;
  }
}
