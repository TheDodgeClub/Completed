import React, { useMemo } from "react";
import {
  View,
  Text,
  ScrollView,
  Pressable,
  StyleSheet,
  ActivityIndicator,
  RefreshControl,
  Alert,
  Image,
  Modal,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  Switch,
} from "react-native";
import { router } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import * as Haptics from "expo-haptics";
import * as ImagePicker from "expo-image-picker";
import { useColors, useTheme } from "@/context/ThemeContext";
import { resolveImageUrl, API_BASE } from "@/constants/api";
import { useAuth } from "@/context/AuthContext";
import {
  getUserAttendance,
  getUserAchievements,
  getUserTeamHistory,
  getUserUpcomingEvents,
  updateProfile,
  updateAvatar,
  requestUploadUrl,
  Achievement,
  AttendanceRecord,
  TeamHistory,
  UpcomingEvent,
} from "@/lib/api";
import { getToken } from "@/lib/api";
import { usePushNotifications } from "@/hooks/usePushNotifications";
import { EliteBanner } from "@/components/EliteBanner";

const PLAYER_ROLES = ["Thrower", "Catcher", "Dodger", "All-Rounder"] as const;
const LEVEL_THRESHOLDS = [0, 300, 700, 1200, 1800, 2500, 3300, 4200, 5200, 6300];
const LEVEL_NAMES = ["Rookie", "Player", "Contender", "Competitor", "Veteran", "Elite", "Pro", "Champion", "Legend", "Icon"];

function getLevelProgress(xp: number, level: number) {
  const currentThreshold = LEVEL_THRESHOLDS[level - 1] ?? 0;
  const nextThreshold = LEVEL_THRESHOLDS[level] ?? LEVEL_THRESHOLDS[LEVEL_THRESHOLDS.length - 1];
  const progress = nextThreshold === currentThreshold ? 1 : (xp - currentThreshold) / (nextThreshold - currentThreshold);
  return { progress: Math.min(1, Math.max(0, progress)), nextThreshold, currentThreshold };
}

function LevelBadge({ level }: { level: number }) {
  const Colors = useColors();
  const styles = useMemo(() => makeStyles(Colors), [Colors]);
  return (
    <View style={styles.levelBadge}>
      <Text style={styles.levelBadgeText}>LV {level}</Text>
    </View>
  );
}

function RoleBadge({ role }: { role: string }) {
  const Colors = useColors();
  const styles = useMemo(() => makeStyles(Colors), [Colors]);
  const icons: Record<string, string> = {
    "Thrower": "target",
    "Catcher": "hands",
    "Dodger": "zap",
    "All-Rounder": "star",
  };
  return (
    <View style={styles.roleBadge}>
      <Feather name={(icons[role] ?? "user") as any} size={11} color={Colors.accent} />
      <Text style={styles.roleBadgeText}>{role}</Text>
    </View>
  );
}

function AchievementBadge({ achievement }: { achievement: Achievement }) {
  const Colors = useColors();
  const styles = useMemo(() => makeStyles(Colors), [Colors]);
  const iconMap: Record<string, string> = {
    star: "star", award: "award", shield: "shield", zap: "zap", medal: "award", trophy: "award",
  };
  const iconName = (iconMap[achievement.icon] || "award") as any;
  return (
    <View style={[styles.achieveBadge, !achievement.unlocked && styles.achieveLocked]}>
      <View style={[styles.achieveIcon, achievement.unlocked && styles.achieveIconUnlocked]}>
        <Feather name={iconName} size={20} color={achievement.unlocked ? Colors.accent : Colors.textMuted} />
      </View>
      <Text style={[styles.achieveTitle, !achievement.unlocked && { color: Colors.textMuted }]} numberOfLines={1}>
        {achievement.title}
      </Text>
      <Text style={[styles.achieveDesc, !achievement.unlocked && { color: Colors.textMuted }]} numberOfLines={2}>
        {achievement.description}
      </Text>
      {achievement.unlocked && <View style={styles.unlockedDot} />}
    </View>
  );
}

