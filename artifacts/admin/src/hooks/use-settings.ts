import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { fetchApi } from "@/lib/api";

export type AppSettings = {
  homeVideoUrl?: string | null;
  clubName?: string | null;
  clubTagline?: string | null;
  homeFeaturedVideoEnabled?: string | null;
  homeFeaturedVideoId?: string | null;
  [key: string]: string | null | undefined;
};

export function useSettings() {
  return useQuery({
    queryKey: ["settings"],
    queryFn: () => fetchApi<AppSettings>("/api/settings/admin"),
  });
}

export function useUpdateSettings() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (updates: Partial<AppSettings>) =>
      fetchApi<AppSettings>("/api/settings/admin", {
        method: "PUT",
        body: JSON.stringify(updates),
      }),
    onSuccess: (data) => {
      queryClient.setQueryData(["settings"], data);
    },
  });
}
