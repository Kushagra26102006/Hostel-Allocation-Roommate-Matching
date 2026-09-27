/**
 * HostelHub Centralized Typed API Client
 * Provides consistent RFC 9457 error handling, idempotency, and typed endpoints.
 */

import { apiClient, type RequestOptions } from "../client/api-client";
import type {
  Application,
  Hostel,
  Bed,
  Room,
  AllocationRun,
  Assignment,
  Waitlist,
  Appeal,
  RoomChange,
  Notification,
  AuditEntry,
  QuestionnaireAnswers,
} from "@/types";

// ============================================================================
// 1. Applications API
// ============================================================================
export const applicationsApi = {
  list: (params?: Record<string, string | number | boolean | undefined>) =>
    apiClient<{ data: Application[]; total: number }>("/api/v1/applications", {
      method: "GET",
      params,
    }),

  getById: (id: string) =>
    apiClient<Application>(`/api/v1/applications/${id}`, {
      method: "GET",
    }),

  create: (data: Partial<Application["formData"]>, idempotencyKey?: string) =>
    apiClient<Application>("/api/v1/applications", {
      method: "POST",
      body: data,
      idempotencyKey,
    }),

  update: (id: string, data: Partial<Application["formData"]>, ifMatch?: number) =>
    apiClient<Application>(`/api/v1/applications/${id}`, {
      method: "PATCH",
      body: data,
      ifMatch,
    }),

  submit: (id: string, ifMatch?: number) =>
    apiClient<Application>(`/api/v1/applications/${id}/submit`, {
      method: "POST",
      ifMatch,
    }),
};

// ============================================================================
// 2. Inventory API
// ============================================================================
export const inventoryApi = {
  getHostels: () =>
    apiClient<{ data: Hostel[] }>("/api/v1/inventory/hostels", {
      method: "GET",
    }),

  getHostelById: (id: string) =>
    apiClient<Hostel>(`/api/v1/inventory/hostels/${id}`, {
      method: "GET",
    }),

  getRooms: (params?: Record<string, string | number | boolean | undefined>) =>
    apiClient<{ data: Room[]; total: number }>("/api/v1/inventory/rooms", {
      method: "GET",
      params,
    }),

  getBeds: (params?: Record<string, string | number | boolean | undefined>) =>
    apiClient<{ data: Bed[]; total: number }>("/api/v1/inventory/beds", {
      method: "GET",
      params,
    }),

  getOccupancyMetrics: () =>
    apiClient<{
      totalBeds: number;
      occupiedBeds: number;
      availableBeds: number;
      heldBeds: number;
      occupancyRate: number;
    }>("/api/v1/inventory/occupancy", {
      method: "GET",
    }),
};

// ============================================================================
// 3. Allocation Engine API
// ============================================================================
export const allocationApi = {
  getRuns: () =>
    apiClient<{ data: AllocationRun[] }>("/api/v1/runs", {
      method: "GET",
    }),

  getRunById: (id: string) =>
    apiClient<AllocationRun>(`/api/v1/runs/${id}`, {
      method: "GET",
    }),

  startRun: (
    params: { cycleId: string; seed: string; weightVersionId: string },
    idempotencyKey?: string,
  ) =>
    apiClient<AllocationRun>("/api/v1/runs", {
      method: "POST",
      body: params,
      idempotencyKey,
    }),

  getAssignments: (runId: string, params?: Record<string, string | number | boolean | undefined>) =>
    apiClient<{ data: Assignment[]; total: number }>(`/api/v1/runs/${runId}/assignments`, {
      method: "GET",
      params,
    }),
};

// ============================================================================
// 4. Warden Review API
// ============================================================================
export const reviewApi = {
  getDraftReviewQueue: (hostelId: string) =>
    apiClient<{ data: Assignment[] }>(`/api/v1/drafts/${hostelId}/review`, {
      method: "GET",
    }),

  approveDraft: (hostelId: string, draftId: string) =>
    apiClient<{ status: string }>(`/api/v1/drafts/${draftId}/approve`, {
      method: "POST",
      body: { hostelId },
    }),

  overrideAssignment: (
    assignmentId: string,
    override: { newBedId: string; reason: string },
    idempotencyKey?: string,
  ) =>
    apiClient<Assignment>(`/api/v1/drafts/assignments/${assignmentId}/override`, {
      method: "POST",
      body: override,
      idempotencyKey,
    }),
};

