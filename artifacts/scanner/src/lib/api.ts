const TOKEN_KEY = "dc_admin_token";

export function getToken() { return localStorage.getItem(TOKEN_KEY); }
export function setToken(t: string) { localStorage.setItem(TOKEN_KEY, t); }
export function clearToken() { localStorage.removeItem(TOKEN_KEY); }

export async function fetchApi<T>(path: string, opts: RequestInit = {}): Promise<T> {
  const token = getToken();
  const headers = new Headers(opts.headers);
  if (!headers.has("Content-Type") && !(opts.body instanceof FormData)) {
    headers.set("Content-Type", "application/json");
  }
  if (token) headers.set("x-auth-token", token);
  const res = await fetch(path, { ...opts, headers });
  if (!res.ok) {
    let msg = `Error ${res.status}`;
    try { const d = await res.json(); if (d.error) msg = d.error; } catch {}
    throw new Error(msg);
  }
  if (res.status === 204) return null as T;
  return res.json();
}

export type AdminUser = { id: number; name: string; email: string; isAdmin: boolean };
export type ActiveEvent = { id: number; title: string; date: string; location: string; checkInPin: string | null; checkInOpen: boolean };
export type CheckInResult = { success?: boolean; alreadyCheckedIn?: boolean; xpGained?: number; member: { id: number; name: string; avatarUrl: string | null; accountType?: string } };
export type CheckInStats = { checkedIn: { id: number; name: string; avatarUrl: string | null; checkedInAt: string | null }[]; expectedCount: number };

export async function loginAdmin(email: string, password: string): Promise<AdminUser> {
  const res = await fetchApi<{ user: AdminUser; token: string }>("/api/auth/login", {
    method: "POST", body: JSON.stringify({ email, password }),
  });
  if (!res.user.isAdmin) throw new Error("Admin access required");
  setToken(res.token);
  return res.user;
}

export async function getMe(): Promise<AdminUser | null> {
  if (!getToken()) return null;
  try { return await fetchApi<AdminUser>("/api/auth/me"); } catch { return null; }
}

export async function getActiveEvents(): Promise<ActiveEvent[]> {
  return fetchApi<ActiveEvent[]>("/api/events/checkin-active");
}

export async function scanCheckIn(eventId: number, userId: number): Promise<CheckInResult> {
  return fetchApi<CheckInResult>(`/api/events/${eventId}/checkin-scan`, {
    method: "POST", body: JSON.stringify({ userId }),
  });
}

export async function getCheckinStats(eventId: number): Promise<CheckInStats> {
  return fetchApi<CheckInStats>(`/api/events/${eventId}/checkin-stats`);
}
