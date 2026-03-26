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
import * as WebBrowser from "expo-web-browser";
import { router } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useQuery } from "@tanstack/react-query";
import * as Haptics from "expo-haptics";
import { useColors } from "@/context/ThemeContext";
import { resolveImageUrl } from "@/constants/api";
import { useAuth } from "@/context/AuthContext";
import {
  listUpcomingEvents, listPosts, getAppSettings, getMyRank, getActivity, listMerch,
  Post, ActivityItem, MerchProduct,
} from "@/lib/api";
import { EventCard } from "@/components/EventCard";
import { PostCard } from "@/components/PostCard";
import { PostDetailModal } from "@/components/PostDetailModal";
import { VideoHero } from "@/components/VideoHero";
import { EliteBanner } from "@/components/EliteBanner";


/* ── Level constants ── */
const LEVEL_THRESHOLDS = [0, 300, 800, 1600, 2500, 5000, 10000, 20000, 40000, 80000];
const LEVEL_NAMES = ["Beginner", "Developing", "Experienced", "Skilled", "Advanced", "Pro", "League", "Expert", "Master", "Icon"];

function getLevelProgress(xp: number, level: number) {
  const threshCurrent = LEVEL_THRESHOLDS[level - 1] ?? 0;
  const threshNext = LEVEL_THRESHOLDS[level];
  if (!threshNext) return { pct: 1, xpInLevel: 0, xpNeeded: 0, nextLevelName: "Max", isMax: true };
  const xpInLevel = xp - threshCurrent;
  const xpNeeded = threshNext - threshCurrent;
  return { pct: Math.min(xpInLevel / xpNeeded, 1), xpInLevel, xpNeeded, nextLevelName: LEVEL_NAMES[level] ?? "Max", isMax: false };
}

