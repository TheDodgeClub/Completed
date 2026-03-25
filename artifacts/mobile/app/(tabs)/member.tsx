import React from "react";
import {
  View,
  Text,
  ScrollView,
  Pressable,
  StyleSheet,
  ActivityIndicator,
  RefreshControl,
  Alert,
} from "react-native";
import { router } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useQuery } from "@tanstack/react-query";
import * as Haptics from "expo-haptics";
import Colors from "@/constants/colors";
import { useAuth } from "@/context/AuthContext";
import { getUserAttendance, getUserAchievements, Achievement, AttendanceRecord } from "@/lib/api";

function AchievementBadge({ achievement }: { achievement: Achievement }) {
  const iconMap: Record<string, string> = {
    star: "star",
    award: "award",
    shield: "shield",
    zap: "zap",
    medal: "award",
    trophy: "award",
  };
  const iconName = (iconMap[achievement.icon] || "award") as any;

  return (
    <View style={[styles.achieveBadge, !achievement.unlocked && styles.achieveLocked]}>
      <View style={[styles.achieveIcon, achievement.unlocked && styles.achieveIconUnlocked]}>
        <Feather
          name={iconName}
          size={20}
          color={achievement.unlocked ? Colors.accent : Colors.textMuted}
        />
      </View>
      <Text style={[styles.achieveTitle, !achievement.unlocked && { color: Colors.textMuted }]}>
        {achievement.title}
      </Text>
      <Text style={[styles.achieveDesc, !achievement.unlocked && { color: Colors.textMuted }]}>
        {achievement.description}
      </Text>
      {achievement.unlocked && (
        <View style={styles.unlockedDot} />
      )}
    </View>
  );
}

function AttendanceRow({ record }: { record: AttendanceRecord }) {
  const date = new Date(record.event.date);
  const formatted = date.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });

  return (
    <View style={styles.attendRow}>
      <View style={styles.attendDate}>
        <Text style={styles.attendDay}>{date.getDate()}</Text>
        <Text style={styles.attendMonth}>
          {date.toLocaleDateString("en-GB", { month: "short" }).toUpperCase()}
        </Text>
      </View>
      <View style={styles.attendInfo}>
        <Text style={styles.attendTitle} numberOfLines={1}>{record.event.title}</Text>
        <Text style={styles.attendLocation} numberOfLines={1}>{record.event.location}</Text>
      </View>
      {record.earnedMedal && (
        <View style={styles.medalBadge}>
          <Feather name="award" size={14} color={Colors.accent} />
        </View>
      )}
    </View>
  );
}

function GuestView() {
  return (
    <ScrollView style={styles.screen} contentInsetAdjustmentBehavior="automatic">
      <LinearGradient
        colors={[Colors.primary, "#8B0000"]}
        style={styles.guestHero}
      >
        <View style={styles.guestIconWrap}>
          <Feather name="shield" size={44} color="#fff" />
        </View>
        <Text style={styles.guestTitle}>Member Zone</Text>
        <Text style={styles.guestSubtitle}>
          Sign in or create a free account to access your exclusive member dashboard.
        </Text>
      </LinearGradient>

      <View style={styles.guestBody}>
        {[
          { icon: "calendar" as const, label: "Track your event attendance" },
          { icon: "award" as const, label: "Collect medals and achievements" },
          { icon: "bell" as const, label: "Access member-only updates" },
          { icon: "shopping-bag" as const, label: "Buy merch and tickets" },
        ].map(item => (
          <View key={item.label} style={styles.guestFeature}>
            <View style={styles.guestFeatureIcon}>
              <Feather name={item.icon} size={20} color={Colors.primary} />
            </View>
            <Text style={styles.guestFeatureText}>{item.label}</Text>
          </View>
        ))}

        <Pressable
          style={({ pressed }) => [styles.signInBtn, { opacity: pressed ? 0.85 : 1 }]}
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
            router.push("/(auth)/register");
          }}
        >
          <Text style={styles.signInBtnText}>Join the Club — It's Free</Text>
        </Pressable>

        <Pressable
          style={styles.loginLink}
          onPress={() => router.push("/(auth)/login")}
        >
          <Text style={styles.loginLinkText}>Already a member? Sign in</Text>
        </Pressable>
      </View>
    </ScrollView>
  );
}

