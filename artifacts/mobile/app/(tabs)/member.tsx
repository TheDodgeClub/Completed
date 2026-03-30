import React, { useMemo, useState, useRef } from "react";
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
  Share,
} from "react-native";
import QRCode from "react-native-qrcode-svg";
import * as Clipboard from "expo-clipboard";
import { router } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import * as Haptics from "expo-haptics";
import * as ImagePicker from "expo-image-picker";
import { useColors } from "@/context/ThemeContext";
import { resolveImageUrl, API_BASE } from "@/constants/api";
import { useAuth } from "@/context/AuthContext";
import {
  getUserAttendance,
  getUserUpcomingEvents,
  getUserAchievements,
  listUpcomingEvents,
  getMyTickets,
  updateProfile,
  updateAvatar,
  requestUploadUrl,
  deleteAccount,
  getBlockedUsers,
  unblockUser,
  AttendanceRecord,
  UpcomingEvent,
  Achievement,
  Ticket,
  BlockedUser,
} from "@/lib/api";
import { getToken, checkUsernameAvailable } from "@/lib/api";
import { useAnnouncements } from "@/hooks/useAnnouncements";
import { captureRef } from "react-native-view-shot";
import * as Sharing from "expo-sharing";
import PlayerCard from "@/components/PlayerCard";


const LEVEL_THRESHOLDS = [0, 300, 800, 1600, 2500, 5000, 10000, 20000, 40000, 80000];
const LEVEL_NAMES = ["Beginner", "Developing", "Experienced", "Skilled", "Advanced", "Pro", "League", "Expert", "Master", "Icon"];

const SUPPORTER_TIERS = [
  { name: "Club Friend",  emoji: "🤝", minXp: 0,    perk: "Welcome to The Dodge Club!" },
  { name: "Die Hard",     emoji: "🔥", minXp: 150,  perk: "Shoutout at events" },
  { name: "Club Legend",  emoji: "⭐", minXp: 500,  perk: "VIP supporter status" },
  { name: "Superfan",     emoji: "🏆", minXp: 1000, perk: "Name on the club wall" },
] as const;

function getSupporterProgress(xp: number) {
  let tierIdx = 0;
  for (let i = 0; i < SUPPORTER_TIERS.length; i++) {
    if (xp >= SUPPORTER_TIERS[i].minXp) tierIdx = i;
  }
  const current = SUPPORTER_TIERS[tierIdx];
  const next = SUPPORTER_TIERS[tierIdx + 1] ?? null;
  const isMax = next === null;
  const start = current.minXp;
  const end = next?.minXp ?? start;
  const progress = isMax ? 1 : Math.min(1, Math.max(0, (xp - start) / (end - start)));
  const xpToNext = isMax ? 0 : end - xp;
  return { current, next, isMax, progress, xpToNext };
}

function getLevelProgress(xp: number, level: number) {
  const currentThreshold = LEVEL_THRESHOLDS[level - 1] ?? 0;
  const nextThreshold = LEVEL_THRESHOLDS[level];
  const isMax = nextThreshold === undefined;
  const safNext = nextThreshold ?? LEVEL_THRESHOLDS[LEVEL_THRESHOLDS.length - 1];
  const progress = safNext === currentThreshold ? 1 : (xp - currentThreshold) / (safNext - currentThreshold);
  return { progress: Math.min(1, Math.max(0, progress)), nextThreshold: safNext, currentThreshold, isMax, xpToNext: isMax ? 0 : safNext - xp };
}

function getCountdown(dateStr: string): string | null {
  const diff = new Date(dateStr).getTime() - Date.now();
  if (diff <= 0 || diff > 60 * 86400000) return null;
  const d = Math.floor(diff / 86400000);
  const h = Math.floor((diff % 86400000) / 3600000);
  const m = Math.floor((diff % 3600000) / 60000);
  if (d >= 2) return `${d} days`;
  if (d === 1) return "Tomorrow";
  if (h >= 1) return `${h}h`;
  if (m >= 1) return `${m} mins`;
  return "Starting soon!";
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

function AttendanceRow({ record }: { record: AttendanceRecord }) {
  const Colors = useColors();
  const styles = useMemo(() => makeStyles(Colors), [Colors]);
  const date = new Date(record.event.date);
  const xp = record.xpEarned ?? 50;
  const streak = record.streakAt ?? 1;
  const isMilestone = (record.milestoneBonus ?? 0) > 0;
  return (
    <View style={styles.attendRow}>
      <View style={styles.attendDate}>
        <Text style={styles.attendDay}>{date.getDate()}</Text>
        <Text style={styles.attendMonth}>{date.toLocaleDateString("en-GB", { month: "short" }).toUpperCase()}</Text>
      </View>
      <View style={styles.attendInfo}>
        <Text style={styles.attendTitle} numberOfLines={1}>{record.event.title}</Text>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 6, marginTop: 2 }}>
          <Text style={styles.attendLocation} numberOfLines={1}>{record.event.location}</Text>
          {isMilestone && <Text style={styles.attendMilestoneBadge}>🎯 Milestone</Text>}
        </View>
      </View>
      <View style={{ alignItems: "flex-end", gap: 4 }}>
        <View style={styles.attendXpChip}>
          <Text style={styles.attendXpText}>+{xp} XP</Text>
        </View>
        {streak >= 2 && (
          <Text style={styles.attendStreakLabel}>🔥 ×{streak}</Text>
        )}
        {record.earnedMedal && (
          <View style={styles.medalBadge}>
            <Feather name="award" size={12} color={Colors.accent} />
          </View>
        )}
      </View>
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
        <View style={{ flexDirection: "row", flexWrap: "wrap", justifyContent: "center", gap: 20 }}>
          <Pressable
            style={({ pressed }) => [styles.privacyLink, { opacity: pressed ? 0.6 : 1 }]}
            onPress={() => router.push("/legal/guidelines")}
          >
            <Text style={styles.privacyLinkText}>Community Guidelines</Text>
          </Pressable>
          <Pressable
            style={({ pressed }) => [styles.privacyLink, { opacity: pressed ? 0.6 : 1 }]}
            onPress={() => router.push("/legal/privacy")}
          >
            <Text style={styles.privacyLinkText}>Privacy Policy</Text>
          </Pressable>
          <Pressable
            style={({ pressed }) => [styles.privacyLink, { opacity: pressed ? 0.6 : 1 }]}
            onPress={() => router.push("/legal/terms")}
          >
            <Text style={styles.privacyLinkText}>Terms of Service</Text>
          </Pressable>
        </View>
      </View>
    </ScrollView>
  );
}

/* ======= Edit Profile Modal ======= */
const SKILL_OPTIONS = ["Throwing", "Catching", "Dodging", "Tactical", "All Rounder"] as const;

