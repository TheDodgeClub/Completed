import React, { useMemo, useState, useCallback } from "react";
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
  RefreshControl,
  Pressable,
  Image,
  Modal,
  Platform,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { VideoView, useVideoPlayer } from "expo-video";
import * as WebBrowser from "expo-web-browser";
import { router, useFocusEffect } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import * as Haptics from "expo-haptics";
import { useColors } from "@/context/ThemeContext";
import { resolveImageUrl } from "@/constants/api";
import { useAuth } from "@/context/AuthContext";
import { listPosts, listVideos, reportPost, VideoClip, Post, Announcement } from "@/lib/api";
import { PostCard } from "@/components/PostCard";
import { PostDetailModal } from "@/components/PostDetailModal";
import { useAnnouncements } from "@/hooks/useAnnouncements";

type Tab = "all" | "announcements" | "videos";

/* ─── Helpers ─── */
function formatTimeAgo(date: Date): string {
  const now = Date.now();
  const diff = now - date.getTime();
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return "Just now";
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return date.toLocaleDateString("en-GB", { day: "numeric", month: "short" });
}

function getYouTubeThumbnail(url: string): string | null {
  const ytMatch = url.match(/(?:youtube\.com\/(?:watch\?v=|embed\/|shorts\/)|youtu\.be\/)([A-Za-z0-9_-]{11})/);
  if (ytMatch) return `https://img.youtube.com/vi/${ytMatch[1]}/mqdefault.jpg`;
  return null;
}
function getStreamableThumbnail(url: string): string | null {
  const match = url.match(/streamable\.com\/(?:l\/)?([a-zA-Z0-9]+)/);
  if (match) return `https://cdn-cf-east.streamable.com/image/${match[1]}.jpg`;
  return null;
}
function getAutoThumbnail(url: string): string | null {
  return getYouTubeThumbnail(url) ?? getStreamableThumbnail(url);
}

/* ─── Announcement Card ─── */
function AnnouncementCard({ item }: { item: Announcement }) {
  const Colors = useColors();
  const styles = useMemo(() => makeStyles(Colors), [Colors]);
  return (
    <View style={styles.announcementCard}>
      <View style={styles.announcementHeader}>
        <View style={styles.announcementIconWrap}>
          <Feather name="bell" size={13} color={Colors.primary} />
        </View>
        <Text style={styles.announcementLabel}>Club Announcement</Text>
        <Text style={styles.announcementTime}>{formatTimeAgo(new Date(item.createdAt))}</Text>
      </View>
      <Text style={styles.announcementTitle}>{item.title}</Text>
      <Text style={styles.announcementBody}>{item.body}</Text>
    </View>
  );
}

/* ─── Video Player Modal ─── */
function VideoPlayerModal({ video, onClose }: { video: VideoClip; onClose: () => void }) {
  const resolvedUrl = resolveImageUrl(video.url) ?? video.url;
  const player = useVideoPlayer(resolvedUrl, p => { p.play(); });
  return (
    <Modal visible animationType="slide" onRequestClose={onClose} statusBarTranslucent>
      <SafeAreaView style={{ flex: 1, backgroundColor: "#000" }}>
        <View style={{ flexDirection: "row", alignItems: "center", paddingHorizontal: 16, paddingVertical: 12 }}>
          <Pressable onPress={onClose} style={{ padding: 4 }}>
            <Feather name="x" size={24} color="#fff" />
          </Pressable>
          <Text style={{ flex: 1, fontFamily: "Inter_600SemiBold", fontSize: 15, color: "#fff", marginLeft: 12 }} numberOfLines={1}>
            {video.title}
          </Text>
        </View>
        <VideoView player={player} style={{ flex: 1 }} contentFit="contain" nativeControls />
        {video.description ? (
          <View style={{ padding: 16 }}>
            <Text style={{ fontFamily: "Inter_400Regular", fontSize: 13, color: "#ccc" }}>{video.description}</Text>
          </View>
        ) : null}
      </SafeAreaView>
    </Modal>
  );
}

