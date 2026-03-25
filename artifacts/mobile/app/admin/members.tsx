import React, { useState } from "react";
import {
  View,
  Text,
  ScrollView,
  Pressable,
  StyleSheet,
  Alert,
  Modal,
  Switch,
  ActivityIndicator,
  FlatList,
} from "react-native";
import { router } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import Colors from "@/constants/colors";
import {
  adminListMembers,
  adminGetMemberAttendance,
  adminMarkAttendance,
  adminDeleteAttendance,
  adminListEvents,
  type AdminMember,
  type AdminAttendanceRecord,
  type Event,
} from "@/lib/api";

function MemberCard({ member, onPress }: { member: AdminMember; onPress: () => void }) {
  return (
    <Pressable style={({ pressed }) => [styles.card, pressed && styles.cardPressed]} onPress={onPress}>
      <View style={styles.avatar}>
        <Text style={styles.avatarText}>{member.name.charAt(0).toUpperCase()}</Text>
      </View>
      <View style={styles.cardBody}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
          <Text style={styles.memberName}>{member.name}</Text>
          {member.isAdmin && (
            <View style={styles.adminPill}>
              <Text style={styles.adminPillText}>Admin</Text>
            </View>
          )}
        </View>
        <Text style={styles.memberEmail}>{member.email}</Text>
      </View>
      <View style={styles.cardRight}>
        <Text style={styles.statNum}>{member.eventsAttended}</Text>
        <Text style={styles.statLbl}>events</Text>
      </View>
      <Feather name="chevron-right" size={16} color={Colors.textMuted} />
    </Pressable>
  );
}

function AttendanceRow({
  record,
  onDelete,
}: {
  record: AdminAttendanceRecord;
  onDelete: () => void;
}) {
  return (
    <View style={styles.attRow}>
      <View style={{ flex: 1 }}>
        <Text style={styles.attEvent} numberOfLines={1}>{record.event.title}</Text>
        <Text style={styles.attDate}>{new Date(record.event.date).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}</Text>
      </View>
      {record.earnedMedal && (
        <Feather name="award" size={16} color={Colors.accent} style={{ marginRight: 8 }} />
      )}
      <Pressable style={styles.deleteAttBtn} onPress={onDelete}>
        <Feather name="trash-2" size={14} color={Colors.error} />
      </Pressable>
    </View>
  );
}

function MarkAttendanceModal({
  visible,
  member,
  events,
  existingAttendance,
  onClose,
  onMark,
  marking,
}: {
  visible: boolean;
  member: AdminMember | null;
  events: Event[];
  existingAttendance: AdminAttendanceRecord[];
  onClose: () => void;
  onMark: (eventId: number, earnedMedal: boolean) => void;
  marking: boolean;
}) {
  const [selectedEventId, setSelectedEventId] = useState<number | null>(null);
  const [earnedMedal, setEarnedMedal] = useState(false);
  const insets = useSafeAreaInsets();

  React.useEffect(() => {
    if (visible) { setSelectedEventId(null); setEarnedMedal(false); }
  }, [visible]);

  const alreadyAttended = new Set(existingAttendance.map(r => r.eventId));

  const eligibleEvents = events.filter(e => !alreadyAttended.has(e.id));

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <View style={[styles.markModalContainer, { paddingTop: insets.top + 16 }]}>
        <View style={styles.modalHeader}>
          <Pressable onPress={onClose}>
            <Text style={styles.cancelBtn}>Cancel</Text>
          </Pressable>
          <Text style={styles.modalTitle}>Mark Attendance</Text>
          <Pressable
            disabled={!selectedEventId || marking}
            onPress={() => selectedEventId && onMark(selectedEventId, earnedMedal)}
          >
            {marking ? (
              <ActivityIndicator size="small" color={Colors.primary} />
            ) : (
              <Text style={[styles.saveBtn, !selectedEventId && { opacity: 0.4 }]}>Mark</Text>
            )}
          </Pressable>
        </View>

        {member && (
          <Text style={styles.markingFor}>Marking attendance for <Text style={{ color: Colors.primary }}>{member.name}</Text></Text>
        )}

        {eligibleEvents.length === 0 ? (
          <View style={styles.emptyEvents}>
            <Feather name="check-circle" size={40} color={Colors.success} />
            <Text style={styles.emptyEventsText}>This member has been marked for all events.</Text>
          </View>
        ) : (
          <>
            <Text style={styles.fieldLabel}>Select Event</Text>
            <ScrollView style={styles.eventPickerList}>
              {eligibleEvents.map(e => (
                <Pressable
                  key={e.id}
                  style={[styles.eventPickerRow, selectedEventId === e.id && styles.eventPickerRowActive]}
                  onPress={() => setSelectedEventId(e.id)}
                >
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.eventPickerName, selectedEventId === e.id && { color: Colors.primary }]}>{e.title}</Text>
                    <Text style={styles.eventPickerDate}>{new Date(e.date).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}</Text>
                  </View>
                  {selectedEventId === e.id && <Feather name="check-circle" size={20} color={Colors.primary} />}
                </Pressable>
              ))}
            </ScrollView>

            <View style={styles.medalRow}>
              <View>
                <Text style={styles.switchLabel}>Award Medal</Text>
                <Text style={styles.switchHint}>Mark that they earned a medal at this event</Text>
              </View>
              <Switch
                value={earnedMedal}
                onValueChange={setEarnedMedal}
                trackColor={{ false: Colors.border, true: Colors.accent + "88" }}
                thumbColor={earnedMedal ? Colors.accent : Colors.textMuted}
              />
            </View>
          </>
        )}
      </View>
    </Modal>
  );
}

