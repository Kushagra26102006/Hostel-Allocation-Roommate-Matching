"use client";

import * as React from "react";
import {
  type ColumnDef,
  type ColumnFiltersState,
  type SortingState,
  type VisibilityState,
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
} from "@tanstack/react-table";
import {
  ChevronDown,
  ChevronUp,
  ChevronsUpDown,
  Search,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

export interface DataTableProps<TData, TValue> {
  columns: ColumnDef<TData, TValue>[];
  data: TData[];
  searchKey?: string;
  searchPlaceholder?: string;
  onRowClick?: (row: TData) => void;
  isLoading?: boolean;
  emptyMessage?: string;
  className?: string;
  toolbarActions?: React.ReactNode;
}

export function DataTable<TData, TValue>({
  columns,
  data,
  searchKey,
  searchPlaceholder = "Search records...",
  onRowClick,
  isLoading = false,
  emptyMessage = "No matching records found",
  className,
  toolbarActions,
}: DataTableProps<TData, TValue>) {
  const [sorting, setSorting] = React.useState<SortingState>([]);
  const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>([]);
  const [columnVisibility, setColumnVisibility] = React.useState<VisibilityState>({});
  const [rowSelection, setRowSelection] = React.useState({});

  const table = useReactTable({
    data,
    columns,
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    onColumnVisibilityChange: setColumnVisibility,
    onRowSelectionChange: setRowSelection,
    state: {
      sorting,
      columnFilters,
      columnVisibility,
      rowSelection,
    },
  });

  return (
    <div className={cn("space-y-3.5", className)}>
      {/* Search and Action Toolbar */}
      {(searchKey || toolbarActions) && (
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          {searchKey ? (
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted pointer-events-none" />
              <Input
                placeholder={searchPlaceholder}
                value={(table.getColumn(searchKey)?.getFilterValue() as string) ?? ""}
                onChange={(event) => table.getColumn(searchKey)?.setFilterValue(event.target.value)}
                className="pl-9 h-9 text-xs sm:text-sm bg-surface"
              />
            </div>
          ) : (
            <div />
          )}

          {toolbarActions && (
            <div className="flex items-center gap-2 shrink-0">{toolbarActions}</div>
          )}
        </div>
      )}

      {/* Table Surface */}
      <div className="rounded-card border border-border/70 bg-surface overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm border-collapse">
            <thead>
              {table.getHeaderGroups().map((headerGroup) => (
                <tr
                  key={headerGroup.id}
                  className="border-b border-border/80 bg-surface-muted/60 text-xs font-semibold uppercase tracking-wider text-muted select-none"
                >
                  {headerGroup.headers.map((header) => {
                    const canSort = header.column.getCanSort();
                    const isSorted = header.column.getIsSorted();

                    return (
                      <th
                        key={header.id}
                        className={cn(
                          "px-4 py-3 font-semibold",
                          canSort && "cursor-pointer hover:text-foreground transition-colors",
                        )}
                        onClick={header.column.getToggleSortingHandler()}
                      >
                        <div className="flex items-center gap-1.5">
                          {flexRender(header.column.columnDef.header, header.getContext())}
                          {canSort && (
                            <span className="shrink-0 text-muted">
                              {isSorted === "asc" ? (
                                <ChevronUp className="h-3.5 w-3.5 text-brand-600" />
                              ) : isSorted === "desc" ? (
                                <ChevronDown className="h-3.5 w-3.5 text-brand-600" />
                              ) : (
                                <ChevronsUpDown className="h-3 w-3 opacity-40 hover:opacity-100" />
                              )}
                            </span>
                          )}
                        </div>
                      </th>
                    );
                  })}
                </tr>
              ))}
            </thead>
            <tbody className="divide-y divide-border/50">
              {isLoading ? (
                Array.from({ length: 5 }).map((_, idx) => (
                  <tr key={idx} className="animate-pulse">
                    {columns.map((_, cIdx) => (
                      <td key={cIdx} className="px-4 py-3.5">
                        <div className="h-4 w-3/4 rounded bg-muted/20" />
                      </td>
                    ))}
                  </tr>
                ))
              ) : table.getRowModel().rows?.length ? (
                table.getRowModel().rows.map((row) => (
                  <tr
                    key={row.id}
                    data-state={row.getIsSelected() && "selected"}
                    onClick={() => onRowClick?.(row.original)}
                    className={cn(
                      "transition-colors duration-150 hover:bg-surface-muted/60",
                      onRowClick && "cursor-pointer active:bg-surface-muted",
                    )}
                  >
                    {row.getVisibleCells().map((cell) => (
                      <td key={cell.id} className="px-4 py-3 text-xs sm:text-sm text-foreground">
                        {flexRender(cell.column.columnDef.cell, cell.getContext())}
                      </td>
                    ))}
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={columns.length} className="h-32 text-center text-sm text-muted">
                    {emptyMessage}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Bar */}
        <div className="flex items-center justify-between px-4 py-3 border-t border-border/60 bg-surface-muted/30 text-xs text-muted">
          <div>
            Showing{" "}
            <span className="font-semibold text-foreground">
              {table.getState().pagination.pageIndex * table.getState().pagination.pageSize + 1}
            </span>{" "}
            to{" "}
            <span className="font-semibold text-foreground">
              {Math.min(
                (table.getState().pagination.pageIndex + 1) * table.getState().pagination.pageSize,
                data.length,
              )}
            </span>{" "}
            of <span className="font-semibold text-foreground">{data.length}</span> results
          </div>

          <div className="flex items-center gap-1.5">
            <Button
              variant="outline"
              size="sm"
              onClick={() => table.previousPage()}
              disabled={!table.getCanPreviousPage()}
              className="h-8 px-2.5 text-xs"
            >
              <ChevronLeft className="h-3.5 w-3.5 mr-1" />
              Previous
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => table.nextPage()}
              disabled={!table.getCanNextPage()}
              className="h-8 px-2.5 text-xs"
            >
              Next
              <ChevronRight className="h-3.5 w-3.5 ml-1" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