function AttendanceRow({ record }: { record: AttendanceRecord }) {
  const Colors = useColors();
  const styles = useMemo(() => makeStyles(Colors), [Colors]);
  const date = new Date(record.event.date);
  return (
    <View style={styles.attendRow}>
      <View style={styles.attendDate}>
        <Text style={styles.attendDay}>{date.getDate()}</Text>
        <Text style={styles.attendMonth}>{date.toLocaleDateString("en-GB", { month: "short" }).toUpperCase()}</Text>
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

function UpcomingEventRow({ event }: { event: UpcomingEvent }) {
  const Colors = useColors();
  const styles = useMemo(() => makeStyles(Colors), [Colors]);
  const date = new Date(event.date);
  const daysUntil = Math.ceil((date.getTime() - Date.now()) / 86400000);
  return (
    <View style={styles.upcomingRow}>
      <View style={styles.upcomingDate}>
        <Text style={styles.upcomingDay}>{date.getDate()}</Text>
        <Text style={styles.upcomingMonth}>{date.toLocaleDateString("en-GB", { month: "short" }).toUpperCase()}</Text>
      </View>
      <View style={styles.attendInfo}>
        <Text style={styles.attendTitle} numberOfLines={1}>{event.title}</Text>
        <Text style={styles.attendLocation} numberOfLines={1}>{event.location}</Text>
      </View>
      <View style={styles.daysChip}>
        <Text style={styles.daysChipText}>{daysUntil}d</Text>
      </View>
    </View>
  );
}

function TeamHistoryRow({ entry }: { entry: TeamHistory }) {
  const Colors = useColors();
  const styles = useMemo(() => makeStyles(Colors), [Colors]);
  return (
    <View style={styles.teamRow}>
      <View style={styles.teamDot} />
      <View style={{ flex: 1 }}>
        <Text style={styles.teamName}>{entry.teamName}</Text>
        <Text style={styles.teamMeta}>
          {entry.season}{entry.roleInTeam ? ` · ${entry.roleInTeam}` : ""}
        </Text>
        {entry.notes && <Text style={styles.teamNotes}>{entry.notes}</Text>}
      </View>
    </View>
  );
}


function GuestView() {
  const Colors = useColors();
  const styles = useMemo(() => makeStyles(Colors), [Colors]);
  return (
    <ScrollView style={styles.screen} contentInsetAdjustmentBehavior="automatic">
      <LinearGradient colors={[Colors.primary, "#052A15"]} style={styles.guestHero}>
        <View style={styles.guestIconWrap}>
          <Feather name="shield" size={44} color="#fff" />
        </View>
        <Text style={styles.guestTitle}>Member Zone</Text>
        <Text style={styles.guestSubtitle}>
          Your exclusive dashboard for XP, achievements, and event history.
        </Text>
        <Pressable
          style={({ pressed }) => [styles.signInBtn, { opacity: pressed ? 0.85 : 1 }]}
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
            router.push("/(auth)/register");
          }}
        >
          <Text style={styles.signInBtnText}>Join the Club — It's Free</Text>
        </Pressable>
        <Pressable style={styles.loginLink} onPress={() => router.push("/(auth)/login")}>
          <Text style={styles.loginLinkText}>Already a member? Sign in</Text>
        </Pressable>
      </LinearGradient>
      <View style={styles.guestBody}>
        {[
          { icon: "zap" as const, label: "Earn XP and level up your player card" },
          { icon: "award" as const, label: "Collect medals and achievements" },
          { icon: "calendar" as const, label: "Track your event attendance" },
        ].map(item => (
          <View key={item.label} style={styles.guestFeature}>
            <View style={styles.guestFeatureIcon}>
              <Feather name={item.icon} size={20} color={Colors.primary} />
            </View>
            <Text style={styles.guestFeatureText}>{item.label}</Text>
          </View>
        ))}
      </View>
    </ScrollView>
  );
}

