import React, { useMemo, useState, useCallback } from "react";
import {
  View,
  Text,
  ScrollView,
  Pressable,
  StyleSheet,
  ActivityIndicator,
  Alert,
  Modal,
  Platform,
} from "react-native";
import { router } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useQuery } from "@tanstack/react-query";
import * as Haptics from "expo-haptics";
import * as WebBrowser from "expo-web-browser";
import { useColors } from "@/context/ThemeContext";
import { useAuth } from "@/context/AuthContext";
import {
  getMembershipStatus,
  createMembershipCheckout,
  createMembershipSubscriptionIntent,
  confirmEliteSubscription,
  createBillingPortalSession,
  ackEliteCelebration,
} from "@/lib/api";

const WebStripeModal =
  Platform.OS === "web"
    ? require("@/components/WebStripeModal.web").default
    : null;

const ELITE_PERKS = [
  { icon: "clock" as const, label: "Early Tix", desc: "Early access to event tickets" },
  { icon: "zap" as const, label: "2× XP", desc: "Double XP at every event" },
  { icon: "tag" as const, label: "15% Off", desc: "15% off all event tickets" },
  { icon: "shopping-bag" as const, label: "10% Merch", desc: "10% off all club merch" },
  { icon: "package" as const, label: "Drops", desc: "First access to new merch drops" },
  { icon: "award" as const, label: "Gold Card", desc: "Golden Elite player card" },
  { icon: "shield" as const, label: "Badge", desc: "Elite badge on profile" },
];