function MemberDetailModal({
  visible,
  member,
  events,
  onClose,
}: {
  visible: boolean;
  member: AdminMember | null;
  events: Event[];
  onClose: () => void;
}) {
  const insets = useSafeAreaInsets();
  const qc = useQueryClient();
  const [markingModal, setMarkingModal] = useState(false);

  const { data: attendance, isLoading: attendanceLoading } = useQuery({
    queryKey: ["admin", "attendance", member?.id],
    queryFn: () => adminGetMemberAttendance(member!.id),
    enabled: !!member && visible,
  });

  const markMutation = useMutation({
    mutationFn: ({ eventId, earnedMedal }: { eventId: number; earnedMedal: boolean }) =>
      adminMarkAttendance({ userId: member!.id, eventId, earnedMedal }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin", "attendance", member?.id] });
      qc.invalidateQueries({ queryKey: ["admin", "members"] });
      setMarkingModal(false);
    },
    onError: (e: Error) => Alert.alert("Error", e.message),
  });

  const deleteMutation = useMutation({
    mutationFn: adminDeleteAttendance,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin", "attendance", member?.id] });
      qc.invalidateQueries({ queryKey: ["admin", "members"] });
    },
    onError: (e: Error) => Alert.alert("Error", e.message),
  });

  const handleDeleteAttendance = (record: AdminAttendanceRecord) => {
    Alert.alert("Remove Attendance", `Remove "${record.event.title}" from ${member?.name}'s record?`, [
      { text: "Cancel", style: "cancel" },
      { text: "Remove", style: "destructive", onPress: () => deleteMutation.mutate(record.id) },
    ]);
  };

  if (!member) return null;

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <View style={[styles.detailContainer, { paddingTop: insets.top + 16 }]}>
        <View style={styles.modalHeader}>
          <Pressable onPress={onClose}>
            <Feather name="arrow-left" size={22} color={Colors.text} />
          </Pressable>
          <Text style={styles.modalTitle}>{member.name}</Text>
          <Pressable style={styles.markBtn} onPress={() => setMarkingModal(true)}>
            <Feather name="plus" size={16} color={Colors.background} />
            <Text style={styles.markBtnText}>Attendance</Text>
          </Pressable>
        </View>

        {/* Member info strip */}
        <View style={styles.memberInfo}>
          <View style={styles.bigAvatar}>
            <Text style={styles.bigAvatarText}>{member.name.charAt(0).toUpperCase()}</Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.memberEmail}>{member.email}</Text>
            <Text style={styles.memberSince}>Member since {new Date(member.memberSince).toLocaleDateString("en-GB", { month: "long", year: "numeric" })}</Text>
          </View>
          <View style={styles.miniStats}>
            <View style={styles.miniStat}>
              <Text style={styles.miniStatNum}>{member.eventsAttended}</Text>
              <Text style={styles.miniStatLbl}>Events</Text>
            </View>
            <View style={styles.miniStat}>
              <Feather name="award" size={14} color={Colors.accent} />
              <Text style={styles.miniStatNum}>{member.medalsEarned}</Text>
            </View>
          </View>
        </View>

        <Text style={styles.sectionLabel}>ATTENDANCE HISTORY</Text>

        {attendanceLoading ? (
          <ActivityIndicator style={{ marginTop: 40 }} color={Colors.primary} />
        ) : !attendance || attendance.length === 0 ? (
          <Text style={styles.empty}>No attendance recorded yet.</Text>
        ) : (
          <ScrollView showsVerticalScrollIndicator={false} style={{ flex: 1 }}>
            {attendance.map(r => (
              <AttendanceRow key={r.id} record={r} onDelete={() => handleDeleteAttendance(r)} />
            ))}
          </ScrollView>
        )}
      </View>

      <MarkAttendanceModal
        visible={markingModal}
        member={member}
        events={events}
        existingAttendance={attendance ?? []}
        onClose={() => setMarkingModal(false)}
        onMark={(eventId, earnedMedal) => markMutation.mutate({ eventId, earnedMedal })}
        marking={markMutation.isPending}
      />
    </Modal>
  );
}

