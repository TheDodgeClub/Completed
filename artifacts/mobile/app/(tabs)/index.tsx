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
  Platform,
  Linking,
  Alert,
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
import { useColors, useTheme } from "@/context/ThemeContext";
import { resolveImageUrl } from "@/constants/api";
import { useAuth } from "@/context/AuthContext";
import {
  listUpcomingEvents, listPosts, getAppSettings, reportPost,
  Post, FeaturedVideo,
} from "@/lib/api";
import { PostCard } from "@/components/PostCard";
import { PostDetailModal } from "@/components/PostDetailModal";
import { NotificationPromptModal } from "@/components/NotificationPromptModal";
import { requestAndRegisterNotifications, usePushNotifications } from "@/hooks/usePushNotifications";

const NOTIF_PROMPT_KEY = "notif_prompt_shown";

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
          <View style={qrModalStyles.qrBox}>
            <QRCode value={`dodgeclub:member:${userId}`} size={200} color="#000000" backgroundColor="#FFFFFF" />
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
  qrBox: { padding: 20, borderRadius: 16, marginVertical: 8, backgroundColor: "#FFFFFF" },
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
  const { isDark, toggleTheme } = useTheme();
  const { user, isAuthenticated, refreshUser } = useAuth();
  const { notificationsEnabled, toggleNotifications } = usePushNotifications(isAuthenticated);
  const logoBaseWidth = Platform.OS === "web" ? Math.min(screenWidth, 430) : screenWidth;
  const logoHeight = logoBaseWidth * 0.084 * 1.2;

  /* ── Notification pre-prompt ── */
  const [showNotifPrompt, setShowNotifPrompt] = useState(false);

  useEffect(() => {
    if (!isAuthenticated || Platform.OS === "web") return;
    let timer: ReturnType<typeof setTimeout>;
    AsyncStorage.getItem(NOTIF_PROMPT_KEY).then(val => {
      if (val === null) {
        timer = setTimeout(() => setShowNotifPrompt(true), 1500);
      }
    });
    return () => {
      if (timer) clearTimeout(timer);
    };
  }, [isAuthenticated]);

  const handleNotifAllow = async () => {
    await AsyncStorage.setItem(NOTIF_PROMPT_KEY, "shown");
    setShowNotifPrompt(false);
    requestAndRegisterNotifications();
  };

  const handleNotifDismiss = async () => {
    await AsyncStorage.setItem(NOTIF_PROMPT_KEY, "shown");
    setShowNotifPrompt(false);
  };

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
    staleTime: 0,
    refetchInterval: 30_000,
  });

  const featuredVideo: FeaturedVideo | null = appSettings?.featuredVideo ?? null;

  const [selectedPost, setSelectedPost] = useState<Post | null>(null);
  const [featuredVideoPlaying, setFeaturedVideoPlaying] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const focalY = useMemo(() => {
    const pos = appSettings?.homeHeroImagePosition;
    if (!pos) return 50;
    const parts = pos.split(" ");
    return Math.max(0, Math.min(100, Number(parts[1]) || 50));
  }, [appSettings?.homeHeroImagePosition]);

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
      refetchSettings();
      if (user?.accountType === "supporter") {
        supporterBarAnim.setValue(0);
        Animated.timing(supporterBarAnim, { toValue: supporterTargetRef.current, duration: 1200, useNativeDriver: false }).start();
      }
    }, [supporterBarAnim, refreshUser, refetchSettings, user?.accountType])
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
        contentInsetAdjustmentBehavior="never"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={Platform.OS === "web" ? { paddingBottom: 100 } : undefined}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={Colors.primary} />
        }
      >
        {/* ══════════ AREA 1: HERO ══════════ */}
        <View style={[styles.hero, { paddingTop: Math.max(insets.top, 44) + 24 }]}>
          {/* Hero background: always the green gradient */}
          <LinearGradient
            colors={["#074A24", "#021409"]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={StyleSheet.absoluteFill}
          />
          {/* Logo + header controls */}
          <View style={styles.heroTopRow}>
            <Image
              source={require("@/assets/images/tdc-logo.png")}
              style={{ height: logoHeight, width: logoBaseWidth * 0.63 * 1.2, marginLeft: Platform.OS === "web" ? -20 : -52 }}
              resizeMode="contain"
            />
            <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
              <Pressable
                style={{ padding: 8 }}
                onPress={async () => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  const ok = await toggleNotifications(!notificationsEnabled);
                  if (!notificationsEnabled && !ok) {
                    Alert.alert("Notifications Blocked", "Allow notifications in your device settings to receive Dodge Club alerts.");
                  }
                }}
              >
                <Feather
                  name={notificationsEnabled ? "bell" : "bell-off"}
                  size={20}
                  color={notificationsEnabled ? Colors.accent : "rgba(255,255,255,0.55)"}
                />
              </Pressable>
              <Pressable
                style={{ padding: 8 }}
                onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); toggleTheme(); }}
              >
                <Feather name={isDark ? "sun" : "moon"} size={20} color="rgba(255,255,255,0.7)" />
              </Pressable>
            </View>
          </View>

          <Text style={styles.heroTagline}>Come alone. Win together.</Text>

          {/* Hero Banner — admin-controlled image + overlay text */}
          {(() => {
            const bannerLinkUrl = appSettings?.homeHeroBannerLinkUrl?.trim() || null;
            const bannerTitle = appSettings?.homeHeroBannerTitle?.trim() || null;
            const bannerSubtitle = appSettings?.homeHeroBannerSubtitle?.trim() || null;
            const adminImageUrl = appSettings?.homeHeroImageUrl ?? null;
            const resolvedAdminUri = adminImageUrl ? (resolveImageUrl(adminImageUrl) ?? adminImageUrl) : null;
            const fallbackImageUrl = nextEvent?.imageUrl ?? null;
            const resolvedFallbackUri = fallbackImageUrl ? (resolveImageUrl(fallbackImageUrl) ?? fallbackImageUrl) : null;
            const resolvedUri = resolvedAdminUri ?? resolvedFallbackUri;
            const hasOverlayText = !!(bannerTitle || bannerSubtitle);

            if (!resolvedUri && !nextEvent) return null;

            const handleBannerPress = () => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              if (bannerLinkUrl) {
                if (bannerLinkUrl.startsWith("http://") || bannerLinkUrl.startsWith("https://")) {
                  Linking.openURL(bannerLinkUrl);
                } else {
                  router.push(bannerLinkUrl as any);
                }
              } else {
                router.push("/(tabs)/tickets");
              }
            };

            return (
              <Pressable
                style={({ pressed }) => [styles.eventBanner, { opacity: pressed ? 0.88 : 1 }]}
                onPress={handleBannerPress}
              >
                {resolvedUri ? (
                  <>
                    <Image
                      source={{ uri: resolvedUri }}
                      style={{
                        position: "absolute",
                        left: 0,
                        right: 0,
                        height: 363,
                        top: -121 * (focalY / 100),
                      }}
                      resizeMode="cover"
                    />
                    {hasOverlayText && (
                      <LinearGradient
                        colors={["transparent", "rgba(0,0,0,0.92)"]}
                        style={styles.eventBannerOverlay}
                      >
                        {bannerTitle ? (
                          <Text style={styles.eventBannerTitle} numberOfLines={2}>{bannerTitle}</Text>
                        ) : null}
                        {bannerSubtitle ? (
                          <Text style={[styles.eventBannerDate, bannerTitle ? {} : styles.eventBannerTitle]}>{bannerSubtitle}</Text>
                        ) : null}
                      </LinearGradient>
                    )}
                  </>
                ) : nextEvent ? (
                  <View style={styles.eventTextBanner}>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.eventBannerTitle} numberOfLines={1}>{nextEvent.title}</Text>
                      <Text style={styles.eventBannerDate}>
                        {new Date(nextEvent.date).toLocaleDateString("en-GB", { weekday: "short", month: "short", day: "numeric" })}
                      </Text>
                    </View>
                    <Feather name="chevron-right" size={18} color="rgba(255,255,255,0.6)" />
                  </View>
                ) : null}
              </Pressable>
            );
          })()}

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
        </View>

        {/* ══════════ GO ELITE BANNER (non-Elite users only) ══════════ */}
        {!user?.isElite && (
          <Pressable
            style={({ pressed }) => [styles.goEliteBanner, { opacity: pressed ? 0.88 : 1 }]}
            onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); router.push("/membership"); }}
          >
            <Text style={styles.goEliteBannerStar}>E</Text>
            <View style={{ flex: 1 }}>
              <Text style={styles.goEliteBannerTitle}>Go Elite — Unlock everything</Text>
            </View>
            <Feather name="chevron-right" size={16} color="#FFD700" />
          </Pressable>
        )}

        <View style={styles.body}>

          {/* ══════════ AREA 2: QUICK ACTIONS STRIP ══════════ */}
          <View style={styles.quickActionsRow}>
            <Pressable
              style={({ pressed }) => [styles.quickAction, { opacity: pressed ? 0.6 : 0.8 }]}
              onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); router.push("/(tabs)/tickets"); }}
            >
              <LinearGradient colors={[Colors.secondary, Colors.primary]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.quickActionIcon}>
                <Feather name="tag" size={17} color="#FFFFFF" />
              </LinearGradient>
              <Text style={styles.quickActionLabel}>Get Tickets</Text>
            </Pressable>

            <Pressable
              style={({ pressed }) => [styles.quickAction, { opacity: pressed ? 0.6 : 0.8 }]}
              onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); router.push("/(tabs)/merch"); }}
            >
              <LinearGradient colors={[Colors.secondary, Colors.primary]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.quickActionIcon}>
                <Feather name="shopping-bag" size={17} color="#FFFFFF" />
              </LinearGradient>
              <Text style={styles.quickActionLabel}>Club Store</Text>
            </Pressable>

            <Pressable
              style={({ pressed }) => [styles.quickAction, { opacity: pressed ? 0.6 : 0.8 }]}
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                if (!isAuthenticated) { router.push("/(auth)/login"); return; }
                setQrVisible(true);
              }}
            >
              <LinearGradient colors={[Colors.secondary, Colors.primary]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.quickActionIcon}>
                <Feather name="maximize" size={17} color="#FFFFFF" />
              </LinearGradient>
              <Text style={styles.quickActionLabel}>My QR</Text>
            </Pressable>

            <Pressable
              style={({ pressed }) => [styles.quickAction, { opacity: pressed ? 0.6 : 0.8 }]}
              onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium); router.push("/games/dodge"); }}
            >
              <LinearGradient colors={[Colors.secondary, Colors.primary]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.quickActionIcon}>
                <Text style={{ fontSize: 17 }}>🏐</Text>
              </LinearGradient>
              <Text style={styles.quickActionLabel}>Mini Game</Text>
            </Pressable>
          </View>

          {/* ══════════ AREA 2.5: COUNTDOWN ══════════ */}
          {nextEventCountdown && (
            <View style={styles.countdownRow}>
              <Feather name="clock" size={12} color={Colors.warning} />
              <Text style={styles.countdownRowText}>{nextEventCountdown}</Text>
            </View>
          )}

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
              <FeaturedVideoInlineCard
                video={featuredVideo}
                onExpand={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); setFeaturedVideoPlaying(true); }}
              />
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
                  onReport={user ? () => reportPost(post.id) : undefined}
                />
              ))
            ) : !featuredVideo ? (
              <View style={styles.empty}>
                <Feather name="message-square" size={32} color={Colors.textMuted} />
                <Text style={styles.emptyText}>No updates yet</Text>
              </View>
            ) : null}
          </View>

          {/* Legal footer */}
          <View style={styles.legalFooter}>
            <Pressable onPress={() => router.push("/legal/privacy")} style={styles.legalLink}>
              <Text style={styles.legalLinkText}>Privacy Policy</Text>
            </Pressable>
            <Text style={styles.legalSep}>·</Text>
            <Pressable onPress={() => router.push("/legal/terms")} style={styles.legalLink}>
              <Text style={styles.legalLinkText}>Terms of Use</Text>
            </Pressable>
            <Text style={styles.legalSep}>·</Text>
            <Pressable onPress={() => router.push("/legal/guidelines")} style={styles.legalLink}>
              <Text style={styles.legalLinkText}>Community Guidelines</Text>
            </Pressable>
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

      <NotificationPromptModal
        visible={showNotifPrompt}
        onAllow={handleNotifAllow}
        onDismiss={handleNotifDismiss}
      />
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

