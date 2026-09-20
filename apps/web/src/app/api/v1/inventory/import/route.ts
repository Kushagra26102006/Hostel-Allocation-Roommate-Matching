import { z } from "zod";
import { apiHandler } from "@/lib/api/handler.js";
import {
  parseCsv,
  parseXlsx,
  executeInventoryImport,
} from "@/lib/inventory/import-engine.js";
import { ApiProblemError } from "@/lib/api/errors.js";

const importQuerySchema = z.object({
  dry_run: z
    .preprocess((val) => {
      if (typeof val === "boolean") return val;
      if (typeof val === "string") return val.toLowerCase() === "true";
      return false;
    }, z.boolean())
    .default(false),
});

export const POST = apiHandler(
  {
    permission: "inventory:manage",
    query: importQuerySchema,
    operationId: "importInventory",
    summary: "Bulk Import Inventory from CSV or XLSX",
  },
  async ({ req, institution_id, query }) => {
    const contentType = req.headers.get("content-type") ?? "";
    let rawRows: Record<string, unknown>[] = [];

    if (contentType.includes("multipart/form-data")) {
      const formData = await req.formData();
      const file = formData.get("file");
      const mappingStr = formData.get("columnMapping");
      let columnMapping: Record<string, string> | undefined;

      if (typeof mappingStr === "string") {
        try {
          columnMapping = JSON.parse(mappingStr);
        } catch {
          // Ignore invalid JSON mapping
        }
      }

      if (!(file instanceof Blob)) {
        throw new ApiProblemError({
          type: "https://hostelhub.campus.edu/probs/bad-request",
          title: "Missing File",
          status: 400,
          detail: "Multipart upload must include a 'file' field with CSV or XLSX data.",
          code: "BAD_REQUEST",
        });
      }

      const fileName = file instanceof File ? file.name.toLowerCase() : "";
      const arrayBuffer = await file.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);

      if (fileName.endsWith(".xlsx") || fileName.endsWith(".xls")) {
        rawRows = await parseXlsx(buffer, columnMapping);
      } else {
        rawRows = parseCsv(buffer, columnMapping);
      }
    } else if (contentType.includes("application/json")) {
      const json = (await req.json()) as {
        rows?: Record<string, unknown>[];
        csv?: string;
        columnMapping?: Record<string, string>;
      };

      if (Array.isArray(json.rows)) {
        rawRows = json.rows;
      } else if (typeof json.csv === "string") {
        rawRows = parseCsv(json.csv, json.columnMapping);
      } else {
        throw new ApiProblemError({
          type: "https://hostelhub.campus.edu/probs/bad-request",
          title: "Invalid Body",
          status: 400,
          detail: "JSON payload must contain 'rows' array or 'csv' string.",
          code: "BAD_REQUEST",
        });
      }
    } else {
      // Plain text CSV body
      const text = await req.text();
      rawRows = parseCsv(text);
    }

    if (rawRows.length === 0) {
      throw new ApiProblemError({
        type: "https://hostelhub.campus.edu/probs/bad-request",
        title: "Empty File",
        status: 400,
        detail: "The uploaded file contained no data rows.",
        code: "BAD_REQUEST",
      });
    }

    const result = await executeInventoryImport(
      institution_id,
      rawRows,
      Boolean(query.dry_run),
    );

    return result;
  },
);
