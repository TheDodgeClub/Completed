import React, { useMemo, useState, useEffect, useCallback, useRef } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
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
  Animated,
} from "react-native";
import * as WebBrowser from "expo-web-browser";
import { router, useFocusEffect } from "expo-router";
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
  Post, ActivityItem, MerchProduct, MemberSummary,
} from "@/lib/api";
import { EventCard } from "@/components/EventCard";
import { PostCard } from "@/components/PostCard";
import { PostDetailModal } from "@/components/PostDetailModal";
import { VideoHero } from "@/components/VideoHero";
import { MemberProfileModal } from "@/components/MemberProfileModal";

/* ── Supporter tier constants ── */
const SUPPORTER_TIERS = [
  { name: "Club Friend",  emoji: "🤝", minXp: 0,    perk: "Welcome to The Dodge Club!" },
  { name: "Die Hard",     emoji: "🔥", minXp: 150,  perk: "Shoutout at events" },
  { name: "Club Legend",  emoji: "⭐", minXp: 500,  perk: "VIP supporter status" },
  { name: "Superfan",     emoji: "🏆", minXp: 1000, perk: "Name on the club wall" },
] as const;
function getSupporterProgress(xp: number) {
  let tierIdx = 0;
  for (let i = 0; i < SUPPORTER_TIERS.length; i++) { if (xp >= SUPPORTER_TIERS[i].minXp) tierIdx = i; }
  const current = SUPPORTER_TIERS[tierIdx];
  const next = SUPPORTER_TIERS[tierIdx + 1] ?? null;
  const isMax = next === null;
  const start = current.minXp;
  const end = next?.minXp ?? start;
  const progress = isMax ? 1 : Math.min(1, Math.max(0, (xp - start) / (end - start)));
  const xpToNext = isMax ? 0 : end - xp;
  return { current, next, isMax, progress, xpToNext };
}

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
  if (diff <= 0 || diff > 60 * 86400000) return null;
  const d = Math.floor(diff / 86400000);
  const h = Math.floor((diff % 86400000) / 3600000);
  const m = Math.floor((diff % 3600000) / 60000);
  if (d >= 2) return `${d} days till next event`;
  if (d === 1) return "Tomorrow";
  if (h >= 1) return `${h}h till next event`;
  if (m >= 1) return `${m} mins away`;
  return "Starting soon!";
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
  const { user, isAuthenticated, refreshUser } = useAuth();
  const logoHeight = screenWidth * 0.084 * 1.2;

  const ONBOARD_KEY = user ? `supporter_onboarding_collapsed_${user.id}` : null;
  const [onboardCollapsed, setOnboardCollapsed] = useState(false);
  useEffect(() => {
    if (!ONBOARD_KEY || user?.accountType !== "supporter") return;
    AsyncStorage.getItem(ONBOARD_KEY).then(val => { setOnboardCollapsed(val === "1"); });
  }, [ONBOARD_KEY, user?.accountType]);
  const toggleOnboarding = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const next = !onboardCollapsed;
    setOnboardCollapsed(next);
    if (ONBOARD_KEY) await AsyncStorage.setItem(ONBOARD_KEY, next ? "1" : "0");
  };

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
    staleTime: 30 * 1000,
    refetchInterval: 30 * 1000,
  });

  const { data: merch } = useQuery({
    queryKey: ["merch"],
    queryFn: listMerch,
    staleTime: 10 * 60 * 1000,
  });

  const homeVideoUrl = appSettings?.homeVideoUrl ?? null;

  const [selectedPost, setSelectedPost] = React.useState<Post | null>(null);
  const [selectedPulseMember, setSelectedPulseMember] = React.useState<MemberSummary | null>(null);
  const [refreshing, setRefreshing] = React.useState(false);
  const handleRefresh = async () => {
    setRefreshing(true);
    await Promise.all([refetchEvents(), refetchPosts(), refetchRank(), refetchActivity(), refreshUser()]);
    setRefreshing(false);
  };

  /* ── XP progress (declared here so hooks below can reference it safely) ── */
  const xpProgress = user ? getLevelProgress(user.xp ?? 0, user.level ?? 1) : null;
  const levelName = user ? (LEVEL_NAMES[(user.level ?? 1) - 1] ?? "Rookie") : null;

  /* ── Animated XP bars ── */
  const xpBarAnim = useRef(new Animated.Value(0)).current;
  const supporterBarAnim = useRef(new Animated.Value(0)).current;
  const xpTargetRef = useRef(0);
  const supporterTargetRef = useRef(0);
  useEffect(() => {
    const pct = xpProgress?.pct ?? 0;
    xpTargetRef.current = pct;
    // Re-animate whenever XP data arrives or changes (handles load-after-focus race condition)
    xpBarAnim.setValue(0);
    Animated.timing(xpBarAnim, { toValue: pct, duration: 1200, useNativeDriver: false }).start();
  }, [xpProgress?.pct]);

  useEffect(() => {
    if (user?.accountType === "supporter") {
      const pct = getSupporterProgress(user.xp ?? 0).progress;
      supporterTargetRef.current = pct;
      supporterBarAnim.setValue(0);
      Animated.timing(supporterBarAnim, { toValue: pct, duration: 1200, useNativeDriver: false }).start();
    }
  }, [user?.xp, user?.accountType]);

  useFocusEffect(
    useCallback(() => {
      // Refresh user data so XP is always up to date when returning to home
      refreshUser();

      // Animate to whatever the latest known target is when re-entering the screen
      xpBarAnim.setValue(0);
      supporterBarAnim.setValue(0);
      Animated.timing(xpBarAnim, { toValue: xpTargetRef.current, duration: 1200, useNativeDriver: false }).start();
      Animated.timing(supporterBarAnim, { toValue: supporterTargetRef.current, duration: 1200, useNativeDriver: false }).start();

    }, [xpBarAnim, supporterBarAnim, refreshUser])
  );

  const publicPosts = posts?.filter(p => !p.isMembersOnly).slice(0, 3) ?? [];
  const nextEvent = events?.[0] ?? null;
  const nextEventCountdown = nextEvent ? getCountdown(nextEvent.date) : null;

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
              <Animated.View style={[styles.xpBarFill, {
                width: xpBarAnim.interpolate({ inputRange: [0, 1], outputRange: ["0%", "100%"] }),
              }]} />
            </View>
            <Text style={styles.xpHint}>
              {xpProgress.isMax
                ? "Maximum level reached 🏆"
                : `${(xpProgress.xpNeeded - xpProgress.xpInLevel).toLocaleString()} XP needed to reach ${xpProgress.nextLevelName}`}
            </Text>
          </View>
        )}

        {/* ── Supporter Journey Bar — in hero, matching member progress position ── */}
        {isAuthenticated && user?.accountType === "supporter" && (() => {
          const sp = getSupporterProgress(user.xp ?? 0);
          return (
            <View style={styles.xpSection}>
              <View style={styles.xpTopRow}>
                <Text style={styles.xpSectionLabel}>Supporter Journey</Text>
                <Text style={styles.xpValue}>{(user.xp ?? 0).toLocaleString()} XP</Text>
              </View>
              <View style={styles.xpLevelRow}>
                <Text style={styles.xpLevelName}>{sp.current.emoji} {sp.current.name}</Text>
              </View>
              <View style={styles.xpBarBg}>
                <Animated.View style={[styles.xpBarFill, {
                  width: supporterBarAnim.interpolate({ inputRange: [0, 1], outputRange: ["0%", "100%"] }),
                }]} />
              </View>
              <Text style={styles.xpHint}>
                {sp.isMax
                  ? "Superfan status reached 🏆 You're a club legend!"
                  : `${sp.xpToNext} XP to unlock ${sp.next!.emoji} ${sp.next!.name} — ${sp.next!.perk}`}
              </Text>
            </View>
          );
        })()}

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

        </View>
      </LinearGradient>

      {/* Hero Video — shown when admin has configured a video URL */}
      {homeVideoUrl ? <VideoHero uri={homeVideoUrl} /> : null}

      <View style={styles.body}>

        {/* ── Supporter Onboarding Card ── */}
        {isAuthenticated && user?.accountType === "supporter" && (
          <View style={styles.onboardCard}>
            <Pressable
              style={[styles.onboardCardHeader, onboardCollapsed && { borderBottomWidth: 0 }]}
              onPress={toggleOnboarding}
            >
              <View style={{ flex: 1 }}>
                <Text style={styles.onboardCardTitle}>Welcome to The Dodge Club 👋</Text>
                <Text style={styles.onboardCardSub}>Here's how to get started as a supporter</Text>
              </View>
              <Feather
                name={onboardCollapsed ? "chevron-down" : "chevron-up"}
                size={18}
                color={Colors.textMuted}
              />
            </Pressable>
            {!onboardCollapsed && (
              <>
                <Pressable
                  style={({ pressed }) => [styles.onboardStep, { opacity: pressed ? 0.85 : 1 }]}
                  onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); router.push("/(tabs)/tickets"); }}
                >
                  <View style={styles.onboardBadge}><Text style={styles.onboardBadgeText}>1</Text></View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.onboardStepTitle}>Find an event & secure your spot</Text>
                    <Text style={styles.onboardStepSub}>Browse upcoming sessions and grab a ticket</Text>
                  </View>
                  <Feather name="chevron-right" size={15} color={Colors.textMuted} />
                </Pressable>
                <View style={styles.onboardDivider} />
                <Pressable
                  style={({ pressed }) => [styles.onboardStep, { opacity: pressed ? 0.85 : 1 }]}
                  onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); router.push("/(tabs)/updates"); }}
                >
                  <View style={styles.onboardBadge}><Text style={styles.onboardBadgeText}>2</Text></View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.onboardStepTitle}>Watch the rules video</Text>
                    <Text style={styles.onboardStepSub}>Know the game before you arrive</Text>
                  </View>
                  <Feather name="play-circle" size={16} color={Colors.accent} />
                </Pressable>
                <View style={styles.onboardDivider} />
                <View style={styles.onboardStep}>
                  <View style={styles.onboardBadge}><Text style={styles.onboardBadgeText}>3</Text></View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.onboardStepTitle}>Show up & rep the club</Text>
                    <Text style={styles.onboardStepSub}>Attend your first session, then grab some merch!</Text>
                  </View>
                  <Pressable
                    style={({ pressed }) => [styles.onboardMerchBtn, { opacity: pressed ? 0.8 : 1 }]}
                    onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); router.push("/(tabs)/merch"); }}
                  >
                    <Text style={styles.onboardMerchBtnText}>Shop 👕</Text>
                  </Pressable>
                </View>
              </>
            )}
          </View>
        )}

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
                  {nextEventCountdown ? `  ·  ${nextEventCountdown}` : ""}
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
                {nextEventCountdown ? (
                  <Text style={styles.eventTextCardCountdown}>{nextEventCountdown}</Text>
                ) : null}
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
              <Text style={styles.gameCardSub}>Daily Dodge Mini Game</Text>
            </View>
            <View style={styles.gameCardArrow}>
              <Feather name="play-circle" size={28} color="#FFC107" />
            </View>
          </LinearGradient>
        </Pressable>

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
              {isAuthenticated && nextEventCountdown && (
                <Pressable
                  style={styles.countdownBanner}
                  onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); router.push("/(tabs)/tickets"); }}
                >
                  <Feather name="clock" size={14} color={Colors.primary} />
                  <Text style={styles.countdownBannerText}>{nextEventCountdown}</Text>
                  <Feather name="chevron-right" size={13} color={Colors.primary} style={{ marginLeft: "auto" }} />
                </Pressable>
              )}
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

        {/* ── Feature 5: Community Pulse ── */}
        {activityItems && activityItems.length > 0 && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Community Pulse</Text>
            </View>
            <View style={styles.pulseCard}>
              {activityItems.slice(0, 6).map((item: ActivityItem, idx: number) => (
                <View key={item.id}>
                  {idx > 0 && <View style={styles.pulseDivider} />}
                  <Pressable
                    style={({ pressed }) => [styles.pulseRow, { opacity: pressed ? 0.75 : 1 }]}
                    onPress={() => {
                      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                      setSelectedPulseMember({
                        id: item.userId,
                        name: item.userName,
                        avatarUrl: item.userAvatar,
                        username: null,
                        bio: null,
                        preferredRole: null,
                        accountType: item.accountType,
                        memberSince: item.timestamp,
                      });
                    }}
                  >
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
                  </Pressable>
                </View>
              ))}
            </View>
          </View>
        )}

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

    {selectedPulseMember && (
      <MemberProfileModal
        member={selectedPulseMember}
        onClose={() => setSelectedPulseMember(null)}
      />
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
    countdownBanner: {
      flexDirection: "row",
      alignItems: "center",
      gap: 8,
      backgroundColor: Colors.card,
      borderWidth: 1,
      borderColor: Colors.primary + "40",
      borderRadius: 10,
      paddingHorizontal: 14,
      paddingVertical: 10,
      marginBottom: 12,
    },
    countdownBannerText: {
      fontFamily: "Inter_700Bold",
      fontSize: 14,
      color: Colors.primary,
      flex: 1,
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
    eventTextCardCountdown: {
      fontFamily: "Inter_600SemiBold",
      fontSize: 11,
      color: Colors.primary,
      marginTop: 3,
    },
    /* ── Supporter Onboarding Card ── */
    onboardCard: {
      backgroundColor: Colors.surface,
      borderRadius: 16,
      borderWidth: 1,
      borderColor: `${Colors.primary}40`,
      overflow: "hidden",
      marginBottom: 8,
    },
    onboardCardHeader: {
      flexDirection: "row",
      alignItems: "flex-start",
      paddingHorizontal: 16,
      paddingTop: 14,
      paddingBottom: 12,
      borderBottomWidth: 1,
      borderBottomColor: Colors.border,
      gap: 8,
    },
    onboardCardTitle: { fontFamily: "Poppins_800ExtraBold", fontSize: 14, color: Colors.text },
    onboardCardSub: { fontFamily: "Inter_400Regular", fontSize: 11, color: Colors.textMuted, marginTop: 1 },
    onboardStep: {
      flexDirection: "row",
      alignItems: "center",
      gap: 12,
      paddingHorizontal: 16,
      paddingVertical: 13,
    },
    onboardBadge: {
      width: 26,
      height: 26,
      borderRadius: 13,
      backgroundColor: Colors.primary,
      alignItems: "center",
      justifyContent: "center",
    },
    onboardBadgeText: { fontFamily: "Poppins_800ExtraBold", fontSize: 11, color: "#fff" },
    onboardStepTitle: { fontFamily: "Inter_600SemiBold", fontSize: 13, color: Colors.text },
    onboardStepSub: { fontFamily: "Inter_400Regular", fontSize: 11, color: Colors.textMuted, marginTop: 1 },
    onboardDivider: { height: 1, backgroundColor: Colors.border, marginHorizontal: 16 },
    onboardMerchBtn: {
      backgroundColor: `${Colors.primary}22`,
      borderRadius: 8,
      paddingHorizontal: 10,
      paddingVertical: 6,
      borderWidth: 1,
      borderColor: `${Colors.primary}44`,
    },
    onboardMerchBtnText: { fontFamily: "Inter_700Bold", fontSize: 11, color: Colors.primary },

    /* ── Supporter Journey Card ── */
    supporterJourneyCard: {
      backgroundColor: Colors.surface,
      borderRadius: 16,
      borderWidth: 1,
      borderColor: "#FFC10740",
      padding: 16,
      marginBottom: 8,
      gap: 6,
    },
    supporterJourneyHeader: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
    },
    supporterJourneyLabel: {
      fontFamily: "Inter_600SemiBold",
      fontSize: 10,
      color: Colors.textMuted,
      textTransform: "uppercase",
      letterSpacing: 0.8,
    },
    supporterJourneyXp: {
      fontFamily: "Inter_700Bold",
      fontSize: 11,
      color: "#FFC107",
    },
    supporterJourneyTier: {
      fontFamily: "Poppins_800ExtraBold",
      fontSize: 15,
      color: Colors.text,
      lineHeight: 21,
    },
    supporterJourneyTrack: {
      height: 7,
      backgroundColor: Colors.surface2 ?? Colors.border,
      borderRadius: 4,
      overflow: "hidden",
      marginVertical: 2,
    },
    supporterJourneyFill: {
      height: "100%",
      backgroundColor: "#FFC107",
      borderRadius: 4,
    },
    supporterJourneyFooter: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      gap: 8,
    },
    supporterJourneyHint: {
      fontFamily: "Inter_400Regular",
      fontSize: 11,
      color: Colors.textMuted,
      flex: 1,
      lineHeight: 15,
    },
    supporterJourneyNext: {
      fontSize: 18,
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
      position: "relative",
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
