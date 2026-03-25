import AsyncStorage from "@react-native-async-storage/async-storage";
import { API_BASE } from "@/constants/api";

const AUTH_TOKEN_KEY = "dodge_club_auth_token";
const USER_KEY = "dodge_club_user";

export type UserProfile = {
  id: number;
  email: string;
  name: string;
  isAdmin: boolean;
  memberSince: string;
  eventsAttended: number;
  medalsEarned: number;
  ringsEarned: number;
  avatarUrl: string | null;
};

export type Event = {
  id: number;
  title: string;
  description: string;
  date: string;
  location: string;
  ticketUrl: string | null;
  imageUrl: string | null;
  isUpcoming: boolean;
  attendeeCount: number;
};

export type AttendanceRecord = {
  id: number;
  userId: number;
  eventId: number;
  earnedMedal: boolean;
  attendedAt: string;
  event: Event;
};

export type Achievement = {
  id: string;
  title: string;
  description: string;
  icon: string;
  unlocked: boolean;
  unlockedAt: string | null;
};

export type Post = {
  id: number;
  title: string;
  content: string;
  imageUrl: string | null;
  createdAt: string;
  authorName: string;
  isMembersOnly: boolean;
};

export type MerchProduct = {
  id: number;
  name: string;
  description: string;
  price: number;
  imageUrl: string | null;
  buyUrl: string | null;
  category: string;
  inStock: boolean;
};

export type CommunityStats = {
  totalEvents: number;
  totalMembers: number;
  totalTicketsSold: number;
  totalMedalsAwarded: number;
};

/* ---- token helpers ---- */
export async function getToken(): Promise<string | null> {
  return AsyncStorage.getItem(AUTH_TOKEN_KEY);
}

export async function setToken(token: string): Promise<void> {
  await AsyncStorage.setItem(AUTH_TOKEN_KEY, token);
}

export async function clearToken(): Promise<void> {
  await AsyncStorage.removeItem(AUTH_TOKEN_KEY);
  await AsyncStorage.removeItem(USER_KEY);
}

/* ---- fetch wrapper ---- */
async function apiFetch<T>(path: string, options: RequestInit = {}): Promise<T> {
  const token = await getToken();
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(options.headers as Record<string, string>),
  };
  if (token) {
    headers["x-auth-token"] = token;
  }

  const res = await fetch(`${API_BASE}${path}`, { ...options, headers });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: "Request failed" }));
    throw new Error(err.error || err.message || "Request failed");
  }
  return res.json();
}

/* ---- auth ---- */
export async function register(email: string, password: string, name: string) {
  const data = await apiFetch<{ user: UserProfile; token: string }>("/auth/register", {
    method: "POST",
    body: JSON.stringify({ email, password, name }),
  });
  await setToken(data.token);
  await AsyncStorage.setItem(USER_KEY, JSON.stringify(data.user));
  return data;
}

export async function login(email: string, password: string) {
  const data = await apiFetch<{ user: UserProfile; token: string }>("/auth/login", {
    method: "POST",
    body: JSON.stringify({ email, password }),
  });
  await setToken(data.token);
  await AsyncStorage.setItem(USER_KEY, JSON.stringify(data.user));
  return data;
}

export async function logout() {
  await apiFetch("/auth/logout", { method: "POST" });
  await clearToken();
}

export async function getMe(): Promise<UserProfile> {
  return apiFetch<UserProfile>("/auth/me");
}

/* ---- events ---- */
export async function listEvents(): Promise<Event[]> {
  return apiFetch<Event[]>("/events");
}

export async function listUpcomingEvents(): Promise<Event[]> {
  return apiFetch<Event[]>("/events/upcoming");
}

/* ---- users ---- */
export async function getUserAttendance(userId: number): Promise<AttendanceRecord[]> {
  return apiFetch<AttendanceRecord[]>(`/users/${userId}/attendance`);
}

export async function getUserAchievements(userId: number): Promise<Achievement[]> {
  return apiFetch<Achievement[]>(`/users/${userId}/achievements`);
}

/* ---- posts ---- */
export async function listPosts(): Promise<Post[]> {
  return apiFetch<Post[]>("/posts");
}

