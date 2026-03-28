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
  Modal,
} from "react-native";
import { router, useFocusEffect } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { VideoView, useVideoPlayer } from "expo-video";
import { Feather } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useQuery } from "@tanstack/react-query";
import * as Haptics from "expo-haptics";
import QRCode from "react-native-qrcode-svg";
import { useColors } from "@/context/ThemeContext";
import { resolveImageUrl } from "@/constants/api";
import { useAuth } from "@/context/AuthContext";
import {
  listUpcomingEvents, listPosts, getAppSettings,
  Post, FeaturedVideo,
} from "@/lib/api";
import { PostCard } from "@/components/PostCard";
import { PostDetailModal } from "@/components/PostDetailModal";

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

/* ── QR Modal ── */
function QRModal({ visible, userId, onClose }: { visible: boolean; userId: number; onClose: () => void }) {
  const Colors = useColors();
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={qrModalStyles.overlay} onPress={onClose}>
        <Pressable style={[qrModalStyles.sheet, { backgroundColor: Colors.card }]} onPress={() => {}}>
          <Text style={[qrModalStyles.title, { color: Colors.text }]}>Member QR Code</Text>
          <Text style={[qrModalStyles.sub, { color: Colors.textMuted }]}>Show to door staff for check-in</Text>
          <View style={[qrModalStyles.qrBox, { backgroundColor: Colors.surface }]}>
            <QRCode value={`dodgeclub:member:${userId}`} size={200} color={Colors.text} backgroundColor={Colors.surface} />
          </View>
          <Text style={[qrModalStyles.memberId, { color: Colors.textMuted }]}>Member #{userId}</Text>
          <Pressable style={[qrModalStyles.closeBtn, { backgroundColor: Colors.primary }]} onPress={onClose}>
            <Text style={qrModalStyles.closeBtnText}>Close</Text>
          </Pressable>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const qrModalStyles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.72)",
    alignItems: "center",
    justifyContent: "center",
  },
  sheet: {
    borderRadius: 20,
    padding: 28,
    alignItems: "center",
    gap: 10,
    width: 300,
  },
  title: { fontFamily: "Poppins_800ExtraBold", fontSize: 18 },
  sub: { fontFamily: "Inter_400Regular", fontSize: 13 },
  qrBox: { padding: 20, borderRadius: 16, marginVertical: 8 },
  memberId: { fontFamily: "Inter_400Regular", fontSize: 12 },
  closeBtn: {
    paddingHorizontal: 28,
    paddingVertical: 12,
    borderRadius: 10,
    marginTop: 4,
  },
  closeBtnText: { fontFamily: "Inter_700Bold", fontSize: 14, color: "#fff" },
});