/* ─── Video Card (full-width for Videos tab, horizontal-scroll for All tab) ─── */
function VideoCard({ video, onPress, fullWidth }: { video: VideoClip; onPress: () => void; fullWidth?: boolean }) {
  const Colors = useColors();
  const styles = useMemo(() => makeStyles(Colors), [Colors]);
  const [muted, setMuted] = useState(true);
  const [videoReady, setVideoReady] = useState(false);

  const isExternalLink = video.url.includes("youtube.com") || video.url.includes("youtu.be") || video.url.includes("vimeo.com");
  const resolvedUrl = resolveImageUrl(video.url) ?? video.url;
  const isNativeInline = !isExternalLink && Platform.OS !== "web";
  const isWebInline = !isExternalLink && Platform.OS === "web";

  const player = useVideoPlayer(isNativeInline ? resolvedUrl : null, (p) => {
    if (!isNativeInline) return;
    p.loop = true; p.muted = true; p.play();
  });

  React.useEffect(() => {
    if (!isNativeInline) return;
    const sub = player.addListener("statusChange", ({ status }) => {
      if (status === "readyToPlay" && !videoReady) { setVideoReady(true); player.play(); }
    });
    return () => sub.remove();
  }, [isNativeInline, player]);

  const thumbnailUri = video.thumbnailUrl
    ? (resolveImageUrl(video.thumbnailUrl) ?? undefined)
    : (getAutoThumbnail(video.url) ?? undefined);

  const webVideoRef = React.useRef<any>(null);
  function toggleMute(e: any) {
    e.stopPropagation?.();
    const next = !muted;
    setMuted(next);
    if (Platform.OS === "web") { if (webVideoRef.current) webVideoRef.current.muted = next; }
    else { player.muted = next; }
  }

  function handlePress() {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (isExternalLink) WebBrowser.openBrowserAsync(video.url);
    else onPress();
  }

  const thumbHeight = fullWidth ? 200 : 124;
  const cardStyle = fullWidth ? styles.videoCardFull : styles.videoCard;

  return (
    <Pressable style={({ pressed }) => [cardStyle, { opacity: pressed ? 0.85 : 1 }]} onPress={handlePress}>
      <View style={[styles.videoThumb, { height: thumbHeight, width: fullWidth ? "100%" : 220 }]}>
        {thumbnailUri ? (
          <Image source={{ uri: thumbnailUri }} style={StyleSheet.absoluteFill} resizeMode="cover" />
        ) : (
          <View style={[StyleSheet.absoluteFill, styles.videoThumbPlaceholder]} />
        )}
        {isNativeInline ? (
          <>
            <VideoView player={player} style={StyleSheet.absoluteFill} contentFit="cover" nativeControls={false} />
            <Pressable onPress={toggleMute} style={styles.videoMuteBtn} hitSlop={8}>
              <Feather name={muted ? "volume-x" : "volume-2"} size={12} color="#fff" />
            </Pressable>
          </>
        ) : isWebInline ? (
          <>
            {/* @ts-ignore */}
            <video ref={webVideoRef} src={resolvedUrl} autoPlay muted loop playsInline
              style={{ position: "absolute", top: 0, left: 0, width: "100%", height: "100%", objectFit: "cover" }} />
            <Pressable onPress={toggleMute} style={styles.videoMuteBtn} hitSlop={8}>
              <Feather name={muted ? "volume-x" : "volume-2"} size={12} color="#fff" />
            </Pressable>
          </>
        ) : (
          <View style={styles.playOverlay}>
            <View style={styles.playCircle}>
              <Feather name="play" size={22} color="#fff" style={{ marginLeft: 3 }} />
            </View>
          </View>
        )}
      </View>
      <View style={styles.videoInfo}>
        <Text style={styles.videoTitle} numberOfLines={2}>{video.title}</Text>
        {video.description ? <Text style={styles.videoDesc} numberOfLines={1}>{video.description}</Text> : null}
      </View>
    </Pressable>
  );
}

