import type { ApplicantFacts } from "./dsl.js";
export interface ErpPort {
    getStudentFacts(studentId: string): Promise<ApplicantFacts | null>;
}
/**
 * Mock ERP Adapter that reads student records from CSV input data.
 */
export declare class CsvErpAdapter implements ErpPort {
    private studentMap;
    constructor(csvData?: string);
    parseCsv(csvData: string): void;
    private seedDefaultMockData;
    getStudentFacts(studentId: string): Promise<ApplicantFacts | null>;
}
//# sourceMappingURL=erp-port.d.ts.map