function getCountdown(dateStr: string): string | null {
  const diff = new Date(dateStr).getTime() - Date.now();
  if (diff <= 0 || diff > 30 * 86400000) return null;
  const d = Math.floor(diff / 86400000);
  const h = Math.floor((diff % 86400000) / 3600000);
  const m = Math.floor((diff % 3600000) / 60000);
  if (d > 0) return `${d}d ${h}h`;
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m`;
}

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 2) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 7) return `${days}d ago`;
  return `${Math.floor(days / 7)}w ago`;
}

export default function HomeScreen() {
  const insets = useSafeAreaInsets();
  const { width: screenWidth } = useWindowDimensions();
  const Colors = useColors();
  const styles = useMemo(() => makeStyles(Colors), [Colors]);
  const { user, isAuthenticated } = useAuth();
  const logoHeight = screenWidth * 0.084 * 1.2;

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

  const { data: rank, refetch: refetchRank } = useQuery({
    queryKey: ["my-rank"],
    queryFn: getMyRank,
    enabled: isAuthenticated,
    staleTime: 2 * 60 * 1000,
  });

  const { data: activityItems, refetch: refetchActivity } = useQuery({
    queryKey: ["activity"],
    queryFn: getActivity,
    staleTime: 2 * 60 * 1000,
  });

  const { data: merch } = useQuery({
    queryKey: ["merch"],
    queryFn: listMerch,
    staleTime: 10 * 60 * 1000,
  });

  const homeVideoUrl = appSettings?.homeVideoUrl ?? null;

  const [selectedPost, setSelectedPost] = React.useState<Post | null>(null);
  const [refreshing, setRefreshing] = React.useState(false);
  const handleRefresh = async () => {
    setRefreshing(true);
    await Promise.all([refetchEvents(), refetchPosts(), refetchRank(), refetchActivity()]);
    setRefreshing(false);
  };

  const publicPosts = posts?.filter(p => !p.isMembersOnly).slice(0, 3) ?? [];
  const nextEvent = events?.[0] ?? null;
  const isNewMember = isAuthenticated && (user?.eventsAttended ?? 0) === 0;

  /* ── XP progress for logged-in user ── */
  const xpProgress = user ? getLevelProgress(user.xp ?? 0, user.level ?? 1) : null;
  const levelName = user ? (LEVEL_NAMES[(user.level ?? 1) - 1] ?? "Rookie") : null;

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
        colors={["#074A24", "#021409"]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[styles.hero, { paddingTop: insets.top + 24 }]}
      >
        <View style={styles.heroTopRow}>
          <View style={{ flex: 1, alignItems: "flex-start" }}>
            <Image
              source={require("@/assets/images/tdc-logo.png")}
              style={{ height: logoHeight, width: screenWidth * 0.63 * 1.2, marginLeft: -52 }}
              resizeMode="contain"
            />
          </View>
        </View>

        <Text style={styles.heroTagline}>
          Come alone. Win together.
        </Text>

        {/* ── Feature 1: XP Progress Bar — players only ── */}
        {isAuthenticated && user && xpProgress && user.accountType !== "supporter" && (
          <View style={styles.xpSection}>
            <View style={styles.xpTopRow}>
              <Text style={styles.xpSectionLabel}>Your Progress</Text>
              {/* ── Feature 3: Rank chip ── */}
              {rank?.xpRank && (
                <Pressable
                  style={styles.rankChip}
                  onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); router.push("/(tabs)/community"); }}
                >
                  <Feather name="zap" size={11} color="#FFC107" />
                  <Text style={styles.rankChipText}>#{rank.xpRank} of {rank.totalMembers}</Text>
                </Pressable>
              )}
            </View>
            <View style={styles.xpLevelRow}>
              <Text style={styles.xpLevelName}>{levelName}</Text>
              <Text style={styles.xpValue}>{(user.xp ?? 0).toLocaleString()} XP</Text>
            </View>
            <View style={styles.xpBarBg}>
              <View style={[styles.xpBarFill, { width: `${Math.round(xpProgress.pct * 100)}%` as any }]} />
            </View>
            <Text style={styles.xpHint}>
              {xpProgress.isMax
                ? "Maximum level reached 🏆"
                : `${(xpProgress.xpNeeded - xpProgress.xpInLevel).toLocaleString()} XP needed to reach ${xpProgress.nextLevelName}`}
            </Text>
          </View>
        )}

        <View style={styles.heroCTARow}>
          <Pressable
            style={({ pressed }) => [styles.heroBtn, styles.heroBtnSecondary, { opacity: pressed ? 0.85 : 1 }]}
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              router.push("/(tabs)/tickets");
            }}
          >
            <Feather name="tag" size={13} color="#0D0D0D" />
            <Text style={styles.heroBtnSecondaryText}>Get Tickets</Text>
          </Pressable>
          {user?.accountType !== "supporter" && (
            <Pressable
              style={({ pressed }) => [
                styles.heroBtn,
                user?.isElite ? styles.heroBtnEliteActive : styles.heroBtnElite,
                { opacity: pressed ? 0.85 : 1 },
              ]}
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                router.push("/elite");
              }}
            >
              <Text style={{ fontSize: 12, lineHeight: 14 }}>⚡</Text>
              <Text style={user?.isElite ? styles.heroBtnEliteActiveText : styles.heroBtnEliteText}>
                {user?.isElite ? "You're Elite" : "Go Elite"}
              </Text>
            </Pressable>
          )}
        </View>
      </LinearGradient>

      {/* Hero Video — shown when admin has configured a video URL */}
      {homeVideoUrl ? <VideoHero uri={homeVideoUrl} /> : null}

      <View style={styles.body}>

        {/* Next Upcoming Event Banner — guests only */}
        {!isAuthenticated && nextEvent && (
          nextEvent.imageUrl ? (
            /* Full image banner */
            <Pressable
              style={styles.eventBanner}
              onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); router.push("/(tabs)/tickets"); }}
            >
              <Image source={{ uri: resolveImageUrl(nextEvent.imageUrl) ?? nextEvent.imageUrl }} style={styles.eventBannerImage} resizeMode="cover" />
              <LinearGradient
                colors={["transparent", "rgba(0,0,0,0.72)"]}
                style={styles.eventBannerOverlay}
              >
                <Text style={styles.eventBannerTitle} numberOfLines={2}>{nextEvent.title}</Text>
                <Text style={styles.eventBannerDate}>
                  {new Date(nextEvent.date).toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" })}
                </Text>
              </LinearGradient>
            </Pressable>
          ) : (
            /* Text-only card when no image is set */
            <Pressable
              style={styles.eventTextCard}
              onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); router.push("/(tabs)/tickets"); }}
            >
              <Feather name="calendar" size={18} color={Colors.primary} style={{ marginRight: 12 }} />
              <View style={{ flex: 1 }}>
                <Text style={styles.eventTextCardTitle} numberOfLines={1}>{nextEvent.title}</Text>
                <Text style={styles.eventTextCardDate}>
                  {new Date(nextEvent.date).toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" })}
                </Text>
              </View>
              <Feather name="chevron-right" size={16} color={Colors.textMuted} />
            </Pressable>
          )
        )}

        {/* ── Play Dodge game card ── */}
        <Pressable
          style={({ pressed }) => [styles.gameCard, { opacity: pressed ? 0.88 : 1 }]}
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
            router.push("/games/dodge");
          }}
        >
          <LinearGradient
            colors={["#0a3d1f", "#051a0d"]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.gameCardGradient}
          >
            <View style={styles.gameCardLeft}>
              <Text style={styles.gameCardEmoji}>🏐</Text>
            </View>
            <View style={styles.gameCardBody}>
              <Text style={styles.gameCardTitle}>DAILY DODGE</Text>
              <Text style={styles.gameCardSub}>Play today's game — earn up to +50 XP</Text>
            </View>
            <View style={styles.gameCardArrow}>
              <Feather name="play-circle" size={28} color="#FFC107" />
            </View>
          </LinearGradient>
        </Pressable>

        {/* ── Getting Started card — new members only ── */}
        {isNewMember && (
          <Pressable
            style={({ pressed }) => [styles.gettingStartedCard, { opacity: pressed ? 0.88 : 1 }]}
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              router.push("/(tabs)/tickets");
            }}
          >
            <Feather name="zap" size={20} color={Colors.primary} />
            <View style={{ flex: 1, marginLeft: 12 }}>
              <Text style={styles.gettingStartedTitle}>Welcome to The Dodge Club!</Text>
              <Text style={styles.gettingStartedText}>Register for your first event to earn XP and unlock achievements.</Text>
            </View>
            <Feather name="chevron-right" size={18} color={Colors.primary} />
          </Pressable>
        )}

        {/* Upcoming Events — excludes the featured banner event */}
        {(() => {
          // Authenticated users see all events; guests already have the featured banner so exclude it
          const displayEvents = events
            ? (isAuthenticated ? events.slice(0, 3) : events.filter(e => e.id !== nextEvent?.id).slice(0, 3))
            : [];
          const sectionTitle = isAuthenticated ? "Upcoming Events" : "More Events";
          if (eventsLoading) {
            return (
              <View style={styles.section}>
                <ActivityIndicator color={Colors.primary} style={{ marginTop: 8 }} />
              </View>
            );
          }
          if (!events || events.length === 0) {
            return (
              <View style={styles.section}>
                <View style={styles.sectionHeader}>
                  <Text style={styles.sectionTitle}>Upcoming Events</Text>
                </View>
                <View style={styles.empty}>
                  <Feather name="calendar" size={32} color={Colors.textMuted} />
                  <Text style={styles.emptyText}>No upcoming events yet</Text>
                </View>
              </View>
            );
          }
          if (displayEvents.length === 0) return null;
          return (
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>{sectionTitle}</Text>
                <Pressable onPress={() => router.push("/(tabs)/tickets")}>
                  <Text style={styles.seeAll}>See All</Text>
                </Pressable>
              </View>
              {displayEvents.map(event => (
                <EventCard
                  key={event.id}
                  event={event}
                  compact
                  onPress={() => router.push("/(tabs)/tickets")}
                />
              ))}
            </View>
          );
        })()}

        {/* ── Club Shop row ── */}
        {merch && merch.length > 0 && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Club Shop</Text>
              <Pressable onPress={() => router.push("/(tabs)/merch")}>
                <Text style={styles.seeAll}>Shop All</Text>
              </Pressable>
            </View>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.merchRow}
            >
              {merch.slice(0, 6).map(item => (
                <Pressable
                  key={item.id}
                  style={({ pressed }) => [styles.merchCard, { opacity: pressed ? 0.82 : 1 }]}
                  onPress={() => {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    if (item.buyUrl) WebBrowser.openBrowserAsync(item.buyUrl);
                  }}
                >
                  <View style={styles.merchCardImage}>
                    {resolveImageUrl(item.imageUrl) ? (
                      <Image
                        source={{ uri: resolveImageUrl(item.imageUrl)! }}
                        style={StyleSheet.absoluteFill}
                        resizeMode="cover"
                      />
                    ) : (
                      <Feather name="shopping-bag" size={22} color={Colors.textMuted} />
                    )}
                    {!item.inStock && (
                      <View style={styles.soldOutBadge}>
                        <Text style={styles.soldOutText}>SOLD OUT</Text>
                      </View>
                    )}
                  </View>
                  <Text style={styles.merchCardName} numberOfLines={2}>{item.name}</Text>
                  {item.price != null && (
                    <Text style={styles.merchCardPrice}>£{Number(item.price).toFixed(2)}</Text>
                  )}
                </Pressable>
              ))}
            </ScrollView>
          </View>
        )}

        {/* Go Elite Banner — players only */}
        {user?.accountType !== "supporter" && (
          <EliteBanner isElite={user?.isElite ?? false} isAuthenticated={isAuthenticated} />
        )}

        {/* ── Feature 5: Community Pulse ── */}
        {activityItems && activityItems.length > 0 && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Community Pulse</Text>
            </View>
            <View style={styles.pulseCard}>
              {activityItems.slice(0, 5).map((item: ActivityItem, idx: number) => (
                <View key={item.id}>
                  {idx > 0 && <View style={styles.pulseDivider} />}
                  <View style={styles.pulseRow}>
                    <View style={styles.pulseAvatarWrap}>
                      {item.userAvatar ? (
                        <Image
                          source={{ uri: resolveImageUrl(item.userAvatar) ?? item.userAvatar }}
                          style={styles.pulseAvatar}
                        />
                      ) : (
                        <View style={[styles.pulseAvatar, styles.pulseAvatarFallback]}>
                          <Text style={styles.pulseAvatarInitial}>{item.userName.charAt(0).toUpperCase()}</Text>
                        </View>
                      )}
                    </View>
                    <Text style={styles.pulseText} numberOfLines={2}>{item.text}</Text>
                    <Text style={styles.pulseTime}>{timeAgo(item.timestamp)}</Text>
                  </View>
                </View>
              ))}
            </View>
          </View>
        )}

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
    heroTagline: {
      fontFamily: "Inter_600SemiBold",
      fontSize: 15,
      color: "#FFC107",
      marginBottom: 16,
      lineHeight: 22,
      maxWidth: 260,
    },
    /* ── XP Progress ── */
    xpSection: {
      marginBottom: 20,
      backgroundColor: "rgba(255,255,255,0.07)",
      borderRadius: 12,
      padding: 12,
      borderWidth: 1,
      borderColor: "rgba(255,255,255,0.12)",
    },
    xpTopRow: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      marginBottom: 6,
    },
    xpSectionLabel: {
      fontFamily: "Inter_600SemiBold",
      fontSize: 11,
      color: "rgba(255,255,255,0.55)",
      textTransform: "uppercase",
      letterSpacing: 0.8,
    },
    xpLevelRow: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "baseline",
      marginBottom: 8,
    },
    xpLevelName: {
      fontFamily: "Poppins_800ExtraBold",
      fontSize: 15,
      color: "#FFC107",
      lineHeight: 20,
    },
    xpValue: {
      fontFamily: "Inter_600SemiBold",
      fontSize: 12,
      color: "rgba(255,255,255,0.7)",
    },
    rankChip: {
      flexDirection: "row",
      alignItems: "center",
      gap: 4,
      backgroundColor: "rgba(255,193,7,0.15)",
      borderRadius: 20,
      paddingHorizontal: 10,
      paddingVertical: 4,
      borderWidth: 1,
      borderColor: "rgba(255,193,7,0.3)",
    },
    rankChipText: {
      fontFamily: "Inter_600SemiBold",
      fontSize: 11,
      color: "#FFC107",
    },
    xpBarBg: {
      height: 5,
      borderRadius: 3,
      backgroundColor: "rgba(255,255,255,0.15)",
      marginBottom: 6,
      overflow: "hidden",
    },
    xpBarFill: {
      height: "100%",
      borderRadius: 3,
      backgroundColor: "#1A8C4E",
    },
    xpHint: {
      fontFamily: "Inter_400Regular",
      fontSize: 10,
      color: "rgba(255,255,255,0.5)",
    },
    /* ── Hero CTAs ── */
    heroCTARow: {
      flexDirection: "row",
      gap: 10,
    },
    heroBtn: {
      flexDirection: "row",
      alignItems: "center",
      gap: 6,
      paddingHorizontal: 14,
      paddingVertical: 10,
      borderRadius: 10,
    },
    heroBtnPrimary: {
      backgroundColor: "rgba(255,255,255,0.2)",
      borderWidth: 1,
      borderColor: "rgba(255,255,255,0.4)",
    },
    heroBtnPrimaryText: {
      fontFamily: "Inter_600SemiBold",
      fontSize: 11,
      color: "#fff",
    },
    heroBtnSecondary: {
      backgroundColor: "#FFC107",
      borderWidth: 0,
    },
    heroBtnSecondaryText: {
      fontFamily: "Inter_600SemiBold",
      fontSize: 11,
      color: "#0D0D0D",
    },
    heroBtnElite: {
      backgroundColor: "rgba(255,255,255,0.15)",
      borderWidth: 1,
      borderColor: "rgba(255,193,7,0.6)",
    },
    heroBtnEliteText: {
      fontFamily: "Inter_600SemiBold",
      fontSize: 11,
      color: "#FFC107",
    },
    heroBtnEliteActive: {
      backgroundColor: "rgba(255,193,7,0.18)",
      borderWidth: 1,
      borderColor: "rgba(255,193,7,0.5)",
    },
    heroBtnEliteActiveText: {
      fontFamily: "Inter_600SemiBold",
      fontSize: 11,
      color: "#FFD54F",
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
    /* ── Event Banner + Countdown ── */
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
    countdownChip: {
      position: "absolute",
      top: 12,
      right: 12,
      flexDirection: "row",
      alignItems: "center",
      gap: 4,
      backgroundColor: "rgba(0,0,0,0.65)",
      borderRadius: 20,
      paddingHorizontal: 10,
      paddingVertical: 5,
      borderWidth: 1,
      borderColor: "rgba(255,193,7,0.5)",
    },
    countdownChipInline: {
      flexDirection: "row",
      alignItems: "center",
      gap: 4,
      backgroundColor: "rgba(255,193,7,0.12)",
      borderRadius: 20,
      paddingHorizontal: 10,
      paddingVertical: 5,
      borderWidth: 1,
      borderColor: "rgba(255,193,7,0.4)",
    },
    countdownText: {
      fontFamily: "Inter_600SemiBold",
      fontSize: 11,
      color: "#FFC107",
    },
    /* ── Text-only event card ── */
    eventTextCard: {
      flexDirection: "row",
      alignItems: "center",
      backgroundColor: Colors.card,
      borderRadius: 14,
      borderWidth: 1,
      borderColor: Colors.border,
      padding: 16,
      marginBottom: 20,
    },
    eventTextCardTitle: {
      fontFamily: "Poppins_800ExtraBold",
      fontSize: 15,
      color: Colors.text,
      lineHeight: 20,
    },
    eventTextCardDate: {
      fontFamily: "Inter_400Regular",
      fontSize: 12,
      color: Colors.textMuted,
      marginTop: 2,
    },
    /* ── Game Card ── */
    gameCard: {
      borderRadius: 16,
      overflow: "hidden",
      marginBottom: 16,
      borderWidth: 1,
      borderColor: "rgba(26,140,78,0.4)",
    },
    gameCardGradient: {
      flexDirection: "row",
      alignItems: "center",
      paddingVertical: 18,
      paddingHorizontal: 18,
      gap: 14,
    },
    gameCardLeft: {
      width: 44,
      height: 44,
      borderRadius: 22,
      backgroundColor: "rgba(255,193,7,0.12)",
      alignItems: "center",
      justifyContent: "center",
    },
    gameCardEmoji: { fontSize: 24 },
    gameCardBody: { flex: 1 },
    gameCardTitle: {
      fontFamily: "Poppins_800ExtraBold",
      fontSize: 15,
      color: "#FFC107",
      letterSpacing: 0.6,
    },
    gameCardSub: {
      fontFamily: "Inter_400Regular",
      fontSize: 12,
      color: "rgba(255,255,255,0.65)",
      marginTop: 2,
    },
    gameCardArrow: {},
    /* ── Getting Started Card ── */
    gettingStartedCard: {
      flexDirection: "row",
      alignItems: "center",
      backgroundColor: Colors.card,
      borderRadius: 14,
      borderWidth: 1,
      borderColor: Colors.primary + "40",
      padding: 16,
      marginBottom: 16,
      gap: 4,
    },
    gettingStartedTitle: {
      fontFamily: "Inter_600SemiBold",
      fontSize: 14,
      color: Colors.text,
      marginBottom: 2,
    },
    gettingStartedText: {
      fontFamily: "Inter_400Regular",
      fontSize: 12,
      color: Colors.textMuted,
      lineHeight: 17,
    },
    /* ── Merch Row ── */
    merchRow: {
      gap: 12,
      paddingRight: 4,
    },
    merchCard: {
      width: 120,
      backgroundColor: Colors.card,
      borderRadius: 14,
      borderWidth: 1,
      borderColor: Colors.border,
      overflow: "hidden",
    },
    merchCardImage: {
      width: "100%",
      height: 100,
      backgroundColor: Colors.surface,
      alignItems: "center",
      justifyContent: "center",
      overflow: "hidden",
      position: "relative",
    },
    soldOutBadge: {
      position: "absolute",
      bottom: 6,
      left: 6,
      backgroundColor: "rgba(0,0,0,0.72)",
      borderRadius: 4,
      paddingHorizontal: 6,
      paddingVertical: 2,
    },
    soldOutText: {
      fontFamily: "Inter_600SemiBold",
      fontSize: 8,
      color: "#fff",
      letterSpacing: 0.5,
    },
    merchCardName: {
      fontFamily: "Inter_600SemiBold",
      fontSize: 11,
      color: Colors.text,
      paddingHorizontal: 8,
      paddingTop: 8,
      paddingBottom: 2,
      lineHeight: 15,
    },
    merchCardPrice: {
      fontFamily: "Inter_400Regular",
      fontSize: 11,
      color: Colors.textMuted,
      paddingHorizontal: 8,
      paddingBottom: 10,
    },
    /* ── Community Pulse ── */
    pulseCard: {
      backgroundColor: Colors.card,
      borderRadius: 14,
      borderWidth: 1,
      borderColor: Colors.border,
      overflow: "hidden",
    },
    pulseRow: {
      flexDirection: "row",
      alignItems: "center",
      paddingHorizontal: 14,
      paddingVertical: 10,
      gap: 10,
    },
    pulseDivider: {
      height: 1,
      backgroundColor: Colors.border,
      marginLeft: 52,
    },
    pulseAvatarWrap: {
      width: 32,
      height: 32,
    },
    pulseAvatar: {
      width: 32,
      height: 32,
      borderRadius: 16,
    },
    pulseAvatarFallback: {
      backgroundColor: Colors.primary + "33",
      alignItems: "center",
      justifyContent: "center",
    },
    pulseAvatarInitial: {
      fontFamily: "Poppins_800ExtraBold",
      fontSize: 13,
      color: Colors.primary,
    },
    pulseText: {
      flex: 1,
      fontFamily: "Inter_400Regular",
      fontSize: 13,
      color: Colors.text,
      lineHeight: 18,
    },
    pulseTime: {
      fontFamily: "Inter_400Regular",
      fontSize: 11,
      color: Colors.textMuted,
    },
    /* ── Empty states ── */
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