/* ─── Segmented Tab Bar ─── */
function TabBar({ selected, onChange, counts }: {
  selected: Tab;
  onChange: (t: Tab) => void;
  counts: { announcements: number; videos: number; posts: number };
}) {
  const Colors = useColors();
  const styles = useMemo(() => makeStyles(Colors), [Colors]);
  const tabs: { key: Tab; label: string; icon: string; count?: number }[] = [
    { key: "all", label: "All", icon: "layers" },
    { key: "announcements", label: "Club News", icon: "bell", count: counts.announcements },
    { key: "videos", label: "Videos", icon: "video", count: counts.videos },
  ];
  return (
    <View style={styles.tabBar}>
      {tabs.map(tab => {
        const active = selected === tab.key;
        return (
          <Pressable
            key={tab.key}
            style={({ pressed }) => [styles.tabItem, active && styles.tabItemActive, { opacity: pressed ? 0.75 : 1 }]}
            onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); onChange(tab.key); }}
          >
            <Feather name={tab.icon as any} size={14} color={active ? Colors.primary : Colors.textMuted} />
            <Text style={[styles.tabLabel, active && styles.tabLabelActive]}>{tab.label}</Text>
            {tab.count !== undefined && tab.count > 0 && (
              <View style={[styles.tabBadge, active && styles.tabBadgeActive]}>
                <Text style={[styles.tabBadgeText, active && styles.tabBadgeTextActive]}>{tab.count}</Text>
              </View>
            )}
          </Pressable>
        );
      })}
    </View>
  );
}

