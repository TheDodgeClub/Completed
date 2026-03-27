import React, { useMemo } from "react";
import {
  View,
  Text,
  Modal,
  ScrollView,
  Pressable,
  Image,
  StyleSheet,
  ActivityIndicator,
} from "react-native";
import { router } from "expo-router";
import { Feather } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useQuery } from "@tanstack/react-query";
import { useColors } from "@/context/ThemeContext";
import { resolveImageUrl } from "@/constants/api";
import { getMemberProfile, MemberSummary } from "@/lib/api";

const LEVEL_NAMES = ["Beginner", "Developing", "Experienced", "Skilled", "Advanced", "Pro", "League", "Expert", "Master", "Icon"];
const LEVEL_THRESHOLDS = [0, 300, 800, 1600, 2500, 5000, 10000, 20000, 40000, 80000];

const SUPPORTER_TIERS = [
  { name: "Fan",         emoji: "👏", minXp: 0,    perk: "Club supporter" },
  { name: "Loyal Fan",   emoji: "🎽", minXp: 50,   perk: "Name in newsletter" },
  { name: "Club Backer", emoji: "🛡️", minXp: 150,  perk: "Discount on events" },
  { name: "Club Legend", emoji: "⭐", minXp: 500,  perk: "VIP supporter status" },
  { name: "Superfan",    emoji: "🏆", minXp: 1000, perk: "Name on the club wall" },
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

function getLevel(xp: number): number {
  let level = 1;
  for (let i = 1; i < LEVEL_THRESHOLDS.length; i++) {
    if (xp >= LEVEL_THRESHOLDS[i]) level = i + 1; else break;
  }
  return level;
}

function getLevelProgress(xp: number, level: number) {
  const threshCurrent = LEVEL_THRESHOLDS[level - 1] ?? 0;
  const threshNext = LEVEL_THRESHOLDS[level];
  if (!threshNext) return { pct: 1, isMax: true, nextLevelName: "Max", xpToNext: 0 };
  return {
    pct: Math.min((xp - threshCurrent) / (threshNext - threshCurrent), 1),
    isMax: false,
    nextLevelName: LEVEL_NAMES[level] ?? "Max",
    xpToNext: threshNext - xp,
  };
}

function Avatar({ avatarUrl, name, size = 44, Colors }: { avatarUrl: string | null; name: string; size?: number; Colors: any }) {
  const uri = resolveImageUrl(avatarUrl);
  const radius = size / 2;
  if (uri) return <Image source={{ uri }} style={{ width: size, height: size, borderRadius: radius }} />;
  return (
    <View style={{ width: size, height: size, borderRadius: radius, backgroundColor: `${Colors.primary}30`, alignItems: "center", justifyContent: "center" }}>
      <Text style={{ fontFamily: "Inter_700Bold", fontSize: size * 0.38, color: Colors.primary }}>{name.charAt(0).toUpperCase()}</Text>
    </View>
  );
}

export function MemberProfileModal({ member, currentUserId, onClose }: {
  member: MemberSummary;
  currentUserId: number | null;
  onClose: () => void;
}) {
  const Colors = useColors();
  const styles = useMemo(() => makeStyles(Colors), [Colors]);

  const { data: profile, isLoading } = useQuery({
    queryKey: ["member-profile", member.id],
    queryFn: () => getMemberProfile(member.id),
  });

  const isSupporter = (profile?.accountType ?? member.accountType) === "supporter";
  const level = profile ? getLevel(profile.xp) : 1;
  const levelName = LEVEL_NAMES[(level - 1)] ?? "Rookie";
  const levelProgress = (!isSupporter && profile) ? getLevelProgress(profile.xp, level) : null;
  const supporterProgress = (isSupporter && profile) ? getSupporterProgress(profile.xp) : null;

  const handleDM = () => {
    onClose();
    router.push(`/messages/${member.id}` as any);
  };

  return (
    <Modal visible animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <View style={[styles.modalRoot, { backgroundColor: Colors.background }]}>
        <View style={styles.modalHandle} />
        <Pressable style={styles.modalClose} onPress={onClose}>
          <Feather name="x" size={22} color={Colors.textMuted} />
        </Pressable>

        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 56 }}>
          <LinearGradient colors={[Colors.primary + "CC", Colors.background]} style={styles.profileHero}>
            <Avatar avatarUrl={member.avatarUrl} name={member.name} size={88} Colors={Colors} />
            <Text style={styles.profileName}>{member.name}</Text>
            {member.username && <Text style={styles.profileUsername}>@{member.username}</Text>}
            <View style={{ flexDirection: "row", gap: 8, alignItems: "center", flexWrap: "wrap", justifyContent: "center" }}>
              {isSupporter ? (
                <View style={[styles.levelBadge, { backgroundColor: "#E8F5E920", borderColor: "#4CAF5060", borderWidth: 1 }]}>
                  <Text style={[styles.levelText, { color: "#4CAF50" }]}>❤️ Supporter</Text>
                </View>
              ) : (
                <View style={styles.levelBadge}>
                  <Text style={styles.levelText}>{levelName}</Text>
                </View>
              )}
              {(profile?.isElite ?? member.isElite ?? false) && (
                <View style={{ flexDirection: "row", alignItems: "center", gap: 4, backgroundColor: "#FFC10720", borderRadius: 20, paddingHorizontal: 10, paddingVertical: 4, borderWidth: 1, borderColor: "#FFC10750" }}>
                  <Text style={{ fontFamily: "Poppins_800ExtraBold", fontSize: 10, color: "#FFC107" }}>⚡ ELITE</Text>
                </View>
              )}
            </View>
          </LinearGradient>

          {isLoading ? (
            <ActivityIndicator color={Colors.primary} style={{ marginTop: 32 }} />
          ) : profile ? (
            <View style={styles.profileBody}>
              {isSupporter && supporterProgress ? (
                <View style={styles.xpSection}>
                  <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
                    <Text style={styles.xpSectionLabel}>Supporter Journey</Text>
                    <Text style={styles.xpValue}>{profile.xp.toLocaleString()} XP</Text>
                  </View>
                  <Text style={[styles.xpSectionLabel, { fontSize: 12, marginBottom: 6, color: Colors.textMuted }]}>
                    {supporterProgress.current.emoji} {supporterProgress.current.name}
                  </Text>
                  <View style={styles.xpBarBg}>
                    <View style={[styles.xpBarFill, { width: `${Math.round(supporterProgress.progress * 100)}%` as any }]} />
                  </View>
                  <Text style={styles.xpHint}>
                    {supporterProgress.isMax
                      ? "Superfan status reached 🏆 Club legend!"
                      : `${supporterProgress.xpToNext} XP to unlock ${supporterProgress.next!.emoji} ${supporterProgress.next!.name}`}
                  </Text>
                </View>
              ) : levelProgress ? (
                <View style={styles.xpSection}>
                  <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
                    <Text style={styles.xpSectionLabel}>XP Progress</Text>
                    <Text style={styles.xpValue}>{profile.xp.toLocaleString()} XP</Text>
                  </View>
                  <View style={styles.xpBarBg}>
                    <View style={[styles.xpBarFill, { width: `${Math.round(levelProgress.pct * 100)}%` as any }]} />
                  </View>
                  <Text style={styles.xpHint}>
                    {levelProgress.isMax
                      ? "Maximum level reached 🏆"
                      : `${levelProgress.xpToNext?.toLocaleString()} XP to ${levelProgress.nextLevelName}`}
                  </Text>
                </View>
              ) : null}

              {isSupporter ? (
                <View style={[styles.statsGrid, { justifyContent: "center" }]}>
                  {[
                    { emoji: "⚡", label: "XP", value: profile.xp.toLocaleString() },
                    { emoji: "📅", label: "Events", value: String(profile.eventsAttended) },
                  ].map((s) => (
                    <View key={s.label} style={[styles.statBox, { flex: 0, minWidth: 110 }]}>
                      <Text style={{ fontSize: 18, marginBottom: 2 }}>{s.emoji}</Text>
                      <Text style={styles.statValue}>{s.value}</Text>
                      <Text style={styles.statLabel}>{s.label}</Text>
                    </View>
                  ))}
                </View>
              ) : (
                <View style={styles.statsGrid}>
                  {[
                    { emoji: "⚡", label: "XP", value: profile.xp.toLocaleString() },
                    { emoji: "📅", label: "Events", value: String(profile.eventsAttended) },
                    { emoji: "🏅", label: "Medals", value: String(profile.medalsEarned) },
                    { emoji: "💍", label: "Rings", value: String(profile.ringsEarned) },
                  ].map((s) => (
                    <View key={s.label} style={styles.statBox}>
                      <Text style={{ fontSize: 18, marginBottom: 2 }}>{s.emoji}</Text>
                      <Text style={styles.statValue}>{s.value}</Text>
                      <Text style={styles.statLabel}>{s.label}</Text>
                    </View>
                  ))}
                </View>
              )}

              {!isSupporter && (
                <View style={styles.streakCard}>
                  <View style={styles.streakItem}>
                    <Text style={styles.streakEmoji}>🔥</Text>
                    <View>
                      <Text style={styles.streakValue}>{profile.currentStreak}</Text>
                      <Text style={styles.streakLabel}>Current Streak</Text>
                    </View>
                  </View>
                  <View style={styles.streakDivider} />
                  <View style={styles.streakItem}>
                    <Text style={styles.streakEmoji}>🏆</Text>
                    <View>
                      <Text style={styles.streakValue}>{profile.bestStreak}</Text>
                      <Text style={styles.streakLabel}>Best Streak</Text>
                    </View>
                  </View>
                </View>
              )}

              {profile.bio ? (
                <View style={styles.bioSection}>
                  <Text style={styles.sectionTitle}>About</Text>
                  <Text style={styles.bioText}>{profile.bio}</Text>
                </View>
              ) : null}

              {!isSupporter && profile.preferredRole ? (
                <View style={styles.roleRow}>
                  <Feather name="user" size={14} color={Colors.textMuted} />
                  <Text style={styles.memberSinceText}>Plays as {profile.preferredRole}</Text>
                </View>
              ) : null}

              <View style={styles.roleRow}>
                <Feather name="calendar" size={14} color={Colors.textMuted} />
                <Text style={styles.memberSinceText}>
                  Member since {new Date(profile.memberSince).toLocaleDateString("en-GB", { month: "long", year: "numeric" })}
                </Text>
              </View>

              {currentUserId !== null && currentUserId !== member.id && (
                <Pressable
                  style={({ pressed }) => [styles.dmBtn, { opacity: pressed ? 0.85 : 1 }]}
                  onPress={handleDM}
                >
                  <Feather name="message-circle" size={18} color="#fff" />
                  <Text style={styles.dmBtnText}>Send Message</Text>
                </Pressable>
              )}
            </View>
          ) : null}
        </ScrollView>
      </View>
    </Modal>
  );
}

