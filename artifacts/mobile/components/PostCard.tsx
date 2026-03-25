import React, { useMemo } from "react";
import { View, Text, StyleSheet, Image, Pressable } from "react-native";
import { Feather } from "@expo/vector-icons";
import { useColors } from "@/context/ThemeContext";
import { resolveImageUrl } from "@/constants/api";
import type { Post } from "@/lib/api";

type Props = {
  post: Post;
  isLocked?: boolean;
  commentCount?: number;
  onPress?: () => void;
};

export function PostCard({ post, isLocked, commentCount, onPress }: Props) {
  const Colors = useColors();
  const styles = useMemo(() => makeStyles(Colors), [Colors]);
  const date = new Date(post.createdAt);
  const formatted = date.toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
  const imageUri = resolveImageUrl(post.imageUrl);

  return (
    <Pressable
      style={({ pressed }) => [styles.card, { opacity: pressed && onPress ? 0.9 : 1 }]}
      onPress={onPress}
      disabled={!onPress}
    >
      {imageUri && (
        <Image source={{ uri: imageUri }} style={styles.postImage} resizeMode="cover" />
      )}
      <View style={styles.cardContent}>
        {post.isMembersOnly && (
          <View style={styles.membersBadge}>
            <Feather name="shield" size={10} color={Colors.accent} />
            <Text style={styles.membersBadgeText}>Members Only</Text>
          </View>
        )}
        <Text style={styles.title}>{post.title}</Text>
        {isLocked ? (
          <View style={styles.lockedRow}>
            <Feather name="lock" size={14} color={Colors.textMuted} />
            <Text style={styles.lockedText}>Sign in to read member updates</Text>
          </View>
        ) : (
          <Text style={styles.content} numberOfLines={4}>{post.content}</Text>
        )}
        <View style={styles.footer}>
          <View style={styles.authorRow}>
            <View style={styles.authorDot} />
            <Text style={styles.author}>{post.authorName}</Text>
          </View>
          <View style={styles.footerRight}>
            {!isLocked && (
              <View style={styles.commentCount}>
                <Feather name="message-circle" size={13} color={Colors.textMuted} />
                <Text style={styles.commentCountText}>{commentCount ?? 0}</Text>
              </View>
            )}
            <Text style={styles.date}>{formatted}</Text>
          </View>
        </View>
      </View>
    </Pressable>
  );
}

function makeStyles(Colors: ReturnType<typeof useColors>) {
  return StyleSheet.create({
    card: {
      backgroundColor: Colors.surface,
      borderRadius: 18,
      overflow: "hidden",
      borderWidth: 1,
      borderColor: Colors.border,
      marginBottom: 12,
    },
    postImage: {
      width: "100%",
      height: 160,
    },
    cardContent: {
      padding: 18,
    },
    membersBadge: {
      flexDirection: "row",
      alignItems: "center",
      gap: 4,
      marginBottom: 8,
    },
    membersBadgeText: {
      fontFamily: "Inter_600SemiBold",
      fontSize: 11,
      color: Colors.accent,
      textTransform: "uppercase",
      letterSpacing: 0.5,
    },
    title: {
      fontFamily: "Inter_700Bold",
      fontSize: 17,
      color: Colors.text,
      marginBottom: 8,
    },
    content: {
      fontFamily: "Inter_400Regular",
      fontSize: 14,
      color: Colors.textSecondary,
      lineHeight: 22,
      marginBottom: 14,
    },
    lockedRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: 8,
      paddingVertical: 12,
      marginBottom: 14,
    },
    lockedText: {
      fontFamily: "Inter_400Regular",
      fontSize: 14,
      color: Colors.textMuted,
      fontStyle: "italic",
    },
    footer: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      marginTop: 8,
      paddingTop: 12,
      borderTopWidth: 1,
      borderTopColor: Colors.border,
    },
    authorRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: 6,
    },
    authorDot: {
      width: 8,
      height: 8,
      borderRadius: 4,
      backgroundColor: Colors.primary,
    },
    author: {
      fontFamily: "Inter_600SemiBold",
      fontSize: 13,
      color: Colors.textSecondary,
    },
    footerRight: {
      flexDirection: "row",
      alignItems: "center",
      gap: 12,
    },
    commentCount: {
      flexDirection: "row",
      alignItems: "center",
      gap: 4,
    },
    commentCountText: {
      fontFamily: "Inter_400Regular",
      fontSize: 12,
      color: Colors.textMuted,
    },
    date: {
      fontFamily: "Inter_400Regular",
      fontSize: 12,
      color: Colors.textMuted,
    },
  });
}
