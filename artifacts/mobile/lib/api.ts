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
  xp: number;
  level: number;
  xpProgress?: { current: number; next: number; level: number };
  currentStreak: number;
  bestStreak: number;
  avatarUrl: string | null;
  username: string | null;
  preferredRole: string | null;
  bio: string | null;
  isElite?: boolean;
  eliteSince?: string | null;
  accountType?: "player" | "supporter";
  referralCode?: string | null;
};

export type EventAttendee = {
  id: number;
  name: string;
  avatarUrl: string | null;
  accountType: string;
};


export type UpcomingEvent = {
  id: number;
  title: string;
  date: string;
  location: string;
  imageUrl: string | null;
  xpReward?: number;
};

export type CheckoutField = {
  id: string;
  label: string;
  type: "text" | "email" | "phone" | "date" | "textarea" | "select";
  required: boolean;
  options?: string[];
};

export type TicketType = {
  id: number;
  name: string;
  description: string | null;
  price: number;
  quantity: number | null;
  quantitySold: number;
  available: number | null;
  isSoldOut: boolean;
  maxPerOrder: number | null;
  saleStartsAt: string | null;
  saleEndsAt: string | null;
  isActive: boolean;
  saleOpen: boolean;
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
  ticketPrice: number | null;
  ticketCapacity: number | null;
  stripePriceId: string | null;
  checkoutFields: CheckoutField[];
  waiverText: string | null;
  xpReward: number;
  ticketTypes: TicketType[];
};

export type Ticket = {
  id: number;
  eventId: number;
  status: "paid" | "free" | "pending" | "cancelled";
  ticketCode: string;
  checkedIn: boolean;
  checkedInAt: string | null;
  amountPaid: number;
  createdAt: string;
  eventTitle: string;
  eventDate: string;
  eventLocation: string;
  eventImageUrl: string | null;
};

export type AttendanceRecord = {
  id: number;
  userId: number;
  eventId: number;
  earnedMedal: boolean;
  attendedAt: string;
  xpEarned: number;
  streakAt: number;
  milestoneBonus: number;
  event: Event;
};

export type Achievement = {
  id: string;
  title: string;
  description: string;
  icon: string;
  unlocked: boolean;
  unlockedAt: string | null;
  current?: number;
  threshold?: number;
};

