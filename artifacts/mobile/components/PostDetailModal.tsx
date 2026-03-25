import React, { useMemo, useState, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  Image,
  Modal,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  FlatList,
  Pressable,
  ActivityIndicator,
} from "react-native";
import { router } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import * as Haptics from "expo-haptics";
import { useColors } from "@/context/ThemeContext";
import { useAuth } from "@/context/AuthContext";
import { resolveImageUrl } from "@/constants/api";
import { getPostComments, addPostComment, Post, PostComment } from "@/lib/api";

type Props = {
  post: Post;
  onClose: () => void;
};

export function PostDetailModal({ post, onClose }: Props) {
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
  const date = new Date(post.createdAt).toLocaleDateString("en-GB", {
    day: "numeric", month: "long", year: "numeric",
  });

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
              {imageUri && (
                <Image source={{ uri: imageUri }} style={styles.detailImage} resizeMode="cover" />
              )}
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

              <View style={styles.commentsHeader}>
                <Feather name="message-circle" size={16} color={Colors.primary} />
                <Text style={styles.commentsTitle}>Comments ({comments.length})</Text>
              </View>
              {commentsLoading && (
                <ActivityIndicator color={Colors.primary} style={{ marginTop: 16 }} />
              )}
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

        {isAuthenticated ? (
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
              style={({ pressed }) => [
                styles.sendBtn,
                {
                  opacity: pressed ? 0.8 : 1,
                  backgroundColor: commentText.trim() ? Colors.primary : Colors.surface2,
                },
              ]}
              onPress={handleSend}
              disabled={!commentText.trim() || submitting}
            >
              {submitting
                ? <ActivityIndicator size="small" color={Colors.primary} />
                : <Feather name="send" size={16} color={commentText.trim() ? "#fff" : Colors.textMuted} />}
            </Pressable>
          </View>
        ) : (
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

function makeStyles(Colors: ReturnType<typeof useColors>) {
  return StyleSheet.create({
    modalHeader: {
      flexDirection: "row", alignItems: "center", gap: 12,
      paddingHorizontal: 16, paddingBottom: 14,
      backgroundColor: Colors.surface,
      borderBottomWidth: 1, borderBottomColor: Colors.border,
    },
    modalBackBtn: { padding: 4 },
    modalHeaderTitle: { flex: 1, fontFamily: "Inter_700Bold", fontSize: 16, color: Colors.text },
    detailImage: { width: "100%", height: 200 },
    detailContent: { padding: 20 },
    membersBadge: { flexDirection: "row", alignItems: "center", gap: 4, marginBottom: 8 },
    membersBadgeText: {
      fontFamily: "Inter_600SemiBold", fontSize: 11, color: Colors.accent,
      textTransform: "uppercase", letterSpacing: 0.5,
    },
    detailTitle: { fontFamily: "Inter_700Bold", fontSize: 22, color: Colors.text, marginBottom: 10 },
    detailMeta: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 16 },
    authorDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: Colors.primary },
    detailAuthor: { fontFamily: "Inter_600SemiBold", fontSize: 13, color: Colors.textSecondary },
    detailDate: { fontFamily: "Inter_400Regular", fontSize: 13, color: Colors.textMuted },
    detailBody: { fontFamily: "Inter_400Regular", fontSize: 15, color: Colors.text, lineHeight: 24 },
    commentsHeader: {
      flexDirection: "row", alignItems: "center", gap: 8,
      paddingHorizontal: 20, paddingVertical: 14,
      borderTopWidth: 1, borderTopColor: Colors.border,
      backgroundColor: Colors.surface2,
    },
    commentsTitle: { fontFamily: "Inter_700Bold", fontSize: 15, color: Colors.text },
    noComments: {
      fontFamily: "Inter_400Regular", fontSize: 14, color: Colors.textMuted,
      textAlign: "center", paddingVertical: 24,
    },
    commentRow: { flexDirection: "row", gap: 12, paddingHorizontal: 16, paddingVertical: 10 },
    commentAvatar: {
      width: 34, height: 34, borderRadius: 17,
      backgroundColor: `${Colors.primary}25`,
      alignItems: "center", justifyContent: "center", flexShrink: 0,
    },
    commentAvatarLetter: { fontFamily: "Inter_700Bold", fontSize: 14, color: Colors.primary },
    commentBubble: {
      flex: 1, backgroundColor: Colors.surface, borderRadius: 14,
      padding: 12, borderWidth: 1, borderColor: Colors.border,
    },
    commentMeta: { flexDirection: "row", justifyContent: "space-between", marginBottom: 4 },
    commentAuthor: { fontFamily: "Inter_600SemiBold", fontSize: 13, color: Colors.text },
    commentTime: { fontFamily: "Inter_400Regular", fontSize: 11, color: Colors.textMuted },
    commentText: { fontFamily: "Inter_400Regular", fontSize: 14, color: Colors.text, lineHeight: 20 },
    inputRow: {
      flexDirection: "row", alignItems: "flex-end", gap: 10,
      paddingHorizontal: 16, paddingTop: 10,
      backgroundColor: Colors.surface,
      borderTopWidth: 1, borderTopColor: Colors.border,
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
      backgroundColor: Colors.surface,
      borderTopWidth: 1, borderTopColor: Colors.border,
    },
    signInPromptText: { fontFamily: "Inter_600SemiBold", fontSize: 14, color: Colors.primary },
  });
}