function EditProfileModal({
  visible,
  onClose,
  user,
  onSave,
  onDeleteAccount,
}: {
  visible: boolean;
  onClose: () => void;
  user: any;
  onSave: (data: any) => void;
  onDeleteAccount: () => void;
}) {
  const Colors = useColors();
  const styles = useMemo(() => makeStyles(Colors), [Colors]);
  const [name, setName] = React.useState(user?.name ?? "");
  const [username, setUsername] = React.useState(user?.username ?? "");
  const [bio, setBio] = React.useState(user?.bio ?? "");
  const [selectedSkills, setSelectedSkills] = React.useState<string[]>(
    user?.skills ? user.skills.split(",").filter(Boolean).map((s: string) => s.trim()) : []
  );
  const [saving, setSaving] = React.useState(false);
  const [usernameChecking, setUsernameChecking] = React.useState(false);
  const [usernameError, setUsernameError] = React.useState("");
  const [usernameOk, setUsernameOk] = React.useState(false);
  const usernameTimer = React.useRef<ReturnType<typeof setTimeout> | null>(null);
  const isPlayer = (user?.accountType ?? "player") !== "supporter";

  React.useEffect(() => {
    if (visible) {
      setName(user?.name ?? "");
      setUsername(user?.username ?? "");
      setBio(user?.bio ?? "");
      setUsernameError("");
      setUsernameOk(false);
      setSelectedSkills(
        user?.skills ? user.skills.split(",").filter(Boolean).map((s: string) => s.trim()) : []
      );
    }
  }, [visible, user]);

  React.useEffect(() => {
    if (usernameTimer.current) clearTimeout(usernameTimer.current);
    const trimmed = username.trim().replace(/^@/, "");
    if (!trimmed || trimmed === (user?.username ?? "")) {
      setUsernameError("");
      setUsernameOk(false);
      setUsernameChecking(false);
      return;
    }
    setUsernameChecking(true);
    setUsernameError("");
    setUsernameOk(false);
    usernameTimer.current = setTimeout(async () => {
      try {
        const result = await checkUsernameAvailable(trimmed);
        if (!result.available) {
          setUsernameError(result.message ?? "Username already taken");
          setUsernameOk(false);
        } else {
          setUsernameError("");
          setUsernameOk(true);
        }
      } catch {
        setUsernameError("");
        setUsernameOk(false);
      } finally {
        setUsernameChecking(false);
      }
    }, 600);
    return () => { if (usernameTimer.current) clearTimeout(usernameTimer.current); };
  }, [username, user?.username]);

  const toggleSkill = (skill: string) => {
    setSelectedSkills(prev =>
      prev.includes(skill) ? prev.filter(s => s !== skill) : prev.length >= 3 ? prev : [...prev, skill]
    );
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await onSave({ name, username, bio, ...(isPlayer ? { skills: selectedSkills } : {}) });
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
            <Pressable onPress={handleSave} disabled={saving || usernameChecking || !!usernameError} style={styles.modalSaveBtn}>
              <Text style={[styles.modalSaveText, (saving || usernameChecking || !!usernameError) && { opacity: 0.4 }]}>
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
              <View style={styles.usernameInputRow}>
                <TextInput
                  style={[styles.fieldInput, { flex: 1, marginBottom: 0, paddingRight: 46 }, usernameError ? { borderColor: "#FF6B6B", backgroundColor: "rgba(255,107,107,0.05)" } : usernameOk ? { borderColor: "#4CAF50" } : undefined]}
                  value={username}
                  onChangeText={setUsername}
                  placeholder="@username"
                  placeholderTextColor={Colors.textMuted}
                  autoCapitalize="none"
                  autoCorrect={false}
                />
                <View style={styles.usernameInputIcon} pointerEvents="none">
                  {usernameChecking && <ActivityIndicator size="small" color={Colors.textMuted} />}
                  {!usernameChecking && usernameOk && <Feather name="check-circle" size={18} color="#4CAF50" />}
                  {!usernameChecking && !!usernameError && <Feather name="alert-circle" size={18} color="#FF6B6B" />}
                </View>
              </View>
              {!!usernameError && (
                <Text style={styles.usernameErrorText}>{usernameError}</Text>
              )}
              {!usernameError && usernameOk && (
                <Text style={styles.usernameOkText}>@{username.trim().replace(/^@/, "")} is available</Text>
              )}
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

            {isPlayer && (
              <View style={styles.fieldGroup}>
                <Text style={styles.fieldLabel}>My Skills</Text>
                <Text style={styles.fieldHint}>Select up to 3</Text>
                <View style={styles.editSkillsGrid}>
                  {SKILL_OPTIONS.map(skill => {
                    const selected = selectedSkills.includes(skill);
                    return (
                      <Pressable
                        key={skill}
                        style={[styles.editSkillChip, selected && styles.editSkillChipSelected]}
                        onPress={() => toggleSkill(skill)}
                      >
                        <Feather
                          name="check"
                          size={12}
                          color={selected ? Colors.primary : "transparent"}
                        />
                        <Text style={[styles.editSkillChipText, selected && styles.editSkillChipTextSelected]}>
                          {skill}
                        </Text>
                      </Pressable>
                    );
                  })}
                </View>
              </View>
            )}

            <Pressable
              style={({ pressed }) => [styles.deleteAccountBtn, { opacity: pressed ? 0.8 : 1 }]}
              onPress={onDeleteAccount}
            >
              <Feather name="trash-2" size={16} color="#FF3B30" />
              <Text style={styles.deleteAccountText}>Delete Account</Text>
            </Pressable>

            <View style={styles.legalFooterRow}>
              <Pressable onPress={() => { onClose(); setTimeout(() => router.push("/legal/privacy"), 300); }} style={({ pressed }) => [{ opacity: pressed ? 0.6 : 1 }]}>
                <Text style={styles.privacyLinkText}>Privacy Policy</Text>
              </Pressable>
              <Text style={styles.legalSepText}>·</Text>
              <Pressable onPress={() => { onClose(); setTimeout(() => router.push("/legal/terms"), 300); }} style={({ pressed }) => [{ opacity: pressed ? 0.6 : 1 }]}>
                <Text style={styles.privacyLinkText}>Terms of Use</Text>
              </Pressable>
              <Text style={styles.legalSepText}>·</Text>
              <Pressable onPress={() => { onClose(); setTimeout(() => router.push("/legal/guidelines"), 300); }} style={({ pressed }) => [{ opacity: pressed ? 0.6 : 1 }]}>
                <Text style={styles.privacyLinkText}>Community Guidelines</Text>
              </Pressable>
            </View>
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

/* ======= Member QR Card ======= */
function MemberQRCard({ userId, Colors, styles }: { userId: number; Colors: any; styles: any }) {
  const [expanded, setExpanded] = useState(false);
  return (
    <Pressable
      style={styles.memberIdCard}
      onPress={() => { setExpanded(e => !e); Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); }}
    >
      <View style={styles.memberIdRow}>
        <View style={{ flex: 1 }}>
          <Text style={styles.memberIdLabel}>Member QR Code</Text>
          <Text style={styles.memberIdSub}>Show to door staff for check-in</Text>
        </View>
        <Feather name={expanded ? "chevron-up" : "chevron-down"} size={18} color={Colors.textMuted} />
      </View>
      {expanded && (
        <View style={styles.memberIdQRContainer}>
          <View style={styles.memberIdQRBox}>
            <QRCode value={`dodgeclub:member:${userId}`} size={180} color={Colors.text} backgroundColor={Colors.card} />
          </View>
          <Text style={styles.memberIdSubSmall}>Member #{userId}</Text>
        </View>
      )}
    </Pressable>
  );
}

const MemberTicketRow = ({ ticket, Colors, styles }: { ticket: Ticket; Colors: any; styles: any }) => {
  const date = new Date(ticket.eventDate);
  const isCheckedIn = ticket.checkedIn;
  const isToday = date.toDateString() === new Date().toDateString();
  return (
    <View style={styles.ticketRow}>
      <View style={[styles.ticketDateBlock, isToday && styles.ticketDateBlockToday]}>
        <Text style={[styles.ticketDateDay, isToday && { color: "#fff" }]}>{date.getDate()}</Text>
        <Text style={[styles.ticketDateMonth, isToday && { color: "rgba(255,255,255,0.8)" }]}>
          {date.toLocaleDateString("en-GB", { month: "short" }).toUpperCase()}
        </Text>
      </View>
      <View style={{ flex: 1 }}>
        <Text style={styles.ticketRowTitle} numberOfLines={1}>{ticket.eventTitle}</Text>
        <Text style={styles.ticketRowLocation} numberOfLines={1}>{ticket.eventLocation}</Text>
        <Text style={styles.ticketRowTime}>
          {date.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" })}
          {isToday ? "  •  Today" : ""}
        </Text>
      </View>
      <View style={{ alignItems: "flex-end", gap: 6 }}>
        {isCheckedIn ? (
          <View style={styles.ticketCheckedInBadge}>
            <Feather name="check-circle" size={12} color="#30D158" />
            <Text style={styles.ticketCheckedInText}>In</Text>
          </View>
        ) : (
          <View style={[styles.ticketStatusBadge, ticket.status === "paid" ? styles.ticketStatusPaid : styles.ticketStatusFree]}>
            <Text style={styles.ticketStatusText}>{ticket.status === "paid" ? "Paid" : "Free"}</Text>
          </View>
        )}
        {ticket.amountPaid > 0 && (
          <Text style={styles.ticketAmountText}>£{(ticket.amountPaid / 100).toFixed(2)}</Text>
        )}
        {(ticket.eventXpReward ?? 50) > 0 && (
          <View style={{ flexDirection: "row", alignItems: "center", gap: 3 }}>
            <Feather name="zap" size={10} color={isCheckedIn ? "#30D158" : "#FFC107"} />
            <Text style={{ fontFamily: "Inter_500Medium", fontSize: 10, color: isCheckedIn ? "#30D158" : "#FFC107" }}>
              {isCheckedIn ? "XP earned" : `+${ticket.eventXpReward ?? 50} XP`}
            </Text>
          </View>
        )}
      </View>
    </View>
  );
};

/* ======= Main Screen ======= */
export default function MemberScreen() {
  const insets = useSafeAreaInsets();
  const Colors = useColors();
  const styles = useMemo(() => makeStyles(Colors), [Colors]);
  const { user, isAuthenticated, isLoading, logout, refreshUser } = useAuth();
  const queryClient = useQueryClient();
  const [refreshing, setRefreshing] = React.useState(false);
  const [editVisible, setEditVisible] = React.useState(false);
  const [uploadingAvatar, setUploadingAvatar] = React.useState(false);
  const [achievementsCollapsed, setAchievementsCollapsed] = React.useState(true);
  const [cardVisible, setCardVisible] = React.useState(false);
  const [sharingCard, setSharingCard] = React.useState(false);
  const cardRef = useRef<View>(null);

  const handleShareCard = async () => {
    setSharingCard(true);
    try {
      const uri = await captureRef(cardRef, { format: "png", quality: 1 });
      const canShare = await Sharing.isAvailableAsync();
      if (canShare) {
        await Sharing.shareAsync(uri, { mimeType: "image/png", dialogTitle: "Share your Dodge Club player card" });
      } else {
        await Share.share({ url: uri, message: "Check out my Dodge Club player card!" });
      }
    } catch {
      // sharing not supported (e.g. web) — silently ignore
    } finally {
      setSharingCard(false);
    }
  };

  const userId = user?.id ?? 0;
  const { announcements } = useAnnouncements();
  const latestAnnouncement = announcements[0] ?? null;

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


  const { data: upcomingEvents, refetch: refetchUpcoming } = useQuery({
    queryKey: ["upcoming-registered", userId],
    queryFn: () => getUserUpcomingEvents(userId),
    enabled: !!userId,
  });

  const { data: myTickets, refetch: refetchTickets } = useQuery({
    queryKey: ["my-tickets"],
    queryFn: getMyTickets,
    enabled: isAuthenticated,
  });

  const { data: blockedUsers, refetch: refetchBlocked } = useQuery({
    queryKey: ["blocked-users"],
    queryFn: getBlockedUsers,
    enabled: isAuthenticated,
  });

  const { data: clubEvents } = useQuery({
    queryKey: ["upcoming-events"],
    queryFn: listUpcomingEvents,
    staleTime: 5 * 60 * 1000,
  });

  const nextClubEvent = clubEvents?.[0] ?? null;
  const nextClubCountdown = nextClubEvent ? getCountdown(nextClubEvent.date) : null;

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

  // Upcoming tickets (paid or free, event not yet in the past)
  const upcomingTickets = (myTickets ?? []).filter(t =>
    (t.status === "paid" || t.status === "free") &&
    new Date(t.eventDate).getTime() > Date.now() - 2 * 60 * 60 * 1000 // keep for 2h after start
  );

  const handleRefresh = async () => {
    setRefreshing(true);
    await Promise.all([refreshUser(), refetchAttendance(), refetchUpcoming(), refetchAchievements(), refetchTickets()]);
    setRefreshing(false);
  };

  const handleLogout = async () => {
    Alert.alert("Sign Out", "Are you sure you want to sign out?", [
      { text: "Cancel", style: "cancel" },
      { text: "Sign Out", style: "destructive", onPress: async () => { await logout(); } },
    ]);
  };

  const handleDeleteAccount = () => {
    Alert.alert(
      "Delete Account",
      "This will permanently delete your account and all your data — XP, tickets, and event history. This cannot be undone.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete Account",
          style: "destructive",
          onPress: () => {
            Alert.alert(
              "Are you absolutely sure?",
              "Your account will be deleted immediately and cannot be recovered.",
              [
                { text: "Cancel", style: "cancel" },
                {
                  text: "Yes, Delete",
                  style: "destructive",
                  onPress: async () => {
                    try {
                      setEditVisible(false);
                      await deleteAccount();
                      router.replace("/(auth)/login");
                    } catch (err: any) {
                      Alert.alert("Error", err.message ?? "Could not delete account. Please try again.");
                    }
                  },
                },
              ]
            );
          },
        },
      ]
    );
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
  const { progress, isMax, xpToNext } = getLevelProgress(xp, level);
  const nextLevelName = LEVEL_NAMES[level] ?? "Max";
  const currentStreak = user.currentStreak ?? 0;
  const MILESTONES_DEF = [
    { events: 5, bonus: 100 }, { events: 10, bonus: 250 },
    { events: 25, bonus: 500 }, { events: 50, bonus: 1000 },
  ];
  const nextMilestone = MILESTONES_DEF.find(m => m.events > (user.eventsAttended ?? 0));
  const avatarUri = resolveImageUrl(user.avatarUrl);
  return (
    <ScrollView
      style={styles.screen}
      contentInsetAdjustmentBehavior="automatic"
      showsVerticalScrollIndicator={false}
      contentContainerStyle={Platform.OS === "web" ? { paddingBottom: 100 } : undefined}
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
            {user.accountType !== "supporter" && (
              <Pressable
                style={({ pressed }) => [styles.shareCardBtn, { opacity: pressed ? 0.8 : 1 }]}
                onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); setCardVisible(true); }}
              >
                <Feather name="share-2" size={14} color="#FFD700" />
                <Text style={styles.shareCardBtnText}>My Card</Text>
              </Pressable>
            )}
            <Pressable onPress={handleLogout} style={styles.logoutBtn}>
              <Feather name="log-out" size={18} color="rgba(255,255,255,0.7)" />
            </Pressable>
          </View>
        </View>

        {/* Name & Badges */}
        <Text style={styles.memberName}>{user.name}</Text>
        {user.username && <Text style={styles.memberUsername}>@{user.username}</Text>}

        {user.accountType === "supporter" && (
          <View style={styles.badgeRow}>
            <View style={styles.supporterBadge}>
              <Feather name="heart" size={12} color="#fff" />
              <Text style={styles.supporterBadgeText}>SUPPORTER</Text>
            </View>
          </View>
        )}

        {user.bio && <Text style={styles.memberBio}>{user.bio}</Text>}

        <Text style={styles.memberSince}>
          Member since {new Date(user.memberSince).toLocaleDateString("en-GB", { month: "long", year: "numeric" })}
        </Text>

        {user.accountType !== "supporter" && user.skills && (() => {
          const skills = user.skills!.split(",").filter(Boolean).map(s => s.trim()).slice(0, 3);
          return skills.length > 0 ? (
            <View style={styles.profileSkillsBlock}>
              <Text style={styles.profileSkillsLabel}>SKILLS</Text>
              <View style={styles.profileSkillsRow}>
                {skills.map(skill => (
                  <View key={skill} style={styles.profileSkillChip}>
                    <Text style={styles.profileSkillChipText}>{skill}</Text>
                  </View>
                ))}
              </View>
            </View>
          ) : null;
        })()}

        {/* XP Progress — players / supporter-specific tier bar */}
        {user.accountType === "supporter" ? (() => {
          const sp = getSupporterProgress(xp);
          return (
            <View style={styles.xpSection}>
              <View style={styles.xpLabelRow}>
                <Text style={styles.xpProgressLabel}>Supporter Journey</Text>
                <Text style={styles.xpLabel}>{xp.toLocaleString()} XP</Text>
              </View>
              <View style={styles.xpLevelNameRow}>
                <Text style={styles.xpLevelNameDisplay}>{sp.current.emoji} {sp.current.name}</Text>
              </View>
              <View style={styles.xpTrack}>
                <View style={[styles.xpFillSupporter, { width: `${Math.round(sp.progress * 100)}%` }]} />
              </View>
              {sp.isMax ? (
                <Text style={styles.xpHintText}>Superfan status reached 🏆 You're a club legend!</Text>
              ) : (
                <>
                  <Text style={styles.xpHintText}>
                    {sp.xpToNext} XP to unlock {sp.next!.emoji} {sp.next!.name} — {sp.next!.perk}
                  </Text>
                  <Text style={styles.xpStreakHint}>Earn XP by attending events and referring friends</Text>
                </>
              )}
              {currentStreak >= 2 && (
                <Text style={styles.xpStreakHint}>🔥 {currentStreak}-event streak — keep it going!</Text>
              )}
            </View>
          );
        })() : (
          <View style={styles.xpSection}>
            <View style={styles.xpLabelRow}>
              <Text style={styles.xpProgressLabel}>Your Progress</Text>
              <Text style={styles.xpLabel}>{xp.toLocaleString()} XP</Text>
            </View>
            <View style={styles.xpLevelNameRow}>
              <View style={styles.xpLevelBadgeInline}>
                <Text style={styles.xpLevelBadgeInlineText}>LV {level}</Text>
              </View>
              <Text style={styles.xpLevelNameDisplay}>{levelName}</Text>
            </View>
            <View style={styles.xpTrack}>
              <View style={[styles.xpFill, { width: `${Math.round(progress * 100)}%` }]} />
            </View>
            <Text style={styles.xpHintText}>
              {isMax ? "Maximum level reached 🏆" : `${xpToNext.toLocaleString()} XP needed to reach ${nextLevelName}`}
            </Text>
            {nextMilestone && (
              <Text style={styles.xpMilestoneHint}>
                🎯 {nextMilestone.events - (user.eventsAttended ?? 0)} more event{nextMilestone.events - (user.eventsAttended ?? 0) !== 1 ? "s" : ""} for your {nextMilestone.events}th milestone (+{nextMilestone.bonus} XP)
              </Text>
            )}
            {currentStreak >= 2 && (
              <Text style={styles.xpStreakHint}>🔥 {currentStreak}-event streak — bonus XP active!</Text>
            )}
          </View>
        )}
      </LinearGradient>

      {/* ── Stats Bar ── */}
      <View style={styles.statsSection}>
        {user.accountType === "supporter" ? (
          <>
            <View style={styles.statBlock}>
              <Text style={[styles.statValue, { color: Colors.accent }]}>{user.eventsAttended ?? 0}</Text>
              <Text style={styles.statLabel}>Events Attended</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statBlock}>
              <Text style={[styles.statValue, { color: Colors.primary }]}>{(user.xp ?? 0).toLocaleString()}</Text>
              <Text style={styles.statLabel}>XP Earned</Text>
            </View>
          </>
        ) : (
          <>
            <View style={styles.statBlock}>
              <Text style={[styles.statValue, { color: currentStreak > 0 ? "#FF6B35" : Colors.textMuted }]}>
                {currentStreak > 0 ? `🔥${currentStreak}` : "–"}
              </Text>
              <Text style={styles.statLabel}>Event Streak</Text>
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
          </>
        )}
      </View>

      {/* ── Next Event Countdown ── */}
      {nextClubEvent && nextClubCountdown && (
        <Pressable
          style={styles.countdownBar}
          onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); router.push("/(tabs)/tickets"); }}
        >
          <Feather name="calendar" size={14} color={Colors.warning} />
          <View style={{ flex: 1, marginLeft: 10 }}>
            <Text style={styles.countdownBarTitle} numberOfLines={1}>{nextClubEvent.title}</Text>
            <Text style={styles.countdownBarDate}>
              {new Date(nextClubEvent.date).toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" })}
            </Text>
          </View>
          <View style={styles.countdownChip}>
            <Feather name="clock" size={11} color={Colors.warning} />
            <Text style={styles.countdownChipText}>
              {nextClubCountdown === "Tomorrow"
                ? "Tomorrow's event"
                : nextClubCountdown === "Starting soon!"
                ? "Starting soon!"
                : `${nextClubCountdown} till next event`}
            </Text>
          </View>
        </Pressable>
      )}

      {latestAnnouncement && (
        <View style={styles.announcementBanner}>
          <View style={styles.announcementBannerIcon}>
            <Feather name="bell" size={14} color={Colors.primary} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.announcementBannerLabel}>Club Announcement</Text>
            <Text style={styles.announcementBannerTitle} numberOfLines={1}>{latestAnnouncement.title}</Text>
            <Text style={styles.announcementBannerBody} numberOfLines={2}>{latestAnnouncement.body}</Text>
          </View>
        </View>
      )}

      <View style={styles.body}>
        {/* ── My Tickets ── */}
        <View style={styles.section}>
          <View style={[styles.sectionHeader, { justifyContent: "space-between" }]}>
            <Text style={styles.sectionTitle}>My Tickets</Text>
            <Pressable
              onPress={() => router.push("/(tabs)/tickets?tab=my")}
              style={{ flexDirection: "row", alignItems: "center", gap: 4 }}
            >
              <Text style={{ fontFamily: "Inter_600SemiBold", fontSize: 13, color: Colors.primary }}>All tickets</Text>
              <Feather name="chevron-right" size={14} color={Colors.primary} />
            </Pressable>
          </View>
          {upcomingTickets.length > 0 ? (
            upcomingTickets.map(ticket => <MemberTicketRow key={ticket.id} ticket={ticket} Colors={Colors} styles={styles} />)
          ) : (
            <Pressable
              style={({ pressed }) => [styles.ticketEmptyCard, { opacity: pressed ? 0.85 : 1 }]}
              onPress={() => router.push("/(tabs)/tickets")}
            >
              <Feather name="tag" size={22} color={Colors.textMuted} />
              <Text style={styles.ticketEmptyText}>No upcoming tickets</Text>
              <Text style={styles.ticketEmptyHint}>Browse events and get your ticket</Text>
            </Pressable>
          )}
        </View>

        {/* ── Achievement Progress — players only, collapsible ── */}
        {user.accountType !== "supporter" && achievements && achievements.length > 0 && (
          <View style={styles.section}>
            <Pressable
              style={[styles.sectionHeader, { justifyContent: "space-between" }]}
              onPress={() => {
                setAchievementsCollapsed(c => !c);
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              }}
            >
              <Text style={styles.sectionTitle}>Achievements</Text>
              <Feather name={achievementsCollapsed ? "chevron-down" : "chevron-up"} size={18} color={Colors.textMuted} />
            </Pressable>
            {!achievementsCollapsed && (
              <View style={styles.achieveProgressList}>
                {achievements.map(a => {
                  const pct = a.threshold && a.threshold > 0 ? Math.min((a.current ?? 0) / a.threshold, 1) : 0;
                  return (
                    <View key={a.id} style={styles.achieveProgressRow}>
                      <View style={[styles.achieveProgressIcon, a.unlocked && styles.achieveProgressIconUnlocked]}>
                        <Text style={{ fontSize: 18 }}>
                          {a.icon === "star" ? "⭐" : a.icon === "award" ? "🏆" : a.icon === "shield" ? "🛡️" : a.icon === "zap" ? "⚡" : a.icon === "medal" ? "🏅" : "🎖️"}
                        </Text>
                      </View>
                      <View style={{ flex: 1 }}>
                        <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
                          <Text style={styles.achieveProgressTitle}>{a.title}</Text>
                          {a.unlocked ? (
                            <Pressable
                              onPress={() => {
                                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                                Share.share({ message: `I just unlocked the "${a.title}" achievement on The Dodge Club! 🏐 ${a.description}` });
                              }}
                              style={styles.achieveShareBtn}
                            >
                              <Feather name="share-2" size={12} color={Colors.primary} />
                              <Text style={styles.achieveShareText}>Share</Text>
                            </Pressable>
                          ) : (
                            <Text style={styles.achieveProgressCount}>
                              {a.current ?? 0}/{a.threshold ?? 0}
                            </Text>
                          )}
                        </View>
                        <View style={styles.achieveProgressTrack}>
                          <View style={[styles.achieveProgressFill, { width: `${Math.round(pct * 100)}%` }]} />
                        </View>
                        {!a.unlocked && (
                          <Text style={styles.achieveProgressHint}>{a.description}</Text>
                        )}
                      </View>
                    </View>
                  );
                })}
              </View>
            )}
          </View>
        )}

        {/* ── Upcoming Events ── */}
        {upcomingEvents && upcomingEvents.length > 0 && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Events You're Going To</Text>
            </View>
            {upcomingEvents.map(event => (
              <UpcomingEventRow key={event.id} event={event} />
            ))}
          </View>
        )}

        {/* ── Member QR Code ── */}
        <MemberQRCard userId={user.id} Colors={Colors} styles={styles} />


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

        {/* ── Referral Code ── */}
        {user.referralCode && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Refer a Friend</Text>
            </View>
            <View style={styles.referralCard}>
              <View style={styles.referralTop}>
                <View>
                  <Text style={styles.referralLabel}>Your referral code</Text>
                  <Text style={styles.referralCode}>{user.referralCode}</Text>
                </View>
                <Feather name="gift" size={28} color={Colors.primary} />
              </View>
              <Text style={styles.referralHint}>Share your code — you earn +25 XP every time a friend signs up using it. Start referring today!</Text>
              <View style={styles.referralBtnRow}>
                <Pressable
                  style={[styles.referralBtn, { flex: 1 }]}
                  onPress={async () => {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    await Clipboard.setStringAsync(user.referralCode!);
                    Alert.alert("Copied!", "Your referral code has been copied.");
                  }}
                >
                  <Feather name="copy" size={14} color={Colors.primary} />
                  <Text style={styles.referralBtnText}>Copy Code</Text>
                </Pressable>
                <Pressable
                  style={[styles.referralBtn, styles.referralBtnPrimary, { flex: 1 }]}
                  onPress={() => {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                    Share.share({
                      message: `Join The Dodge Club! Use my code ${user.referralCode} when you sign up. Download the app and start playing! 🏐`,
                      title: "Join The Dodge Club",
                    });
                  }}
                >
                  <Feather name="share-2" size={14} color="#fff" />
                  <Text style={[styles.referralBtnText, { color: "#fff" }]}>Share</Text>
                </Pressable>
              </View>
            </View>
          </View>
        )}

        {/* ── Blocked Users ── */}
        {blockedUsers && blockedUsers.length > 0 && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Feather name="slash" size={16} color={Colors.textMuted} />
              <Text style={[styles.sectionTitle, { marginLeft: 8 }]}>Blocked Members</Text>
            </View>
            {blockedUsers.map((bu: BlockedUser) => (
              <View key={bu.id} style={styles.blockedRow}>
                <View style={styles.blockedAvatar}>
                  <Text style={styles.blockedAvatarInitial}>{bu.name.charAt(0).toUpperCase()}</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.blockedName}>{bu.name}</Text>
                  {bu.username && <Text style={styles.blockedUsername}>@{bu.username}</Text>}
                </View>
                <Pressable
                  style={({ pressed }) => [styles.unblockBtn, { opacity: pressed ? 0.7 : 1 }]}
                  onPress={() => {
                    Alert.alert("Unblock", `Unblock ${bu.name}?`, [
                      { text: "Cancel", style: "cancel" },
                      {
                        text: "Unblock",
                        onPress: async () => {
                          try {
                            await unblockUser(bu.id);
                            refetchBlocked();
                            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                          } catch {}
                        },
                      },
                    ]);
                  }}
                >
                  <Text style={styles.unblockBtnText}>Unblock</Text>
                </Pressable>
              </View>
            ))}
          </View>
        )}

        <View style={{ flexDirection: "row", flexWrap: "wrap", justifyContent: "center", gap: 20, marginBottom: 16 }}>
          <Pressable
            style={({ pressed }) => [styles.privacyLink, { opacity: pressed ? 0.6 : 1 }]}
            onPress={() => router.push("/legal/guidelines")}
          >
            <Text style={styles.privacyLinkText}>Community Guidelines</Text>
          </Pressable>
          <Pressable
            style={({ pressed }) => [styles.privacyLink, { opacity: pressed ? 0.6 : 1 }]}
            onPress={() => router.push("/legal/privacy")}
          >
            <Text style={styles.privacyLinkText}>Privacy Policy</Text>
          </Pressable>
          <Pressable
            style={({ pressed }) => [styles.privacyLink, { opacity: pressed ? 0.6 : 1 }]}
            onPress={() => router.push("/legal/terms")}
          >
            <Text style={styles.privacyLinkText}>Terms of Service</Text>
          </Pressable>
        </View>

      </View>

      <EditProfileModal
        visible={editVisible}
        onClose={() => setEditVisible(false)}
        user={user}
        onSave={saveProfile}
        onDeleteAccount={handleDeleteAccount}
      />

      {/* Share My Card Modal */}
      <Modal visible={cardVisible} transparent animationType="fade" onRequestClose={() => setCardVisible(false)}>
        <View style={styles.cardModalOverlay}>
          <View style={styles.cardModalInner}>
            <Text style={styles.cardModalTitle}>Your Player Card</Text>
            <Text style={styles.cardModalSub}>Share with friends on any platform</Text>

            <View style={styles.cardModalCardWrap}>
              <PlayerCard
                ref={cardRef}
                name={user.name}
                username={user.username}
                avatarUrl={user.avatarUrl}
                level={level}
                xp={user.xp ?? 0}
                medalsEarned={user.medalsEarned ?? 0}
                ringsEarned={user.ringsEarned ?? 0}
                skills={user.skills}
              />
            </View>

            <View style={styles.cardModalActions}>
              <Pressable
                style={({ pressed }) => [styles.shareCardActionBtn, { opacity: pressed || sharingCard ? 0.7 : 1 }]}
                onPress={handleShareCard}
                disabled={sharingCard}
              >
                <Feather name="share-2" size={16} color="#000" />
                <Text style={styles.shareCardActionBtnText}>{sharingCard ? "Sharing..." : "Share Card"}</Text>
              </Pressable>
              <Pressable
                style={({ pressed }) => [styles.cardModalCloseBtn, { opacity: pressed ? 0.7 : 1 }]}
                onPress={() => setCardVisible(false)}
              >
                <Text style={styles.cardModalCloseBtnText}>Close</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
}

