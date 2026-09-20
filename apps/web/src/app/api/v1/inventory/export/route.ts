import { z } from "zod";
import { NextResponse } from "next/server";
import { apiHandler } from "@/lib/api/handler.js";
import { exportInventoryCsv, exportInventoryXlsx } from "@/lib/inventory/export-engine.js";

const exportQuerySchema = z.object({
  format: z.enum(["csv", "xlsx"]).default("csv"),
});

export const GET = apiHandler(
  {
    permission: "inventory:manage",
    query: exportQuerySchema,
    operationId: "exportInventory",
    summary: "Export Inventory in CSV or XLSX Format",
  },
  async ({ institution_id, query }) => {
    const timestamp = new Date().toISOString().split("T")[0];

    if (query.format === "xlsx") {
      const buffer = await exportInventoryXlsx(institution_id);
      return new NextResponse(new Uint8Array(buffer), {
        status: 200,
        headers: {
          "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
          "Content-Disposition": `attachment; filename="inventory-${timestamp}.xlsx"`,
        },
      });
    }

    const csvString = await exportInventoryCsv(institution_id);
    return new NextResponse(csvString, {
      status: 200,
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="inventory-${timestamp}.csv"`,
      },
    });
  },
);