// ============================================================================
// 5. Waitlist API
// ============================================================================
export const waitlistApi = {
  list: (cycleId: string, params?: Record<string, string | number | boolean | undefined>) =>
    apiClient<{ data: Waitlist[]; total: number }>("/api/v1/waitlist", {
      method: "GET",
      params: { cycleId, ...params },
    }),

  promote: (id: string, reason: string) =>
    apiClient<Waitlist>(`/api/v1/waitlist/${id}/promote`, {
      method: "POST",
      body: { reason },
    }),
};

// ============================================================================
// 6. Appeals API
// ============================================================================
export const appealsApi = {
  list: () =>
    apiClient<{ data: Appeal[] }>("/api/v1/appeals", {
      method: "GET",
    }),

  getById: (id: string) =>
    apiClient<Appeal>(`/api/v1/appeals/${id}`, {
      method: "GET",
    }),

  create: (data: { appealCategory: string; statement: string; evidenceDocs?: string[] }) =>
    apiClient<Appeal>("/api/v1/appeals", {
      method: "POST",
      body: data,
    }),

  review: (id: string, decision: { status: "approved" | "rejected"; notes: string }) =>
    apiClient<Appeal>(`/api/v1/appeals/${id}/decision`, {
      method: "POST",
      body: decision,
    }),
};

// ============================================================================
// 7. Room Changes API
// ============================================================================
export const roomChangesApi = {
  list: () =>
    apiClient<{ data: RoomChange[] }>("/api/v1/room-changes", {
      method: "GET",
    }),

  create: (data: {
    targetHostel: string;
    targetRoomType: string;
    reasonCategory: string;
    reasonText: string;
  }) =>
    apiClient<RoomChange>("/api/v1/room-changes", {
      method: "POST",
      body: data,
    }),
};

// ============================================================================
// 8. Reports API
// ============================================================================
export const reportsApi = {
  getFairnessMetrics: (runId?: string) =>
    apiClient<{
      giniIndex: number;
      firstChoiceRate: number;
      meanCompatibility: number;
      categoryParityGap: number;
    }>("/api/v1/reports/fairness", {
      method: "GET",
      params: { runId },
    }),

  getOccupancyReport: () =>
    apiClient<{
      hostels: { id: string; name: string; capacity: number; occupied: number }[];
    }>("/api/v1/reports/occupancy", {
      method: "GET",
    }),
};

// ============================================================================
// 9. Notifications API
// ============================================================================
export const notificationsApi = {
  list: () =>
    apiClient<{ data: Notification[] }>("/api/v1/notifications", {
      method: "GET",
    }),

  markAllAsRead: () =>
    apiClient<{ success: boolean }>("/api/v1/notifications/mark-all-read", {
      method: "POST",
    }),
};

// ============================================================================
// 10. Audit API
// ============================================================================
export const auditApi = {
  list: (params?: Record<string, string | number | boolean | undefined>) =>
    apiClient<{ data: AuditEntry[]; headHash: string }>("/api/v1/platform/audit", {
      method: "GET",
      params,
    }),
};

// ============================================================================
// 11. Questionnaire API (F07)
// ============================================================================
export const questionnaireApi = {
  get: (options?: RequestOptions) =>
    apiClient<{ data: QuestionnaireAnswers }>("/api/v1/questionnaire", {
      method: "GET",
      ...options,
    }),

  submit: (answers: QuestionnaireAnswers, options?: RequestOptions) =>
    apiClient<{ data: QuestionnaireAnswers; score?: number }>("/api/v1/questionnaire", {
      method: "POST",
      body: answers,
      ...options,
    }),
};

// Re-export core apiClient for custom callers
export { apiClient };
export type { RequestOptions };
