import React, { useMemo, useState, useRef } from "react";
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
  RefreshControl,
  Pressable,
  Linking,
  Image,
  Modal,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  FlatList,
} from "react-native";
import { router } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import * as Haptics from "expo-haptics";
import { useColors } from "@/context/ThemeContext";
import { resolveImageUrl } from "@/constants/api";
import { useAuth } from "@/context/AuthContext";
import {
  listPosts, listVideos, VideoClip, Post,
  getPostComments, addPostComment, PostComment,
} from "@/lib/api";
import { PostCard } from "@/components/PostCard";

/* ─── Video card ─── */
function VideoCard({ video }: { video: VideoClip }) {
  const Colors = useColors();
  const styles = useMemo(() => makeStyles(Colors), [Colors]);

  return (
    <Pressable
      style={({ pressed }) => [styles.videoCard, { opacity: pressed ? 0.85 : 1 }]}
      onPress={() => Linking.openURL(video.url).catch(() => {})}
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

/* ─── Post detail modal with comments ─── */
function PostDetailModal({ post, onClose }: { post: Post; onClose: () => void }) {
  const Colors = useColors();
  const styles = useMemo(() => makeStyles(Colors), [Colors]);
  const { isAuthenticated, user } = useAuth();
  const insets = useSafeAreaInsets();
  const queryClient = useQueryClient();
  const [commentText, setCommentText] = useState("");
  const flatRef = useRef<FlatList>(null);

  const { data: comments = [], isLoading: commentsLoading } = useQuery({
    queryKey: ["comments", post.id],
    queryFn: () => getPostComments(post.id),
  });

  const { mutate: submitComment, isPending: submitting } = useMutation({
    mutationFn: (content: string) => addPostComment(post.id, content),
    onSuccess: (comment) => {
      queryClient.setQueryData<PostComment[]>(["comments", post.id], (old) => [...(old ?? []), comment]);
      setCommentText("");
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      setTimeout(() => flatRef.current?.scrollToEnd({ animated: true }), 100);
    },
  });

  const imageUri = resolveImageUrl(post.imageUrl);
  const date = new Date(post.createdAt).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" });

  const handleSend = () => {
    const c = commentText.trim();
    if (!c || submitting) return;
    submitComment(c);
  };

  return (
    <Modal visible animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <KeyboardAvoidingView
        style={{ flex: 1, backgroundColor: Colors.background }}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        {/* Header */}
        <View style={[styles.modalHeader, { paddingTop: insets.top > 0 ? 16 : 24 }]}>
          <Pressable style={styles.modalBackBtn} onPress={onClose}>
            <Feather name="x" size={22} color={Colors.text} />
          </Pressable>
          <Text style={styles.modalHeaderTitle} numberOfLines={1}>{post.title}</Text>
        </View>

        <FlatList
          ref={flatRef}
          data={comments}
          keyExtractor={c => String(c.id)}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: 24 }}
          ListHeaderComponent={
            <View>
              {/* Post content */}
              {imageUri && <Image source={{ uri: imageUri }} style={styles.detailImage} resizeMode="cover" />}
              <View style={styles.detailContent}>
                {post.isMembersOnly && (
                  <View style={styles.membersBadge}>
                    <Feather name="shield" size={10} color={Colors.accent} />
                    <Text style={styles.membersBadgeText}>Members Only</Text>
                  </View>
                )}
                <Text style={styles.detailTitle}>{post.title}</Text>
                <View style={styles.detailMeta}>
                  <View style={styles.authorDot} />
                  <Text style={styles.detailAuthor}>{post.authorName}</Text>
                  <Text style={styles.detailDate}>{date}</Text>
                </View>
                <Text style={styles.detailBody}>{post.content}</Text>
              </View>

              {/* Comments header */}
              <View style={styles.commentsHeader}>
                <Feather name="message-circle" size={16} color={Colors.primary} />
                <Text style={styles.commentsTitle}>Comments ({comments.length})</Text>
              </View>
              {commentsLoading && <ActivityIndicator color={Colors.primary} style={{ marginTop: 16 }} />}
              {!commentsLoading && comments.length === 0 && (
                <Text style={styles.noComments}>Be the first to comment!</Text>
              )}
            </View>
          }
          renderItem={({ item: c }) => (
            <View style={styles.commentRow}>
              <View style={styles.commentAvatar}>
                <Text style={styles.commentAvatarLetter}>{c.authorName.charAt(0).toUpperCase()}</Text>
              </View>
              <View style={styles.commentBubble}>
                <View style={styles.commentMeta}>
                  <Text style={styles.commentAuthor}>{c.authorName}</Text>
                  <Text style={styles.commentTime}>
                    {new Date(c.createdAt).toLocaleDateString("en-GB", { day: "numeric", month: "short" })}
                  </Text>
                </View>
                <Text style={styles.commentText}>{c.content}</Text>
              </View>
            </View>
          )}
        />

        {/* Comment input */}
        {isAuthenticated && (
          <View style={[styles.inputRow, { paddingBottom: insets.bottom + 10 }]}>
            <View style={styles.commentAvatar}>
              <Text style={styles.commentAvatarLetter}>{user?.name?.charAt(0).toUpperCase() ?? "?"}</Text>
            </View>
            <TextInput
              style={styles.commentInput}
              value={commentText}
              onChangeText={setCommentText}
              placeholder="Write a comment…"
              placeholderTextColor={Colors.textMuted}
              multiline
              maxLength={500}
            />
            <Pressable
              style={({ pressed }) => [styles.sendBtn, { opacity: pressed ? 0.8 : 1, backgroundColor: commentText.trim() ? Colors.primary : Colors.surface2 }]}
              onPress={handleSend}
              disabled={!commentText.trim() || submitting}
            >
              {submitting
                ? <ActivityIndicator size="small" color={Colors.primary} />
                : <Feather name="send" size={16} color={commentText.trim() ? "#fff" : Colors.textMuted} />}
            </Pressable>
          </View>
        )}
        {!isAuthenticated && (
          <Pressable
            style={[styles.signInPrompt, { paddingBottom: insets.bottom + 12 }]}
            onPress={() => { onClose(); router.push("/(auth)/login"); }}
          >
            <Text style={styles.signInPromptText}>Sign in to leave a comment →</Text>
          </Pressable>
        )}
      </KeyboardAvoidingView>
    </Modal>
  );
}

