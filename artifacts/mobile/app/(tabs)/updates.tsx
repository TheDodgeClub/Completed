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
  SafeAreaView,
} from "react-native";
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
import { listPosts, listVideos, VideoClip, Post, Announcement } from "@/lib/api";
import { PostCard } from "@/components/PostCard";
import { PostDetailModal } from "@/components/PostDetailModal";
import { useAnnouncements } from "@/hooks/useAnnouncements";

/* ─── Announcement Card ─── */
function AnnouncementCard({ item }: { item: Announcement }) {
  const Colors = useColors();
  const styles = useMemo(() => makeStyles(Colors), [Colors]);
  const date = new Date(item.createdAt);
  const timeAgo = formatTimeAgo(date);

  return (
    <View style={styles.announcementCard}>
      <View style={styles.announcementHeader}>
        <View style={styles.announcementIconWrap}>
          <Feather name="bell" size={14} color={Colors.primary} />
        </View>
        <Text style={styles.announcementLabel}>Club Announcement</Text>
        <Text style={styles.announcementTime}>{timeAgo}</Text>
      </View>
      <Text style={styles.announcementTitle}>{item.title}</Text>
      <Text style={styles.announcementBody}>{item.body}</Text>
    </View>
  );
}

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

/* ─── Video player modal ─── */
function VideoPlayerModal({ video, onClose }: { video: VideoClip; onClose: () => void }) {
  const Colors = useColors();
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
        <VideoView
          player={player}
          style={{ flex: 1 }}
          contentFit="contain"
          nativeControls
        />
        {video.description ? (
          <View style={{ padding: 16 }}>
            <Text style={{ fontFamily: "Inter_400Regular", fontSize: 13, color: "#ccc" }}>{video.description}</Text>
          </View>
        ) : null}
      </SafeAreaView>
    </Modal>
  );
}

/* ─── Video card ─── */
function VideoCard({ video, onPress }: { video: VideoClip; onPress: () => void }) {
  const Colors = useColors();
  const styles = useMemo(() => makeStyles(Colors), [Colors]);

  const isExternalLink = video.url.includes("youtube.com") || video.url.includes("youtu.be") || video.url.includes("vimeo.com");

  return (
    <Pressable
      style={({ pressed }) => [styles.videoCard, { opacity: pressed ? 0.85 : 1 }]}
      onPress={() => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        if (isExternalLink) {
          WebBrowser.openBrowserAsync(video.url);
        } else {
          onPress();
        }
      }}
    >
      <View style={styles.videoThumb}>
        {video.thumbnailUrl ? (
          <Image source={{ uri: resolveImageUrl(video.thumbnailUrl) ?? undefined }} style={StyleSheet.absoluteFill} resizeMode="cover" />
        ) : (
          <View style={[StyleSheet.absoluteFill, styles.videoThumbPlaceholder]}>
            <Feather name="play-circle" size={32} color={Colors.accent} />
          </View>
        )}
        <View style={styles.playOverlay}>
          <Feather name="play-circle" size={28} color="#fff" />
        </View>
      </View>
      <View style={styles.videoInfo}>
        <Text style={styles.videoTitle} numberOfLines={2}>{video.title}</Text>
        {video.description ? <Text style={styles.videoDesc} numberOfLines={1}>{video.description}</Text> : null}
      </View>
    </Pressable>
  );
}