export default function AdminMembersScreen() {
  const insets = useSafeAreaInsets();
  const [selectedMember, setSelectedMember] = useState<AdminMember | null>(null);
  const [detailVisible, setDetailVisible] = useState(false);

  const { data: members, isLoading } = useQuery({ queryKey: ["admin", "members"], queryFn: adminListMembers });
  const { data: events = [] } = useQuery({ queryKey: ["admin", "events"], queryFn: adminListEvents });

  const openDetail = (member: AdminMember) => {
    setSelectedMember(member);
    setDetailVisible(true);
  };

  return (
    <View style={[styles.screen, { paddingTop: insets.top }]}>
      <View style={styles.topBar}>
        <Pressable style={styles.backBtn} onPress={() => router.back()}>
          <Feather name="arrow-left" size={22} color={Colors.text} />
        </Pressable>
        <Text style={styles.screenTitle}>Members</Text>
        <View style={styles.countBadge}>
          <Text style={styles.countText}>{members?.filter(m => !m.isAdmin).length ?? "—"}</Text>
        </View>
      </View>

      {isLoading ? (
        <View style={styles.center}><ActivityIndicator size="large" color={Colors.primary} /></View>
      ) : (
        <FlatList
          data={members}
          keyExtractor={m => String(m.id)}
          contentContainerStyle={[styles.list, { paddingBottom: insets.bottom + 24 }]}
          showsVerticalScrollIndicator={false}
          renderItem={({ item }) => (
            <MemberCard member={item} onPress={() => openDetail(item)} />
          )}
          ListEmptyComponent={<Text style={styles.empty}>No members yet.</Text>}
        />
      )}

      <MemberDetailModal
        visible={detailVisible}
        member={selectedMember}
        events={events}
        onClose={() => { setDetailVisible(false); setSelectedMember(null); }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: Colors.background },
  center: { flex: 1, justifyContent: "center", alignItems: "center" },
  topBar: { flexDirection: "row", alignItems: "center", paddingHorizontal: 16, paddingBottom: 12, borderBottomWidth: 1, borderBottomColor: Colors.border },
  backBtn: { padding: 8 },
  screenTitle: { flex: 1, fontSize: 20, fontWeight: "700", color: Colors.text, marginLeft: 8 },
  countBadge: { backgroundColor: Colors.surface, borderRadius: 20, borderWidth: 1, borderColor: Colors.border, paddingHorizontal: 12, paddingVertical: 4 },
  countText: { color: Colors.textSecondary, fontSize: 14, fontWeight: "600" },
  list: { padding: 16, gap: 10 },
  empty: { color: Colors.textSecondary, textAlign: "center", marginTop: 60, fontSize: 15 },
  card: { backgroundColor: Colors.surface, borderRadius: 14, borderWidth: 1, borderColor: Colors.border, padding: 14, flexDirection: "row", alignItems: "center", gap: 12 },
  cardPressed: { opacity: 0.7 },
  avatar: { width: 42, height: 42, borderRadius: 21, backgroundColor: Colors.primary + "33", alignItems: "center", justifyContent: "center" },
  avatarText: { fontSize: 18, fontWeight: "700", color: Colors.primary },
  cardBody: { flex: 1 },
  memberName: { fontSize: 15, fontWeight: "600", color: Colors.text },
  memberEmail: { fontSize: 12, color: Colors.textSecondary, marginTop: 2 },
  adminPill: { backgroundColor: Colors.accent + "22", borderRadius: 10, paddingHorizontal: 7, paddingVertical: 2, borderWidth: 1, borderColor: Colors.accent + "44" },
  adminPillText: { color: Colors.accent, fontSize: 10, fontWeight: "700" },
  cardRight: { alignItems: "center", marginRight: 4 },
  statNum: { fontSize: 16, fontWeight: "700", color: Colors.text },
  statLbl: { fontSize: 10, color: Colors.textMuted },
  /* Detail modal */
  detailContainer: { flex: 1, backgroundColor: Colors.background, paddingHorizontal: 20 },
  modalHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingBottom: 16, borderBottomWidth: 1, borderBottomColor: Colors.border },
  modalTitle: { fontSize: 17, fontWeight: "700", color: Colors.text, flex: 1, textAlign: "center" },
  cancelBtn: { fontSize: 16, color: Colors.textSecondary },
  saveBtn: { fontSize: 16, fontWeight: "700", color: Colors.primary },
  markBtn: { flexDirection: "row", alignItems: "center", backgroundColor: Colors.primary, borderRadius: 20, paddingHorizontal: 12, paddingVertical: 6, gap: 5 },
  markBtnText: { color: Colors.background, fontSize: 13, fontWeight: "700" },
  memberInfo: { flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 16, borderBottomWidth: 1, borderBottomColor: Colors.border, marginBottom: 16 },
  bigAvatar: { width: 52, height: 52, borderRadius: 26, backgroundColor: Colors.primary + "33", alignItems: "center", justifyContent: "center" },
  bigAvatarText: { fontSize: 22, fontWeight: "700", color: Colors.primary },
  memberSince: { fontSize: 11, color: Colors.textMuted, marginTop: 2 },
  miniStats: { flexDirection: "row", gap: 12 },
  miniStat: { alignItems: "center" },
  miniStatNum: { fontSize: 16, fontWeight: "700", color: Colors.text },
  miniStatLbl: { fontSize: 10, color: Colors.textMuted },
  sectionLabel: { fontSize: 11, color: Colors.textMuted, fontWeight: "700", letterSpacing: 1.5, marginBottom: 8 },
  attRow: { flexDirection: "row", alignItems: "center", paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: Colors.border + "88" },
  attEvent: { fontSize: 14, fontWeight: "600", color: Colors.text },
  attDate: { fontSize: 12, color: Colors.textSecondary, marginTop: 2 },
  deleteAttBtn: { padding: 8 },
  /* Mark attendance modal */
  markModalContainer: { flex: 1, backgroundColor: Colors.background, paddingHorizontal: 20 },
  markingFor: { fontSize: 14, color: Colors.textSecondary, paddingVertical: 12 },
  fieldLabel: { fontSize: 12, color: Colors.textSecondary, fontWeight: "600", marginBottom: 8, letterSpacing: 0.5 },
  eventPickerList: { flex: 1, marginBottom: 16 },
  eventPickerRow: { flexDirection: "row", alignItems: "center", paddingVertical: 12, paddingHorizontal: 14, backgroundColor: Colors.surface, borderRadius: 12, borderWidth: 1, borderColor: Colors.border, marginBottom: 8 },
  eventPickerRowActive: { borderColor: Colors.primary, backgroundColor: Colors.primary + "11" },
  eventPickerName: { fontSize: 14, fontWeight: "600", color: Colors.text },
  eventPickerDate: { fontSize: 12, color: Colors.textSecondary, marginTop: 2 },
  emptyEvents: { flex: 1, alignItems: "center", justifyContent: "center", gap: 12 },
  emptyEventsText: { color: Colors.textSecondary, textAlign: "center", fontSize: 15 },
  medalRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", backgroundColor: Colors.surface, borderRadius: 14, borderWidth: 1, borderColor: Colors.border, padding: 16, marginBottom: 24 },
  switchLabel: { fontSize: 15, fontWeight: "600", color: Colors.text, marginBottom: 2 },
  switchHint: { fontSize: 12, color: Colors.textSecondary },
});