/* ─── Main screen ─── */
export default function UpdatesScreen() {
  const insets = useSafeAreaInsets();
  const Colors = useColors();
  const styles = useMemo(() => makeStyles(Colors), [Colors]);
  const { isAuthenticated } = useAuth();
  const [refreshing, setRefreshing] = React.useState(false);
  const [selectedPost, setSelectedPost] = useState<Post | null>(null);
  const queryClient = useQueryClient();

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
    await Promise.all([refetchPosts(), refetchVideos()]);
    setRefreshing(false);
  };

  const isLoading = postsLoading || videosLoading;
  const visiblePosts = isAuthenticated ? posts ?? [] : (posts ?? []).filter(p => !p.isMembersOnly);
  const lockedPosts = isAuthenticated ? [] : (posts ?? []).filter(p => p.isMembersOnly);

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
                  {videos.map(v => <VideoCard key={v.id} video={v} />)}
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

              {!isAuthenticated && lockedPosts.length > 0 && (
                <>
                  <View style={styles.lockBanner}>
                    <Feather name="lock" size={18} color={Colors.accent} />
                    <Text style={styles.lockBannerText}>
                      {lockedPosts.length} member-only update{lockedPosts.length > 1 ? "s" : ""} available
                    </Text>
                  </View>
                  {lockedPosts.map(post => <PostCard key={post.id} post={post} isLocked />)}
                  <Pressable
                    style={({ pressed }) => [styles.joinBtn, { opacity: pressed ? 0.85 : 1 }]}
                    onPress={() => router.push("/(auth)/register")}
                  >
                    <Text style={styles.joinBtnText}>Join to read member updates</Text>
                    <Feather name="arrow-right" size={16} color="#fff" />
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

    /* Post detail modal */
    modalHeader: {
      flexDirection: "row", alignItems: "center", gap: 12,
      paddingHorizontal: 16, paddingBottom: 14,
      backgroundColor: Colors.surface, borderBottomWidth: 1, borderBottomColor: Colors.border,
    },
    modalBackBtn: { padding: 4 },
    modalHeaderTitle: { flex: 1, fontFamily: "Inter_700Bold", fontSize: 16, color: Colors.text },
    detailImage: { width: "100%", height: 200 },
    detailContent: { padding: 20 },
    membersBadge: { flexDirection: "row", alignItems: "center", gap: 4, marginBottom: 8 },
    membersBadgeText: { fontFamily: "Inter_600SemiBold", fontSize: 11, color: Colors.accent, textTransform: "uppercase", letterSpacing: 0.5 },
    detailTitle: { fontFamily: "Inter_700Bold", fontSize: 22, color: Colors.text, marginBottom: 10 },
    detailMeta: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 16 },
    authorDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: Colors.primary },
    detailAuthor: { fontFamily: "Inter_600SemiBold", fontSize: 13, color: Colors.textSecondary },
    detailDate: { fontFamily: "Inter_400Regular", fontSize: 13, color: Colors.textMuted },
    detailBody: { fontFamily: "Inter_400Regular", fontSize: 15, color: Colors.text, lineHeight: 24 },

    /* Comments */
    commentsHeader: {
      flexDirection: "row", alignItems: "center", gap: 8,
      paddingHorizontal: 20, paddingVertical: 14,
      borderTopWidth: 1, borderTopColor: Colors.border,
      backgroundColor: Colors.surface2,
    },
    commentsTitle: { fontFamily: "Inter_700Bold", fontSize: 15, color: Colors.text },
    noComments: { fontFamily: "Inter_400Regular", fontSize: 14, color: Colors.textMuted, textAlign: "center", paddingVertical: 24 },
    commentRow: { flexDirection: "row", gap: 12, paddingHorizontal: 16, paddingVertical: 10 },
    commentAvatar: {
      width: 34, height: 34, borderRadius: 17,
      backgroundColor: `${Colors.primary}25`, alignItems: "center", justifyContent: "center", flexShrink: 0,
    },
    commentAvatarLetter: { fontFamily: "Inter_700Bold", fontSize: 14, color: Colors.primary },
    commentBubble: { flex: 1, backgroundColor: Colors.surface, borderRadius: 14, padding: 12, borderWidth: 1, borderColor: Colors.border },
    commentMeta: { flexDirection: "row", justifyContent: "space-between", marginBottom: 4 },
    commentAuthor: { fontFamily: "Inter_600SemiBold", fontSize: 13, color: Colors.text },
    commentTime: { fontFamily: "Inter_400Regular", fontSize: 11, color: Colors.textMuted },
    commentText: { fontFamily: "Inter_400Regular", fontSize: 14, color: Colors.text, lineHeight: 20 },

    /* Input row */
    inputRow: {
      flexDirection: "row", alignItems: "flex-end", gap: 10,
      paddingHorizontal: 16, paddingTop: 10,
      backgroundColor: Colors.surface, borderTopWidth: 1, borderTopColor: Colors.border,
    },
    commentInput: {
      flex: 1, minHeight: 40, maxHeight: 100,
      backgroundColor: Colors.surface2, borderRadius: 20,
      paddingHorizontal: 14, paddingVertical: 8,
      fontFamily: "Inter_400Regular", fontSize: 14, color: Colors.text,
      borderWidth: 1, borderColor: Colors.border,
    },
    sendBtn: {
      width: 38, height: 38, borderRadius: 19,
      alignItems: "center", justifyContent: "center",
    },
    signInPrompt: {
      alignItems: "center", padding: 16,
      backgroundColor: Colors.surface, borderTopWidth: 1, borderTopColor: Colors.border,
    },
    signInPromptText: { fontFamily: "Inter_600SemiBold", fontSize: 14, color: Colors.primary },
  });
}
