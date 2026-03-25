import React, { useMemo, useState, useCallback } from "react";
import {
  View,
  Text,
  FlatList,
  Pressable,
  StyleSheet,
  ActivityIndicator,
  TextInput,
  Image,
  Modal,
  ScrollView,
  RefreshControl,
} from "react-native";
import { router } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import { useQuery } from "@tanstack/react-query";
import * as Haptics from "expo-haptics";
import { LinearGradient } from "expo-linear-gradient";
import { useColors } from "@/context/ThemeContext";
import { useAuth } from "@/context/AuthContext";
import { resolveImageUrl } from "@/constants/api";
import {
  listMembers, getMemberProfile,
  MemberSummary, UserProfile,
} from "@/lib/api";

const LEVEL_NAMES = ["Rookie", "Player", "Contender", "Competitor", "Veteran", "Elite", "Pro", "Champion", "Legend", "Icon"];

function getLevel(xp: number): number {
  const thresholds = [0, 300, 700, 1200, 1800, 2500, 3300, 4200, 5200, 6300];
  let level = 1;
  for (let i = 1; i < thresholds.length; i++) {
    if (xp >= thresholds[i]) level = i + 1; else break;
  }
  return level;
}

function Avatar({ avatarUrl, name, size = 44, Colors }: { avatarUrl: string | null; name: string; size?: number; Colors: any }) {
  const uri = resolveImageUrl(avatarUrl);
  const radius = size / 2;
  if (uri) {
    return <Image source={{ uri }} style={{ width: size, height: size, borderRadius: radius }} />;
  }
  return (
    <View style={{ width: size, height: size, borderRadius: radius, backgroundColor: `${Colors.primary}30`, alignItems: "center", justifyContent: "center" }}>
      <Text style={{ fontFamily: "Inter_700Bold", fontSize: size * 0.38, color: Colors.primary }}>{name.charAt(0).toUpperCase()}</Text>
    </View>
  );
}

function MemberRow({ member, onPress }: { member: MemberSummary; onPress: () => void }) {
  const Colors = useColors();
  const styles = useMemo(() => makeStyles(Colors), [Colors]);

  return (
    <Pressable style={({ pressed }) => [styles.memberRow, { opacity: pressed ? 0.85 : 1 }]} onPress={onPress}>
      <Avatar avatarUrl={member.avatarUrl} name={member.name} size={46} Colors={Colors} />
      <View style={styles.memberInfo}>
        <Text style={styles.memberName}>{member.name}</Text>
        <Text style={styles.memberMeta}>
          {member.username ? `@${member.username}` : member.preferredRole ?? "Member"}
        </Text>
      </View>
      <Feather name="chevron-right" size={16} color={Colors.textMuted} />
    </Pressable>
  );
}

function ProfileModal({ member, onClose, currentUserId }: {
  member: MemberSummary;
  onClose: () => void;
  currentUserId: number | null;
}) {
  const Colors = useColors();
  const styles = useMemo(() => makeStyles(Colors), [Colors]);

  const { data: profile, isLoading } = useQuery({
    queryKey: ["member-profile", member.id],
    queryFn: () => getMemberProfile(member.id),
  });

  const level = profile ? getLevel(profile.xp) : 1;
  const levelName = LEVEL_NAMES[(level - 1)] ?? "Rookie";

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

        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 48 }}>
          {/* Hero */}
          <LinearGradient colors={[Colors.primary + "CC", Colors.background]} style={styles.profileHero}>
            <Avatar avatarUrl={member.avatarUrl} name={member.name} size={88} Colors={Colors} />
            <Text style={styles.profileName}>{member.name}</Text>
            {member.username && <Text style={styles.profileUsername}>@{member.username}</Text>}
            <View style={styles.levelBadge}>
              <Text style={styles.levelText}>{levelName}</Text>
            </View>
          </LinearGradient>

          {isLoading ? (
            <ActivityIndicator color={Colors.primary} style={{ marginTop: 32 }} />
          ) : profile ? (
            <View style={styles.profileBody}>
              {/* Stats row */}
              <View style={styles.statsRow}>
                {[
                  { label: "XP", value: profile.xp.toLocaleString() },
                  { label: "Events", value: profile.eventsAttended },
                  { label: "Medals", value: profile.medalsEarned },
                  { label: "Rings", value: profile.ringsEarned },
                ].map((s) => (
                  <View key={s.label} style={styles.statBox}>
                    <Text style={styles.statValue}>{s.value}</Text>
                    <Text style={styles.statLabel}>{s.label}</Text>
                  </View>
                ))}
              </View>

              {/* Bio */}
              {profile.bio ? (
                <View style={styles.section}>
                  <Text style={styles.sectionTitle}>About</Text>
                  <Text style={styles.bioText}>{profile.bio}</Text>
                </View>
              ) : null}

              {/* Role */}
              {profile.preferredRole ? (
                <View style={styles.roleRow}>
                  <Feather name="crosshair" size={14} color={Colors.primary} />
                  <Text style={styles.roleText}>Preferred role: {profile.preferredRole}</Text>
                </View>
              ) : null}

              {/* Member since */}
              <View style={styles.roleRow}>
                <Feather name="calendar" size={14} color={Colors.textMuted} />
                <Text style={styles.memberSinceText}>
                  Member since {new Date(profile.memberSince).toLocaleDateString("en-GB", { month: "long", year: "numeric" })}
                </Text>
              </View>

              {/* DM button (not yourself) */}
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

export default function CommunityScreen() {
  const insets = useSafeAreaInsets();
  const Colors = useColors();
  const styles = useMemo(() => makeStyles(Colors), [Colors]);
  const { user, isAuthenticated } = useAuth();
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<MemberSummary | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const { data: members, isLoading, refetch } = useQuery({
    queryKey: ["members"],
    queryFn: listMembers,
  });

  const filtered = useMemo(() => {
    if (!members) return [];
    const q = search.toLowerCase().trim();
    if (!q) return members;
    return members.filter(m =>
      m.name.toLowerCase().includes(q) ||
      (m.username?.toLowerCase().includes(q)) ||
      (m.preferredRole?.toLowerCase().includes(q))
    );
  }, [members, search]);

  const handleRefresh = async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  };

  return (
    <View style={[styles.screen, { backgroundColor: Colors.background }]}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + 20 }]}>
        <View style={styles.headerRow}>
          <View>
            <Text style={styles.headerTitle}>Community</Text>
            <Text style={styles.headerSubtitle}>{members?.length ?? 0} members</Text>
          </View>
          {isAuthenticated && (
            <Pressable
              style={({ pressed }) => [styles.messagesBtn, { opacity: pressed ? 0.8 : 1 }]}
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                router.push("/messages" as any);
              }}
            >
              <Feather name="message-circle" size={20} color={Colors.primary} />
            </Pressable>
          )}
        </View>
        <View style={styles.searchBar}>
          <Feather name="search" size={16} color={Colors.textMuted} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search members…"
            placeholderTextColor={Colors.textMuted}
            value={search}
            onChangeText={setSearch}
            returnKeyType="search"
          />
          {search.length > 0 && (
            <Pressable onPress={() => setSearch("")}>
              <Feather name="x" size={16} color={Colors.textMuted} />
            </Pressable>
          )}
        </View>
      </View>

      {isLoading ? (
        <ActivityIndicator color={Colors.primary} style={{ marginTop: 40 }} />
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={m => String(m.id)}
          contentContainerStyle={[styles.listContent, { paddingBottom: insets.bottom + 24 }]}
          renderItem={({ item }) => (
            <MemberRow
              member={item}
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                setSelected(item);
              }}
            />
          )}
          ItemSeparatorComponent={() => <View style={styles.separator} />}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={Colors.primary} />
          }
          ListEmptyComponent={
            <View style={styles.empty}>
              <Feather name="users" size={40} color={Colors.textMuted} />
              <Text style={styles.emptyText}>No members found</Text>
            </View>
          }
        />
      )}

      {selected && (
        <ProfileModal
          member={selected}
          currentUserId={user?.id ?? null}
          onClose={() => setSelected(null)}
        />
      )}
    </View>
  );
}