/* ---- merch ---- */
export async function listMerch(): Promise<MerchProduct[]> {
  return apiFetch<MerchProduct[]>("/merch");
}

/* ---- stats ---- */
export async function getStats(): Promise<CommunityStats> {
  return apiFetch<CommunityStats>("/stats");
}

/* ========== ADMIN TYPES ========== */

export type AdminMember = {
  id: number;
  name: string;
  email: string;
  isAdmin: boolean;
  memberSince: string;
  eventsAttended: number;
  medalsEarned: number;
  avatarUrl: string | null;
};

export type AdminAttendanceRecord = {
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
};

/* ========== ADMIN API ========== */

/* --- Events --- */
export async function adminListEvents(): Promise<Event[]> {
  return apiFetch<Event[]>("/admin/events");
}

export async function adminCreateEvent(data: {
  title: string;
  description: string;
  date: string;
  location: string;
  ticketUrl?: string;
  imageUrl?: string;
}): Promise<Event> {
  return apiFetch<Event>("/admin/events", { method: "POST", body: JSON.stringify(data) });
}

export async function adminUpdateEvent(id: number, data: {
  title?: string;
  description?: string;
  date?: string;
  location?: string;
  ticketUrl?: string;
  imageUrl?: string;
}): Promise<Event> {
  return apiFetch<Event>(`/admin/events/${id}`, { method: "PUT", body: JSON.stringify(data) });
}

export async function adminDeleteEvent(id: number): Promise<void> {
  return apiFetch<void>(`/admin/events/${id}`, { method: "DELETE" });
}

/* --- Posts --- */
export async function adminListPosts(): Promise<Post[]> {
  return apiFetch<Post[]>("/admin/posts");
}

export async function adminCreatePost(data: {
  title: string;
  content: string;
  imageUrl?: string;
  isMembersOnly: boolean;
}): Promise<Post> {
  return apiFetch<Post>("/admin/posts", { method: "POST", body: JSON.stringify(data) });
}

export async function adminUpdatePost(id: number, data: {
  title?: string;
  content?: string;
  imageUrl?: string;
  isMembersOnly?: boolean;
}): Promise<Post> {
  return apiFetch<Post>(`/admin/posts/${id}`, { method: "PUT", body: JSON.stringify(data) });
}

export async function adminDeletePost(id: number): Promise<void> {
  return apiFetch<void>(`/admin/posts/${id}`, { method: "DELETE" });
}

/* --- Merch --- */
export async function adminListMerch(): Promise<MerchProduct[]> {
  return apiFetch<MerchProduct[]>("/admin/merch");
}

export async function adminCreateMerch(data: {
  name: string;
  description: string;
  price: number;
  imageUrl?: string;
  buyUrl?: string;
  category: string;
  inStock: boolean;
}): Promise<MerchProduct> {
  return apiFetch<MerchProduct>("/admin/merch", { method: "POST", body: JSON.stringify(data) });
}

export async function adminUpdateMerch(id: number, data: {
  name?: string;
  description?: string;
  price?: number;
  imageUrl?: string;
  buyUrl?: string;
  category?: string;
  inStock?: boolean;
}): Promise<MerchProduct> {
  return apiFetch<MerchProduct>(`/admin/merch/${id}`, { method: "PUT", body: JSON.stringify(data) });
}

export async function adminDeleteMerch(id: number): Promise<void> {
  return apiFetch<void>(`/admin/merch/${id}`, { method: "DELETE" });
}

/* --- Members --- */
export async function adminListMembers(): Promise<AdminMember[]> {
  return apiFetch<AdminMember[]>("/admin/members");
}

export async function adminGetMemberAttendance(userId: number): Promise<AdminAttendanceRecord[]> {
  return apiFetch<AdminAttendanceRecord[]>(`/admin/members/${userId}/attendance`);
}

export async function adminMarkAttendance(data: {
  userId: number;
  eventId: number;
  earnedMedal: boolean;
}): Promise<AdminAttendanceRecord> {
  return apiFetch<AdminAttendanceRecord>("/admin/attendance", { method: "POST", body: JSON.stringify(data) });
}

export async function adminDeleteAttendance(id: number): Promise<void> {
  return apiFetch<void>(`/admin/attendance/${id}`, { method: "DELETE" });
}