/* ======= Edit Profile Modal ======= */
function EditProfileModal({
  visible,
  onClose,
  user,
  onSave,
}: {
  visible: boolean;
  onClose: () => void;
  user: any;
  onSave: (data: any) => void;
}) {
  const Colors = useColors();
  const styles = useMemo(() => makeStyles(Colors), [Colors]);
  const [name, setName] = React.useState(user?.name ?? "");
  const [username, setUsername] = React.useState(user?.username ?? "");
  const [bio, setBio] = React.useState(user?.bio ?? "");
  const [preferredRole, setPreferredRole] = React.useState(user?.preferredRole ?? "");
  const [saving, setSaving] = React.useState(false);

  React.useEffect(() => {
    if (visible) {
      setName(user?.name ?? "");
      setUsername(user?.username ?? "");
      setBio(user?.bio ?? "");
      setPreferredRole(user?.preferredRole ?? "");
    }
  }, [visible, user]);

  const handleSave = async () => {
    setSaving(true);
    try {
      await onSave({ name, username, bio, preferredRole });
      onClose();
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={{ flex: 1 }}>
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Pressable onPress={onClose} style={styles.modalCloseBtn}>
              <Text style={styles.modalCancelText}>Cancel</Text>
            </Pressable>
            <Text style={styles.modalTitle}>Edit Profile</Text>
            <Pressable onPress={handleSave} disabled={saving} style={styles.modalSaveBtn}>
              <Text style={[styles.modalSaveText, saving && { opacity: 0.5 }]}>
                {saving ? "Saving..." : "Save"}
              </Text>
            </Pressable>
          </View>

          <ScrollView style={styles.modalBody} keyboardShouldPersistTaps="handled">
            <View style={styles.fieldGroup}>
              <Text style={styles.fieldLabel}>Display Name</Text>
              <TextInput
                style={styles.fieldInput}
                value={name}
                onChangeText={setName}
                placeholder="Your name"
                placeholderTextColor={Colors.textMuted}
                autoCapitalize="words"
              />
            </View>
            <View style={styles.fieldGroup}>
              <Text style={styles.fieldLabel}>Username</Text>
              <TextInput
                style={styles.fieldInput}
                value={username}
                onChangeText={setUsername}
                placeholder="@username"
                placeholderTextColor={Colors.textMuted}
                autoCapitalize="none"
                autoCorrect={false}
              />
            </View>
            <View style={styles.fieldGroup}>
              <Text style={styles.fieldLabel}>Bio</Text>
              <TextInput
                style={[styles.fieldInput, styles.fieldInputMultiline]}
                value={bio}
                onChangeText={setBio}
                placeholder="Tell the club about yourself..."
                placeholderTextColor={Colors.textMuted}
                multiline
                numberOfLines={4}
              />
            </View>
            <View style={styles.fieldGroup}>
              <Text style={styles.fieldLabel}>Preferred Role</Text>
              <View style={styles.roleGrid}>
                {PLAYER_ROLES.map(role => (
                  <Pressable
                    key={role}
                    style={({ pressed }) => [
                      styles.roleOption,
                      preferredRole === role && styles.roleOptionSelected,
                      { opacity: pressed ? 0.8 : 1 },
                    ]}
                    onPress={() => setPreferredRole(preferredRole === role ? "" : role)}
                  >
                    <Text style={[styles.roleOptionText, preferredRole === role && styles.roleOptionTextSelected]}>
                      {role}
                    </Text>
                  </Pressable>
                ))}
              </View>
            </View>
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

/* ======= Main Screen ======= */
export default function MemberScreen() {
  const insets = useSafeAreaInsets();
  const Colors = useColors();
  const styles = useMemo(() => makeStyles(Colors), [Colors]);
  const { isDark, toggleTheme } = useTheme();
  const { user, isAuthenticated, isLoading, logout, refreshUser } = useAuth();
  const { notificationsEnabled, toggleNotifications, loading: notifLoading } = usePushNotifications(isAuthenticated);
  const queryClient = useQueryClient();
  const [refreshing, setRefreshing] = React.useState(false);
  const [editVisible, setEditVisible] = React.useState(false);
  const [uploadingAvatar, setUploadingAvatar] = React.useState(false);

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

  const { data: teamHistory, refetch: refetchTeamHistory } = useQuery({
    queryKey: ["team-history", userId],
    queryFn: () => getUserTeamHistory(userId),
    enabled: !!userId,
  });

  const { data: upcomingEvents, refetch: refetchUpcoming } = useQuery({
    queryKey: ["upcoming-registered", userId],
    queryFn: () => getUserUpcomingEvents(userId),
    enabled: !!userId,
  });

  const { mutate: saveProfile } = useMutation({
    mutationFn: updateProfile,
    onSuccess: async () => {
      await refreshUser();
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    },
    onError: (err: any) => {
      Alert.alert("Error", err.message ?? "Could not save profile");
    },
  });

  const handleRefresh = async () => {
    setRefreshing(true);
    await Promise.all([refreshUser(), refetchAttendance(), refetchAchievements(), refetchTeamHistory(), refetchUpcoming()]);
    setRefreshing(false);
  };

  const handleLogout = async () => {
    Alert.alert("Sign Out", "Are you sure you want to sign out?", [
      { text: "Cancel", style: "cancel" },
      { text: "Sign Out", style: "destructive", onPress: async () => { await logout(); } },
    ]);
  };

  const handlePickAvatar = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== "granted") {
      Alert.alert("Permission needed", "Please allow photo library access to change your profile photo.");
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });

    if (result.canceled || !result.assets?.[0]) return;

    const asset = result.assets[0];
    const uri = asset.uri;
    const filename = uri.split("/").pop() ?? "avatar.jpg";
    const contentType = asset.mimeType ?? "image/jpeg";

    setUploadingAvatar(true);
    try {
      const { uploadURL, objectPath } = await requestUploadUrl({
        name: filename,
        size: asset.fileSize ?? 0,
        contentType,
      });

      const fileResponse = await fetch(uri);
      const blob = await fileResponse.blob();
      await fetch(uploadURL, { method: "PUT", body: blob, headers: { "Content-Type": contentType } });

      await updateAvatar(objectPath);
      await refreshUser();
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (err: any) {
      Alert.alert("Upload failed", err.message ?? "Could not upload photo");
    } finally {
      setUploadingAvatar(false);
    }
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

  const xp = user.xp ?? 0;
  const level = user.level ?? 1;
  const levelName = LEVEL_NAMES[level - 1] ?? "Player";
  const { progress } = getLevelProgress(xp, level);
  const avatarUri = resolveImageUrl(user.avatarUrl);
  const unlockedCount = achievements?.filter(a => a.unlocked).length ?? 0;

  return (
    <ScrollView
      style={styles.screen}
      contentInsetAdjustmentBehavior="automatic"
      showsVerticalScrollIndicator={false}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={Colors.primary} />}
    >
      {/* ── Hero / Player Card ── */}
      <LinearGradient
        colors={[Colors.primary, "#052A15"]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[styles.profileHero, { paddingTop: insets.top + 20 }]}
      >
        <View style={styles.heroTopRow}>
          {/* Avatar */}
          <Pressable onPress={handlePickAvatar} disabled={uploadingAvatar} style={styles.avatarWrap}>
            {uploadingAvatar ? (
              <View style={styles.avatarCircle}>
                <ActivityIndicator color="#fff" />
              </View>
            ) : avatarUri ? (
              <Image source={{ uri: avatarUri }} style={styles.avatarCircle} />
            ) : (
              <View style={styles.avatarCircle}>
                <Text style={styles.avatarInitial}>{user.name.charAt(0).toUpperCase()}</Text>
              </View>
            )}
            <View style={styles.avatarEditBadge}>
              <Feather name="camera" size={10} color="#fff" />
            </View>
            <Text style={styles.avatarChangeLabel}>{uploadingAvatar ? "Uploading..." : "Change"}</Text>
          </Pressable>

          <View style={styles.heroActions}>
            <Pressable
              style={({ pressed }) => [styles.editBtn, { opacity: pressed ? 0.8 : 1 }]}
              onPress={() => setEditVisible(true)}
            >
              <Feather name="edit-2" size={14} color="#fff" />
              <Text style={styles.editBtnText}>Edit</Text>
            </Pressable>
            <Pressable onPress={handleLogout} style={styles.logoutBtn}>
              <Feather name="log-out" size={18} color="rgba(255,255,255,0.7)" />
            </Pressable>
          </View>
        </View>

        {/* Name & Badges */}
        <Text style={styles.memberName}>{user.name}</Text>
        {user.username && <Text style={styles.memberUsername}>@{user.username}</Text>}

        <View style={styles.badgeRow}>
          <LevelBadge level={level} />
          <Text style={styles.levelNameText}>{levelName}</Text>
          {user.preferredRole && <RoleBadge role={user.preferredRole} />}
          {user.isElite && (
            <View style={styles.eliteBadge}>
              <Feather name="star" size={10} color="#0D0D0D" />
              <Text style={styles.eliteBadgeText}>ELITE</Text>
            </View>
          )}
        </View>

        {user.bio && <Text style={styles.memberBio}>{user.bio}</Text>}

        <Text style={styles.memberSince}>
          Member since {new Date(user.memberSince).toLocaleDateString("en-GB", { month: "long", year: "numeric" })}
        </Text>

        {/* XP Progress */}
        <View style={styles.xpSection}>
          <View style={styles.xpLabelRow}>
            <Text style={styles.xpLabel}>{xp.toLocaleString()} XP</Text>
            <Text style={styles.xpNextLevel}>Level {level + 1}</Text>
          </View>
          <View style={styles.xpTrack}>
            <View style={[styles.xpFill, { width: `${Math.round(progress * 100)}%` }]} />
          </View>
        </View>
      </LinearGradient>

      {/* ── Stats Bar ── */}
      <View style={styles.statsSection}>
        <View style={styles.statBlock}>
          <Text style={[styles.statValue, { color: Colors.primary }]}>{user.eventsAttended ?? 0}</Text>
          <Text style={styles.statLabel}>Events</Text>
        </View>
        <View style={styles.statDivider} />
        <View style={styles.statBlock}>
          <Text style={[styles.statValue, { color: Colors.accent }]}>{user.medalsEarned ?? 0}</Text>
          <Text style={styles.statLabel}>Medals</Text>
        </View>
        <View style={styles.statDivider} />
        <View style={styles.statBlock}>
          <Text style={[styles.statValue, { color: "#A78BFA" }]}>{user.ringsEarned ?? 0}</Text>
          <Text style={styles.statLabel}>Rings</Text>
        </View>
        <View style={styles.statDivider} />
        <View style={styles.statBlock}>
          <Text style={[styles.statValue, { color: "#60A5FA" }]}>{unlockedCount}</Text>
          <Text style={styles.statLabel}>Awards</Text>
        </View>
      </View>

      <View style={styles.body}>
        {/* ── Quick Actions ── */}
        <View style={styles.quickActions}>
          <Pressable
            style={({ pressed }) => [styles.quickBtn, { opacity: pressed ? 0.8 : 1 }]}
            onPress={() => router.push("/(tabs)/tickets")}
          >
            <Feather name="tag" size={20} color={Colors.primary} />
            <Text style={styles.quickBtnText}>Tickets</Text>
          </Pressable>
          <Pressable
            style={({ pressed }) => [styles.quickBtn, { opacity: pressed ? 0.8 : 1 }]}
            onPress={() => router.push("/(tabs)/merch")}
          >
            <Feather name="shopping-bag" size={20} color={Colors.secondary} />
            <Text style={styles.quickBtnText}>Merch</Text>
          </Pressable>
          <Pressable
            style={({ pressed }) => [styles.quickBtn, user.isElite ? styles.quickBtnElite : {}, { opacity: pressed ? 0.8 : 1 }]}
            onPress={() => router.push("/elite")}
          >
            <Feather name="star" size={20} color={Colors.accent} />
            <Text style={styles.quickBtnText}>{user.isElite ? "Elite" : "Go Elite"}</Text>
          </Pressable>
        </View>

        {/* ── Upcoming Events ── */}
        {upcomingEvents && upcomingEvents.length > 0 && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Upcoming Events</Text>
            </View>
            {upcomingEvents.map(event => (
              <UpcomingEventRow key={event.id} event={event} />
            ))}
          </View>
        )}

        {/* ── Achievements ── */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Achievements</Text>
          </View>
          {achievements && achievements.length > 0 && (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.achieveScroll}>
              <View style={styles.achieveRow}>
                {achievements.map(a => (
                  <AchievementBadge key={a.id} achievement={a} />
                ))}
              </View>
            </ScrollView>
          )}
          {/* Mini Game */}
          <Pressable
            style={({ pressed }) => [styles.gameCard, { opacity: pressed ? 0.85 : 1 }]}
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
              router.push("/games/dodge");
            }}
          >
            <View style={styles.gameCardIcon}>
              <Text style={styles.gameCardEmoji}>🏐</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.gameCardTitle}>DODGEBALL</Text>
              <Text style={styles.gameCardSub}>Throw at the opponent — earn up to +50 XP</Text>
            </View>
            <Feather name="chevron-right" size={18} color={Colors.accent} />
          </Pressable>
        </View>

        {/* ── Team History ── */}
        {teamHistory && teamHistory.length > 0 && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Team History</Text>
            </View>
            <View style={styles.teamList}>
              {teamHistory.map(entry => (
                <TeamHistoryRow key={entry.id} entry={entry} />
              ))}
            </View>
          </View>
        )}

        {/* ── Go Elite Banner ── */}
        <EliteBanner isElite={user.isElite ?? false} isAuthenticated={true} />

        {/* ── Event History ── */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Event History</Text>
          </View>
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

        {/* ── Settings ── */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Settings</Text>
          </View>
          <View style={styles.prefCard}>
            <View style={styles.prefRow}>
              <View style={styles.prefIconWrap}>
                <Feather name="bell" size={18} color={notificationsEnabled ? Colors.primary : Colors.textMuted} />
              </View>
              <View style={styles.prefInfo}>
                <Text style={styles.prefLabel}>Push Notifications</Text>
                <Text style={styles.prefHint}>
                  {notificationsEnabled
                    ? "You'll receive event alerts & club updates"
                    : "Enable to get event reminders & club news"}
                </Text>
              </View>
              {notifLoading ? (
                <ActivityIndicator size="small" color={Colors.primary} />
              ) : (
                <Switch
                  value={notificationsEnabled}
                  onValueChange={async (val) => {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    const ok = await toggleNotifications(val);
                    if (val && !ok) {
                      Alert.alert(
                        "Permission Denied",
                        "Please allow notifications in your device settings to receive Dodge Club alerts.",
                      );
                    }
                  }}
                  trackColor={{ false: Colors.border, true: Colors.primary + "88" }}
                  thumbColor={notificationsEnabled ? Colors.primary : Colors.textMuted}
                  ios_backgroundColor={Colors.border}
                />
              )}
            </View>

            <View style={styles.prefDivider} />

            <View style={styles.prefRow}>
              <View style={styles.prefIconWrap}>
                <Feather name={isDark ? "sun" : "moon"} size={18} color={Colors.accent} />
              </View>
              <View style={styles.prefInfo}>
                <Text style={styles.prefLabel}>{isDark ? "Dark Mode" : "Light Mode"}</Text>
                <Text style={styles.prefHint}>Toggle the app appearance</Text>
              </View>
              <Switch
                value={isDark}
                onValueChange={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  toggleTheme();
                }}
                trackColor={{ false: Colors.border, true: Colors.accent + "66" }}
                thumbColor={isDark ? Colors.accent : Colors.textMuted}
                ios_backgroundColor={Colors.border}
              />
            </View>
          </View>
        </View>
      </View>

      <EditProfileModal
        visible={editVisible}
        onClose={() => setEditVisible(false)}
        user={user}
        onSave={saveProfile}
      />
    </ScrollView>
  );
}

