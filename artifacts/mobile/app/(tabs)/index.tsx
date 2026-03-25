import React, { useMemo } from "react";
import {
  View,
  Text,
  ScrollView,
  Pressable,
  StyleSheet,
  ActivityIndicator,
  RefreshControl,
  Image,
  useWindowDimensions,
} from "react-native";
import { router } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useQuery } from "@tanstack/react-query";
import * as Haptics from "expo-haptics";
import { useColors } from "@/context/ThemeContext";
import { resolveImageUrl } from "@/constants/api";
import { useAuth } from "@/context/AuthContext";
import { listUpcomingEvents, listPosts, getAppSettings, Post } from "@/lib/api";
import { EventCard } from "@/components/EventCard";
import { PostCard } from "@/components/PostCard";
import { PostDetailModal } from "@/components/PostDetailModal";
import { VideoHero } from "@/components/VideoHero";
import { EliteBanner } from "@/components/EliteBanner";

export default function HomeScreen() {
  const insets = useSafeAreaInsets();
  const { width: screenWidth } = useWindowDimensions();
  const Colors = useColors();
  const styles = useMemo(() => makeStyles(Colors), [Colors]);
  const { user, isAuthenticated } = useAuth();
  const logoWidth = screenWidth * 0.77;
  const logoHeight = logoWidth * 0.3;

  const { data: events, isLoading: eventsLoading, refetch: refetchEvents } = useQuery({
    queryKey: ["upcoming-events"],
    queryFn: listUpcomingEvents,
  });

  const { data: posts, isLoading: postsLoading, refetch: refetchPosts } = useQuery({
    queryKey: ["posts"],
    queryFn: listPosts,
  });

  const { data: appSettings } = useQuery({
    queryKey: ["app-settings"],
    queryFn: getAppSettings,
    staleTime: 5 * 60 * 1000,
  });

  const homeVideoUrl = appSettings?.homeVideoUrl ?? null;

  const [selectedPost, setSelectedPost] = React.useState<Post | null>(null);
  const [refreshing, setRefreshing] = React.useState(false);
  const handleRefresh = async () => {
    setRefreshing(true);
    await Promise.all([refetchEvents(), refetchPosts()]);
    setRefreshing(false);
  };

  const publicPosts = posts?.filter(p => !p.isMembersOnly).slice(0, 3) ?? [];

  return (
    <>
    <ScrollView
      style={styles.screen}
      contentInsetAdjustmentBehavior="automatic"
      showsVerticalScrollIndicator={false}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={Colors.primary} />
      }
    >
      {/* Hero */}
      <LinearGradient
        colors={[Colors.primary, "#052A15"]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[styles.hero, { paddingTop: insets.top + 24 }]}
      >
        <View style={styles.heroTopRow}>
          <View style={styles.notifBtn} />
          <Image
            source={require("@/assets/images/tdc-logo.png")}
            style={{ width: logoWidth, height: logoHeight }}
            resizeMode="contain"
          />
          <Pressable
            style={styles.notifBtn}
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            }}
          >
            <Feather name="bell" size={20} color="#fff" />
          </Pressable>
        </View>

        <Text style={styles.heroTagline}>
          Come alone – Win together.
        </Text>

        <View style={styles.heroCTARow}>
          {isAuthenticated ? (
            <Pressable
              style={({ pressed }) => [styles.heroBtn, styles.heroBtnPrimary, { opacity: pressed ? 0.85 : 1 }]}
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                router.push("/(tabs)/member");
              }}
            >
              <Feather name="shield" size={16} color="#fff" />
              <Text style={styles.heroBtnPrimaryText}>Member Zone</Text>
            </Pressable>
          ) : (
            <Pressable
              style={({ pressed }) => [styles.heroBtn, styles.heroBtnPrimary, { opacity: pressed ? 0.85 : 1 }]}
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                router.push("/(auth)/register");
              }}
            >
              <Feather name="user-plus" size={16} color="#fff" />
              <Text style={styles.heroBtnPrimaryText}>Join Now</Text>
            </Pressable>
          )}
          <Pressable
            style={({ pressed }) => [styles.heroBtn, styles.heroBtnSecondary, { opacity: pressed ? 0.85 : 1 }]}
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              router.push("/(tabs)/tickets");
            }}
          >
            <Feather name="tag" size={16} color="#fff" />
            <Text style={styles.heroBtnSecondaryText}>Buy Tickets</Text>
          </Pressable>
        </View>
      </LinearGradient>

      {/* Hero Video — shown when admin has configured a video URL */}
      {homeVideoUrl ? <VideoHero uri={homeVideoUrl} /> : null}

      <View style={styles.body}>
        {/* Next Upcoming Event Banner */}
        {events && events.length > 0 && events[0].imageUrl ? (
          <Pressable
            style={styles.eventBanner}
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              router.push("/(tabs)/tickets");
            }}
          >
            <Image source={{ uri: resolveImageUrl(events[0].imageUrl) ?? events[0].imageUrl }} style={styles.eventBannerImage} resizeMode="cover" />
            <LinearGradient
              colors={["transparent", "rgba(0,0,0,0.72)"]}
              style={styles.eventBannerOverlay}
            >
              <Text style={styles.eventBannerTitle} numberOfLines={2}>{events[0].title}</Text>
              <Text style={styles.eventBannerDate}>
                {new Date(events[0].date).toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" })}
              </Text>
            </LinearGradient>
          </Pressable>
        ) : null}

        {/* Upcoming Events */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Upcoming Events</Text>
            <Pressable onPress={() => router.push("/(tabs)/tickets")}>
              <Text style={styles.seeAll}>See All</Text>
            </Pressable>
          </View>
          {eventsLoading ? (
            <ActivityIndicator color={Colors.primary} style={{ marginTop: 16 }} />
          ) : events && events.length > 0 ? (
            events.slice(0, 3).map(event => (
              <EventCard
                key={event.id}
                event={event}
                compact
                onPress={() => router.push("/(tabs)/tickets")}
              />
            ))
          ) : (
            <View style={styles.empty}>
              <Feather name="calendar" size={32} color={Colors.textMuted} />
              <Text style={styles.emptyText}>No upcoming events yet</Text>
            </View>
          )}
        </View>

        {/* Go Elite Banner */}
        <EliteBanner isElite={user?.isElite ?? false} isAuthenticated={isAuthenticated} />

        {/* Latest Updates */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Latest Updates</Text>
            <Pressable onPress={() => router.push("/(tabs)/updates")}>
              <Text style={styles.seeAll}>See All</Text>
            </Pressable>
          </View>
          {postsLoading ? (
            <ActivityIndicator color={Colors.primary} style={{ marginTop: 16 }} />
          ) : publicPosts.length > 0 ? (
            publicPosts.map(post => (
              <PostCard
                key={post.id}
                post={post}
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  setSelectedPost(post);
                }}
              />
            ))
          ) : (
            <View style={styles.empty}>
              <Feather name="message-square" size={32} color={Colors.textMuted} />
              <Text style={styles.emptyText}>No updates yet</Text>
            </View>
          )}
        </View>

      </View>
    </ScrollView>

    {selectedPost && (
      <PostDetailModal post={selectedPost} onClose={() => setSelectedPost(null)} />
    )}
  </>
  );
}

