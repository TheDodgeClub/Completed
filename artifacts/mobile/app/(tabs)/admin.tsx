import React from "react";
import {
  View,
  Text,
  ScrollView,
  Pressable,
  StyleSheet,
  Alert,
} from "react-native";
import { router } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import Colors from "@/constants/colors";
import { useAuth } from "@/context/AuthContext";
import { useQuery } from "@tanstack/react-query";
import {
  adminListEvents,
  adminListPosts,
  adminListMerch,
  adminListMembers,
} from "@/lib/api";

type SectionCardProps = {
  title: string;
  subtitle: string;
  icon: keyof typeof Feather.glyphMap;
  count: number | undefined;
  color: string;
  onPress: () => void;
};

function SectionCard({ title, subtitle, icon, count, color, onPress }: SectionCardProps) {
  return (
    <Pressable
      style={({ pressed }) => [styles.card, pressed && styles.cardPressed]}
      onPress={onPress}
    >
      <View style={[styles.cardIcon, { backgroundColor: color + "22" }]}>
        <Feather name={icon} size={26} color={color} />
      </View>
      <View style={styles.cardBody}>
        <Text style={styles.cardTitle}>{title}</Text>
        <Text style={styles.cardSubtitle}>{subtitle}</Text>
      </View>
      <View style={styles.cardRight}>
        {count !== undefined && (
          <View style={[styles.badge, { backgroundColor: color + "33" }]}>
            <Text style={[styles.badgeText, { color }]}>{count}</Text>
          </View>
        )}
        <Feather name="chevron-right" size={18} color={Colors.textMuted} />
      </View>
    </Pressable>
  );
}

export default function AdminDashboard() {
  const insets = useSafeAreaInsets();
  const { user } = useAuth();

  const { data: events } = useQuery({ queryKey: ["admin", "events"], queryFn: adminListEvents });
  const { data: posts } = useQuery({ queryKey: ["admin", "posts"], queryFn: adminListPosts });
  const { data: merch } = useQuery({ queryKey: ["admin", "merch"], queryFn: adminListMerch });
  const { data: members } = useQuery({ queryKey: ["admin", "members"], queryFn: adminListMembers });

  if (!user?.isAdmin) {
    return (
      <View style={[styles.container, styles.center]}>
        <Feather name="lock" size={48} color={Colors.error} />
        <Text style={styles.lockedText}>Access Denied</Text>
      </View>
    );
  }

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <LinearGradient
        colors={["#1a0a00", Colors.background]}
        style={styles.headerGradient}
      />

      <ScrollView
        contentContainerStyle={[styles.scroll, { paddingBottom: insets.bottom + 32 }]}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.header}>
          <View style={[styles.adminBadge]}>
            <Feather name="shield" size={14} color={Colors.accent} />
            <Text style={styles.adminBadgeText}>ADMIN</Text>
          </View>
          <Text style={styles.heading}>Control Panel</Text>
          <Text style={styles.subheading}>Welcome back, {user.name}</Text>
        </View>

        {/* Stats row */}
        <View style={styles.statsRow}>
          <View style={styles.statBox}>
            <Text style={styles.statNumber}>{events?.length ?? "—"}</Text>
            <Text style={styles.statLabel}>Events</Text>
          </View>
          <View style={[styles.statBox, styles.statDivider]}>
            <Text style={styles.statNumber}>{members?.filter(m => !m.isAdmin).length ?? "—"}</Text>
            <Text style={styles.statLabel}>Members</Text>
          </View>
          <View style={[styles.statBox, styles.statDivider]}>
            <Text style={styles.statNumber}>{posts?.length ?? "—"}</Text>
            <Text style={styles.statLabel}>Posts</Text>
          </View>
          <View style={[styles.statBox, styles.statDivider]}>
            <Text style={styles.statNumber}>{merch?.length ?? "—"}</Text>
            <Text style={styles.statLabel}>Products</Text>
          </View>
        </View>

        {/* Section cards */}
        <Text style={styles.sectionLabel}>MANAGE</Text>

        <SectionCard
          title="Events"
          subtitle="Create, edit and delete events"
          icon="calendar"
          count={events?.length}
          color={Colors.primary}
          onPress={() => router.push("/admin/events" as any)}
        />
        <SectionCard
          title="Posts"
          subtitle="Manage the message board"
          icon="message-square"
          count={posts?.length}
          color={Colors.secondary}
          onPress={() => router.push("/admin/posts" as any)}
        />
        <SectionCard
          title="Merch"
          subtitle="Add and update products"
          icon="shopping-bag"
          count={merch?.length}
          color="#8B5CF6"
          onPress={() => router.push("/admin/merch" as any)}
        />
        <SectionCard
          title="Members"
          subtitle="View members and mark attendance"
          icon="users"
          count={members?.filter(m => !m.isAdmin).length}
          color={Colors.accent}
          onPress={() => router.push("/admin/members" as any)}
        />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  center: { justifyContent: "center", alignItems: "center" },
  headerGradient: { ...StyleSheet.absoluteFillObject, height: 300 },
  scroll: { paddingHorizontal: 20 },
  header: { paddingTop: 20, paddingBottom: 24 },
  adminBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    backgroundColor: Colors.accent + "22",
    alignSelf: "flex-start",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: Colors.accent + "44",
  },
  adminBadgeText: { color: Colors.accent, fontSize: 11, fontWeight: "700", letterSpacing: 1.5 },
  heading: { fontSize: 30, fontWeight: "800", color: Colors.text, marginBottom: 4 },
  subheading: { fontSize: 14, color: Colors.textSecondary },
  statsRow: {
    flexDirection: "row",
    backgroundColor: Colors.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: Colors.border,
    marginBottom: 28,
    overflow: "hidden",
  },
  statBox: { flex: 1, alignItems: "center", paddingVertical: 16 },
  statDivider: { borderLeftWidth: 1, borderLeftColor: Colors.border },
  statNumber: { fontSize: 22, fontWeight: "800", color: Colors.text },
  statLabel: { fontSize: 11, color: Colors.textMuted, marginTop: 2 },
  sectionLabel: { fontSize: 11, color: Colors.textMuted, fontWeight: "700", letterSpacing: 1.5, marginBottom: 12 },
  card: {
    backgroundColor: Colors.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: Colors.border,
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
    marginBottom: 12,
    gap: 14,
  },
  cardPressed: { opacity: 0.7 },
  cardIcon: { width: 48, height: 48, borderRadius: 14, alignItems: "center", justifyContent: "center" },
  cardBody: { flex: 1 },
  cardTitle: { fontSize: 16, fontWeight: "700", color: Colors.text, marginBottom: 2 },
  cardSubtitle: { fontSize: 13, color: Colors.textSecondary },
  cardRight: { flexDirection: "row", alignItems: "center", gap: 8 },
  badge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20 },
  badgeText: { fontSize: 13, fontWeight: "700" },
  lockedText: { fontSize: 20, fontWeight: "700", color: Colors.text, marginTop: 16 },
});
