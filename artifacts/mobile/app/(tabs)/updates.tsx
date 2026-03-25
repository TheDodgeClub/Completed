import React from "react";
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
  RefreshControl,
  Pressable,
} from "react-native";
import { router } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import { useQuery } from "@tanstack/react-query";
import Colors from "@/constants/colors";
import { useAuth } from "@/context/AuthContext";
import { listPosts } from "@/lib/api";
import { PostCard } from "@/components/PostCard";

export default function UpdatesScreen() {
  const insets = useSafeAreaInsets();
  const { isAuthenticated } = useAuth();
  const [refreshing, setRefreshing] = React.useState(false);

  const { data: posts, isLoading, refetch } = useQuery({
    queryKey: ["posts"],
    queryFn: listPosts,
  });

  const handleRefresh = async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  };

  // Guests see public posts only; members see all
  const visiblePosts = isAuthenticated
    ? posts ?? []
    : (posts ?? []).filter(p => !p.isMembersOnly);

  const lockedPosts = isAuthenticated ? [] : (posts ?? []).filter(p => p.isMembersOnly);

  return (
    <ScrollView
      style={styles.screen}
      contentInsetAdjustmentBehavior="automatic"
      showsVerticalScrollIndicator={false}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={Colors.primary} />
      }
    >
      <View style={[styles.header, { paddingTop: insets.top + 24 }]}>
        <Text style={styles.headerTitle}>Updates</Text>
        <Text style={styles.headerSubtitle}>Community news and announcements</Text>
      </View>

      <View style={styles.body}>
        {isLoading ? (
          <ActivityIndicator color={Colors.primary} style={{ marginTop: 40 }} />
        ) : (
          <>
            {/* All visible posts */}
            {visiblePosts.length > 0 ? (
              visiblePosts.map(post => <PostCard key={post.id} post={post} />)
            ) : (
              <View style={styles.empty}>
                <Feather name="message-square" size={40} color={Colors.textMuted} />
                <Text style={styles.emptyTitle}>No updates yet</Text>
                <Text style={styles.emptyText}>Watch this space — announcements coming soon.</Text>
              </View>
            )}

            {/* Locked posts for guests */}
            {!isAuthenticated && lockedPosts.length > 0 && (
              <>
                <View style={styles.lockBanner}>
                  <Feather name="lock" size={18} color={Colors.accent} />
                  <Text style={styles.lockBannerText}>
                    {lockedPosts.length} member-only update{lockedPosts.length > 1 ? "s" : ""} available
                  </Text>
                </View>
                {lockedPosts.map(post => (
                  <PostCard key={post.id} post={post} isLocked />
                ))}
                <Pressable
                  style={({ pressed }) => [styles.joinBtn, { opacity: pressed ? 0.85 : 1 }]}
                  onPress={() => router.push("/(auth)/register")}
                >
                  <Text style={styles.joinBtnText}>Join to read member updates</Text>
                  <Feather name="arrow-right" size={16} color="#fff" />
                </Pressable>
              </>
            )}
          </>
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  header: {
    paddingHorizontal: 24,
    paddingBottom: 24,
    backgroundColor: Colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  headerTitle: {
    fontFamily: "Poppins_800ExtraBold",
    fontSize: 36,
    color: Colors.text,
  },
  headerSubtitle: {
    fontFamily: "Inter_400Regular",
    fontSize: 14,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  body: { padding: 20 },
  empty: {
    alignItems: "center",
    paddingVertical: 48,
    gap: 10,
  },
  emptyTitle: {
    fontFamily: "Inter_700Bold",
    fontSize: 16,
    color: Colors.textSecondary,
  },
  emptyText: {
    fontFamily: "Inter_400Regular",
    fontSize: 14,
    color: Colors.textMuted,
    textAlign: "center",
    paddingHorizontal: 20,
  },
  lockBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    backgroundColor: `${Colors.accent}15`,
    borderWidth: 1,
    borderColor: `${Colors.accent}40`,
    borderRadius: 14,
    padding: 14,
    marginBottom: 14,
  },
  lockBannerText: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 14,
    color: Colors.accent,
  },
  joinBtn: {
    backgroundColor: Colors.primary,
    borderRadius: 14,
    paddingVertical: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    marginTop: 8,
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  joinBtnText: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 15,
    color: "#fff",
  },
});
