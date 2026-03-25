import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { fetchApi } from "@/lib/api";

export interface AdminMember {
  id: number;
  name: string;
  email: string;
  isAdmin: boolean;
  memberSince: string;
  eventsAttended: number;
  medalsEarned: number;
  avatarUrl: string | null;
}

export interface AdminAttendanceRecord {
  id: number;
  userId: number;
  eventId: number;
  earnedMedal: boolean;
  attendedAt: string;
  event: {
    id: number;
    title: string;
    date: string;
    location: string;
  };
}

export function useMembers() {
  return useQuery({
    queryKey: ["members"],
    queryFn: () => fetchApi<AdminMember[]>("/api/admin/members"),
  });
}

export function useMemberAttendance(userId: number | null) {
  return useQuery({
    queryKey: ["attendance", userId],
    queryFn: () => fetchApi<AdminAttendanceRecord[]>(`/api/admin/members/${userId}/attendance`),
    enabled: !!userId,
  });
}

export function useMarkAttendance() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: { userId: number; eventId: number; earnedMedal: boolean }) =>
      fetchApi<AdminAttendanceRecord>("/api/admin/attendance", {
        method: "POST",
        body: JSON.stringify(data),
      }),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["attendance", variables.userId] });
      queryClient.invalidateQueries({ queryKey: ["members"] });
      queryClient.invalidateQueries({ queryKey: ["events"] });
    },
  });
}

export function useDeleteAttendance() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: number) =>
      fetchApi(`/api/admin/attendance/${id}`, { method: "DELETE" }),
    onSuccess: () => {
      // Invalidate all attendance arrays to be safe, plus members list
      queryClient.invalidateQueries({ queryKey: ["attendance"] });
      queryClient.invalidateQueries({ queryKey: ["members"] });
      queryClient.invalidateQueries({ queryKey: ["events"] });
    },
  });
}
