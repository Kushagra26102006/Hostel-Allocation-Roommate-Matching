/**
 * Reactive TanStack Query Hooks wrapping the HostelHub API layer
 */

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { mockApi } from "@/lib/api/mock";

export function useHostels() {
  return useQuery({
    queryKey: ["hostels"],
    queryFn: () => mockApi.getHostels(),
  });
}

export function useHostel(id: string) {
  return useQuery({
    queryKey: ["hostel", id],
    queryFn: () => mockApi.getHostelById(id),
    enabled: Boolean(id),
  });
}

export function useFloorBeds(hostelId: string, floorNo = 1) {
  return useQuery({
    queryKey: ["floorBeds", hostelId, floorNo],
    queryFn: () => mockApi.getFloorBeds(hostelId, floorNo),
    enabled: Boolean(hostelId),
  });
}

export function useStudentPreferences() {
  return useQuery({
    queryKey: ["studentPreferences"],
    queryFn: () => mockApi.getPreferences(),
  });
}

export function useUpdatePreferences() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (preferences: string[]) => mockApi.updatePreferences(preferences),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["studentPreferences"] });
    },
  });
}

export function useQuestionnaire() {
  return useQuery({
    queryKey: ["questionnaire"],
    queryFn: () => mockApi.getQuestionnaire(),
  });
}

export function useSaveQuestionnaire() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (answers: Parameters<typeof mockApi.saveQuestionnaire>[0]) =>
      mockApi.saveQuestionnaire(answers),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["questionnaire"] });
    },
  });
}

export function useStudentGroup() {
  return useQuery({
    queryKey: ["studentGroup"],
    queryFn: () => mockApi.getGroup(),
  });
}

export function useInviteGroupMember() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (rollNo: string) => mockApi.inviteGroupMember(rollNo),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["studentGroup"] });
    },
  });
}

export function useAllocationResult() {
  return useQuery({
    queryKey: ["allocationResult"],
    queryFn: () => mockApi.getAllocationResult(),
  });
}

export function useRoomChanges() {
  return useQuery({
    queryKey: ["roomChanges"],
    queryFn: () => mockApi.getRoomChanges(),
  });
}

export function useCreateRoomChange() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: Parameters<typeof mockApi.createRoomChange>[0]) =>
      mockApi.createRoomChange(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["roomChanges"] });
    },
  });
}

export function useAppeals() {
  return useQuery({
    queryKey: ["appeals"],
    queryFn: () => mockApi.getAppeals(),
  });
}

export function useCreateAppeal() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: Parameters<typeof mockApi.createAppeal>[0]) => mockApi.createAppeal(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["appeals"] });
    },
  });
}

export function useAllocationRuns() {
  return useQuery({
    queryKey: ["allocationRuns"],
    queryFn: () => mockApi.getAllocationRuns(),
  });
}

export function useWaitlist() {
  return useQuery({
    queryKey: ["waitlist"],
    queryFn: () => mockApi.getWaitlist(),
  });
}

export function usePromoteWaitlist() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, reason }: { id: string; reason: string }) =>
      mockApi.promoteWaitlistStudent(id, reason),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["waitlist"] });
    },
  });
}

export function useAuditLogs() {
  return useQuery({
    queryKey: ["auditLogs"],
    queryFn: () => mockApi.getAuditLogs(),
  });
}

export function useFeatureFlags() {
  return useQuery({
    queryKey: ["featureFlags"],
    queryFn: () => mockApi.getFeatureFlags(),
  });
}

export function useToggleFeatureFlag() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ key, enabled }: { key: string; enabled: boolean }) =>
      mockApi.toggleFeatureFlag(key, enabled),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["featureFlags"] });
    },
  });
}

export function useWeightVersions() {
  return useQuery({
    queryKey: ["weightVersions"],
    queryFn: () => mockApi.getWeightVersions(),
  });
}

export function useApiKeys() {
  return useQuery({
    queryKey: ["apiKeys"],
    queryFn: () => mockApi.getApiKeys(),
  });
}

export function useWebhooks() {
  return useQuery({
    queryKey: ["webhooks"],
    queryFn: () => mockApi.getWebhooks(),
  });
}