export default function GoEliteScreen() {
  const insets = useSafeAreaInsets();
  const Colors = useColors();
  const styles = useMemo(() => makeStyles(Colors), [Colors]);
  const [checkoutLoading, setCheckoutLoading] = useState(false);
  const [portalLoading, setPortalLoading] = useState(false);
  const [selectedPerk, setSelectedPerk] = useState(0);
  const perkTimerRef = React.useRef<ReturnType<typeof setInterval> | null>(null);
  const { user, refreshUser } = useAuth();

  const resetPerkTimer = React.useCallback(() => {
    if (perkTimerRef.current) clearInterval(perkTimerRef.current);
    perkTimerRef.current = setInterval(() => {
      setSelectedPerk(p => (p + 1) % ELITE_PERKS.length);
    }, 2500);
  }, []);

  React.useEffect(() => {
    resetPerkTimer();
    return () => { if (perkTimerRef.current) clearInterval(perkTimerRef.current); };
  }, [resetPerkTimer]);
  const [celebrationVisible, setCelebrationVisible] = useState(false);
  const [webEliteModal, setWebEliteModal] = useState<{
    clientSecret: string;
    publishableKey: string;
    subscriptionId: string;
  } | null>(null);

  React.useEffect(() => {
    if (user?.pendingEliteCelebration) {
      setCelebrationVisible(true);
    }
  }, [user?.pendingEliteCelebration]);

  const handleAckCelebration = React.useCallback(async () => {
    setCelebrationVisible(false);
    try { await ackEliteCelebration(); } catch { /* ignore */ }
    refreshUser();
  }, [refreshUser]);

  const { data: status, isLoading, refetch } = useQuery({
    queryKey: ["membershipStatus"],
    queryFn: getMembershipStatus,
    retry: false,
  });

  const isElite = status?.isElite ?? false;

  const handleWebEliteSuccess = useCallback(async () => {
    const subId = webEliteModal?.subscriptionId;
    setWebEliteModal(null);
    if (subId) {
      try { await confirmEliteSubscription(subId); } catch { /* webhook handles it */ }
    }
    await Promise.all([refetch(), refreshUser()]);
  }, [webEliteModal, refetch, refreshUser]);

  const handleCheckout = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    setCheckoutLoading(true);
    try {
      if (Platform.OS === "web") {
        // Web — open in-app Payment Element modal (avoids iframe/redirect issues)
        const data = await createMembershipSubscriptionIntent();
        setWebEliteModal(data);
      } else {
        // Native — Stripe Checkout Session in-app browser sheet
        const data = await createMembershipCheckout();
        await WebBrowser.openBrowserAsync(data.url, {
          presentationStyle: WebBrowser.WebBrowserPresentationStyle.PAGE_SHEET,
          showTitle: false,
          enableBarCollapsing: true,
        });
        await Promise.all([refetch(), refreshUser()]);
      }
    } catch (err: any) {
      Alert.alert("Error", err.message ?? "Could not open checkout. Please try again.");
    } finally {
      setCheckoutLoading(false);
    }
  };

  const handlePortal = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setPortalLoading(true);
    try {
      const data = await createBillingPortalSession();
      if (Platform.OS === "web") {
        // Web — open portal in new tab so user can return to the app after managing billing
        window.open(data.url, "_blank", "noopener");
        setPortalLoading(false);
        return;
      } else {
        // Native — in-app browser sheet
        await WebBrowser.openBrowserAsync(data.url, {
          presentationStyle: WebBrowser.WebBrowserPresentationStyle.PAGE_SHEET,
          showTitle: false,
          enableBarCollapsing: true,
        });
        await refetch();
      }
    } catch (err: any) {
      Alert.alert("Error", err.message ?? "Could not open billing portal. Please try again.");
    } finally {
      setPortalLoading(false);
    }
  };

  return (
    <View style={[styles.root, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={styles.header}>
        <Pressable
          onPress={() => router.back()}
          style={({ pressed }) => [styles.backBtn, { opacity: pressed ? 0.6 : 1 }]}
        >
          <Feather name="x" size={22} color={Colors.text} />
        </Pressable>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 32 }]}
      >
        {/* Hero */}
        <LinearGradient colors={["#1A1000", "#3D2800"]} style={styles.hero}>
          <Text style={styles.heroTitle}>Go Elite</Text>
          <Text style={styles.heroPrice}>
            £9.99<Text style={styles.heroPricePer}> / month</Text>
          </Text>
          <Text style={styles.heroSub}>Unlock all the perks</Text>
          <Text style={[styles.heroSub, { fontSize: 13, opacity: 0.6 }]}>Cancel anytime</Text>
          {!isElite && (
            <Pressable
              style={({ pressed }) => [styles.xpBonusRow, { marginTop: 14, backgroundColor: "rgba(255,193,7,0.1)", borderColor: "rgba(255,193,7,0.3)", opacity: pressed ? 0.8 : 1 }]}
              onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); handleCheckout(); }}
            >
              <Text style={styles.xpBonusIcon}>⚡</Text>
              <Text style={[styles.xpBonusText, { color: "rgba(255,255,255,0.85)", flex: 1 }]}>Join today for a <Text style={[styles.xpBonusHighlight, { color: "#FFC107" }]}>500 XP</Text> one time bonus</Text>
              <Feather name="chevron-right" size={14} color="rgba(255,193,7,0.7)" />
            </Pressable>
          )}
        </LinearGradient>

        {/* Status Card */}
        {isLoading ? (
          <View style={styles.statusCard}>
            <ActivityIndicator color={Colors.primary} />
          </View>
        ) : isElite ? (
          <View style={[styles.statusCard, styles.statusCardElite]}>
            <View style={styles.statusRow}>
              <View style={styles.eliteBadge}>
                <Text style={styles.eliteBadgeText}>E  ELITE</Text>
              </View>
              <Text style={styles.statusActiveText}>Active</Text>
            </View>
            {status?.eliteSince && (
              <Text style={styles.statusSince}>
                Member since{" "}
                {new Date(status.eliteSince).toLocaleDateString("en-GB", {
                  month: "long",
                  year: "numeric",
                })}
              </Text>
            )}
            {status?.nextBillingDate && (
              <Text style={styles.statusBilling}>
                Next billing:{" "}
                {new Date(status.nextBillingDate).toLocaleDateString("en-GB", {
                  day: "numeric",
                  month: "long",
                  year: "numeric",
                })}
              </Text>
            )}
          </View>
        ) : null}

        {/* Perks Tabs */}
        <View style={styles.perksSection}>
          <Text style={styles.perksTitle}>Your unlocks</Text>
          <View style={styles.perkTabsGrid}>
            {ELITE_PERKS.map((perk, i) => {
              const active = selectedPerk === i;
              return (
                <Pressable
                  key={perk.label}
                  style={({ pressed }) => [
                    styles.perkTab,
                    active && styles.perkTabActive,
                    { opacity: pressed ? 0.85 : 1 },
                  ]}
                  onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); setSelectedPerk(i); resetPerkTimer(); }}
                >
                  <Feather name={perk.icon} size={16} color={active ? "#fff" : Colors.textMuted} />
                  <Text style={[styles.perkTabLabel, active && styles.perkTabLabelActive]} numberOfLines={1}>{perk.label}</Text>
                </Pressable>
              );
            })}
          </View>
        </View>

        {/* CTA */}
        {!isLoading && (
          isElite ? (
            <View style={styles.ctaSection}>
              <Pressable
                style={({ pressed }) => [styles.manageBtn, { opacity: pressed ? 0.85 : 1 }]}
                disabled={portalLoading}
                onPress={handlePortal}
              >
                {portalLoading ? (
                  <ActivityIndicator color="#fff" size="small" />
                ) : (
                  <>
                    <Feather name="settings" size={16} color="#fff" />
                    <Text style={styles.manageBtnText}>Manage or Cancel Subscription</Text>
                  </>
                )}
              </Pressable>
              <Text style={styles.ctaNote}>
                Opens a secure Stripe portal inside the app to manage your billing.
              </Text>
            </View>
          ) : (
            <View style={styles.ctaSection}>
              <Pressable
                style={({ pressed }) => [styles.upgradeBtn, { opacity: pressed ? 0.9 : 1 }]}
                disabled={checkoutLoading}
                onPress={handleCheckout}
              >
                {checkoutLoading ? (
                  <ActivityIndicator color="#000" size="small" />
                ) : (
                  <>
                    <Text style={styles.eliteStarSmall}>E</Text>
                    <Text style={styles.upgradeBtnText}>Go Elite — £9.99/month</Text>
                  </>
                )}
              </Pressable>
              <Text style={styles.ctaNote}>
                Cancel anytime. Billed monthly via Stripe. Opens securely inside the app.
              </Text>
            </View>
          )
        )}

        {/* Comparison table */}
        <View style={styles.comparisonSection}>
          <Text style={styles.comparisonTitle}>Free vs Elite</Text>
          <View style={styles.comparisonTable}>
            <View style={styles.comparisonHeader}>
              <Text style={[styles.comparisonCol, { flex: 2 }]} />
              <Text style={[styles.comparisonCol, styles.comparisonColHeader]}>Free</Text>
              <Text style={[styles.comparisonCol, styles.comparisonColHeaderElite]}>Elite</Text>
            </View>
            {[
              { feature: "Event access", free: true, elite: true },
              { feature: "XP & levelling", free: true, elite: true },
              { feature: "Player card", free: true, elite: true },
              { feature: "Early ticket access", free: false, elite: true },
              { feature: "Double XP bonus", free: false, elite: true },
              { feature: "15% off tickets", free: false, elite: true },
              { feature: "10% off merch", free: false, elite: true },
              { feature: "Early merch drops", free: false, elite: true },
              { feature: "Golden Player Card", free: false, elite: true },
              { feature: "Elite badge", free: false, elite: true },
            ].map((row) => (
              <View key={row.feature} style={styles.comparisonRow}>
                <Text style={[styles.comparisonFeature, { flex: 2 }]}>{row.feature}</Text>
                <View style={[styles.comparisonCol, { alignItems: "center" }]}>
                  <Feather
                    name={row.free ? "check" : "minus"}
                    size={16}
                    color={row.free ? Colors.primary : Colors.textMuted}
                  />
                </View>
                <View style={[styles.comparisonCol, { alignItems: "center" }]}>
                  <Feather
                    name={row.elite ? "check" : "minus"}
                    size={16}
                    color={row.elite ? Colors.primary : Colors.textMuted}
                  />
                </View>
              </View>
            ))}
          </View>
        </View>
      </ScrollView>

      {/* In-app Stripe Payment Element for Elite subscription (web only) */}
      {Platform.OS === "web" && WebStripeModal && webEliteModal && (
        <WebStripeModal
          visible={!!webEliteModal}
          clientSecret={webEliteModal.clientSecret}
          publishableKey={webEliteModal.publishableKey}
          onSuccess={handleWebEliteSuccess}
          onClose={() => setWebEliteModal(null)}
        />
      )}

      {/* Elite Celebration Modal — shown immediately after checkout if Elite was granted */}
      <Modal visible={celebrationVisible} transparent animationType="fade" onRequestClose={handleAckCelebration}>
        <View style={styles.celebrationOverlay}>
          <View style={styles.celebrationCard}>
            <Text style={styles.celebrationStar}>E</Text>
            <Text style={styles.celebrationTitle}>
              {user?.pendingEliteXpAwarded ? "You're Elite!" : "Welcome Back, Elite!"}
            </Text>
            <Text style={styles.celebrationSub}>
              {user?.pendingEliteXpAwarded
                ? "Welcome to the top tier of The Dodge Club. Your Elite badge is now live."
                : "Your Elite membership is active again. All your perks are back."}
            </Text>
            {user?.pendingEliteXpAwarded ? (
              <View style={styles.celebrationXpBox}>
                <Text style={styles.celebrationXpValue}>+500 XP</Text>
                <Text style={styles.celebrationXpLabel}>Elite Welcome Bonus</Text>
              </View>
            ) : (
              <View style={[styles.celebrationXpBox, { backgroundColor: "rgba(255,255,255,0.05)", borderColor: "rgba(255,255,255,0.12)" }]}>
                <Text style={[styles.celebrationXpLabel, { fontSize: 13, paddingHorizontal: 8 }]}>
                  The one-time XP bonus was already awarded on your first Elite activation — your rank is intact!
                </Text>
              </View>
            )}
            {ELITE_PERKS.map(perk => (
              <View key={perk.label} style={styles.celebrationPerkRow}>
                <Feather name="check" size={14} color="#FFD700" />
                <Text style={styles.celebrationPerkText}>{perk.desc}</Text>
              </View>
            ))}
            <Pressable
              style={({ pressed }) => [styles.celebrationBtn, { opacity: pressed ? 0.88 : 1 }]}
              onPress={() => { Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success); handleAckCelebration(); }}
            >
              <Text style={styles.celebrationBtnText}>Let's Go! 🎉</Text>
            </Pressable>
          </View>
        </View>
      </Modal>
    </View>
  );
}

