import React, { useMemo, useState } from "react";
import {
  View,
  Text,
  ScrollView,
  Pressable,
  StyleSheet,
  ActivityIndicator,
  Alert,
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
  createBillingPortalSession,
} from "@/lib/api";

const ELITE_PERKS = [
  { icon: "star" as const, label: "Elite badge on your profile & player card" },
  { icon: "zap" as const, label: "Double XP bonus at every event" },
  { icon: "gift" as const, label: "Exclusive monthly merch discount" },
  { icon: "users" as const, label: "Priority spot reservation for sold-out events" },
  { icon: "award" as const, label: "Members-only Elite leaderboard" },
  { icon: "shield" as const, label: "VIP check-in lane at the door" },
];

export default function GoEliteScreen() {
  const insets = useSafeAreaInsets();
  const Colors = useColors();
  const styles = useMemo(() => makeStyles(Colors), [Colors]);
  const [checkoutLoading, setCheckoutLoading] = useState(false);
  const [portalLoading, setPortalLoading] = useState(false);
  const { refreshUser } = useAuth();

  const { data: status, isLoading, refetch } = useQuery({
    queryKey: ["membershipStatus"],
    queryFn: getMembershipStatus,
    retry: false,
  });

  const isElite = status?.isElite ?? false;

  const handleCheckout = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    setCheckoutLoading(true);
    try {
      const data = await createMembershipCheckout();
      await WebBrowser.openBrowserAsync(data.url, {
        presentationStyle: WebBrowser.WebBrowserPresentationStyle.PAGE_SHEET,
        showTitle: false,
        enableBarCollapsing: true,
      });
      // Browser closed — refresh both membership status and user profile (triggers celebration modal if Elite was granted)
      await Promise.all([refetch(), refreshUser()]);
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
      await WebBrowser.openBrowserAsync(data.url, {
        presentationStyle: WebBrowser.WebBrowserPresentationStyle.PAGE_SHEET,
        showTitle: false,
        enableBarCollapsing: true,
      });
      // Browser closed — refresh status in case they cancelled
      await refetch();
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
          <View style={styles.eliteStar}>
            <Text style={styles.eliteStarText}>⭐</Text>
          </View>
          <Text style={styles.heroTitle}>Go Elite</Text>
          <Text style={styles.heroPrice}>
            £9.99<Text style={styles.heroPricePer}> / month</Text>
          </Text>
          <Text style={styles.heroSub}>
            Unlock exclusive perks and show the club you're all in
          </Text>
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
                <Text style={styles.eliteBadgeText}>⭐ ELITE</Text>
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
        ) : (
          <View style={styles.statusCard}>
            <View style={styles.statusRow}>
              <View style={styles.freeBadge}>
                <Text style={styles.freeBadgeText}>FREE</Text>
              </View>
              <Text style={styles.statusFreeText}>Standard membership</Text>
            </View>
            <Text style={styles.statusFreeHint}>
              Upgrade to Elite to unlock all the perks below
            </Text>
          </View>
        )}

        {/* Perks List */}
        <View style={styles.perksSection}>
          <Text style={styles.perksTitle}>What you get</Text>
          {ELITE_PERKS.map((perk) => (
            <View key={perk.label} style={styles.perkRow}>
              <View style={[styles.perkIcon, isElite && styles.perkIconActive]}>
                <Feather
                  name={perk.icon}
                  size={16}
                  color={isElite ? "#FFD700" : Colors.textMuted}
                />
              </View>
              <Text style={[styles.perkText, isElite && styles.perkTextActive]}>
                {perk.label}
              </Text>
            </View>
          ))}
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
              <View style={styles.xpBonusRow}>
                <Text style={styles.xpBonusIcon}>⚡</Text>
                <Text style={styles.xpBonusText}>Join today and get a one-time <Text style={styles.xpBonusHighlight}>+500 XP</Text> Elite welcome bonus</Text>
              </View>
              <Pressable
                style={({ pressed }) => [styles.upgradeBtn, { opacity: pressed ? 0.9 : 1 }]}
                disabled={checkoutLoading}
                onPress={handleCheckout}
              >
                {checkoutLoading ? (
                  <ActivityIndicator color="#000" size="small" />
                ) : (
                  <>
                    <Text style={styles.eliteStarSmall}>⭐</Text>
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
              { feature: "Elite badge", free: false, elite: true },
              { feature: "Double XP bonus", free: false, elite: true },
              { feature: "Priority spots", free: false, elite: true },
              { feature: "Merch discount", free: false, elite: true },
              { feature: "VIP check-in", free: false, elite: true },
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
                    color={row.elite ? "#FFD700" : Colors.textMuted}
                  />
                </View>
              </View>
            ))}
          </View>
        </View>
      </ScrollView>
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
    },
    eliteStarText: {
      fontSize: 48,
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
      marginTop: 4,
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
      color: "#FFD700",
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
    },
    perkRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: 12,
    },
    perkIcon: {
      width: 36,
      height: 36,
      borderRadius: 10,
      backgroundColor: Colors.card,
      alignItems: "center",
      justifyContent: "center",
    },
    perkIconActive: {
      backgroundColor: "rgba(255,215,0,0.12)",
    },
    perkText: {
      fontFamily: "Inter_400Regular",
      fontSize: 14,
      color: Colors.textMuted,
      flex: 1,
    },
    perkTextActive: {
      color: Colors.text,
    },
    ctaSection: {
      marginHorizontal: 16,
      marginTop: 28,
      gap: 10,
    },
    upgradeBtn: {
      backgroundColor: "#FFD700",
      borderRadius: 14,
      paddingVertical: 16,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: 8,
    },
    eliteStarSmall: {
      fontSize: 18,
    },
    upgradeBtnText: {
      fontFamily: "Inter_700Bold",
      fontSize: 16,
      color: "#000",
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
      backgroundColor: "rgba(255,215,0,0.08)",
      borderWidth: 1,
      borderColor: "rgba(255,215,0,0.25)",
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
      color: "rgba(255,255,255,0.75)",
      flex: 1,
    },
    xpBonusHighlight: {
      fontFamily: "Inter_700Bold",
      color: "#FFD700",
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
      borderBottomColor: "rgba(255,255,255,0.06)",
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
      color: "#FFD700",
      fontFamily: "Inter_700Bold",
    },
    comparisonRow: {
      flexDirection: "row",
      alignItems: "center",
      paddingHorizontal: 16,
      paddingVertical: 12,
      borderBottomWidth: 1,
      borderBottomColor: "rgba(255,255,255,0.04)",
    },
    comparisonFeature: {
      fontFamily: "Inter_400Regular",
      fontSize: 13,
      color: Colors.text,
    },
  });
}
