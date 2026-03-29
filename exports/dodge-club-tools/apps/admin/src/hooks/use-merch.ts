import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { fetchApi } from "@/lib/api";

export interface MerchProduct {
  id: number;
  name: string;
  description: string;
  price: number;
  imageUrl: string | null;
  buyUrl: string | null;
  category: string;
  inStock: boolean;
}

export type MerchInput = Omit<MerchProduct, "id">;

export function useMerch() {
  return useQuery({
    queryKey: ["merch"],
    queryFn: () => fetchApi<MerchProduct[]>("/api/admin/merch"),
  });
}

export function useCreateMerch() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: MerchInput) =>
      fetchApi<MerchProduct>("/api/admin/merch", {
        method: "POST",
        body: JSON.stringify(data),
      }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["merch"] }),
  });
}

export function useUpdateMerch() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...data }: Partial<MerchInput> & { id: number }) =>
      fetchApi<MerchProduct>(`/api/admin/merch/${id}`, {
        method: "PUT",
        body: JSON.stringify(data),
      }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["merch"] }),
  });
}

export function useDeleteMerch() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: number) =>
      fetchApi(`/api/admin/merch/${id}`, { method: "DELETE" }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["merch"] }),
  });
}