/* ─── Main Screen ─── */
export default function UpdatesScreen() {
  const insets = useSafeAreaInsets();
  const Colors = useColors();
  const styles = useMemo(() => makeStyles(Colors), [Colors]);
  const { isAuthenticated, user } = useAuth();
  const [activeTab, setActiveTab] = useState<Tab>("all");
  const [refreshing, setRefreshing] = React.useState(false);
  const [selectedPost, setSelectedPost] = useState<Post | null>(null);
  const [selectedVideo, setSelectedVideo] = useState<VideoClip | null>(null);
  const queryClient = useQueryClient();

  const { announcements, isLoading: announcementsLoading, refetch: refetchAnnouncements, markAllSeen } = useAnnouncements();

  useFocusEffect(useCallback(() => { markAllSeen(); }, [markAllSeen]));

  const { data: posts, isLoading: postsLoading, refetch: refetchPosts } = useQuery({
    queryKey: ["posts"], queryFn: listPosts,
  });
  const { data: videos, isLoading: videosLoading, refetch: refetchVideos } = useQuery({
    queryKey: ["videos"], queryFn: listVideos,
  });
  const { data: commentCounts } = useQuery({
    queryKey: ["comment-counts"],
    queryFn: async () => {
      if (!posts || posts.length === 0) return {};
      const results = await Promise.all(posts.map(async (p) => {
        try {
          const comments = await queryClient.fetchQuery({
            queryKey: ["comments", p.id],
            queryFn: () => import("@/lib/api").then(m => m.getPostComments(p.id)),
            staleTime: 30000,
          });
          return [p.id, comments.length] as [number, number];
        } catch { return [p.id, 0] as [number, number]; }
      }));
      return Object.fromEntries(results);
    },
    enabled: !!posts && posts.length > 0,
  });

  const handleRefresh = async () => {
    setRefreshing(true);
    await Promise.all([refetchPosts(), refetchVideos(), refetchAnnouncements()]);
    setRefreshing(false);
  };

  const isLoading = postsLoading || videosLoading || announcementsLoading;
  const allPosts = posts ?? [];
  const visiblePosts = isAuthenticated ? allPosts : allPosts.filter(p => !p.isMembersOnly);
  const memberLockedPosts = !isAuthenticated ? allPosts.filter(p => p.isMembersOnly) : [];
  const allVideos = videos ?? [];

  const counts = {
    announcements: announcements.length,
    videos: allVideos.length,
    posts: visiblePosts.length,
  };

  return (
    <>
      <ScrollView
        style={styles.screen}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={Platform.OS === "web" ? { paddingBottom: 100 } : undefined}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={Colors.primary} />}
      >
        {/* ── Header ── */}
        <View style={[styles.header, { paddingTop: insets.top + 20 }]}>
          <Text style={styles.headerTitle}>Updates</Text>
        </View>

        {/* ── Tab bar ── */}
        <TabBar selected={activeTab} onChange={setActiveTab} counts={counts} />

        {isLoading ? (
          <ActivityIndicator color={Colors.primary} style={{ marginTop: 48 }} />
        ) : (
          <>
            {/* ══ ALL TAB ══ */}
            {activeTab === "all" && (
              <View>
                {/* Announcements strip */}
                {isAuthenticated && announcements.length > 0 && (
                  <View style={styles.section}>
                    <Pressable
                      style={styles.sectionHeader}
                      onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); setActiveTab("announcements"); }}
                    >
                      <Feather name="bell" size={15} color={Colors.primary} />
                      <Text style={styles.sectionTitle}>Club News</Text>
                      <View style={styles.sectionBadge}>
                        <Text style={styles.sectionBadgeText}>{announcements.length}</Text>
                      </View>
                      <View style={{ flex: 1 }} />
                      <Text style={styles.sectionSeeAll}>See all</Text>
                      <Feather name="chevron-right" size={14} color={Colors.primary} />
                    </Pressable>
                    {announcements.slice(0, 2).map(item => (
                      <AnnouncementCard key={item.id} item={item} />
                    ))}
                  </View>
                )}

                {/* Videos strip */}
                {allVideos.length > 0 && (
                  <View style={styles.section}>
                    <Pressable
                      style={styles.sectionHeader}
                      onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); setActiveTab("videos"); }}
                    >
                      <Feather name="video" size={15} color={Colors.accent} />
                      <Text style={styles.sectionTitle}>Videos</Text>
                      <View style={{ flex: 1 }} />
                      <Text style={styles.sectionSeeAll}>See all</Text>
                      <Feather name="chevron-right" size={14} color={Colors.primary} />
                    </Pressable>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.videoList}>
                      {allVideos.map(v => <VideoCard key={v.id} video={v} onPress={() => setSelectedVideo(v)} />)}
                    </ScrollView>
                  </View>
                )}

                {/* Posts */}
                {visiblePosts.length > 0 && (
                  <View style={styles.section}>
                    <View style={styles.sectionHeader}>
                      <Feather name="message-square" size={15} color={Colors.textSecondary} />
                      <Text style={styles.sectionTitle}>Posts</Text>
                    </View>
                    {visiblePosts.map(post => (
                      <PostCard
                        key={post.id}
                        post={post}
                        commentCount={commentCounts?.[post.id] ?? 0}
                        onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); setSelectedPost(post); }}
                        onReport={user ? () => reportPost(post.id) : undefined}
                      />
                    ))}
                  </View>
                )}

                {/* Nothing at all */}
                {!isAuthenticated && announcements.length === 0 && allVideos.length === 0 && visiblePosts.length === 0 && (
                  <View style={styles.empty}>
                    <Feather name="inbox" size={40} color={Colors.textMuted} />
                    <Text style={styles.emptyTitle}>Nothing yet</Text>
                    <Text style={styles.emptyText}>Updates and announcements will appear here.</Text>
                  </View>
                )}

                {/* Locked posts */}
                {memberLockedPosts.length > 0 && (
                  <View style={styles.section}>
                    <View style={styles.lockBanner}>
                      <Feather name="lock" size={16} color={Colors.accent} />
                      <Text style={styles.lockBannerText}>
                        {memberLockedPosts.length} member-only post{memberLockedPosts.length > 1 ? "s" : ""} available
                      </Text>
                    </View>
                    {memberLockedPosts.map(post => <PostCard key={post.id} post={post} isLocked />)}
                    <Pressable
                      style={({ pressed }) => [styles.joinBtn, { opacity: pressed ? 0.85 : 1 }]}
                      onPress={() => router.push("/(auth)/register")}
                    >
                      <Text style={styles.joinBtnText}>Join to read member updates</Text>
                      <Feather name="arrow-right" size={16} color="#fff" />
                    </Pressable>
                  </View>
                )}
              </View>
            )}

            {/* ══ ANNOUNCEMENTS TAB ══ */}
            {activeTab === "announcements" && (
              <View style={styles.section}>
                {announcements.length > 0 ? (
                  announcements.map(item => <AnnouncementCard key={item.id} item={item} />)
                ) : (
                  <View style={styles.empty}>
                    <Feather name="bell-off" size={40} color={Colors.textMuted} />
                    <Text style={styles.emptyTitle}>No announcements</Text>
                    <Text style={styles.emptyText}>Club announcements will appear here.</Text>
                  </View>
                )}
              </View>
            )}

            {/* ══ VIDEOS TAB ══ */}
            {activeTab === "videos" && (
              <View style={[styles.section, { gap: 16 }]}>
                {allVideos.length > 0 ? (
                  allVideos.map(v => (
                    <VideoCard key={v.id} video={v} onPress={() => setSelectedVideo(v)} fullWidth />
                  ))
                ) : (
                  <View style={styles.empty}>
                    <Feather name="film" size={40} color={Colors.textMuted} />
                    <Text style={styles.emptyTitle}>No videos yet</Text>
                    <Text style={styles.emptyText}>Club highlight videos will appear here.</Text>
                  </View>
                )}
              </View>
            )}
          </>
        )}
      </ScrollView>

      {selectedPost && <PostDetailModal post={selectedPost} onClose={() => setSelectedPost(null)} />}
      {selectedVideo && <VideoPlayerModal video={selectedVideo} onClose={() => setSelectedVideo(null)} />}
    </>
  );
}