/* ─── Main screen ─── */
export default function UpdatesScreen() {
  const insets = useSafeAreaInsets();
  const Colors = useColors();
  const styles = useMemo(() => makeStyles(Colors), [Colors]);
  const { isAuthenticated, user } = useAuth();
  const [refreshing, setRefreshing] = React.useState(false);
  const [selectedPost, setSelectedPost] = useState<Post | null>(null);
  const [selectedVideo, setSelectedVideo] = useState<VideoClip | null>(null);
  const [showAllAnnouncements, setShowAllAnnouncements] = useState(false);
  const queryClient = useQueryClient();

  const { announcements, isLoading: announcementsLoading, refetch: refetchAnnouncements, markAllSeen } = useAnnouncements();

  useFocusEffect(
    useCallback(() => {
      markAllSeen();
    }, [markAllSeen])
  );

  const { data: posts, isLoading: postsLoading, refetch: refetchPosts } = useQuery({
    queryKey: ["posts"],
    queryFn: listPosts,
  });

  const { data: videos, isLoading: videosLoading, refetch: refetchVideos } = useQuery({
    queryKey: ["videos"],
    queryFn: listVideos,
  });

  const { data: commentCounts } = useQuery({
    queryKey: ["comment-counts"],
    queryFn: async () => {
      if (!posts || posts.length === 0) return {};
      const results = await Promise.all(
        posts.map(async (p) => {
          try {
            const comments = await queryClient.fetchQuery({
              queryKey: ["comments", p.id],
              queryFn: () => import("@/lib/api").then(m => m.getPostComments(p.id)),
              staleTime: 30000,
            });
            return [p.id, comments.length] as [number, number];
          } catch {
            return [p.id, 0] as [number, number];
          }
        })
      );
      return Object.fromEntries(results);
    },
    enabled: !!posts && posts.length > 0,
  });

  const handleRefresh = async () => {
    setRefreshing(true);
    await Promise.all([refetchPosts(), refetchVideos(), refetchAnnouncements()]);
    setRefreshing(false);
  };

  const isElite = user?.isElite ?? false;

  const isLoading = postsLoading || videosLoading;
  const allPosts = posts ?? [];

  const visiblePosts = isAuthenticated
    ? allPosts.filter(p => isElite || !p.isEliteOnly)
    : allPosts.filter(p => !p.isMembersOnly && !p.isEliteOnly);

  const memberLockedPosts = !isAuthenticated ? allPosts.filter(p => p.isMembersOnly && !p.isEliteOnly) : [];
  const eliteLockedPosts = isAuthenticated && !isElite ? allPosts.filter(p => p.isEliteOnly) : [];

  const visibleAnnouncements = showAllAnnouncements ? announcements : announcements.slice(0, 3);

  return (
    <>
      <ScrollView
        style={styles.screen}
        contentInsetAdjustmentBehavior="automatic"
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={Colors.primary} />}
      >
        <View style={[styles.header, { paddingTop: insets.top + 24 }]}>
          <Text style={styles.headerTitle}>Updates</Text>
          <Text style={styles.headerSubtitle}>Community news and announcements</Text>
        </View>

        {isAuthenticated && announcements.length > 0 && (
          <View style={styles.announcementsSection}>
            <View style={styles.sectionHeader}>
              <Feather name="bell" size={16} color={Colors.primary} />
              <Text style={styles.sectionTitle}>Announcements</Text>
              <View style={styles.badge}>
                <Text style={styles.badgeText}>{announcements.length}</Text>
              </View>
            </View>
            {visibleAnnouncements.map(item => (
              <AnnouncementCard key={item.id} item={item} />
            ))}
            {announcements.length > 3 && (
              <Pressable
                style={({ pressed }) => [styles.showMoreBtn, { opacity: pressed ? 0.7 : 1 }]}
                onPress={() => setShowAllAnnouncements(v => !v)}
              >
                <Text style={styles.showMoreText}>
                  {showAllAnnouncements ? "Show less" : `Show ${announcements.length - 3} more`}
                </Text>
                <Feather name={showAllAnnouncements ? "chevron-up" : "chevron-down"} size={14} color={Colors.primary} />
              </Pressable>
            )}
          </View>
        )}

        {isLoading ? (
          <ActivityIndicator color={Colors.primary} style={{ marginTop: 40 }} />
        ) : (
          <>
            {videos && videos.length > 0 && (
              <View style={styles.videosSection}>
                <View style={styles.sectionHeader}>
                  <Feather name="video" size={16} color={Colors.accent} />
                  <Text style={styles.sectionTitle}>Videos</Text>
                </View>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.videoList}>
                  {videos.map(v => <VideoCard key={v.id} video={v} onPress={() => setSelectedVideo(v)} />)}
                </ScrollView>
              </View>
            )}

            <View style={styles.body}>
              {visiblePosts.length > 0 ? (
                visiblePosts.map(post => (
                  <PostCard
                    key={post.id}
                    post={post}
                    commentCount={commentCounts?.[post.id] ?? 0}
                    onPress={() => {
                      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                      setSelectedPost(post);
                    }}
                  />
                ))
              ) : (
                <View style={styles.empty}>
                  <Feather name="message-square" size={40} color={Colors.textMuted} />
                  <Text style={styles.emptyTitle}>No updates yet</Text>
                  <Text style={styles.emptyText}>Watch this space — announcements coming soon.</Text>
                </View>
              )}

              {memberLockedPosts.length > 0 && (
                <>
                  <View style={styles.lockBanner}>
                    <Feather name="lock" size={18} color={Colors.accent} />
                    <Text style={styles.lockBannerText}>
                      {memberLockedPosts.length} member-only update{memberLockedPosts.length > 1 ? "s" : ""} available
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
                </>
              )}

              {eliteLockedPosts.length > 0 && (
                <>
                  <View style={[styles.lockBanner, { backgroundColor: Colors.accent + "18", borderColor: Colors.accent + "50" }]}>
                    <Feather name="star" size={18} color={Colors.accent} />
                    <Text style={styles.lockBannerText}>
                      {eliteLockedPosts.length} Elite-only update{eliteLockedPosts.length > 1 ? "s" : ""} locked
                    </Text>
                  </View>
                  {eliteLockedPosts.map(post => <PostCard key={post.id} post={post} isLocked />)}
                  <Pressable
                    style={({ pressed }) => [styles.eliteBtn, { opacity: pressed ? 0.85 : 1 }]}
                    onPress={() => router.push("/elite")}
                  >
                    <Feather name="star" size={16} color={Colors.accent} />
                    <Text style={styles.eliteBtnText}>Upgrade to Elite — £8.99/month</Text>
                    <Feather name="arrow-right" size={16} color={Colors.accent} />
                  </Pressable>
                </>
              )}
            </View>
          </>
        )}
      </ScrollView>

      {selectedPost && (
        <PostDetailModal post={selectedPost} onClose={() => setSelectedPost(null)} />
      )}

      {selectedVideo && (
        <VideoPlayerModal video={selectedVideo} onClose={() => setSelectedVideo(null)} />
      )}
    </>
  );
}

