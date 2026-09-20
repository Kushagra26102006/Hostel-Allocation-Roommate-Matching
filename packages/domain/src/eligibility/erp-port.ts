import type { ApplicantFacts } from "./dsl.js";

export interface ErpPort {
  getStudentFacts(studentId: string): Promise<ApplicantFacts | null>;
}

/**
 * Mock ERP Adapter that reads student records from CSV input data.
 */
export class CsvErpAdapter implements ErpPort {
  private studentMap = new Map<string, ApplicantFacts>();

  constructor(csvData?: string) {
    if (csvData) {
      this.parseCsv(csvData);
    } else {
      // Seed standard mock student facts
      this.seedDefaultMockData();
    }
  }

  public parseCsv(csvData: string): void {
    const lines = csvData.trim().split(/\r?\n/);
    if (lines.length <= 1) return;

    const headers = lines[0]!.split(",").map((h) => h.trim());

    for (let i = 1; i < lines.length; i++) {
      const line = lines[i]!.trim();
      if (!line) continue;

      const cols = line.split(",").map((c) => c.trim());
      const record: Record<string, unknown> = {};

      headers.forEach((h, idx) => {
        const val = cols[idx] ?? "";
        if (val === "true") record[h] = true;
        else if (val === "false") record[h] = false;
        else if (!isNaN(Number(val)) && val !== "") record[h] = Number(val);
        else record[h] = val;
      });

      const studentId = String(record["studentId"] || record["student_id"] || `student_${i}`);
      this.studentMap.set(studentId, {
        studentId,
        programme: String(record["programme"] ?? "Computer Science"),
        level: String(record["level"] ?? "UG") as any,
        year: Number(record["year"] ?? 1),
        feeCategory: String(record["feeCategory"] ?? "General"),
        hasHold: Boolean(record["hasHold"] ?? false),
        distanceKm: Number(record["distanceKm"] ?? 150),
        documentsVerified: Boolean(record["documentsVerified"] ?? true),
        accessibilityNeed: Boolean(record["accessibilityNeed"] ?? false),
        ...record,
      });
    }
  }

  private seedDefaultMockData(): void {
    this.studentMap.set("usr_student", {
      studentId: "usr_student",
      programme: "B.Tech Computer Science",
      level: "UG",
      year: 1,
      feeCategory: "regular",
      hasHold: false,
      distanceKm: 240,
      documentsVerified: true,
      accessibilityNeed: false,
    });

    this.studentMap.set("student_demo_1", {
      studentId: "student_demo_1",
      programme: "B.Tech Electrical",
      level: "UG",
      year: 2,
      feeCategory: "regular",
      hasHold: false,
      distanceKm: 180,
      documentsVerified: true,
      accessibilityNeed: false,
    });
  }

  public async getStudentFacts(studentId: string): Promise<ApplicantFacts | null> {
    const facts = this.studentMap.get(studentId);
    if (facts) return facts;

    // Default fallback facts if not explicitly found in mock table
    return {
      studentId,
      programme: "General Programme",
      level: "UG",
      year: 1,
      feeCategory: "regular",
      hasHold: false,
      distanceKm: 200,
      documentsVerified: true,
      accessibilityNeed: false,
    };
  }
}