export default function MemberScreen() {
  const insets = useSafeAreaInsets();
  const { user, isAuthenticated, isLoading, logout, refreshUser } = useAuth();
  const [refreshing, setRefreshing] = React.useState(false);

  const userId = user?.id ?? 0;

  const { data: attendance, refetch: refetchAttendance } = useQuery({
    queryKey: ["attendance", userId],
    queryFn: () => getUserAttendance(userId),
    enabled: !!userId,
  });

  const { data: achievements, refetch: refetchAchievements } = useQuery({
    queryKey: ["achievements", userId],
    queryFn: () => getUserAchievements(userId),
    enabled: !!userId,
  });

  const handleRefresh = async () => {
    setRefreshing(true);
    await Promise.all([refreshUser(), refetchAttendance(), refetchAchievements()]);
    setRefreshing(false);
  };

  const handleLogout = async () => {
    Alert.alert("Sign Out", "Are you sure you want to sign out?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Sign Out",
        style: "destructive",
        onPress: async () => {
          await logout();
        },
      },
    ]);
  };

  if (isLoading) {
    return (
      <View style={[styles.screen, { alignItems: "center", justifyContent: "center" }]}>
        <ActivityIndicator color={Colors.primary} size="large" />
      </View>
    );
  }

  if (!isAuthenticated || !user) {
    return <GuestView />;
  }

  const unlockedAchievements = achievements?.filter(a => a.unlocked).length ?? 0;

  return (
    <ScrollView
      style={styles.screen}
      contentInsetAdjustmentBehavior="automatic"
      showsVerticalScrollIndicator={false}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={Colors.primary} />
      }
    >
      {/* Profile Header */}
      <LinearGradient
        colors={[Colors.primary, "#8B0000"]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[styles.profileHero, { paddingTop: insets.top + 24 }]}
      >
        <View style={styles.profileTopRow}>
          <View style={styles.avatarCircle}>
            <Text style={styles.avatarInitial}>{user.name.charAt(0).toUpperCase()}</Text>
          </View>
          <Pressable onPress={handleLogout} style={styles.logoutBtn}>
            <Feather name="log-out" size={18} color="rgba(255,255,255,0.8)" />
          </Pressable>
        </View>
        <Text style={styles.memberName}>{user.name}</Text>
        <Text style={styles.memberEmail}>{user.email}</Text>
        <View style={styles.memberSinceRow}>
          <Feather name="shield" size={12} color="rgba(255,255,255,0.7)" />
          <Text style={styles.memberSince}>
            Member since {new Date(user.memberSince).toLocaleDateString("en-GB", {
              month: "long",
              year: "numeric",
            })}
          </Text>
        </View>
      </LinearGradient>

      {/* Stats */}
      <View style={styles.statsSection}>
        <View style={styles.statBlock}>
          <Text style={[styles.statValue, { color: Colors.primary }]}>{user.eventsAttended}</Text>
          <Text style={styles.statLabel}>Events{"\n"}Attended</Text>
        </View>
        <View style={styles.statDivider} />
        <View style={styles.statBlock}>
          <Text style={[styles.statValue, { color: Colors.accent }]}>{user.medalsEarned}</Text>
          <Text style={styles.statLabel}>Medals{"\n"}Earned</Text>
        </View>
        <View style={styles.statDivider} />
        <View style={styles.statBlock}>
          <Text style={[styles.statValue, { color: Colors.secondary }]}>{unlockedAchievements}</Text>
          <Text style={styles.statLabel}>Achievements{"\n"}Unlocked</Text>
        </View>
      </View>

      <View style={styles.body}>
        {/* Quick Actions */}
        <View style={styles.quickActions}>
          <Pressable
            style={({ pressed }) => [styles.quickBtn, { opacity: pressed ? 0.8 : 1 }]}
            onPress={() => router.push("/(tabs)/tickets")}
          >
            <Feather name="tag" size={20} color={Colors.primary} />
            <Text style={styles.quickBtnText}>Buy Tickets</Text>
          </Pressable>
          <Pressable
            style={({ pressed }) => [styles.quickBtn, { opacity: pressed ? 0.8 : 1 }]}
            onPress={() => router.push("/(tabs)/merch")}
          >
            <Feather name="shopping-bag" size={20} color={Colors.secondary} />
            <Text style={styles.quickBtnText}>Shop Merch</Text>
          </Pressable>
          <Pressable
            style={({ pressed }) => [styles.quickBtn, { opacity: pressed ? 0.8 : 1 }]}
            onPress={() => router.push("/(tabs)/updates")}
          >
            <Feather name="bell" size={20} color={Colors.accent} />
            <Text style={styles.quickBtnText}>Updates</Text>
          </Pressable>
        </View>

        {/* Achievements */}
        {achievements && achievements.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Achievements</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.achieveScroll}>
              <View style={styles.achieveRow}>
                {achievements.map(a => (
                  <AchievementBadge key={a.id} achievement={a} />
                ))}
              </View>
            </ScrollView>
          </View>
        )}

        {/* Event History */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Event History</Text>
          {attendance && attendance.length > 0 ? (
            attendance.slice(0, 10).map(record => (
              <AttendanceRow key={record.id} record={record} />
            ))
          ) : (
            <View style={styles.empty}>
              <Feather name="calendar" size={32} color={Colors.textMuted} />
              <Text style={styles.emptyText}>No events attended yet</Text>
              <Pressable
                style={({ pressed }) => [styles.exploreBtn, { opacity: pressed ? 0.85 : 1 }]}
                onPress={() => router.push("/(tabs)/tickets")}
              >
                <Text style={styles.exploreBtnText}>Find Events</Text>
              </Pressable>
            </View>
          )}
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  profileHero: {
    paddingHorizontal: 24,
    paddingBottom: 28,
  },
  profileTopRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 16,
  },
  avatarCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: "rgba(255,255,255,0.2)",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: "rgba(255,255,255,0.4)",
  },
  avatarInitial: {
    fontFamily: "Poppins_800ExtraBold",
    fontSize: 30,
    color: "#fff",
  },
  logoutBtn: {
    padding: 10,
  },
  memberName: {
    fontFamily: "Poppins_800ExtraBold",
    fontSize: 26,
    color: "#fff",
    marginBottom: 2,
  },
  memberEmail: {
    fontFamily: "Inter_400Regular",
    fontSize: 14,
    color: "rgba(255,255,255,0.75)",
    marginBottom: 8,
  },
  memberSinceRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  memberSince: {
    fontFamily: "Inter_400Regular",
    fontSize: 12,
    color: "rgba(255,255,255,0.65)",
  },
  statsSection: {
    flexDirection: "row",
    backgroundColor: Colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
    paddingVertical: 20,
  },
  statBlock: {
    flex: 1,
    alignItems: "center",
    gap: 4,
  },
  statDivider: {
    width: 1,
    backgroundColor: Colors.border,
    marginVertical: 4,
  },
  statValue: {
    fontFamily: "Poppins_800ExtraBold",
    fontSize: 28,
    lineHeight: 32,
  },
  statLabel: {
    fontFamily: "Inter_400Regular",
    fontSize: 11,
    color: Colors.textMuted,
    textAlign: "center",
    textTransform: "uppercase",
    letterSpacing: 0.3,
  },
  body: { padding: 20 },
  quickActions: {
    flexDirection: "row",
    gap: 10,
    marginBottom: 28,
  },
  quickBtn: {
    flex: 1,
    backgroundColor: Colors.surface,
    borderRadius: 14,
    padding: 14,
    alignItems: "center",
    gap: 8,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  quickBtnText: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 12,
    color: Colors.text,
    textAlign: "center",
  },
  section: { marginBottom: 28 },
  sectionTitle: {
    fontFamily: "Poppins_800ExtraBold",
    fontSize: 20,
    color: Colors.text,
    marginBottom: 14,
  },
  achieveScroll: { marginHorizontal: -20 },
  achieveRow: { flexDirection: "row", gap: 10, paddingHorizontal: 20 },
  achieveBadge: {
    width: 120,
    backgroundColor: Colors.surface,
    borderRadius: 16,
    padding: 14,
    alignItems: "center",
    gap: 6,
    borderWidth: 1,
    borderColor: Colors.border,
    position: "relative",
  },
  achieveLocked: {
    opacity: 0.5,
  },
  achieveIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: Colors.surface2,
    alignItems: "center",
    justifyContent: "center",
  },
  achieveIconUnlocked: {
    backgroundColor: `${Colors.accent}20`,
    borderWidth: 1,
    borderColor: `${Colors.accent}40`,
  },
  achieveTitle: {
    fontFamily: "Inter_700Bold",
    fontSize: 12,
    color: Colors.text,
    textAlign: "center",
  },
  achieveDesc: {
    fontFamily: "Inter_400Regular",
    fontSize: 10,
    color: Colors.textSecondary,
    textAlign: "center",
    lineHeight: 14,
  },
  unlockedDot: {
    position: "absolute",
    top: 10,
    right: 10,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: Colors.success,
  },
  attendRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    backgroundColor: Colors.surface,
    borderRadius: 14,
    padding: 14,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  attendDate: {
    width: 44,
    height: 50,
    backgroundColor: Colors.surface2,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  attendDay: {
    fontFamily: "Poppins_800ExtraBold",
    fontSize: 16,
    color: Colors.primary,
    lineHeight: 20,
  },
  attendMonth: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 10,
    color: Colors.textMuted,
    letterSpacing: 0.3,
  },
  attendInfo: { flex: 1 },
  attendTitle: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 14,
    color: Colors.text,
  },
  attendLocation: {
    fontFamily: "Inter_400Regular",
    fontSize: 12,
    color: Colors.textMuted,
    marginTop: 2,
  },
  medalBadge: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: `${Colors.accent}20`,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: `${Colors.accent}40`,
  },
  empty: {
    alignItems: "center",
    paddingVertical: 32,
    gap: 10,
  },
  emptyText: {
    fontFamily: "Inter_400Regular",
    fontSize: 14,
    color: Colors.textMuted,
  },
  exploreBtn: {
    backgroundColor: Colors.primary,
    borderRadius: 12,
    paddingHorizontal: 20,
    paddingVertical: 10,
    marginTop: 6,
  },
  exploreBtnText: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 14,
    color: "#fff",
  },
  guestHero: {
    padding: 32,
    paddingTop: 60,
    alignItems: "center",
    gap: 12,
  },
  guestIconWrap: {
    width: 88,
    height: 88,
    borderRadius: 44,
    backgroundColor: "rgba(255,255,255,0.15)",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 8,
  },
  guestTitle: {
    fontFamily: "Poppins_800ExtraBold",
    fontSize: 30,
    color: "#fff",
    textAlign: "center",
  },
  guestSubtitle: {
    fontFamily: "Inter_400Regular",
    fontSize: 15,
    color: "rgba(255,255,255,0.8)",
    textAlign: "center",
    lineHeight: 22,
    paddingHorizontal: 10,
  },
  guestBody: { padding: 24, gap: 16 },
  guestFeature: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    backgroundColor: Colors.surface,
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  guestFeatureIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: `${Colors.primary}20`,
    alignItems: "center",
    justifyContent: "center",
  },
  guestFeatureText: {
    fontFamily: "Inter_500Medium",
    fontSize: 14,
    color: Colors.text,
    flex: 1,
  },
  signInBtn: {
    backgroundColor: Colors.primary,
    borderRadius: 14,
    paddingVertical: 17,
    alignItems: "center",
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 10,
    elevation: 6,
    marginTop: 8,
  },
  signInBtnText: {
    fontFamily: "Inter_700Bold",
    fontSize: 16,
    color: "#fff",
  },
  loginLink: {
    alignItems: "center",
    paddingVertical: 8,
  },
  loginLinkText: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 14,
    color: Colors.primary,
  },
});