function makeStyles(Colors: ReturnType<typeof useColors>) {
  return StyleSheet.create({
    modalRoot: { flex: 1 },
    modalHandle: {
      width: 36, height: 4, borderRadius: 2,
      backgroundColor: Colors.border, alignSelf: "center", marginTop: 10,
    },
    modalClose: {
      position: "absolute", top: 16, right: 20, zIndex: 10,
      padding: 8, borderRadius: 20,
    },
    profileHero: {
      alignItems: "center", paddingTop: 48, paddingBottom: 32, paddingHorizontal: 24, gap: 8,
    },
    profileName: { fontFamily: "Poppins_800ExtraBold", fontSize: 26, color: Colors.text, marginTop: 8 },
    profileUsername: { fontFamily: "Inter_400Regular", fontSize: 14, color: Colors.textSecondary },
    levelBadge: {
      backgroundColor: `${Colors.accent}25`, borderRadius: 20, paddingHorizontal: 14, paddingVertical: 5,
      borderWidth: 1, borderColor: `${Colors.accent}50`,
    },
    levelText: { fontFamily: "Inter_700Bold", fontSize: 13, color: Colors.accent },
    profileBody: { padding: 24, gap: 16 },
    statsGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
    statBox: {
      flex: 1, minWidth: "45%", backgroundColor: Colors.surface, borderRadius: 14,
      borderWidth: 1, borderColor: Colors.border,
      alignItems: "center", paddingVertical: 14,
    },
    statValue: { fontFamily: "Poppins_800ExtraBold", fontSize: 18, color: Colors.text },
    statLabel: { fontFamily: "Inter_400Regular", fontSize: 11, color: Colors.textMuted, marginTop: 2 },
    xpSection: {
      backgroundColor: Colors.surface, borderRadius: 14,
      borderWidth: 1, borderColor: Colors.border, padding: 14,
    },
    xpSectionLabel: { fontFamily: "Inter_600SemiBold", fontSize: 13, color: Colors.textMuted },
    xpValue: { fontFamily: "Poppins_800ExtraBold", fontSize: 13, color: Colors.accent },
    xpBarBg: { height: 6, borderRadius: 3, backgroundColor: `${Colors.primary}30`, marginBottom: 6 },
    xpBarFill: { height: 6, borderRadius: 3, backgroundColor: Colors.primary },
    xpHint: { fontFamily: "Inter_400Regular", fontSize: 11, color: Colors.textMuted },
    streakCard: {
      flexDirection: "row", backgroundColor: Colors.surface, borderRadius: 14,
      borderWidth: 1, borderColor: Colors.border, overflow: "hidden",
    },
    streakItem: { flex: 1, flexDirection: "row", alignItems: "center", gap: 12, padding: 16 },
    streakEmoji: { fontSize: 26 },
    streakValue: { fontFamily: "Poppins_800ExtraBold", fontSize: 22, color: Colors.text },
    streakLabel: { fontFamily: "Inter_400Regular", fontSize: 11, color: Colors.textMuted, marginTop: 1 },
    streakDivider: { width: 1, backgroundColor: Colors.border, marginVertical: 12 },
    bioSection: { gap: 6 },
    sectionTitle: { fontFamily: "Inter_600SemiBold", fontSize: 13, color: Colors.textMuted, textTransform: "uppercase", letterSpacing: 0.5 },
    bioText: { fontFamily: "Inter_400Regular", fontSize: 15, color: Colors.text, lineHeight: 22 },
    roleRow: { flexDirection: "row", alignItems: "center", gap: 8 },
    memberSinceText: { fontFamily: "Inter_400Regular", fontSize: 14, color: Colors.textMuted },
    dmBtn: {
      flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 10,
      backgroundColor: Colors.primary, borderRadius: 16, paddingVertical: 16, marginTop: 8,
      shadowColor: Colors.primary, shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.3, shadowRadius: 8, elevation: 5,
    },
    dmBtnText: { fontFamily: "Inter_600SemiBold", fontSize: 16, color: "#fff" },
  });
}