export default function HomeScreen() {
  const insets = useSafeAreaInsets();
  const { width: screenWidth } = useWindowDimensions();
  const Colors = useColors();
  const styles = useMemo(() => makeStyles(Colors), [Colors]);
  const { user, isAuthenticated, refreshUser } = useAuth();
  const logoHeight = screenWidth * 0.084 * 1.2;

  /* ── Supporter onboarding collapse state ── */
  const ONBOARD_KEY = user ? `supporter_onboarding_collapsed_${user.id}` : null;
  const [onboardCollapsed, setOnboardCollapsed] = useState(true);
  useEffect(() => {
    if (!ONBOARD_KEY || user?.accountType !== "supporter") return;
    AsyncStorage.getItem(ONBOARD_KEY).then(val => {
      setOnboardCollapsed(val !== "0");
    });
  }, [ONBOARD_KEY, user?.accountType]);
  const toggleOnboarding = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const next = !onboardCollapsed;
    setOnboardCollapsed(next);
    if (ONBOARD_KEY) await AsyncStorage.setItem(ONBOARD_KEY, next ? "1" : "0");
  };

  /* ── QR modal ── */
  const [qrVisible, setQrVisible] = useState(false);

  /* ── Data queries ── */
  const { data: events, refetch: refetchEvents } = useQuery({
    queryKey: ["upcoming-events"],
    queryFn: listUpcomingEvents,
  });

  const { data: posts, isLoading: postsLoading, refetch: refetchPosts } = useQuery({
    queryKey: ["posts"],
    queryFn: listPosts,
  });

  const { data: appSettings, refetch: refetchSettings } = useQuery({
    queryKey: ["app-settings"],
    queryFn: getAppSettings,
  });

  const featuredVideo: FeaturedVideo | null = appSettings?.featuredVideo ?? null;

  const [selectedPost, setSelectedPost] = useState<Post | null>(null);
  const [featuredVideoPlaying, setFeaturedVideoPlaying] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const handleRefresh = async () => {
    setRefreshing(true);
    await Promise.all([refetchEvents(), refetchPosts(), refetchSettings(), refreshUser()]);
    setRefreshing(false);
  };

  /* ── Animated supporter progress bar ── */
  const supporterBarAnim = useRef(new Animated.Value(0)).current;
  const supporterTargetRef = useRef(0);

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
      refreshUser();
      if (user?.accountType === "supporter") {
        supporterBarAnim.setValue(0);
        Animated.timing(supporterBarAnim, { toValue: supporterTargetRef.current, duration: 1200, useNativeDriver: false }).start();
      }
    }, [supporterBarAnim, refreshUser, user?.accountType])
  );

  const nextEvent = events?.[0] ?? null;
  const nextEventCountdown = nextEvent ? getCountdown(nextEvent.date) : null;

  /* ── Feed: latest 5 posts, public only for guests ── */
  const feedPosts = useMemo(() => {
    if (!posts) return [];
    const visible = isAuthenticated ? posts : posts.filter(p => !p.isMembersOnly);
    return visible
      .slice()
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .slice(0, 5);
  }, [posts, isAuthenticated]);

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
        {/* ══════════ AREA 1: HERO ══════════ */}
        <LinearGradient
          colors={["#074A24", "#021409"]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={[styles.hero, { paddingTop: insets.top + 24 }]}
        >
          {/* Logo */}
          <View style={styles.heroTopRow}>
            <Image
              source={require("@/assets/images/tdc-logo.png")}
              style={{ height: logoHeight, width: screenWidth * 0.63 * 1.2, marginLeft: -52 }}
              resizeMode="contain"
            />
          </View>

          <Text style={styles.heroTagline}>Come alone. Win together.</Text>

          {/* Next Event Banner (all users) */}
          {nextEvent && (
            <Pressable
              style={({ pressed }) => [styles.eventBanner, { opacity: pressed ? 0.88 : 1 }]}
              onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); router.push("/(tabs)/tickets"); }}
            >
              {nextEvent.imageUrl ? (
                <>
                  <Image
                    source={{ uri: resolveImageUrl(nextEvent.imageUrl) ?? nextEvent.imageUrl }}
                    style={styles.eventBannerImage}
                    resizeMode="cover"
                  />
                  <LinearGradient
                    colors={["transparent", "rgba(0,0,0,0.72)"]}
                    style={styles.eventBannerOverlay}
                  >
                    <View style={styles.eventBannerMeta}>
                      <Text style={styles.eventBannerDate}>
                        {new Date(nextEvent.date).toLocaleDateString("en-GB", { weekday: "short", month: "short", day: "numeric" })}
                      </Text>
                      {nextEventCountdown && (
                        <View style={styles.countdownPill}>
                          <Feather name="clock" size={10} color="#FFC107" />
                          <Text style={styles.countdownPillText}>{nextEventCountdown}</Text>
                        </View>
                      )}
                    </View>
                  </LinearGradient>
                </>
              ) : (
                <View style={styles.eventTextBanner}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.eventBannerTitle} numberOfLines={1}>{nextEvent.title}</Text>
                    <Text style={styles.eventBannerDate}>
                      {new Date(nextEvent.date).toLocaleDateString("en-GB", { weekday: "short", month: "short", day: "numeric" })}
                    </Text>
                    {nextEventCountdown && (
                      <Text style={styles.countdownInline}>{nextEventCountdown}</Text>
                    )}
                  </View>
                  <Feather name="chevron-right" size={18} color="rgba(255,255,255,0.6)" />
                </View>
              )}
            </Pressable>
          )}

          {/* Supporter Journey + Merged Onboarding */}
          {isAuthenticated && user?.accountType === "supporter" && (() => {
            const sp = getSupporterProgress(user.xp ?? 0);
            return (
              <View style={styles.supporterCard}>
                <Pressable style={styles.supporterCardHeader} onPress={toggleOnboarding}>
                  <View style={{ flex: 1 }}>
                    <View style={styles.supporterTopRow}>
                      <Text style={styles.supporterLabel}>Supporter Journey</Text>
                      <Text style={styles.supporterXp}>{(user.xp ?? 0).toLocaleString()} XP</Text>
                    </View>
                    <Text style={styles.supporterTier}>{sp.current.emoji} {sp.current.name}</Text>
                    <View style={styles.supporterTrack}>
                      <Animated.View style={[styles.supporterFill, {
                        width: supporterBarAnim.interpolate({ inputRange: [0, 1], outputRange: ["0%", "100%"] }),
                      }]} />
                    </View>
                    <Text style={styles.supporterHint} numberOfLines={1}>
                      {sp.isMax
                        ? "Superfan status reached 🏆"
                        : `${sp.xpToNext} XP to ${sp.next!.emoji} ${sp.next!.name} — ${sp.next!.perk}`}
                    </Text>
                  </View>
                  <Feather
                    name={onboardCollapsed ? "chevron-down" : "chevron-up"}
                    size={16}
                    color="rgba(255,255,255,0.5)"
                    style={{ marginLeft: 8 }}
                  />
                </Pressable>

                {!onboardCollapsed && (
                  <View style={styles.onboardSteps}>
                    <View style={styles.onboardDivider} />
                    <Pressable
                      style={({ pressed }) => [styles.onboardStep, { opacity: pressed ? 0.85 : 1 }]}
                      onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); router.push("/(tabs)/tickets"); }}
                    >
                      <View style={styles.onboardBadge}><Text style={styles.onboardBadgeText}>1</Text></View>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.onboardStepTitle}>Find an event & secure your spot</Text>
                        <Text style={styles.onboardStepSub}>Browse upcoming sessions and grab a ticket</Text>
                      </View>
                      <Feather name="chevron-right" size={14} color="rgba(255,255,255,0.4)" />
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
                      <Feather name="play-circle" size={15} color="#FFC107" />
                    </Pressable>
                    <View style={styles.onboardDivider} />
                    <Pressable
                      style={({ pressed }) => [styles.onboardStep, { opacity: pressed ? 0.85 : 1 }]}
                      onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); router.push("/(tabs)/merch"); }}
                    >
                      <View style={styles.onboardBadge}><Text style={styles.onboardBadgeText}>3</Text></View>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.onboardStepTitle}>Show up & rep the club</Text>
                        <Text style={styles.onboardStepSub}>Attend your first session, then grab some merch!</Text>
                      </View>
                      <Text style={{ fontSize: 15 }}>👕</Text>
                    </Pressable>
                  </View>
                )}
              </View>
            );
          })()}
        </LinearGradient>

        <View style={styles.body}>

          {/* ══════════ AREA 2: QUICK ACTIONS STRIP ══════════ */}
          <View style={styles.quickActionsRow}>
            <Pressable
              style={({ pressed }) => [styles.quickAction, { opacity: pressed ? 0.6 : 0.8 }]}
              onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); router.push("/(tabs)/tickets"); }}
            >
              <View style={[styles.quickActionIcon, { backgroundColor: Colors.primary }]}>
                <Feather name="tag" size={17} color="#FFFFFF" />
              </View>
              <Text style={styles.quickActionLabel}>Get Tickets</Text>
            </Pressable>

            <Pressable
              style={({ pressed }) => [styles.quickAction, { opacity: pressed ? 0.6 : 0.8 }]}
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                if (!isAuthenticated) { router.push("/(auth)/login"); return; }
                setQrVisible(true);
              }}
            >
              <View style={[styles.quickActionIcon, { backgroundColor: Colors.accent }]}>
                <Feather name="maximize" size={17} color="#111111" />
              </View>
              <Text style={styles.quickActionLabel}>My QR</Text>
            </Pressable>

            <Pressable
              style={({ pressed }) => [styles.quickAction, { opacity: pressed ? 0.6 : 0.8 }]}
              onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium); router.push("/games/dodge"); }}
            >
              <View style={[styles.quickActionIcon, { backgroundColor: Colors.purple }]}>
                <Text style={{ fontSize: 17 }}>🏐</Text>
              </View>
              <Text style={styles.quickActionLabel}>Mini Game</Text>
            </Pressable>

            <Pressable
              style={({ pressed }) => [styles.quickAction, { opacity: pressed ? 0.6 : 0.8 }]}
              onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); router.push("/(tabs)/merch"); }}
            >
              <View style={[styles.quickActionIcon, { backgroundColor: Colors.secondary }]}>
                <Feather name="shopping-bag" size={17} color="#FFFFFF" />
              </View>
              <Text style={styles.quickActionLabel}>Club Shop</Text>
            </Pressable>
          </View>

          {/* ══════════ AREA 3: FEED ══════════ */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Latest Updates</Text>
              <Pressable onPress={() => router.push("/(tabs)/updates")}>
                <Text style={styles.seeAll}>See All</Text>
              </Pressable>
            </View>

            {/* Featured Video Card */}
            {featuredVideo && (
              <Pressable
                style={({ pressed }) => [styles.featuredVideoCard, { opacity: pressed ? 0.88 : 1 }]}
                onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); setFeaturedVideoPlaying(true); }}
              >
                <View style={styles.featuredVideoThumbWrap}>
                  {featuredVideo.thumbnailUrl ? (
                    <Image source={{ uri: resolveImageUrl(featuredVideo.thumbnailUrl) ?? featuredVideo.thumbnailUrl }} style={styles.featuredVideoThumb} resizeMode="cover" />
                  ) : (
                    <View style={[styles.featuredVideoThumb, { backgroundColor: Colors.surface2, alignItems: "center", justifyContent: "center" }]}>
                      <Feather name="video" size={28} color={Colors.textMuted} />
                    </View>
                  )}
                  <View style={styles.featuredPlayBtn}>
                    <Feather name="play" size={18} color="#fff" />
                  </View>
                </View>
                <View style={styles.featuredVideoInfo}>
                  <View style={styles.featuredBadge}>
                    <Text style={styles.featuredBadgeText}>Featured</Text>
                  </View>
                  <Text style={styles.featuredVideoTitle} numberOfLines={2}>{featuredVideo.title}</Text>
                </View>
              </Pressable>
            )}

            {postsLoading ? (
              <ActivityIndicator color={Colors.primary} style={{ marginTop: 16 }} />
            ) : feedPosts.length > 0 ? (
              feedPosts.map(post => (
                <PostCard
                  key={post.id}
                  post={post}
                  onPress={() => {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    setSelectedPost(post);
                  }}
                />
              ))
            ) : !featuredVideo ? (
              <View style={styles.empty}>
                <Feather name="message-square" size={32} color={Colors.textMuted} />
                <Text style={styles.emptyText}>No updates yet</Text>
              </View>
            ) : null}
          </View>

        </View>
      </ScrollView>

      {selectedPost && (
        <PostDetailModal post={selectedPost} onClose={() => setSelectedPost(null)} />
      )}

      {isAuthenticated && user && (
        <QRModal
          visible={qrVisible}
          userId={user.id}
          onClose={() => setQrVisible(false)}
        />
      )}

      {featuredVideoPlaying && featuredVideo && (
        <FeaturedVideoModal video={featuredVideo} onClose={() => setFeaturedVideoPlaying(false)} />
      )}
    </>
  );
}

