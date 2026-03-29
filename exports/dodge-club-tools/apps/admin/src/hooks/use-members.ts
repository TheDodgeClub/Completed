import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { fetchApi } from "@/lib/api";

export interface AdminMember {
  id: number;
  name: string;
  email: string;
  isAdmin: boolean;
  isBanned: boolean;
  memberSince: string;
  eventsAttended: number;
  medalsEarned: number;
  ringsEarned: number;
  xp: number;
  level: number;
  avatarUrl: string | null;
  username: string | null;
  preferredRole: string | null;
  bio: string | null;
  accountType: string;
  referralCode: string | null;
  referredByName: string | null;
  referralCount: number;
  skills: string | null;
}

export interface UserReportEntry {
  id: number;
  reason: string | null;
  resolved: boolean;
  reportedBy: string;
  createdAt: string;
}

export interface UserReportGroup {
  userId: number;
  name: string;
  email: string;
  avatarUrl: string | null;
  isBanned: boolean;
  reportCount: number;
  unresolvedCount: number;
  reports: UserReportEntry[];
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

export interface AdminAward {
  id: number;
  userId: number;
  type: "medal" | "ring";
  note: string | null;
  awardedAt: string;
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

export function useMemberAwards(userId: number | null) {
  return useQuery({
    queryKey: ["awards", userId],
    queryFn: () => fetchApi<AdminAward[]>(`/api/admin/members/${userId}/awards`),
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
      queryClient.invalidateQueries({ queryKey: ["attendance"] });
      queryClient.invalidateQueries({ queryKey: ["members"] });
      queryClient.invalidateQueries({ queryKey: ["events"] });
    },
  });
}

export function useGrantAward() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: { userId: number; type: "medal" | "ring"; note?: string }) =>
      fetchApi<AdminAward>("/api/admin/awards", {
        method: "POST",
        body: JSON.stringify(data),
      }),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["awards", data.userId] });
      queryClient.invalidateQueries({ queryKey: ["members"] });
    },
  });
}

export function useRevokeAward() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id }: { id: number; userId: number }) =>
      fetchApi(`/api/admin/awards/${id}`, { method: "DELETE" }),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["awards", variables.userId] });
      queryClient.invalidateQueries({ queryKey: ["members"] });
    },
  });
}

export function useDeleteMember() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => fetchApi(`/api/admin/members/${id}`, { method: "DELETE" }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["members"] });
    },
  });
}

export function useUpdateMember() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: { name?: string; username?: string; bio?: string; memberSince?: string; accountType?: string } }) =>
      fetchApi<AdminMember>(`/api/admin/members/${id}`, {
        method: "PUT",
        body: JSON.stringify(data),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["members"] });
    },
  });
}

export function useBanMember() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => fetchApi(`/api/admin/members/${id}/ban`, { method: "POST" }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["members"] });
      queryClient.invalidateQueries({ queryKey: ["user-reports"] });
    },
  });
}

export function useUnbanMember() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => fetchApi(`/api/admin/members/${id}/unban`, { method: "POST" }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["members"] });
      queryClient.invalidateQueries({ queryKey: ["user-reports"] });
    },
  });
}

export function useWarnMember() {
  return useMutation({
    mutationFn: ({ id, reason }: { id: number; reason?: string }) =>
      fetchApi(`/api/admin/members/${id}/warn`, {
        method: "POST",
        body: JSON.stringify({ reason }),
      }),
  });
}

export function useUserReports() {
  return useQuery({
    queryKey: ["user-reports"],
    queryFn: () => fetchApi<UserReportGroup[]>("/api/admin/user-reports"),
  });
}

export function useResolveUserReport() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => fetchApi(`/api/admin/user-reports/${id}/resolve`, { method: "POST" }),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["user-reports"] }); },
  });
}