function makeStyles(Colors: ReturnType<typeof useColors>) {
  return StyleSheet.create({
    screen: { flex: 1, backgroundColor: Colors.background },
    header: {
      paddingHorizontal: 24, paddingBottom: 24,
      backgroundColor: Colors.surface,
      borderBottomWidth: 1, borderBottomColor: Colors.border,
    },
    headerTitle: { fontFamily: "Poppins_800ExtraBold", fontSize: 36, color: Colors.text },
    headerSubtitle: { fontFamily: "Inter_400Regular", fontSize: 14, color: Colors.textSecondary, marginTop: 2 },

    announcementsSection: {
      paddingTop: 20,
      paddingHorizontal: 20,
      paddingBottom: 4,
    },
    announcementCard: {
      backgroundColor: Colors.surface,
      borderRadius: 16,
      borderWidth: 1,
      borderColor: Colors.primary + "35",
      padding: 16,
      marginBottom: 12,
      shadowColor: Colors.primary,
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.08,
      shadowRadius: 6,
      elevation: 2,
    },
    announcementHeader: {
      flexDirection: "row",
      alignItems: "center",
      gap: 6,
      marginBottom: 8,
    },
    announcementIconWrap: {
      width: 22,
      height: 22,
      borderRadius: 11,
      backgroundColor: Colors.primary + "20",
      alignItems: "center",
      justifyContent: "center",
    },
    announcementLabel: {
      fontFamily: "Inter_600SemiBold",
      fontSize: 11,
      color: Colors.primary,
      flex: 1,
      textTransform: "uppercase",
      letterSpacing: 0.5,
    },
    announcementTime: {
      fontFamily: "Inter_400Regular",
      fontSize: 11,
      color: Colors.textMuted,
    },
    announcementTitle: {
      fontFamily: "Inter_700Bold",
      fontSize: 15,
      color: Colors.text,
      marginBottom: 6,
    },
    announcementBody: {
      fontFamily: "Inter_400Regular",
      fontSize: 14,
      color: Colors.textSecondary,
      lineHeight: 20,
    },

    badge: {
      backgroundColor: Colors.primary,
      borderRadius: 10,
      paddingHorizontal: 7,
      paddingVertical: 2,
      marginLeft: 4,
    },
    badgeText: {
      fontFamily: "Inter_700Bold",
      fontSize: 11,
      color: "#fff",
    },
    showMoreBtn: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: 6,
      paddingVertical: 10,
      marginBottom: 4,
    },
    showMoreText: {
      fontFamily: "Inter_600SemiBold",
      fontSize: 13,
      color: Colors.primary,
    },

    videosSection: { paddingTop: 20, paddingBottom: 4 },
    sectionHeader: { flexDirection: "row", alignItems: "center", gap: 8, paddingHorizontal: 20, marginBottom: 12 },
    sectionTitle: { fontFamily: "Inter_700Bold", fontSize: 16, color: Colors.text },
    videoList: { paddingHorizontal: 20, gap: 12 },
    videoCard: { width: 220, backgroundColor: Colors.surface, borderRadius: 16, borderWidth: 1, borderColor: Colors.border, overflow: "hidden" },
    videoThumb: { width: 220, height: 124, backgroundColor: Colors.border, overflow: "hidden" },
    videoThumbPlaceholder: { backgroundColor: `${Colors.primary}20`, alignItems: "center", justifyContent: "center" },
    playOverlay: { position: "absolute", inset: 0, alignItems: "center", justifyContent: "center", backgroundColor: "rgba(0,0,0,0.35)" },
    videoInfo: { padding: 12, gap: 4 },
    videoTitle: { fontFamily: "Inter_600SemiBold", fontSize: 13, color: Colors.text, lineHeight: 18 },
    videoDesc: { fontFamily: "Inter_400Regular", fontSize: 12, color: Colors.textSecondary },
    body: { padding: 20 },
    empty: { alignItems: "center", paddingVertical: 48, gap: 10 },
    emptyTitle: { fontFamily: "Inter_700Bold", fontSize: 16, color: Colors.textSecondary },
    emptyText: { fontFamily: "Inter_400Regular", fontSize: 14, color: Colors.textMuted, textAlign: "center", paddingHorizontal: 20 },
    lockBanner: {
      flexDirection: "row", alignItems: "center", gap: 10,
      backgroundColor: `${Colors.accent}15`, borderWidth: 1, borderColor: `${Colors.accent}40`,
      borderRadius: 14, padding: 14, marginBottom: 14,
    },
    lockBannerText: { fontFamily: "Inter_600SemiBold", fontSize: 14, color: Colors.accent },
    joinBtn: {
      backgroundColor: Colors.primary, borderRadius: 14, paddingVertical: 16,
      flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, marginTop: 8,
      shadowColor: Colors.primary, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8, elevation: 4,
    },
    joinBtnText: { fontFamily: "Inter_600SemiBold", fontSize: 15, color: "#fff" },
    eliteBtn: {
      borderWidth: 1.5, borderColor: Colors.accent,
      borderRadius: 14, paddingVertical: 14,
      flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, marginTop: 8,
      backgroundColor: Colors.accent + "12",
    },
    eliteBtnText: { fontFamily: "Inter_600SemiBold", fontSize: 14, color: Colors.accent },
  });
}