function makeStyles(Colors: ReturnType<typeof useColors>) {
  return StyleSheet.create({
    root: {
      flex: 1,
      backgroundColor: Colors.background,
    },
    header: {
      flexDirection: "row",
      alignItems: "center",
      paddingHorizontal: 16,
      paddingVertical: 12,
    },
    backBtn: {
      width: 38,
      height: 38,
      borderRadius: 19,
      backgroundColor: Colors.card,
      alignItems: "center",
      justifyContent: "center",
    },
    scrollContent: {
      gap: 0,
    },
    hero: {
      alignItems: "center",
      paddingVertical: 36,
      paddingHorizontal: 24,
      gap: 8,
    },
    eliteStar: {
      marginBottom: 4,
      width: 80,
      height: 80,
      alignSelf: "center",
      alignItems: "center",
      justifyContent: "center",
    },
    eliteStarShape: {
      position: "absolute",
      fontSize: 80,
      color: "#FFD700",
      lineHeight: 80,
      includeFontPadding: false,
    },
    eliteStarText: {
      fontSize: 30,
      fontFamily: "Poppins_800ExtraBold",
      color: "#1A1000",
      lineHeight: 34,
      includeFontPadding: false,
      zIndex: 1,
    },
    heroTitle: {
      fontFamily: "Poppins_800ExtraBold",
      fontSize: 32,
      color: "#FFD700",
      textAlign: "center",
    },
    heroPrice: {
      fontFamily: "Poppins_700Bold",
      fontSize: 32,
      color: "#fff",
      textAlign: "center",
    },
    heroPricePer: {
      fontFamily: "Inter_400Regular",
      fontSize: 16,
      color: "rgba(255,255,255,0.6)",
    },
    heroSub: {
      fontFamily: "Inter_400Regular",
      fontSize: 14,
      color: "rgba(255,255,255,0.65)",
      textAlign: "center",
      marginTop: -6,
    },
    statusCard: {
      marginHorizontal: 16,
      marginTop: 16,
      backgroundColor: Colors.card,
      borderRadius: 14,
      padding: 16,
      gap: 8,
    },
    statusCardElite: {
      borderWidth: 1,
      borderColor: "rgba(255,215,0,0.35)",
      backgroundColor: "rgba(255,215,0,0.07)",
    },
    statusRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: 10,
    },
    eliteBadge: {
      backgroundColor: "#FFD700",
      borderRadius: 20,
      paddingHorizontal: 12,
      paddingVertical: 4,
    },
    eliteBadgeText: {
      fontFamily: "Inter_700Bold",
      fontSize: 12,
      color: "#000",
      letterSpacing: 1,
    },
    statusActiveText: {
      fontFamily: "Inter_600SemiBold",
      fontSize: 15,
      color: Colors.primary,
    },
    statusSince: {
      fontFamily: "Inter_400Regular",
      fontSize: 13,
      color: Colors.textMuted,
    },
    statusBilling: {
      fontFamily: "Inter_400Regular",
      fontSize: 13,
      color: Colors.textMuted,
    },
    freeBadge: {
      backgroundColor: Colors.border ?? Colors.card,
      borderRadius: 20,
      paddingHorizontal: 12,
      paddingVertical: 4,
    },
    freeBadgeText: {
      fontFamily: "Inter_700Bold",
      fontSize: 12,
      color: Colors.textMuted,
      letterSpacing: 1,
    },
    statusFreeText: {
      fontFamily: "Inter_500Medium",
      fontSize: 15,
      color: Colors.text,
    },
    statusFreeHint: {
      fontFamily: "Inter_400Regular",
      fontSize: 13,
      color: Colors.textMuted,
    },
    perksSection: {
      marginHorizontal: 16,
      marginTop: 24,
      gap: 12,
    },
    perksTitle: {
      fontFamily: "Inter_700Bold",
      fontSize: 16,
      color: Colors.text,
      marginBottom: 4,
      textAlign: "center",
    },
    perkTabsGrid: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: 6,
    },
    perkTab: {
      width: "22%",
      flexGrow: 1,
      alignItems: "center",
      justifyContent: "center",
      gap: 5,
      paddingVertical: 10,
      paddingHorizontal: 4,
      borderRadius: 10,
      borderWidth: 1,
      borderColor: Colors.border,
      backgroundColor: Colors.card,
    },
    perkTabActive: {
      borderColor: Colors.primary,
      backgroundColor: Colors.primary,
    },
    perkTabLabel: {
      fontFamily: "Inter_500Medium",
      fontSize: 10,
      color: Colors.textMuted,
      textAlign: "center",
    },
    perkTabLabelActive: {
      color: "#fff",
    },
    ctaSection: {
      marginHorizontal: 16,
      marginTop: 28,
      gap: 10,
    },
    upgradeBtn: {
      backgroundColor: "#0B3E1E",
      borderRadius: 14,
      paddingVertical: 16,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: 8,
    },
    eliteStarSmall: {
      fontSize: 16,
      fontFamily: "Inter_700Bold",
      color: "#FFD700",
    },
    upgradeBtnText: {
      fontFamily: "Inter_700Bold",
      fontSize: 16,
      color: "#FFD700",
    },
    manageBtn: {
      backgroundColor: Colors.card,
      borderRadius: 14,
      paddingVertical: 16,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: 8,
      borderWidth: 1,
      borderColor: Colors.border ?? "rgba(255,255,255,0.08)",
    },
    manageBtnText: {
      fontFamily: "Inter_600SemiBold",
      fontSize: 15,
      color: Colors.text,
    },
    xpBonusRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: 8,
      backgroundColor: `${Colors.primary}12`,
      borderWidth: 1,
      borderColor: `${Colors.primary}30`,
      borderRadius: 12,
      paddingHorizontal: 14,
      paddingVertical: 10,
    },
    xpBonusIcon: {
      fontSize: 18,
    },
    xpBonusText: {
      fontFamily: "Inter_400Regular",
      fontSize: 13,
      color: Colors.text,
      flex: 1,
    },
    xpBonusHighlight: {
      fontFamily: "Inter_700Bold",
      color: Colors.primary,
    },
    ctaNote: {
      fontFamily: "Inter_400Regular",
      fontSize: 12,
      color: Colors.textMuted,
      textAlign: "center",
    },
    comparisonSection: {
      marginHorizontal: 16,
      marginTop: 32,
      marginBottom: 8,
      gap: 12,
    },
    comparisonTitle: {
      fontFamily: "Inter_700Bold",
      fontSize: 16,
      color: Colors.text,
    },
    comparisonTable: {
      backgroundColor: Colors.card,
      borderRadius: 14,
      overflow: "hidden",
    },
    comparisonHeader: {
      flexDirection: "row",
      alignItems: "center",
      paddingHorizontal: 16,
      paddingVertical: 10,
      borderBottomWidth: 1,
      borderBottomColor: Colors.border ?? "rgba(0,0,0,0.08)",
    },
    comparisonCol: {
      flex: 1,
      fontFamily: "Inter_500Medium",
      fontSize: 13,
      color: Colors.textMuted,
      textAlign: "center",
    },
    comparisonColHeader: {
      color: Colors.textMuted,
      fontFamily: "Inter_600SemiBold",
    },
    comparisonColHeaderElite: {
      color: Colors.primary,
      fontFamily: "Inter_700Bold",
    },
    comparisonRow: {
      flexDirection: "row",
      alignItems: "center",
      paddingHorizontal: 16,
      paddingVertical: 12,
      borderBottomWidth: 1,
      borderBottomColor: Colors.border ?? "rgba(0,0,0,0.06)",
    },
    comparisonFeature: {
      fontFamily: "Inter_400Regular",
      fontSize: 13,
      color: Colors.text,
    },

    /* Celebration modal */
    celebrationOverlay: {
      flex: 1,
      backgroundColor: "rgba(0,0,0,0.85)",
      justifyContent: "center",
      alignItems: "center",
      padding: 20,
    },
    celebrationCard: {
      backgroundColor: "#151515",
      borderRadius: 20,
      padding: 28,
      width: "100%",
      maxWidth: 380,
      alignItems: "center",
      borderWidth: 1,
      borderColor: "rgba(255,215,0,0.25)",
    },
    celebrationStar: { fontSize: 64, fontFamily: "Poppins_800ExtraBold", color: "#FFD700", letterSpacing: -2, marginBottom: 12 },
    celebrationTitle: {
      fontFamily: "Inter_700Bold",
      fontSize: 24,
      color: "#FFD700",
      letterSpacing: 1,
      marginBottom: 8,
      textAlign: "center",
    },
    celebrationSub: {
      fontFamily: "Inter_400Regular",
      fontSize: 14,
      color: "rgba(255,255,255,0.7)",
      textAlign: "center",
      marginBottom: 16,
      lineHeight: 20,
    },
    celebrationXpBox: {
      backgroundColor: "rgba(255,215,0,0.08)",
      borderWidth: 1,
      borderColor: "rgba(255,215,0,0.3)",
      borderRadius: 10,
      padding: 16,
      alignItems: "center",
      width: "100%",
      marginBottom: 20,
    },
    celebrationXpValue: {
      fontFamily: "Inter_700Bold",
      fontSize: 30,
      color: "#FFD700",
    },
    celebrationXpLabel: {
      fontFamily: "Inter_400Regular",
      fontSize: 12,
      color: "rgba(255,255,255,0.45)",
      marginTop: 4,
      textAlign: "center",
    },
    celebrationPerksTitle: {
      fontFamily: "Inter_700Bold",
      fontSize: 13,
      color: "rgba(255,255,255,0.5)",
      letterSpacing: 1,
      marginBottom: 10,
      alignSelf: "flex-start",
    },
    celebrationPerkRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: 10,
      width: "100%",
      paddingVertical: 5,
    },
    celebrationPerkText: {
      fontFamily: "Inter_400Regular",
      fontSize: 14,
      color: "rgba(255,255,255,0.8)",
    },
    celebrationBtn: {
      marginTop: 20,
      backgroundColor: "#FFD700",
      borderRadius: 14,
      paddingVertical: 14,
      paddingHorizontal: 40,
      width: "100%",
      alignItems: "center",
    },
    celebrationBtnText: {
      fontFamily: "Inter_700Bold",
      fontSize: 16,
      color: "#000",
    },
  });
}