function makeStyles(Colors: ReturnType<typeof useColors>) {
  return StyleSheet.create({
    screen: { flex: 1, backgroundColor: Colors.background },

    /* Hero */
    profileHero: { paddingHorizontal: 24, paddingBottom: 28 },
    heroTopRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 16 },
    avatarWrap: { position: "relative" },
    avatarCircle: {
      width: 80, height: 80, borderRadius: 40,
      backgroundColor: "rgba(255,255,255,0.2)",
      alignItems: "center", justifyContent: "center",
      borderWidth: 3, borderColor: "rgba(255,255,255,0.4)",
      overflow: "hidden",
    },
    avatarInitial: { fontFamily: "Poppins_800ExtraBold", fontSize: 32, color: "#fff" },
    avatarEditBadge: {
      position: "absolute", bottom: 2, right: 2,
      width: 22, height: 22, borderRadius: 11,
      backgroundColor: Colors.primary,
      alignItems: "center", justifyContent: "center",
      borderWidth: 2, borderColor: Colors.background,
    },
    avatarChangeLabel: {
      fontFamily: "Inter_600SemiBold", fontSize: 10,
      color: "rgba(255,255,255,0.7)", textAlign: "center", marginTop: 4,
    },
    heroActions: { flexDirection: "row", alignItems: "center", gap: 8, marginTop: 4 },
    themeToggleBtn: {
      width: 34, height: 34, borderRadius: 17,
      backgroundColor: "rgba(255,255,255,0.12)",
      alignItems: "center", justifyContent: "center",
      borderWidth: 1, borderColor: "rgba(255,255,255,0.2)",
    },
    editBtn: {
      flexDirection: "row", alignItems: "center", gap: 5,
      backgroundColor: "rgba(255,255,255,0.15)",
      paddingHorizontal: 12, paddingVertical: 6,
      borderRadius: 20, borderWidth: 1, borderColor: "rgba(255,255,255,0.2)",
    },
    editBtnText: { fontFamily: "Inter_600SemiBold", fontSize: 12, color: "#fff" },
    logoutBtn: { padding: 8 },

    memberName: { fontFamily: "Poppins_800ExtraBold", fontSize: 26, color: "#fff", marginBottom: 2 },
    memberUsername: { fontFamily: "Inter_400Regular", fontSize: 14, color: "rgba(255,255,255,0.65)", marginBottom: 8 },
    badgeRow: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 10 },
    levelBadge: {
      backgroundColor: Colors.accent, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8,
    },
    levelBadgeText: { fontFamily: "Inter_700Bold", fontSize: 11, color: "#000" },
    levelNameText: { fontFamily: "Inter_600SemiBold", fontSize: 12, color: "rgba(255,255,255,0.8)" },
    roleBadge: {
      flexDirection: "row", alignItems: "center", gap: 4,
      backgroundColor: `${Colors.accent}20`,
      paddingHorizontal: 8, paddingVertical: 3,
      borderRadius: 8, borderWidth: 1, borderColor: `${Colors.accent}40`,
    },
    roleBadgeText: { fontFamily: "Inter_600SemiBold", fontSize: 11, color: Colors.accent },
    eliteBadge: {
      flexDirection: "row", alignItems: "center", gap: 3,
      backgroundColor: Colors.accent,
      paddingHorizontal: 8, paddingVertical: 3,
      borderRadius: 8,
    },
    eliteBadgeText: { fontFamily: "Inter_700Bold", fontSize: 10, color: "#0D0D0D", letterSpacing: 0.5 },
    quickBtnElite: { borderColor: Colors.accent, borderWidth: 1.5 },

    memberBio: {
      fontFamily: "Inter_400Regular", fontSize: 13,
      color: "rgba(255,255,255,0.75)", lineHeight: 19, marginBottom: 8,
    },
    memberSince: { fontFamily: "Inter_400Regular", fontSize: 11, color: "rgba(255,255,255,0.55)", marginBottom: 16 },

    /* XP Bar */
    xpSection: { marginTop: 4 },
    xpLabelRow: { flexDirection: "row", justifyContent: "space-between", marginBottom: 6 },
    xpLabel: { fontFamily: "Inter_700Bold", fontSize: 12, color: "rgba(255,255,255,0.9)" },
    xpNextLevel: { fontFamily: "Inter_400Regular", fontSize: 11, color: "rgba(255,255,255,0.5)" },
    xpTrack: { height: 6, backgroundColor: "rgba(255,255,255,0.15)", borderRadius: 3, overflow: "hidden" },
    xpFill: { height: "100%", backgroundColor: Colors.accent, borderRadius: 3 },

    /* Stats */
    statsSection: {
      flexDirection: "row", backgroundColor: Colors.surface,
      borderBottomWidth: 1, borderBottomColor: Colors.border, paddingVertical: 18,
    },
    statBlock: { flex: 1, alignItems: "center", gap: 3 },
    statDivider: { width: 1, backgroundColor: Colors.border, marginVertical: 4 },
    statValue: { fontFamily: "Poppins_800ExtraBold", fontSize: 24, lineHeight: 28 },
    statLabel: { fontFamily: "Inter_400Regular", fontSize: 10, color: Colors.textMuted, textTransform: "uppercase", letterSpacing: 0.3 },

    /* Body */
    body: { padding: 20 },
    quickActions: { flexDirection: "row", gap: 10, marginBottom: 28 },
    quickBtn: {
      flex: 1, backgroundColor: Colors.surface, borderRadius: 14, padding: 14,
      alignItems: "center", gap: 8, borderWidth: 1, borderColor: Colors.border,
    },
    quickBtnText: { fontFamily: "Inter_600SemiBold", fontSize: 12, color: Colors.text, textAlign: "center" },

    /* Sections */
    section: { marginBottom: 28 },
    sectionHeader: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 14 },
    sectionTitle: { fontFamily: "Poppins_800ExtraBold", fontSize: 20, color: Colors.text },

    /* Upcoming events */
    upcomingRow: {
      flexDirection: "row", alignItems: "center", gap: 12,
      backgroundColor: `${Colors.primary}10`,
      borderRadius: 14, padding: 14, marginBottom: 8,
      borderWidth: 1, borderColor: `${Colors.primary}30`,
    },
    upcomingDate: {
      width: 44, height: 50, backgroundColor: Colors.primary,
      borderRadius: 10, alignItems: "center", justifyContent: "center",
    },
    upcomingDay: { fontFamily: "Poppins_800ExtraBold", fontSize: 16, color: "#fff", lineHeight: 20 },
    upcomingMonth: { fontFamily: "Inter_600SemiBold", fontSize: 10, color: "rgba(255,255,255,0.8)", letterSpacing: 0.3 },
    daysChip: {
      backgroundColor: Colors.primary, paddingHorizontal: 8, paddingVertical: 4,
      borderRadius: 8, minWidth: 36, alignItems: "center",
    },
    daysChipText: { fontFamily: "Inter_700Bold", fontSize: 11, color: "#fff" },

    /* Achievements */
    achieveScroll: { marginHorizontal: -20 },
    achieveRow: { flexDirection: "row", gap: 10, paddingHorizontal: 20, paddingBottom: 4 },
    achieveBadge: {
      width: 120, backgroundColor: Colors.surface, borderRadius: 16, padding: 14,
      alignItems: "center", gap: 6, borderWidth: 1, borderColor: Colors.border, position: "relative",
    },
    achieveLocked: { opacity: 0.45 },
    achieveIcon: {
      width: 44, height: 44, borderRadius: 22, backgroundColor: Colors.surface2,
      alignItems: "center", justifyContent: "center",
    },
    achieveIconUnlocked: { backgroundColor: `${Colors.accent}20`, borderWidth: 1, borderColor: `${Colors.accent}40` },
    achieveTitle: { fontFamily: "Inter_700Bold", fontSize: 12, color: Colors.text, textAlign: "center" },
    achieveDesc: { fontFamily: "Inter_400Regular", fontSize: 10, color: Colors.textSecondary, textAlign: "center", lineHeight: 14 },
    unlockedDot: {
      position: "absolute", top: 10, right: 10, width: 8, height: 8,
      borderRadius: 4, backgroundColor: Colors.success,
    },

    /* Team history */
    teamList: {
      backgroundColor: Colors.surface, borderRadius: 16,
      borderWidth: 1, borderColor: Colors.border, overflow: "hidden",
    },
    teamRow: {
      flexDirection: "row", gap: 14, padding: 14,
      borderBottomWidth: 1, borderBottomColor: Colors.border,
    },
    teamDot: {
      width: 10, height: 10, borderRadius: 5, backgroundColor: Colors.primary,
      marginTop: 5, flexShrink: 0,
    },
    teamName: { fontFamily: "Inter_700Bold", fontSize: 14, color: Colors.text, marginBottom: 2 },
    teamMeta: { fontFamily: "Inter_600SemiBold", fontSize: 12, color: Colors.textSecondary },
    teamNotes: { fontFamily: "Inter_400Regular", fontSize: 12, color: Colors.textMuted, marginTop: 4 },

    /* Attendance */
    attendRow: {
      flexDirection: "row", alignItems: "center", gap: 12,
      backgroundColor: Colors.surface, borderRadius: 14, padding: 14,
      marginBottom: 8, borderWidth: 1, borderColor: Colors.border,
    },
    attendDate: {
      width: 44, height: 50, backgroundColor: Colors.surface2,
      borderRadius: 10, alignItems: "center", justifyContent: "center",
    },
    attendDay: { fontFamily: "Poppins_800ExtraBold", fontSize: 16, color: Colors.primary, lineHeight: 20 },
    attendMonth: { fontFamily: "Inter_600SemiBold", fontSize: 10, color: Colors.textMuted, letterSpacing: 0.3 },
    attendInfo: { flex: 1 },
    attendTitle: { fontFamily: "Inter_600SemiBold", fontSize: 14, color: Colors.text },
    attendLocation: { fontFamily: "Inter_400Regular", fontSize: 12, color: Colors.textMuted, marginTop: 2 },
    medalBadge: {
      width: 32, height: 32, borderRadius: 16,
      backgroundColor: `${Colors.accent}20`,
      alignItems: "center", justifyContent: "center",
      borderWidth: 1, borderColor: `${Colors.accent}40`,
    },

    /* Preferences */
    prefCard: {
      backgroundColor: Colors.surface, borderRadius: 18,
      borderWidth: 1, borderColor: Colors.border, overflow: "hidden",
    },
    prefRow: {
      flexDirection: "row", alignItems: "center", gap: 14, padding: 16,
    },
    prefIconWrap: {
      width: 38, height: 38, borderRadius: 12,
      backgroundColor: Colors.surface2,
      alignItems: "center", justifyContent: "center", flexShrink: 0,
    },
    prefInfo: { flex: 1 },
    prefLabel: { fontFamily: "Inter_600SemiBold", fontSize: 15, color: Colors.text },
    prefHint: { fontFamily: "Inter_400Regular", fontSize: 12, color: Colors.textMuted, marginTop: 2 },
    prefDivider: { height: 1, backgroundColor: Colors.border, marginLeft: 68 },

    /* Empty */
    empty: { alignItems: "center", paddingVertical: 32, gap: 10 },
    emptyText: { fontFamily: "Inter_400Regular", fontSize: 14, color: Colors.textMuted },
    exploreBtn: {
      backgroundColor: Colors.primary, borderRadius: 12,
      paddingHorizontal: 20, paddingVertical: 10, marginTop: 6,
    },
    exploreBtnText: { fontFamily: "Inter_600SemiBold", fontSize: 14, color: "#fff" },

    /* Guest */
    guestHero: { padding: 32, paddingTop: 60, alignItems: "center", gap: 12 },
    guestIconWrap: {
      width: 88, height: 88, borderRadius: 44,
      backgroundColor: "rgba(255,255,255,0.15)",
      alignItems: "center", justifyContent: "center", marginBottom: 8,
    },
    guestTitle: { fontFamily: "Poppins_800ExtraBold", fontSize: 30, color: "#fff", textAlign: "center" },
    guestSubtitle: {
      fontFamily: "Inter_400Regular", fontSize: 15,
      color: "rgba(255,255,255,0.8)", textAlign: "center", lineHeight: 22, paddingHorizontal: 10,
    },
    guestBody: { padding: 24, gap: 16 },
    guestFeature: {
      flexDirection: "row", alignItems: "center", gap: 14,
      backgroundColor: Colors.surface, borderRadius: 14,
      padding: 16, borderWidth: 1, borderColor: Colors.border,
    },
    guestFeatureIcon: {
      width: 40, height: 40, borderRadius: 20,
      backgroundColor: `${Colors.primary}20`,
      alignItems: "center", justifyContent: "center",
    },
    guestFeatureText: { fontFamily: "Inter_500Medium", fontSize: 14, color: Colors.text, flex: 1 },
    signInBtn: {
      backgroundColor: "#fff", borderRadius: 14, paddingVertical: 17, alignItems: "center",
      alignSelf: "stretch",
      shadowColor: "#000", shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.2, shadowRadius: 10, elevation: 6, marginTop: 20,
    },
    signInBtnText: { fontFamily: "Inter_700Bold", fontSize: 16, color: Colors.primary },
    loginLink: { alignItems: "center", paddingVertical: 10 },
    loginLinkText: { fontFamily: "Inter_600SemiBold", fontSize: 14, color: "rgba(255,255,255,0.8)" },

    /* Edit Modal */
    modalContainer: { flex: 1, backgroundColor: Colors.background },
    modalHeader: {
      flexDirection: "row", alignItems: "center", justifyContent: "space-between",
      padding: 16, paddingTop: 20, borderBottomWidth: 1, borderBottomColor: Colors.border,
    },
    modalCloseBtn: { padding: 4 },
    modalCancelText: { fontFamily: "Inter_400Regular", fontSize: 16, color: Colors.textSecondary },
    modalTitle: { fontFamily: "Poppins_800ExtraBold", fontSize: 17, color: Colors.text },
    modalSaveBtn: { padding: 4 },
    modalSaveText: { fontFamily: "Inter_700Bold", fontSize: 16, color: Colors.primary },
    modalBody: { padding: 20 },
    fieldGroup: { marginBottom: 22 },
    fieldLabel: { fontFamily: "Inter_600SemiBold", fontSize: 12, color: Colors.textMuted, textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 8 },
    fieldInput: {
      backgroundColor: Colors.surface, borderRadius: 14, padding: 14,
      color: Colors.text, fontFamily: "Inter_400Regular", fontSize: 15,
      borderWidth: 1, borderColor: Colors.border,
    },
    fieldInputMultiline: { minHeight: 100, textAlignVertical: "top" },
    roleGrid: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
    roleOption: {
      paddingHorizontal: 16, paddingVertical: 10, borderRadius: 12,
      borderWidth: 1, borderColor: Colors.border, backgroundColor: Colors.surface,
    },
    roleOptionSelected: {
      backgroundColor: `${Colors.primary}20`, borderColor: Colors.primary,
    },
    roleOptionText: { fontFamily: "Inter_600SemiBold", fontSize: 14, color: Colors.textSecondary },
    roleOptionTextSelected: { color: Colors.primary },

    /* Game card */
    gameCard: {
      flexDirection: "row", alignItems: "center", gap: 12,
      backgroundColor: Colors.surface, borderRadius: 14, marginTop: 12,
      padding: 14, borderWidth: 1, borderColor: `${Colors.accent}33`,
    },
    gameCardIcon: {
      width: 42, height: 42, borderRadius: 10,
      backgroundColor: `${Colors.primary}22`,
      alignItems: "center", justifyContent: "center",
    },
    gameCardEmoji: { fontSize: 22 },
    gameCardTitle: { fontFamily: "Poppins_800ExtraBold", fontSize: 15, color: Colors.accent },
    gameCardSub: { fontFamily: "Inter_400Regular", fontSize: 12, color: Colors.textMuted, marginTop: 1 },
  });
}