/* ── Featured Video Player Modal ── */
function FeaturedVideoModal({ video, onClose }: { video: { id: number; title: string; url: string; thumbnailUrl: string | null }; onClose: () => void }) {
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
      </SafeAreaView>
    </Modal>
  );
}

function makeStyles(Colors: ReturnType<typeof useColors>) {
  return StyleSheet.create({
    screen: {
      flex: 1,
      backgroundColor: Colors.background,
    },

    /* ── Hero ── */
    hero: {
      paddingHorizontal: 24,
      paddingBottom: 28,
    },
    heroTopRow: {
      marginBottom: 14,
    },
    heroTagline: {
      fontFamily: "Inter_600SemiBold",
      fontSize: 15,
      color: "#FFC107",
      marginBottom: 16,
      lineHeight: 22,
    },

    /* ── Event Banner in Hero ── */
    eventBanner: {
      borderRadius: 14,
      overflow: "hidden",
      height: 180,
      marginBottom: 16,
      backgroundColor: "rgba(255,255,255,0.07)",
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
      padding: 14,
      paddingTop: 36,
    },
    eventTextBanner: {
      flex: 1,
      flexDirection: "row",
      alignItems: "center",
      padding: 16,
      gap: 12,
    },
    eventBannerTitle: {
      fontFamily: "Poppins_800ExtraBold",
      fontSize: 16,
      color: "#fff",
      lineHeight: 22,
      marginBottom: 4,
    },
    eventBannerDate: {
      fontFamily: "Inter_500Medium",
      fontSize: 12,
      color: "rgba(255,255,255,0.75)",
    },
    eventBannerMeta: {
      flexDirection: "row",
      alignItems: "center",
      gap: 8,
      marginTop: 6,
    },
    countdownPill: {
      flexDirection: "row",
      alignItems: "center",
      gap: 4,
      backgroundColor: "rgba(255,193,7,0.18)",
      borderRadius: 20,
      paddingHorizontal: 8,
      paddingVertical: 3,
      borderWidth: 1,
      borderColor: "rgba(255,193,7,0.4)",
    },
    countdownPillText: {
      fontFamily: "Inter_600SemiBold",
      fontSize: 10,
      color: "#FFC107",
    },
    countdownInline: {
      fontFamily: "Inter_600SemiBold",
      fontSize: 11,
      color: "#FFC107",
      marginTop: 3,
    },

    /* ── Supporter Card (merged journey + onboarding) ── */
    supporterCard: {
      backgroundColor: "rgba(255,255,255,0.07)",
      borderRadius: 14,
      borderWidth: 1,
      borderColor: "rgba(255,193,7,0.25)",
      overflow: "hidden",
    },
    supporterCardHeader: {
      flexDirection: "row",
      alignItems: "center",
      padding: 14,
    },
    supporterTopRow: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      marginBottom: 4,
    },
    supporterLabel: {
      fontFamily: "Inter_600SemiBold",
      fontSize: 10,
      color: "rgba(255,255,255,0.5)",
      textTransform: "uppercase",
      letterSpacing: 0.8,
    },
    supporterXp: {
      fontFamily: "Inter_600SemiBold",
      fontSize: 11,
      color: "#FFC107",
    },
    supporterTier: {
      fontFamily: "Poppins_800ExtraBold",
      fontSize: 14,
      color: "#fff",
      lineHeight: 20,
      marginBottom: 8,
    },
    supporterTrack: {
      height: 5,
      backgroundColor: "rgba(255,255,255,0.15)",
      borderRadius: 3,
      overflow: "hidden",
      marginBottom: 6,
    },
    supporterFill: {
      height: "100%",
      borderRadius: 3,
      backgroundColor: "#FFC107",
    },
    supporterHint: {
      fontFamily: "Inter_400Regular",
      fontSize: 10,
      color: "rgba(255,255,255,0.5)",
    },
    onboardSteps: {},
    onboardDivider: {
      height: 1,
      backgroundColor: "rgba(255,255,255,0.1)",
    },
    onboardStep: {
      flexDirection: "row",
      alignItems: "center",
      gap: 12,
      paddingHorizontal: 14,
      paddingVertical: 12,
    },
    onboardBadge: {
      width: 24,
      height: 24,
      borderRadius: 12,
      backgroundColor: Colors.primary,
      alignItems: "center",
      justifyContent: "center",
    },
    onboardBadgeText: { fontFamily: "Poppins_800ExtraBold", fontSize: 10, color: "#fff" },
    onboardStepTitle: { fontFamily: "Inter_600SemiBold", fontSize: 13, color: "#fff" },
    onboardStepSub: { fontFamily: "Inter_400Regular", fontSize: 11, color: "rgba(255,255,255,0.5)", marginTop: 1 },

    /* ── Body ── */
    body: {
      padding: 20,
      gap: 8,
    },

    /* ── Quick Actions Strip ── */
    quickActionsRow: {
      flexDirection: "row",
      justifyContent: "space-between",
      marginBottom: 24,
    },
    quickAction: {
      alignItems: "center",
      gap: 7,
      flex: 1,
    },
    quickActionIcon: {
      width: 46,
      height: 46,
      borderRadius: 13,
      alignItems: "center",
      justifyContent: "center",
    },
    quickActionLabel: {
      fontFamily: "Inter_700Bold",
      fontSize: 11,
      color: Colors.text,
      textAlign: "center",
    },

    /* ── Feed ── */
    section: {
      marginBottom: 12,
    },
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

    /* ── Featured Video Card ── */
    featuredVideoCard: {
      flexDirection: "row",
      backgroundColor: Colors.surface,
      borderRadius: 14,
      overflow: "hidden",
      marginBottom: 12,
      borderWidth: 1,
      borderColor: Colors.border,
      alignItems: "center",
    },
    featuredVideoThumbWrap: {
      width: 100,
      height: 70,
      position: "relative",
    },
    featuredVideoThumb: {
      width: 100,
      height: 70,
    },
    featuredPlayBtn: {
      position: "absolute",
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: "rgba(0,0,0,0.38)",
    },
    featuredVideoInfo: {
      flex: 1,
      padding: 12,
      gap: 5,
    },
    featuredBadge: {
      alignSelf: "flex-start",
      backgroundColor: Colors.primary,
      borderRadius: 4,
      paddingHorizontal: 6,
      paddingVertical: 2,
    },
    featuredBadgeText: {
      fontFamily: "Inter_700Bold",
      fontSize: 9,
      color: "#fff",
      textTransform: "uppercase",
      letterSpacing: 0.6,
    },
    featuredVideoTitle: {
      fontFamily: "Inter_600SemiBold",
      fontSize: 13,
      color: Colors.text,
      lineHeight: 18,
    },
  });
}