export type Post = {
  id: number;
  title: string;
  content: string;
  imageUrl: string | null;
  createdAt: string;
  authorName: string;
  isMembersOnly: boolean;
  isEliteOnly: boolean;
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
export async function register(email: string, password: string, name: string, accountType: "player" | "supporter" = "player", referralCode?: string) {
  const data = await apiFetch<{ user: UserProfile; token: string }>("/auth/register", {
    method: "POST",
    body: JSON.stringify({ email, password, name, accountType, referralCode }),
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

export async function googleLogin(accessToken: string) {
  const data = await apiFetch<{ user: UserProfile; token: string }>("/auth/google", {
    method: "POST",
    body: JSON.stringify({ accessToken }),
  });
  await setToken(data.token);
  await AsyncStorage.setItem(USER_KEY, JSON.stringify(data.user));
  return data;
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

export async function getEventAttendees(eventId: number): Promise<EventAttendee[]> {
  return apiFetch<EventAttendee[]>(`/events/${eventId}/attendees`);
}

export async function giftTicket(eventId: number, recipientEmail: string): Promise<{ ticket?: any; checkoutUrl?: string; gifted?: boolean }> {
  return apiFetch(`/tickets/gift`, { method: "POST", body: JSON.stringify({ eventId, recipientEmail }) });
}

/* ---- users ---- */
export async function getUserAttendance(userId: number): Promise<AttendanceRecord[]> {
  return apiFetch<AttendanceRecord[]>(`/users/${userId}/attendance`);
}

export async function getUserAchievements(userId: number): Promise<Achievement[]> {
  return apiFetch<Achievement[]>(`/users/${userId}/achievements`);
}


export async function getUserUpcomingEvents(userId: number): Promise<UpcomingEvent[]> {
  return apiFetch<UpcomingEvent[]>(`/users/${userId}/upcoming-events`);
}

export async function updateProfile(data: {
  name?: string;
  username?: string;
  bio?: string;
  preferredRole?: string;
}): Promise<UserProfile> {
  return apiFetch<UserProfile>("/users/me", { method: "PUT", body: JSON.stringify(data) });
}

export async function updateAvatar(avatarUrl: string): Promise<{ avatarUrl: string }> {
  return apiFetch<{ avatarUrl: string }>("/users/me/avatar", { method: "POST", body: JSON.stringify({ avatarUrl }) });
}

export async function requestUploadUrl(data: { name: string; size: number; contentType: string }): Promise<{ uploadURL: string; objectPath: string }> {
  return apiFetch<{ uploadURL: string; objectPath: string }>("/storage/uploads/request-url", { method: "POST", body: JSON.stringify(data) });
}

export async function registerForEvent(eventId: number): Promise<{ id: number; eventId: number; registeredAt: string }> {
  return apiFetch(`/users/me/register`, { method: "POST", body: JSON.stringify({ eventId }) });
}

/* ---- posts ---- */
export async function listPosts(): Promise<Post[]> {
  return apiFetch<Post[]>("/posts");
}

/* ---- app settings ---- */
export type AppSettings = {
  homeVideoUrl: string | null;
  clubName: string | null;
  clubTagline: string | null;
};

export async function getAppSettings(): Promise<AppSettings> {
  return apiFetch<AppSettings>("/settings");
}

/* ---- videos ---- */
export type VideoClip = {
  id: number;
  title: string;
  description: string | null;
  url: string;
  thumbnailUrl: string | null;
  publishedAt: string | null;
};

export async function listVideos(): Promise<VideoClip[]> {
  return apiFetch<VideoClip[]>("/videos");
}

/* ---- merch ---- */
export async function listMerch(): Promise<MerchProduct[]> {
  return apiFetch<MerchProduct[]>("/merch");
}

/* ---- stats ---- */
export async function getStats(): Promise<CommunityStats> {
  return apiFetch<CommunityStats>("/stats");
}

/* ---- member directory ---- */

export type MemberSummary = {
  id: number;
  name: string;
  avatarUrl: string | null;
  username: string | null;
  bio: string | null;
  preferredRole: string | null;
  memberSince: string;
  isElite?: boolean;
  accountType?: "player" | "supporter";
};

export async function listMembers(): Promise<MemberSummary[]> {
  return apiFetch<MemberSummary[]>("/users");
}

export type LeaderboardEntry = {
  id: number;
  name: string;
  avatarUrl: string | null;
  username: string | null;
  isElite: boolean;
  xp: number;
  medals: number;
  rings: number;
};

export type LeaderboardData = {
  xp: LeaderboardEntry[];
  medals: LeaderboardEntry[];
  rings: LeaderboardEntry[];
};

export async function getLeaderboard(): Promise<LeaderboardData> {
  return apiFetch<LeaderboardData>("/users/leaderboard");
}

export async function getMemberProfile(id: number): Promise<UserProfile> {
  return apiFetch<UserProfile>(`/users/${id}/profile`);
}


/* ---- post comments ---- */

export type PostComment = {
  id: number;
  postId: number;
  userId: number;
  authorName: string;
  authorAvatar: string | null;
  content: string;
  createdAt: string;
};

export async function getPostComments(postId: number): Promise<PostComment[]> {
  return apiFetch<PostComment[]>(`/posts/${postId}/comments`);
}

export async function addPostComment(postId: number, content: string): Promise<PostComment> {
  return apiFetch<PostComment>(`/posts/${postId}/comments`, {
    method: "POST",
    body: JSON.stringify({ content }),
  });
}

/* ---- push notifications ---- */

export async function savePushToken(token: string): Promise<void> {
  return apiFetch<void>("/users/me/push-token", {
    method: "POST",
    body: JSON.stringify({ pushToken: token }),
  });
}

export async function setNotificationsEnabled(enabled: boolean): Promise<void> {
  return apiFetch<void>("/users/me/notifications", {
    method: "PUT",
    body: JSON.stringify({ enabled }),
  });
}

export async function getNotificationStatus(): Promise<{ notificationsEnabled: boolean }> {
  return apiFetch<{ notificationsEnabled: boolean }>("/users/me/notification-status");
}

/* ---- tickets ---- */

export async function getMyTickets(): Promise<Ticket[]> {
  return apiFetch<Ticket[]>("/tickets/my");
}

export async function getEventTicket(eventId: number): Promise<{ ticket: Ticket | null }> {
  return apiFetch<{ ticket: Ticket | null }>(`/tickets/event/${eventId}`);
}

export async function createCheckoutSession(
  eventId: number,
  checkoutData?: Record<string, string>,
  ticketTypeId?: number,
  discountCode?: string,
  quantity: number = 1,
): Promise<{ url: string; sessionId: string }> {
  return apiFetch<{ url: string; sessionId: string }>("/tickets/checkout", {
    method: "POST",
    body: JSON.stringify({ eventId, checkoutData, ticketTypeId, discountCode, quantity }),
  });
}

export async function registerFreeTicket(
  eventId: number,
  checkoutData?: Record<string, string>,
  ticketTypeId?: number,
  quantity: number = 1,
): Promise<{ ticket: Ticket }> {
  return apiFetch<{ ticket: Ticket }>("/tickets/free", {
    method: "POST",
    body: JSON.stringify({ eventId, checkoutData, ticketTypeId, quantity }),
  });
}

export async function validateDiscountCode(
  eventId: number,
  code: string,
): Promise<{ valid: boolean; discountType: "percent" | "fixed"; discountAmount: number; code: string }> {
  return apiFetch<{ valid: boolean; discountType: "percent" | "fixed"; discountAmount: number; code: string }>(
    `/tickets/validate-code?eventId=${eventId}&code=${encodeURIComponent(code)}`
  );
}

export async function recordSession(duration: number, startedAt: string): Promise<void> {
  return apiFetch<void>("/sessions", {
    method: "POST",
    body: JSON.stringify({ duration, startedAt }),
  });
}

/* ─── Elite membership ─── */
export type EliteStatus = {
  isElite: boolean;
  eliteSince: string | null;
  stripeSubscriptionId: string | null;
};

export async function getEliteStatus(): Promise<EliteStatus> {
  return apiFetch<EliteStatus>("/elite/status");
}


export async function awardGameXp(earned: number): Promise<{ added: number; totalGameXp: number }> {
  return apiFetch<{ added: number; totalGameXp: number }>("/users/me/game-xp", {
    method: "POST",
    body: JSON.stringify({ earned }),
  });
}

export async function forgotPassword(email: string): Promise<void> {
  await apiFetch<{ message: string }>("/auth/forgot-password", {
    method: "POST",
    body: JSON.stringify({ email }),
  });
}

export async function resetPassword(email: string, code: string, newPassword: string): Promise<void> {
  await apiFetch<{ message: string }>("/auth/reset-password", {
    method: "POST",
    body: JSON.stringify({ email, code, newPassword }),
  });
}

export type MyRank = { xpRank: number | null; totalMembers: number };

export async function getMyRank(): Promise<MyRank> {
  return apiFetch<MyRank>("/users/me/rank");
}

export type ActivityItem = {
  id: string;
  type: string;
  userId: number;
  userName: string;
  userAvatar: string | null;
  text: string;
  timestamp: string;
  accountType: "player" | "supporter";
  isElite: boolean;
};

export async function getActivity(): Promise<ActivityItem[]> {
  return apiFetch<ActivityItem[]>("/users/activity");
}

export type Announcement = {
  id: number;
  title: string;
  body: string;
  sentCount: number;
  sentBy: string | null;
  createdAt: string;
};

export async function getAnnouncements(): Promise<Announcement[]> {
  return apiFetch<Announcement[]>("/announcements");
}

export async function checkEventIn(eventId: number, pin: string): Promise<{ success?: boolean; alreadyCheckedIn?: boolean }> {
  return apiFetch(`/events/${eventId}/checkin`, { method: "POST", body: JSON.stringify({ pin }) });
}