function makeStyles(Colors: ReturnType<typeof useColors>) {
  return StyleSheet.create({
    screen: { flex: 1, backgroundColor: Colors.background },

    announcementBanner: {
      flexDirection: "row",
      alignItems: "flex-start",
      gap: 10,
      backgroundColor: Colors.surface,
      borderBottomWidth: 1,
      borderBottomColor: Colors.border,
      borderLeftWidth: 3,
      borderLeftColor: Colors.primary,
      paddingHorizontal: 16,
      paddingVertical: 12,
    },
    announcementBannerIcon: {
      width: 28,
      height: 28,
      borderRadius: 14,
      backgroundColor: Colors.primary + "20",
      alignItems: "center",
      justifyContent: "center",
      marginTop: 2,
      flexShrink: 0,
    },
    announcementBannerLabel: {
      fontFamily: "Inter_600SemiBold",
      fontSize: 10,
      color: Colors.primary,
      textTransform: "uppercase",
      letterSpacing: 0.5,
      marginBottom: 2,
    },
    announcementBannerTitle: {
      fontFamily: "Inter_700Bold",
      fontSize: 14,
      color: Colors.text,
      marginBottom: 2,
    },
    announcementBannerBody: {
      fontFamily: "Inter_400Regular",
      fontSize: 13,
      color: Colors.textSecondary,
      lineHeight: 18,
    },

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
    shareCardBtn: {
      flexDirection: "row", alignItems: "center", gap: 5,
      backgroundColor: "rgba(255,215,0,0.12)",
      paddingHorizontal: 12, paddingVertical: 6,
      borderRadius: 20, borderWidth: 1, borderColor: "rgba(255,215,0,0.35)",
    },
    shareCardBtnText: { fontFamily: "Inter_600SemiBold", fontSize: 12, color: "#FFD700" },
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
    profileSkillsBlock: { marginBottom: 10, alignItems: "center" },
    profileSkillsLabel: {
      fontFamily: "Inter_700Bold", fontSize: 9,
      color: "rgba(255,255,255,0.45)", letterSpacing: 1.2,
      textTransform: "uppercase", marginBottom: 6,
    },
    profileSkillsRow: { flexDirection: "row", flexWrap: "wrap", gap: 6, justifyContent: "center" },
    profileSkillChip: {
      backgroundColor: "rgba(255,255,255,0.12)",
      borderRadius: 12,
      paddingHorizontal: 10,
      paddingVertical: 3,
      borderWidth: 1,
      borderColor: "rgba(255,255,255,0.18)",
    },
    profileSkillChipText: {
      fontFamily: "Inter_600SemiBold", fontSize: 11,
      color: "rgba(255,255,255,0.85)",
    },
    memberBio: {
      fontFamily: "Inter_400Regular", fontSize: 13,
      color: "rgba(255,255,255,0.75)", lineHeight: 19, marginBottom: 8,
    },
    memberSince: { fontFamily: "Inter_400Regular", fontSize: 11, color: "rgba(255,255,255,0.55)", marginBottom: 16 },

    /* Share My Card modal */
    cardModalOverlay: {
      flex: 1,
      backgroundColor: "rgba(0,0,0,0.88)",
      alignItems: "center",
      justifyContent: "center",
      paddingHorizontal: 16,
    },
    cardModalInner: {
      width: "100%",
      alignItems: "center",
      gap: 10,
    },
    cardModalTitle: {
      fontFamily: "Poppins_800ExtraBold",
      fontSize: 20,
      color: "#FFFFFF",
    },
    cardModalSub: {
      fontFamily: "Inter_400Regular",
      fontSize: 13,
      color: "rgba(255,255,255,0.5)",
      marginBottom: 4,
    },
    cardModalCardWrap: {
      shadowColor: "#FFD700",
      shadowOffset: { width: 0, height: 0 },
      shadowOpacity: 0.5,
      shadowRadius: 24,
      elevation: 16,
    },
    cardModalActions: {
      flexDirection: "row",
      gap: 10,
      marginTop: 16,
    },
    shareCardActionBtn: {
      flexDirection: "row",
      alignItems: "center",
      gap: 8,
      backgroundColor: "#FFD700",
      paddingHorizontal: 24,
      paddingVertical: 12,
      borderRadius: 14,
    },
    shareCardActionBtnText: {
      fontFamily: "Inter_700Bold",
      fontSize: 15,
      color: "#000",
    },
    cardModalCloseBtn: {
      paddingHorizontal: 20,
      paddingVertical: 12,
      borderRadius: 14,
      backgroundColor: "rgba(255,255,255,0.1)",
      borderWidth: 1,
      borderColor: "rgba(255,255,255,0.15)",
    },
    cardModalCloseBtnText: {
      fontFamily: "Inter_600SemiBold",
      fontSize: 15,
      color: "rgba(255,255,255,0.7)",
    },

    /* XP Bar */
    xpSection: { marginTop: 4 },
    xpLabelRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 2 },
    xpProgressLabel: { fontFamily: "Inter_600SemiBold", fontSize: 10, color: "rgba(255,255,255,0.5)", textTransform: "uppercase", letterSpacing: 0.7 },
    xpLabel: { fontFamily: "Inter_700Bold", fontSize: 12, color: "rgba(255,255,255,0.9)" },
    xpLevelNameRow: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 6 },
    xpLevelBadgeInline: {
      backgroundColor: "#FFD700",
      borderRadius: 6,
      paddingHorizontal: 7,
      paddingVertical: 2,
    },
    xpLevelBadgeInlineText: { fontFamily: "Inter_700Bold", fontSize: 11, color: "#000" },
    xpLevelNameDisplay: { fontFamily: "Poppins_800ExtraBold", fontSize: 14, color: "#FFC107", lineHeight: 20 },
    xpTrack: { height: 6, backgroundColor: "rgba(255,255,255,0.15)", borderRadius: 3, overflow: "hidden" },
    xpFill: { height: "100%", backgroundColor: Colors.accent, borderRadius: 3 },
    xpFillSupporter: { height: "100%", backgroundColor: "#FFC107", borderRadius: 3 },
    xpHintText: { fontFamily: "Inter_400Regular", fontSize: 10, color: "rgba(255,255,255,0.45)", marginTop: 5 },
    xpMilestoneHint: { fontFamily: "Inter_600SemiBold", fontSize: 10, color: "rgba(255,193,7,0.8)", marginTop: 4 },
    xpStreakHint: { fontFamily: "Inter_600SemiBold", fontSize: 10, color: "#FF6B35", marginTop: 3 },
    /* ── Countdown bar ── */
    countdownBar: {
      flexDirection: "row",
      alignItems: "center",
      backgroundColor: Colors.card,
      borderBottomWidth: 1,
      borderBottomColor: Colors.border,
      paddingHorizontal: 20,
      paddingVertical: 10,
    },
    countdownBarTitle: { fontFamily: "Inter_600SemiBold", fontSize: 13, color: Colors.text },
    countdownBarDate: { fontFamily: "Inter_400Regular", fontSize: 11, color: Colors.textMuted, marginTop: 1 },
    countdownChip: {
      flexDirection: "row",
      alignItems: "center",
      gap: 4,
      backgroundColor: "rgba(245,158,11,0.15)",
      borderRadius: 20,
      paddingHorizontal: 10,
      paddingVertical: 5,
      borderWidth: 1,
      borderColor: "rgba(245,158,11,0.4)",
    },
    countdownChipText: { fontFamily: "Inter_600SemiBold", fontSize: 11, color: Colors.warning },

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

    /* My Tickets inline */
    ticketRow: {
      flexDirection: "row", alignItems: "center", gap: 12,
      backgroundColor: Colors.surface, borderRadius: 16, padding: 14,
      marginBottom: 8, borderWidth: 1, borderColor: Colors.border,
    },
    ticketDateBlock: {
      width: 44, height: 50, backgroundColor: Colors.surface2,
      borderRadius: 10, alignItems: "center", justifyContent: "center",
    },
    ticketDateBlockToday: { backgroundColor: Colors.primary },
    ticketDateDay: { fontFamily: "Poppins_800ExtraBold", fontSize: 16, color: Colors.primary, lineHeight: 20 },
    ticketDateMonth: { fontFamily: "Inter_600SemiBold", fontSize: 10, color: Colors.textMuted, letterSpacing: 0.3 },
    ticketRowTitle: { fontFamily: "Inter_600SemiBold", fontSize: 14, color: Colors.text, marginBottom: 2 },
    ticketRowLocation: { fontFamily: "Inter_400Regular", fontSize: 12, color: Colors.textMuted, marginBottom: 2 },
    ticketRowTime: { fontFamily: "Inter_400Regular", fontSize: 11, color: Colors.textSecondary },
    ticketStatusBadge: {
      paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8,
    },
    ticketStatusPaid: { backgroundColor: `${Colors.primary}20`, borderWidth: 1, borderColor: `${Colors.primary}40` },
    ticketStatusFree: { backgroundColor: `${Colors.success}20`, borderWidth: 1, borderColor: `${Colors.success}40` },
    ticketStatusText: { fontFamily: "Inter_700Bold", fontSize: 11, color: Colors.primary },
    ticketCheckedInBadge: {
      flexDirection: "row", alignItems: "center", gap: 4,
      paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8,
      backgroundColor: "rgba(48,209,88,0.1)", borderWidth: 1, borderColor: "rgba(48,209,88,0.3)",
    },
    ticketCheckedInText: { fontFamily: "Inter_700Bold", fontSize: 11, color: "#30D158" },
    ticketAmountText: { fontFamily: "Inter_400Regular", fontSize: 11, color: Colors.textMuted },
    ticketEmptyCard: {
      alignItems: "center", gap: 6, padding: 24,
      backgroundColor: Colors.surface, borderRadius: 16, borderWidth: 1,
      borderColor: Colors.border,
    },
    ticketEmptyText: { fontFamily: "Inter_600SemiBold", fontSize: 14, color: Colors.textSecondary },
    ticketEmptyHint: { fontFamily: "Inter_400Regular", fontSize: 12, color: Colors.textMuted },

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
    attendLocation: { fontFamily: "Inter_400Regular", fontSize: 12, color: Colors.textMuted },
    attendXpChip: {
      paddingHorizontal: 7, paddingVertical: 3,
      backgroundColor: `${Colors.primary}20`,
      borderRadius: 8, borderWidth: 1, borderColor: `${Colors.primary}40`,
    },
    attendXpText: { fontFamily: "Inter_700Bold", fontSize: 11, color: Colors.primary },
    attendStreakLabel: { fontFamily: "Inter_600SemiBold", fontSize: 10, color: "#FF6B35" },
    attendMilestoneBadge: { fontFamily: "Inter_600SemiBold", fontSize: 10, color: Colors.accent },
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
    usernameInputRow: { flexDirection: "row", alignItems: "center" },
    usernameInputIcon: { position: "absolute", right: 14, top: 0, bottom: 0, justifyContent: "center", alignItems: "center", width: 32 },
    usernameErrorText: { fontFamily: "Inter_400Regular", fontSize: 13, color: "#FF6B6B", marginTop: 6, paddingHorizontal: 4 },
    usernameOkText: { fontFamily: "Inter_400Regular", fontSize: 13, color: "#4CAF50", marginTop: 6, paddingHorizontal: 4 },
    fieldHint: { fontFamily: "Inter_400Regular", fontSize: 12, color: Colors.textMuted, marginTop: -4, marginBottom: 10 },
    editSkillsGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
    editSkillChip: {
      flexDirection: "row", alignItems: "center", gap: 5,
      paddingHorizontal: 14, paddingVertical: 9,
      borderRadius: 20, borderWidth: 1.5,
      borderColor: Colors.border, backgroundColor: Colors.surface,
    },
    editSkillChipSelected: {
      borderColor: Colors.primary, backgroundColor: `${Colors.primary}12`,
    },
    editSkillChipText: { fontFamily: "Inter_600SemiBold", fontSize: 13, color: Colors.textSecondary },
    editSkillChipTextSelected: { color: Colors.primary },
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
      borderRadius: 16,
      overflow: "hidden",
      marginHorizontal: 16,
      marginBottom: 12,
    },
    gameCardGradient: {
      flexDirection: "row",
      alignItems: "center",
      padding: 16,
      gap: 12,
    },
    gameCardLeft: {
      width: 44,
      height: 44,
      borderRadius: 12,
      backgroundColor: "rgba(255,255,255,0.08)",
      alignItems: "center",
      justifyContent: "center",
    },
    gameCardBody: { flex: 1 },
    gameCardArrow: {},
    gameCardEmoji: { fontSize: 24 },
    gameCardTitle: { fontFamily: "Poppins_800ExtraBold", fontSize: 15, color: Colors.accent, marginBottom: 2 },
    gameCardSub: { fontFamily: "Inter_400Regular", fontSize: 12, color: "rgba(255,255,255,0.55)", marginTop: 1 },

    achieveProgressList: { gap: 12 },
    achieveProgressRow: {
      flexDirection: "row", alignItems: "flex-start", gap: 12,
      backgroundColor: Colors.surface, borderRadius: 14, padding: 14,
      borderWidth: 1, borderColor: Colors.border,
    },
    achieveProgressIcon: {
      width: 40, height: 40, borderRadius: 20,
      backgroundColor: Colors.surface2,
      alignItems: "center", justifyContent: "center", flexShrink: 0,
    },
    achieveProgressIconUnlocked: {
      backgroundColor: `${Colors.accent}20`,
      borderWidth: 1, borderColor: `${Colors.accent}40`,
    },
    achieveProgressTitle: { fontFamily: "Inter_700Bold", fontSize: 13, color: Colors.text },
    achieveProgressCount: { fontFamily: "Inter_600SemiBold", fontSize: 12, color: Colors.textMuted },
    achieveProgressTrack: {
      height: 6, backgroundColor: Colors.surface2,
      borderRadius: 3, overflow: "hidden", marginTop: 6,
    },
    achieveProgressFill: { height: "100%", backgroundColor: Colors.primary, borderRadius: 3 },
    achieveProgressHint: { fontFamily: "Inter_400Regular", fontSize: 11, color: Colors.textMuted, marginTop: 4 },
    achieveShareBtn: {
      flexDirection: "row", alignItems: "center", gap: 4,
      backgroundColor: `${Colors.primary}15`,
      paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8,
    },
    achieveShareText: { fontFamily: "Inter_600SemiBold", fontSize: 11, color: Colors.primary },

    /* Referral code */
    referralCard: {
      backgroundColor: Colors.surface, borderRadius: 18,
      borderWidth: 1, borderColor: Colors.border, padding: 18, gap: 12,
    },
    referralTop: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
    referralLabel: { fontFamily: "Inter_400Regular", fontSize: 12, color: Colors.textMuted, marginBottom: 4 },
    referralCode: {
      fontFamily: "Inter_700Bold", fontSize: 26, color: Colors.primary,
      letterSpacing: 3,
    },
    referralHint: { fontFamily: "Inter_400Regular", fontSize: 13, color: Colors.textSecondary, lineHeight: 18 },
    referralBtnRow: { flexDirection: "row", gap: 10 },
    referralBtn: {
      flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8,
      paddingVertical: 12, borderRadius: 12,
      borderWidth: 1, borderColor: Colors.primary,
    },
    referralBtnPrimary: { backgroundColor: Colors.primary, borderColor: Colors.primary },
    referralBtnText: { fontFamily: "Inter_600SemiBold", fontSize: 14, color: Colors.primary },

    /* Supporter badge */
    supporterBadge: {
      flexDirection: "row", alignItems: "center", gap: 4,
      backgroundColor: "#E91E63",
      paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8,
    },
    supporterBadgeText: { fontFamily: "Inter_700Bold", fontSize: 10, color: "#fff", letterSpacing: 0.5 },

    /* Member ID / QR Card */
    memberIdCard: {
      marginHorizontal: 16,
      marginBottom: 12,
      backgroundColor: Colors.card,
      borderRadius: 14,
      borderWidth: 1,
      borderColor: Colors.border,
      overflow: "hidden",
    },
    memberIdRow: {
      flexDirection: "row",
      alignItems: "center",
      paddingHorizontal: 16,
      paddingVertical: 14,
    },
    memberIdLabel: {
      fontFamily: "Inter_700Bold",
      fontSize: 14,
      color: Colors.text,
      marginBottom: 2,
    },
    memberIdSub: {
      fontFamily: "Inter_400Regular",
      fontSize: 12,
      color: Colors.textMuted,
    },
    memberIdQRContainer: {
      alignItems: "center",
      paddingBottom: 20,
    },
    memberIdQRBox: {
      backgroundColor: Colors.card,
      padding: 16,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: Colors.border,
    },
    memberIdSubSmall: {
      fontFamily: "Inter_400Regular",
      fontSize: 12,
      color: Colors.textMuted,
      marginTop: 10,
    },

    /* Blocked users */
    blockedRow: {
      flexDirection: "row", alignItems: "center", gap: 12,
      paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: Colors.border,
    },
    blockedAvatar: {
      width: 40, height: 40, borderRadius: 20,
      backgroundColor: Colors.surface, borderWidth: 1, borderColor: Colors.border,
      alignItems: "center", justifyContent: "center",
    },
    blockedAvatarInitial: { fontFamily: "Inter_700Bold", fontSize: 16, color: Colors.textMuted },
    blockedName: { fontFamily: "Inter_600SemiBold", fontSize: 14, color: Colors.text },
    blockedUsername: { fontFamily: "Inter_400Regular", fontSize: 12, color: Colors.textMuted },
    unblockBtn: {
      paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8,
      borderWidth: 1, borderColor: Colors.border,
    },
    unblockBtnText: { fontFamily: "Inter_600SemiBold", fontSize: 12, color: Colors.textMuted },

    /* Privacy policy & delete account */
    privacyLink: { alignItems: "center", paddingVertical: 10 },
    privacyLinkText: { fontFamily: "Inter_600SemiBold", fontSize: 12, color: Colors.textMuted, textDecorationLine: "underline" },
    legalFooterRow: {
      flexDirection: "row", flexWrap: "wrap", justifyContent: "center",
      alignItems: "center", gap: 6, paddingVertical: 10, marginBottom: 4,
    },
    legalSepText: { fontFamily: "Inter_400Regular", fontSize: 12, color: Colors.textMuted, opacity: 0.4 },
    deleteAccountBtn: {
      flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8,
      marginTop: 4, marginBottom: 32,
      paddingVertical: 14, borderRadius: 14,
      borderWidth: 1, borderColor: "#FF3B30",
      backgroundColor: "rgba(255,59,48,0.06)",
    },
    deleteAccountText: { fontFamily: "Inter_600SemiBold", fontSize: 15, color: "#FF3B30" },
  });
}