function makeStyles(Colors: ReturnType<typeof useColors>) {
  return StyleSheet.create({
    screen: { flex: 1, backgroundColor: Colors.background },

    /* Header */
    header: {
      paddingHorizontal: 20,
      paddingBottom: 16,
      backgroundColor: Colors.surface,
      borderBottomWidth: 1,
      borderBottomColor: Colors.border,
    },
    headerTitle: { fontFamily: "Poppins_800ExtraBold", fontSize: 32, color: Colors.text },

    /* Tab bar */
    tabBar: {
      flexDirection: "row",
      backgroundColor: Colors.surface,
      borderBottomWidth: 1,
      borderBottomColor: Colors.border,
      paddingHorizontal: 16,
      paddingVertical: 10,
      gap: 8,
    },
    tabItem: {
      flexDirection: "row",
      alignItems: "center",
      gap: 5,
      paddingHorizontal: 12,
      paddingVertical: 7,
      borderRadius: 20,
      backgroundColor: Colors.surface2,
    },
    tabItemActive: {
      backgroundColor: Colors.primary + "18",
    },
    tabLabel: {
      fontFamily: "Inter_600SemiBold",
      fontSize: 13,
      color: Colors.textMuted,
    },
    tabLabelActive: { color: Colors.primary },
    tabBadge: {
      backgroundColor: Colors.border,
      borderRadius: 8,
      paddingHorizontal: 5,
      paddingVertical: 1,
      minWidth: 18,
      alignItems: "center",
    },
    tabBadgeActive: { backgroundColor: Colors.primary + "25" },
    tabBadgeText: { fontFamily: "Inter_700Bold", fontSize: 10, color: Colors.textMuted },
    tabBadgeTextActive: { color: Colors.primary },

    /* Sections */
    section: { paddingHorizontal: 16, paddingTop: 20, paddingBottom: 4 },
    sectionHeader: {
      flexDirection: "row",
      alignItems: "center",
      gap: 7,
      marginBottom: 14,
    },
    sectionTitle: { fontFamily: "Inter_700Bold", fontSize: 15, color: Colors.text },
    sectionSeeAll: { fontFamily: "Inter_600SemiBold", fontSize: 13, color: Colors.primary },
    sectionBadge: {
      backgroundColor: Colors.primary,
      borderRadius: 9,
      paddingHorizontal: 6,
      paddingVertical: 1,
    },
    sectionBadgeText: { fontFamily: "Inter_700Bold", fontSize: 10, color: "#fff" },

    /* Announcements */
    announcementCard: {
      backgroundColor: Colors.surface,
      borderRadius: 14,
      borderWidth: 1,
      borderColor: Colors.primary + "30",
      padding: 14,
      marginBottom: 10,
    },
    announcementHeader: { flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 8 },
    announcementIconWrap: {
      width: 22, height: 22, borderRadius: 11,
      backgroundColor: Colors.primary + "20",
      alignItems: "center", justifyContent: "center",
    },
    announcementLabel: {
      fontFamily: "Inter_600SemiBold", fontSize: 11,
      color: Colors.primary, flex: 1,
      textTransform: "uppercase", letterSpacing: 0.5,
    },
    announcementTime: { fontFamily: "Inter_400Regular", fontSize: 11, color: Colors.textMuted },
    announcementTitle: { fontFamily: "Inter_700Bold", fontSize: 15, color: Colors.text, marginBottom: 5 },
    announcementBody: { fontFamily: "Inter_400Regular", fontSize: 13, color: Colors.textSecondary, lineHeight: 20 },

    /* Videos */
    videoList: { gap: 12, paddingBottom: 4 },
    videoCard: { width: 220, backgroundColor: Colors.surface, borderRadius: 14, borderWidth: 1, borderColor: Colors.border, overflow: "hidden" },
    videoCardFull: { backgroundColor: Colors.surface, borderRadius: 14, borderWidth: 1, borderColor: Colors.border, overflow: "hidden" },
    videoThumb: { backgroundColor: Colors.border, overflow: "hidden" },
    videoThumbPlaceholder: { backgroundColor: `${Colors.primary}20`, alignItems: "center", justifyContent: "center" },
    playOverlay: { position: "absolute", inset: 0, alignItems: "center", justifyContent: "center", backgroundColor: "rgba(0,0,0,0.3)" },
    playCircle: { width: 48, height: 48, borderRadius: 24, backgroundColor: "rgba(0,0,0,0.55)", alignItems: "center", justifyContent: "center" },
    videoMuteBtn: { position: "absolute", bottom: 8, right: 8, backgroundColor: "rgba(0,0,0,0.55)", borderRadius: 14, padding: 5 },
    videoInfo: { padding: 12, gap: 4 },
    videoTitle: { fontFamily: "Inter_600SemiBold", fontSize: 13, color: Colors.text, lineHeight: 18 },
    videoDesc: { fontFamily: "Inter_400Regular", fontSize: 12, color: Colors.textSecondary },

    /* Lock / Join */
    lockBanner: {
      flexDirection: "row", alignItems: "center", gap: 10,
      backgroundColor: `${Colors.accent}15`, borderWidth: 1, borderColor: `${Colors.accent}40`,
      borderRadius: 12, padding: 12, marginBottom: 12,
    },
    lockBannerText: { fontFamily: "Inter_600SemiBold", fontSize: 14, color: Colors.accent },
    joinBtn: {
      backgroundColor: Colors.primary, borderRadius: 12, paddingVertical: 14,
      flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, marginTop: 8,
    },
    joinBtnText: { fontFamily: "Inter_600SemiBold", fontSize: 15, color: "#fff" },

    /* Empty */
    empty: { alignItems: "center", paddingVertical: 56, gap: 10 },
    emptyTitle: { fontFamily: "Inter_700Bold", fontSize: 16, color: Colors.textSecondary },
    emptyText: { fontFamily: "Inter_400Regular", fontSize: 14, color: Colors.textMuted, textAlign: "center", paddingHorizontal: 24 },
  });
}
