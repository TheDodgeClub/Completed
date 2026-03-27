import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { fetchApi } from "@/lib/api";

export interface TicketType {
  id: number;
  eventId: number;
  name: string;
  description: string | null;
  price: number;
  quantity: number | null;
  quantitySold: number;
  saleStartsAt: string | null;
  saleEndsAt: string | null;
  isActive: boolean;
  sortOrder: number;
  stripeProductId: string | null;
  stripePriceId: string | null;
  createdAt: string;
}

export interface DiscountCode {
  id: number;
  eventId: number | null;
  code: string;
  discountType: "percent" | "fixed";
  discountAmount: number;
  maxUses: number | null;
  usesCount: number;
  expiresAt: string | null;
  isActive: boolean;
  createdAt: string;
}

export function useTicketTypes(eventId: number | null) {
  return useQuery({
    queryKey: ["ticket-types", eventId],
    queryFn: () => fetchApi<TicketType[]>(`/api/admin/events/${eventId}/ticket-types`),
    enabled: !!eventId,
  });
}

export function useCreateTicketType(eventId: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: Partial<TicketType>) =>
      fetchApi<TicketType>(`/api/admin/events/${eventId}/ticket-types`, {
        method: "POST", body: JSON.stringify(data),
      }),
    onSettled: () => qc.invalidateQueries({ queryKey: ["ticket-types", eventId] }),
  });
}

export function useUpdateTicketType(eventId: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...data }: Partial<TicketType> & { id: number }) =>
      fetchApi<TicketType>(`/api/admin/ticket-types/${id}`, {
        method: "PUT", body: JSON.stringify(data),
      }),
    onSettled: () => qc.invalidateQueries({ queryKey: ["ticket-types", eventId] }),
  });
}

export function useDeleteTicketType(eventId: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) =>
      fetchApi(`/api/admin/ticket-types/${id}`, { method: "DELETE" }),
    onSettled: () => qc.invalidateQueries({ queryKey: ["ticket-types", eventId] }),
  });
}

export function useDiscountCodes(eventId: number | null) {
  return useQuery({
    queryKey: ["discount-codes", eventId],
    queryFn: () => fetchApi<DiscountCode[]>(`/api/admin/events/${eventId}/discount-codes`),
    enabled: !!eventId,
  });
}

export function useCreateDiscountCode(eventId: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: Partial<DiscountCode>) =>
      fetchApi<DiscountCode>(`/api/admin/events/${eventId}/discount-codes`, {
        method: "POST", body: JSON.stringify(data),
      }),
    onSettled: () => qc.invalidateQueries({ queryKey: ["discount-codes", eventId] }),
  });
}

export function useUpdateDiscountCode(eventId: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...data }: Partial<DiscountCode> & { id: number }) =>
      fetchApi<DiscountCode>(`/api/admin/discount-codes/${id}`, {
        method: "PUT", body: JSON.stringify(data),
      }),
    onSettled: () => qc.invalidateQueries({ queryKey: ["discount-codes", eventId] }),
  });
}

export function useDeleteDiscountCode(eventId: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) =>
      fetchApi(`/api/admin/discount-codes/${id}`, { method: "DELETE" }),
    onSettled: () => qc.invalidateQueries({ queryKey: ["discount-codes", eventId] }),
  });
}
