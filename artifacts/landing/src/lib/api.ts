async function get<T>(path: string): Promise<T> {
  const res = await fetch(`/api${path}`);
  if (!res.ok) throw new Error(`API error: ${res.status}`);
  return res.json() as Promise<T>;
}

export interface Event {
  id: number;
  title: string;
  description: string | null;
  date: string;
  location: string | null;
  ticketUrl: string | null;
  imageUrl: string | null;
  ticketPrice: number | null;
  ticketCapacity: number | null;
  attendeeCount: number;
  isUpcoming: boolean;
}

export interface Post {
  id: number;
  title?: string;
  content: string;
  imageUrl?: string | null;
  createdAt: string;
  authorName?: string;
  isMembersOnly?: boolean;
}

export interface Stats {
  totalMembers: number;
  totalEvents: number;
  totalTicketsSold: number;
  totalMedalsAwarded: number;
}

export const api = {
  getUpcomingEvents: () => get<Event[]>("/events/upcoming"),
  getStats: () => get<Stats>("/stats"),
  getPosts: () => get<Post[]>("/posts"),
};
