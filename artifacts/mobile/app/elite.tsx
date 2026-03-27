import React, { useMemo } from "react";
import {
  View,
  Text,
  ScrollView,
  Pressable,
  StyleSheet,
  Linking,
  Alert,
} from "react-native";
import { router } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useQuery } from "@tanstack/react-query";
import * as Haptics from "expo-haptics";
import { useColors } from "@/context/ThemeContext";
import { useAuth } from "@/context/AuthContext";
import { getEliteStatus } from "@/lib/api";

const WEBSITE_URL = process.env.EXPO_PUBLIC_WEBSITE_URL ?? "https://dodgeclub.co.uk";

const BENEFITS = [
  { icon: "clock", title: "Early Ticket Access", desc: "Get first pick on every event — before general sale opens." },
  { icon: "book-open", title: "Tips & Tricks", desc: "Exclusive coaching content, tactics, and training guides." },
  { icon: "star", title: "Elite-Only Updates", desc: "Posts and announcements reserved for Elite members only." },
  { icon: "tag", title: "Discounted Tickets", desc: "Elite members enjoy discounts on selected events." },
  { icon: "shield", title: "Elite Badge", desc: "Stand out in the community with your exclusive Elite badge." },
];

function openWebsite(path: string) {
  const url = `${WEBSITE_URL}${path}`;
  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
  Linking.openURL(url).catch(() => {
    Alert.alert("Could not open browser", "Please visit dodgeclub.co.uk to manage your membership.");
  });
}

function makeStyles(Colors: ReturnType<typeof useColors>) {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: Colors.background },
    scrollContent: { paddingBottom: 40 },
    header: {
      paddingTop: 16,
      paddingBottom: 24,
      alignItems: "center",
      paddingHorizontal: 24,
    },
    backBtn: {
      alignSelf: "flex-start",
      padding: 8,
      marginBottom: 8,
    },
    crownWrapper: {
      width: 80,
      height: 80,
      borderRadius: 40,
      backgroundColor: Colors.accent + "22",
      alignItems: "center",
      justifyContent: "center",
      marginBottom: 16,
      borderWidth: 2,
      borderColor: Colors.accent,
    },
    title: {
      fontSize: 28,
      fontWeight: "800",
      color: Colors.accent,
      textAlign: "center",
      letterSpacing: 1,
    },
    subtitle: {
      fontSize: 14,
      color: Colors.textSecondary,
      textAlign: "center",
      marginTop: 6,
      lineHeight: 20,
    },
    priceCard: {
      marginHorizontal: 24,
      marginBottom: 24,
      borderRadius: 16,
      overflow: "hidden",
    },
    priceGradient: {
      padding: 24,
      alignItems: "center",
    },
    priceLabel: {
      fontSize: 13,
      color: Colors.background,
      opacity: 0.8,
      letterSpacing: 2,
      textTransform: "uppercase",
    },
    price: {
      fontSize: 48,
      fontWeight: "800",
      color: Colors.background,
      marginTop: 4,
    },
    priceInterval: {
      fontSize: 16,
      color: Colors.background,
      opacity: 0.8,
      marginTop: -4,
    },
    priceNote: {
      fontSize: 12,
      color: Colors.background,
      opacity: 0.7,
      marginTop: 8,
    },
    section: { marginHorizontal: 24, marginBottom: 24 },
    sectionTitle: {
      fontSize: 16,
      fontWeight: "700",
      color: Colors.text,
      marginBottom: 12,
      letterSpacing: 0.5,
    },
    benefitRow: {
      flexDirection: "row",
      alignItems: "flex-start",
      marginBottom: 16,
    },
    benefitIcon: {
      width: 40,
      height: 40,
      borderRadius: 12,
      backgroundColor: Colors.accent + "18",
      alignItems: "center",
      justifyContent: "center",
      marginRight: 12,
      flexShrink: 0,
    },
    benefitTitle: {
      fontSize: 14,
      fontWeight: "700",
      color: Colors.text,
      marginBottom: 2,
    },
    benefitDesc: {
      fontSize: 13,
      color: Colors.textSecondary,
      lineHeight: 18,
    },
    ctaBtn: {
      marginHorizontal: 24,
      borderRadius: 14,
      overflow: "hidden",
      marginBottom: 12,
    },
    ctaGradient: {
      paddingVertical: 16,
      alignItems: "center",
    },
    ctaText: {
      fontSize: 16,
      fontWeight: "800",
      color: Colors.background,
      letterSpacing: 0.5,
    },
    manageBtn: {
      marginHorizontal: 24,
      borderRadius: 14,
      borderWidth: 1,
      borderColor: Colors.border,
      paddingVertical: 14,
      alignItems: "center",
      marginBottom: 12,
    },
    manageBtnText: {
      fontSize: 14,
      fontWeight: "600",
      color: Colors.textSecondary,
    },
    eliteBanner: {
      marginHorizontal: 24,
      borderRadius: 16,
      overflow: "hidden",
      marginBottom: 24,
    },
    eliteGradient: {
      padding: 20,
      alignItems: "center",
    },
    eliteTitle: {
      fontSize: 18,
      fontWeight: "800",
      color: Colors.background,
    },
    eliteSubtitle: {
      fontSize: 13,
      color: Colors.background,
      opacity: 0.8,
      marginTop: 4,
    },
    disclaimer: {
      fontSize: 11,
      color: Colors.textSecondary,
      textAlign: "center",
      marginHorizontal: 24,
      lineHeight: 16,
    },
  });
}

