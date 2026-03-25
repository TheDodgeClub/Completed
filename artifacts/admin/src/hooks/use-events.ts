import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { fetchApi } from "@/lib/api";

export interface Event {
  id: number;
  title: string;
  description: string;
  date: string;
  location: string;
  ticketUrl: string | null;
  imageUrl: string | null;
  isUpcoming: boolean;
  isPublished: boolean;
  attendeeCount: number;
  ticketPrice: number | null;
  ticketCapacity: number | null;
  stripeProductId: string | null;
  stripePriceId: string | null;
}

export type EventInput = Omit<Event, "id" | "isUpcoming" | "isPublished" | "attendeeCount">;

export function useEvents() {
  return useQuery({
    queryKey: ["events"],
    queryFn: () => fetchApi<Event[]>("/api/admin/events"),
    select: (data) =>
      [...data].sort((a, b) => {
        if (a.isUpcoming !== b.isUpcoming) return a.isUpcoming ? -1 : 1;
        return new Date(a.date).getTime() - new Date(b.date).getTime();
      }),
  });
}

export function useCreateEvent() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: EventInput) =>
      fetchApi<Event>("/api/admin/events", {
        method: "POST",
        body: JSON.stringify(data),
      }),
    onMutate: async (newData) => {
      await queryClient.cancelQueries({ queryKey: ["events"] });
      const previous = queryClient.getQueryData<Event[]>(["events"]);
      const optimistic: Event = {
        ...newData,
        id: -Date.now(),
        isUpcoming: new Date(newData.date) > new Date(),
        isPublished: false,
        attendeeCount: 0,
        ticketUrl: newData.ticketUrl || null,
        imageUrl: newData.imageUrl || null,
        ticketPrice: null,
        ticketCapacity: null,
        stripeProductId: null,
        stripePriceId: null,
      };
      queryClient.setQueryData<Event[]>(["events"], (old = []) => [optimistic, ...old]);
      return { previous };
    },
    onError: (_err, _vars, context) => {
      if (context?.previous) queryClient.setQueryData(["events"], context.previous);
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: ["events"] }),
  });
}

export function useUpdateEvent() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...data }: Partial<EventInput> & { id: number }) =>
      fetchApi<Event>(`/api/admin/events/${id}`, {
        method: "PUT",
        body: JSON.stringify(data),
      }),
    onMutate: async ({ id, ...data }) => {
      await queryClient.cancelQueries({ queryKey: ["events"] });
      const previous = queryClient.getQueryData<Event[]>(["events"]);
      queryClient.setQueryData<Event[]>(["events"], (old = []) =>
        old.map((e) => e.id === id ? { ...e, ...data, isUpcoming: data.date ? new Date(data.date) > new Date() : e.isUpcoming } : e)
      );
      return { previous };
    },
    onError: (_err, _vars, context) => {
      if (context?.previous) queryClient.setQueryData(["events"], context.previous);
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: ["events"] }),
  });
}

export function usePublishEvent() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, publish }: { id: number; publish: boolean }) =>
      fetchApi<Event>(`/api/admin/events/${id}/publish`, {
        method: "POST",
        body: JSON.stringify({ publish }),
      }),
    onMutate: async ({ id, publish }) => {
      await queryClient.cancelQueries({ queryKey: ["events"] });
      const previous = queryClient.getQueryData<Event[]>(["events"]);
      queryClient.setQueryData<Event[]>(["events"], (old = []) =>
        old.map((e) => e.id === id ? { ...e, isPublished: publish } : e)
      );
      return { previous };
    },
    onError: (_err, _vars, context) => {
      if (context?.previous) queryClient.setQueryData(["events"], context.previous);
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: ["events"] }),
  });
}

export function useSetTicketPricing() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, price, capacity }: { id: number; price: number; capacity?: number }) =>
      fetchApi<Event>(`/api/admin/events/${id}/tickets`, {
        method: "POST",
        body: JSON.stringify({ price, capacity }),
      }),
    onSettled: () => queryClient.invalidateQueries({ queryKey: ["events"] }),
  });
}

export function useDeleteEvent() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: number) =>
      fetchApi(`/api/admin/events/${id}`, { method: "DELETE" }),
    onMutate: async (id) => {
      await queryClient.cancelQueries({ queryKey: ["events"] });
      const previous = queryClient.getQueryData<Event[]>(["events"]);
      queryClient.setQueryData<Event[]>(["events"], (old = []) => old.filter((e) => e.id !== id));
      return { previous };
    },
    onError: (_err, _vars, context) => {
      if (context?.previous) queryClient.setQueryData(["events"], context.previous);
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: ["events"] }),
  });
}