function makeStyles(Colors: ReturnType<typeof useColors>) {
  return StyleSheet.create({
    screen: { flex: 1 },
    header: {
      backgroundColor: Colors.surface,
      borderBottomWidth: 1,
      borderBottomColor: Colors.border,
      paddingHorizontal: 20,
      paddingBottom: 16,
      gap: 14,
    },
    headerRow: { flexDirection: "row", alignItems: "flex-end", justifyContent: "space-between" },
    headerTitle: { fontFamily: "Poppins_800ExtraBold", fontSize: 32, color: Colors.text },
    headerSubtitle: { fontFamily: "Inter_400Regular", fontSize: 13, color: Colors.textSecondary },
    messagesBtn: {
      width: 42, height: 42, borderRadius: 21,
      backgroundColor: `${Colors.primary}18`,
      alignItems: "center", justifyContent: "center",
    },
    searchBar: {
      flexDirection: "row", alignItems: "center", gap: 10,
      backgroundColor: Colors.surface2, borderRadius: 14,
      paddingHorizontal: 14, paddingVertical: 10,
      borderWidth: 1, borderColor: Colors.border,
    },
    searchInput: {
      flex: 1, fontFamily: "Inter_400Regular", fontSize: 15,
      color: Colors.text, padding: 0,
    },
    listContent: { padding: 16 },
    separator: { height: 1, backgroundColor: Colors.border, marginLeft: 74 },
    memberRow: {
      flexDirection: "row", alignItems: "center", gap: 14,
      paddingVertical: 12, paddingHorizontal: 4,
    },
    memberInfo: { flex: 1 },
    memberName: { fontFamily: "Inter_600SemiBold", fontSize: 15, color: Colors.text },
    memberMeta: { fontFamily: "Inter_400Regular", fontSize: 13, color: Colors.textMuted, marginTop: 1 },
    empty: { alignItems: "center", paddingTop: 60, gap: 12 },
    emptyText: { fontFamily: "Inter_400Regular", fontSize: 15, color: Colors.textMuted },

    /* Profile modal */
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
    statsRow: { flexDirection: "row", gap: 8 },
    statBox: {
      flex: 1, backgroundColor: Colors.surface, borderRadius: 14,
      borderWidth: 1, borderColor: Colors.border,
      alignItems: "center", paddingVertical: 12,
    },
    statValue: { fontFamily: "Poppins_800ExtraBold", fontSize: 18, color: Colors.text },
    statLabel: { fontFamily: "Inter_400Regular", fontSize: 11, color: Colors.textMuted, marginTop: 2 },
    section: { gap: 6 },
    sectionTitle: { fontFamily: "Inter_600SemiBold", fontSize: 13, color: Colors.textMuted, textTransform: "uppercase", letterSpacing: 0.5 },
    bioText: { fontFamily: "Inter_400Regular", fontSize: 15, color: Colors.text, lineHeight: 22 },
    roleRow: { flexDirection: "row", alignItems: "center", gap: 8 },
    roleText: { fontFamily: "Inter_500Medium", fontSize: 14, color: Colors.text },
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