export default function EliteScreen() {
  const insets = useSafeAreaInsets();
  const Colors = useColors();
  const styles = useMemo(() => makeStyles(Colors), [Colors]);
  const { user, isAuthenticated } = useAuth();

  const { data: eliteStatus } = useQuery({
    queryKey: ["elite-status"],
    queryFn: getEliteStatus,
    enabled: isAuthenticated,
  });

  const isElite = eliteStatus?.isElite ?? user?.isElite ?? false;

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <Pressable style={styles.backBtn} onPress={() => router.back()}>
            <Feather name="arrow-left" size={22} color={Colors.text} />
          </Pressable>

          <View style={styles.crownWrapper}>
            <Feather name="star" size={36} color={Colors.accent} />
          </View>
          <Text style={styles.title}>ELITE MEMBERSHIP</Text>
          <Text style={styles.subtitle}>
            {isElite
              ? "You're an Elite member. Enjoy your exclusive benefits."
              : "Unlock exclusive perks and support your club."}
          </Text>
        </View>

        {isElite ? (
          <View style={styles.eliteBanner}>
            <LinearGradient colors={[Colors.accent, "#B8860B"]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.eliteGradient}>
              <Feather name="award" size={28} color={Colors.background} style={{ marginBottom: 8 }} />
              <Text style={styles.eliteTitle}>You're Elite</Text>
              <Text style={styles.eliteSubtitle}>
                {eliteStatus?.eliteSince
                  ? `Member since ${new Date(eliteStatus.eliteSince).toLocaleDateString("en-GB", { month: "long", year: "numeric" })}`
                  : "Enjoy all Elite benefits"}
              </Text>
            </LinearGradient>
          </View>
        ) : (
          <View style={styles.priceCard}>
            <LinearGradient colors={[Colors.primary, Colors.secondary]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.priceGradient}>
              <Text style={styles.priceLabel}>Elite Membership</Text>
              <Text style={styles.price}>£8.99</Text>
              <Text style={styles.priceInterval}>per month</Text>
              <Text style={styles.priceNote}>Cancel anytime</Text>
            </LinearGradient>
          </View>
        )}

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>WHAT YOU GET</Text>
          {BENEFITS.map((b) => (
            <View key={b.icon} style={styles.benefitRow}>
              <View style={styles.benefitIcon}>
                <Feather name={b.icon as any} size={18} color={Colors.accent} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.benefitTitle}>{b.title}</Text>
                <Text style={styles.benefitDesc}>{b.desc}</Text>
              </View>
            </View>
          ))}
        </View>

        {!isAuthenticated ? (
          <Pressable style={styles.ctaBtn} onPress={() => router.push("/(auth)/login")}>
            <LinearGradient colors={[Colors.accent, "#B8860B"]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.ctaGradient}>
              <Text style={styles.ctaText}>Log In to Join Elite</Text>
            </LinearGradient>
          </Pressable>
        ) : isElite ? (
          <Pressable
            style={styles.manageBtn}
            onPress={() => openWebsite("/manage")}
          >
            <Text style={styles.manageBtnText}>Manage Subscription</Text>
          </Pressable>
        ) : (
          <Pressable
            style={styles.ctaBtn}
            onPress={() => openWebsite("/#elite")}
          >
            <LinearGradient colors={[Colors.accent, "#B8860B"]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.ctaGradient}>
              <Text style={styles.ctaText}>Join Elite — £8.99/month</Text>
            </LinearGradient>
          </Pressable>
        )}

        <Text style={styles.disclaimer}>
          Elite membership is managed through our website. You will be taken to dodgeclub.co.uk to subscribe or manage your membership.
        </Text>
      </ScrollView>
    </View>
  );
}
