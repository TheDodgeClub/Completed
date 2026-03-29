import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { fetchApi } from "@/lib/api";

export interface Video {
  id: number;
  title: string;
  description: string | null;
  url: string;
  thumbnailUrl: string | null;
  isPublished: boolean;
  publishedAt: string | null;
  createdAt: string;
}

export interface VideoInput {
  title: string;
  description?: string;
  url: string;
  thumbnailUrl?: string;
  isPublished?: boolean;
}

export function useVideos() {
  return useQuery<Video[]>({
    queryKey: ["admin", "videos"],
    queryFn: () => fetchApi<Video[]>("/api/admin/videos"),
  });
}

export function useCreateVideo() {
  const qc = useQueryClient();
  return useMutation<Video, Error, VideoInput>({
    mutationFn: (data) =>
      fetchApi<Video>("/api/admin/videos", { method: "POST", body: JSON.stringify(data) }),
    onSuccess: (v) => {
      qc.setQueryData<Video[]>(["admin", "videos"], (old) => [v, ...(old ?? [])]);
    },
  });
}

export function useUpdateVideo() {
  const qc = useQueryClient();
  return useMutation<Video, Error, { id: number; data: Partial<VideoInput> }>({
    mutationFn: ({ id, data }) =>
      fetchApi<Video>(`/api/admin/videos/${id}`, { method: "PUT", body: JSON.stringify(data) }),
    onSuccess: (v) => {
      qc.setQueryData<Video[]>(["admin", "videos"], (old) =>
        old ? old.map((x) => (x.id === v.id ? v : x)) : [v]
      );
    },
  });
}

export function usePublishVideo() {
  const qc = useQueryClient();
  return useMutation<Video, Error, { id: number; publish: boolean }, { prev?: Video[] }>({
    mutationFn: ({ id, publish }) =>
      fetchApi<Video>(`/api/admin/videos/${id}/publish`, { method: "POST", body: JSON.stringify({ publish }) }),
    onMutate: async ({ id, publish }) => {
      const prev = qc.getQueryData<Video[]>(["admin", "videos"]);
      qc.setQueryData<Video[]>(["admin", "videos"], (old) =>
        old ? old.map((x) => (x.id === id ? { ...x, isPublished: publish } : x)) : old
      );
      return { prev };
    },
    onError: (_err, _vars, ctx) => {
      if (ctx?.prev) qc.setQueryData(["admin", "videos"], ctx.prev);
    },
    onSuccess: (v) => {
      qc.setQueryData<Video[]>(["admin", "videos"], (old) =>
        old ? old.map((x) => (x.id === v.id ? v : x)) : [v]
      );
    },
  });
}

export function useDeleteVideo() {
  const qc = useQueryClient();
  return useMutation<void, Error, number, { prev?: Video[] }>({
    mutationFn: (id) =>
      fetchApi<void>(`/api/admin/videos/${id}`, { method: "DELETE" }),
    onMutate: async (id) => {
      const prev = qc.getQueryData<Video[]>(["admin", "videos"]);
      qc.setQueryData<Video[]>(["admin", "videos"], (old) => old ? old.filter((x) => x.id !== id) : []);
      return { prev };
    },
    onError: (_err, _vars, ctx) => {
      if (ctx?.prev) qc.setQueryData(["admin", "videos"], ctx.prev);
    },
  });
}
