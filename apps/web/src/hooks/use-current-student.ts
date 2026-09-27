"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useSession } from "next-auth/react";

export interface StudentProfile {
  id: string;
  fullName: string;
  name: string;
  email: string;
  rollNumber: string;
  roll_number: string;
  phone: string;
  programme: string;
  department: string;
  year: number;
  semester: string;
  cgpa: string;
  category: string;
  homeState: string;
  address: string;
  emergencyContact: string;
  profileCompletion: number;
  applicationStatus:
    "not_started" | "draft" | "submitted" | "under_review" | "approved" | "rejected" | "waitlisted";
  applicationId: string | null;
  applicationReference: string | null;
  hasAllocation: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export function useCurrentStudent() {
  const { data: session, status } = useSession();

  return useQuery<StudentProfile | null>({
    queryKey: ["currentStudent", session?.user?.id],
    queryFn: async () => {
      const res = await fetch("/api/student/me");
      if (!res.ok) {
        if (res.status === 401) return null;
        throw new Error("Failed to load student profile");
      }
      const json = await res.json();
      return json.data as StudentProfile;
    },
    enabled: status === "authenticated" && Boolean(session?.user?.id),
    staleTime: 30 * 1000, // 30s
    retry: 1,
  });
}

export function useUpdateStudentProfile() {
  const queryClient = useQueryClient();
  const { update: updateSession } = useSession();

  return useMutation({
    mutationFn: async (payload: Partial<StudentProfile>) => {
      const res = await fetch("/api/student/me", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to update profile");
      }

      const json = await res.json();
      return json.data as StudentProfile;
    },
    onSuccess: (updatedStudent) => {
      queryClient.setQueryData(["currentStudent", updatedStudent.id], updatedStudent);
      queryClient.invalidateQueries({ queryKey: ["currentStudent"] });
      // Keep NextAuth session token in sync with updated name/rollNumber
      if (updateSession) {
        updateSession({
          name: updatedStudent.fullName,
          rollNumber: updatedStudent.rollNumber,
          phone: updatedStudent.phone,
        }).catch(() => {
          // Non-fatal session update error
        });
      }
    },
  });
}
