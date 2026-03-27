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

export type TeamHistory = {
  id: number;
  teamName: string;
  season: string;
  roleInTeam: string | null;
  notes: string | null;
  createdAt: string;
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

export async function getUserTeamHistory(userId: number): Promise<TeamHistory[]> {
  return apiFetch<TeamHistory[]>(`/users/${userId}/team-history`);
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

/* ---- messages ---- */

export type Conversation = {
  partnerId: number;
  partnerName: string;
  partnerAvatar: string | null;
  lastMessage: string;
  lastMessageAt: string;
  unreadCount: number;
};

export type MessageItem = {
  id: number;
  senderId: number;
  senderName: string;
  senderAvatar: string | null;
  content: string;
  createdAt: string;
  readAt: string | null;
};

export async function listConversations(): Promise<Conversation[]> {
  return apiFetch<Conversation[]>("/messages");
}

export async function getThread(partnerId: number): Promise<MessageItem[]> {
  return apiFetch<MessageItem[]>(`/messages/${partnerId}`);
}

export async function sendMessage(partnerId: number, content: string): Promise<MessageItem> {
  return apiFetch<MessageItem>(`/messages/${partnerId}`, {
    method: "POST",
    body: JSON.stringify({ content }),
  });
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

export async function createCheckoutSession(eventId: number, checkoutData?: Record<string, string>): Promise<{ url: string; sessionId: string }> {
  return apiFetch<{ url: string; sessionId: string }>("/tickets/checkout", {
    method: "POST",
    body: JSON.stringify({ eventId, checkoutData }),
  });
}

export async function registerFreeTicket(eventId: number, checkoutData?: Record<string, string>): Promise<{ ticket: Ticket }> {
  return apiFetch<{ ticket: Ticket }>("/tickets/free", {
    method: "POST",
    body: JSON.stringify({ eventId, checkoutData }),
  });
}

/* ---- admin: send push notification ---- */
export async function adminSendNotification(data: {
  title: string;
  body: string;
  data?: Record<string, string>;
}): Promise<{ sent: number }> {
  return apiFetch<{ sent: number }>("/admin/notify", {
    method: "POST",
    body: JSON.stringify(data),
  });
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

export async function startEliteSubscription(): Promise<{ url: string }> {
  return apiFetch<{ url: string }>("/elite/subscribe", { method: "POST" });
}

export async function getEliteManageUrl(): Promise<{ url: string }> {
  return apiFetch<{ url: string }>("/elite/manage");
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
};

export async function getActivity(): Promise<ActivityItem[]> {
  return apiFetch<ActivityItem[]>("/users/activity");
}
