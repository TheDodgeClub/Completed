import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { fetchApi } from "@/lib/api";

export interface Post {
  id: number;
  title: string;
  content: string;
  imageUrl: string | null;
  createdAt: string;
  authorName: string;
  isMembersOnly: boolean;
  isEliteOnly: boolean;
}

export type PostInput = Pick<Post, "title" | "content" | "imageUrl" | "isMembersOnly" | "isEliteOnly">;

export function usePosts() {
  return useQuery({
    queryKey: ["posts"],
    queryFn: () => fetchApi<Post[]>("/api/admin/posts"),
  });
}

export function useCreatePost() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: PostInput) =>
      fetchApi<Post>("/api/admin/posts", {
        method: "POST",
        body: JSON.stringify(data),
      }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["posts"] }),
  });
}

export function useUpdatePost() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...data }: Partial<PostInput> & { id: number }) =>
      fetchApi<Post>(`/api/admin/posts/${id}`, {
        method: "PUT",
        body: JSON.stringify(data),
      }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["posts"] }),
  });
}

export function useDeletePost() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: number) =>
      fetchApi(`/api/admin/posts/${id}`, { method: "DELETE" }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["posts"] }),
  });
}