function FeaturedVideoInlineCard({ video, onExpand }: { video: FeaturedVideo; onExpand: () => void }) {
  const Colors = useColors();
  const [muted, setMuted] = useState(true);
  const isExternal = video.url.includes("youtube.com") || video.url.includes("youtu.be") || video.url.includes("vimeo.com");
  const resolvedUrl = resolveImageUrl(video.url) ?? video.url;

  const player = useVideoPlayer(isExternal ? null : resolvedUrl, (p) => {
    if (!isExternal) {
      p.loop = true;
      p.muted = true;
      p.play();
    }
  });

  useFocusEffect(
    useCallback(() => {
      if (!isExternal) {
        player.muted = true;
        player.play();
      }
      return () => {
        if (!isExternal) player.pause();
      };
    }, [player, isExternal])
  );

  function toggleMute() {
    const next = !muted;
    setMuted(next);
    player.muted = next;
  }

  const thumbnailUri = video.thumbnailUrl ? resolveImageUrl(video.thumbnailUrl) ?? video.thumbnailUrl : null;

  return (
    <Pressable
      onPress={onExpand}
      style={({ pressed }) => ({
        backgroundColor: Colors.surface,
        borderRadius: 16,
        overflow: "hidden",
        marginBottom: 12,
        borderWidth: 1,
        borderColor: Colors.border,
        opacity: pressed ? 0.92 : 1,
      })}
    >
      <View style={{ width: "100%", height: 190, backgroundColor: "#000" }}>
        {isExternal ? (
          thumbnailUri ? (
            <Image source={{ uri: thumbnailUri }} style={{ width: "100%", height: "100%" }} resizeMode="cover" />
          ) : (
            <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
              <Feather name="video" size={32} color={Colors.textMuted} />
            </View>
          )
        ) : (
          <VideoView
            player={player}
            style={{ width: "100%", height: "100%" }}
            contentFit="cover"
            nativeControls={false}
          />
        )}

        {/* Mute toggle — only for inline playback */}
        {!isExternal && (
          <Pressable
            onPress={(e) => { e.stopPropagation?.(); toggleMute(); }}
            style={{
              position: "absolute",
              bottom: 10,
              right: 10,
              backgroundColor: "rgba(0,0,0,0.55)",
              borderRadius: 20,
              padding: 7,
            }}
            hitSlop={10}
          >
            <Feather name={muted ? "volume-x" : "volume-2"} size={15} color="#fff" />
          </Pressable>
        )}

        {/* Expand to fullscreen */}
        <Pressable
          onPress={(e) => { e.stopPropagation?.(); onExpand(); }}
          style={{
            position: "absolute",
            top: 10,
            right: 10,
            backgroundColor: "rgba(0,0,0,0.55)",
            borderRadius: 20,
            padding: 7,
          }}
          hitSlop={10}
        >
          <Feather name="maximize-2" size={14} color="#fff" />
        </Pressable>

        {/* Play overlay for external links */}
        {isExternal && (
          <View style={{ position: "absolute", inset: 0, alignItems: "center", justifyContent: "center", backgroundColor: "rgba(0,0,0,0.3)" }}>
            <Feather name="play-circle" size={48} color="#fff" />
          </View>
        )}
      </View>

      <View style={{ flexDirection: "row", alignItems: "center", padding: 12, gap: 8 }}>
        <View style={{ backgroundColor: Colors.primary, borderRadius: 4, paddingHorizontal: 6, paddingVertical: 2 }}>
          <Text style={{ fontFamily: "Inter_700Bold", fontSize: 10, color: "#fff", textTransform: "uppercase", letterSpacing: 0.5 }}>Featured</Text>
        </View>
        <Text style={{ flex: 1, fontFamily: "Inter_600SemiBold", fontSize: 14, color: Colors.text }} numberOfLines={1}>{video.title}</Text>
      </View>
    </Pressable>
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
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      marginBottom: 4,
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
      borderRadius: 18,
      overflow: "hidden",
      height: 242,
      marginHorizontal: -12,
      marginBottom: 0,
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
    countdownRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: 5,
      alignSelf: "flex-start",
      marginBottom: 16,
    },
    countdownRowText: {
      fontFamily: "Inter_600SemiBold",
      fontSize: 12,
      color: Colors.warning,
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
      marginTop: 16,
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

    /* ── Go Elite Banner ── */
    goEliteBanner: {
      marginHorizontal: 16,
      marginTop: 10,
      marginBottom: 2,
      backgroundColor: "rgba(255,215,0,0.06)",
      borderRadius: 8,
      borderWidth: 1,
      borderColor: "rgba(255,215,0,0.45)",
      flexDirection: "row" as const,
      alignItems: "center" as const,
      paddingHorizontal: 12,
      paddingVertical: 7,
      gap: 8,
    },
    goEliteBannerStar: { fontSize: 13, fontFamily: "Poppins_800ExtraBold", color: "#FFD700" },
    goEliteBannerTitle: {
      fontFamily: "Inter_600SemiBold",
      fontSize: 13,
      color: "rgba(255,215,0,0.9)",
    },
    goEliteBannerSub: {
      fontFamily: "Inter_400Regular",
      fontSize: 12,
      color: "rgba(255,215,0,0.65)",
      marginTop: 1,
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

    /* ── Legal Footer ── */
    legalFooter: {
      flexDirection: "row",
      flexWrap: "wrap",
      justifyContent: "center",
      alignItems: "center",
      paddingHorizontal: 24,
      paddingTop: 24,
      paddingBottom: 32,
      gap: 4,
    },
    legalLink: {
      paddingVertical: 4,
      paddingHorizontal: 2,
    },
    legalLinkText: {
      fontFamily: "Inter_400Regular",
      fontSize: 12,
      color: Colors.textMuted,
      textDecorationLine: "underline",
    },
    legalSep: {
      fontFamily: "Inter_400Regular",
      fontSize: 12,
      color: Colors.textMuted,
      opacity: 0.4,
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