function makeStyles(Colors: ReturnType<typeof useColors>) {
  return StyleSheet.create({
    screen: {
      flex: 1,
      backgroundColor: Colors.background,
    },
    hero: {
      paddingHorizontal: 24,
      paddingBottom: 32,
    },
    heroTopRow: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      marginBottom: 20,
    },
    notifBtn: {
      width: 40,
      height: 40,
      borderRadius: 20,
      backgroundColor: "rgba(255,255,255,0.15)",
      alignItems: "center",
      justifyContent: "center",
    },
    heroTagline: {
      fontFamily: "Inter_400Regular",
      fontSize: 15,
      color: "rgba(255,255,255,0.85)",
      marginBottom: 24,
      lineHeight: 22,
      maxWidth: 260,
    },
    heroCTARow: {
      flexDirection: "row",
      gap: 12,
    },
    heroBtn: {
      flexDirection: "row",
      alignItems: "center",
      gap: 8,
      paddingHorizontal: 18,
      paddingVertical: 12,
      borderRadius: 12,
    },
    heroBtnPrimary: {
      backgroundColor: "rgba(255,255,255,0.2)",
      borderWidth: 1,
      borderColor: "rgba(255,255,255,0.4)",
    },
    heroBtnPrimaryText: {
      fontFamily: "Inter_600SemiBold",
      fontSize: 14,
      color: "#fff",
    },
    heroBtnSecondary: {
      backgroundColor: "rgba(255,255,255,0.1)",
      borderWidth: 1,
      borderColor: "rgba(255,255,255,0.25)",
    },
    heroBtnSecondaryText: {
      fontFamily: "Inter_600SemiBold",
      fontSize: 14,
      color: "#fff",
    },
    body: { padding: 20, gap: 8 },
    section: { marginBottom: 28 },
    sectionHeader: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      marginBottom: 14,
    },
    sectionTitle: {
      fontFamily: "Poppins_800ExtraBold",
      fontSize: 20,
      color: Colors.text,
    },
    seeAll: {
      fontFamily: "Inter_600SemiBold",
      fontSize: 13,
      color: Colors.primary,
    },
    eventBanner: {
      borderRadius: 16,
      overflow: "hidden",
      marginBottom: 20,
      height: 200,
    },
    eventBannerImage: {
      width: "100%",
      height: "100%",
    },
    eventBannerOverlay: {
      position: "absolute",
      left: 0,
      right: 0,
      bottom: 0,
      padding: 16,
      paddingTop: 40,
    },
    eventBannerTitle: {
      fontFamily: "Poppins_800ExtraBold",
      fontSize: 18,
      color: "#fff",
      lineHeight: 24,
    },
    eventBannerDate: {
      fontFamily: "Inter_600SemiBold",
      fontSize: 13,
      color: "rgba(255,255,255,0.85)",
      marginTop: 4,
    },
    empty: {
      alignItems: "center",
      padding: 32,
      gap: 10,
    },
    emptyText: {
      fontFamily: "Inter_400Regular",
      fontSize: 14,
      color: Colors.textMuted,
    },
  });
}
