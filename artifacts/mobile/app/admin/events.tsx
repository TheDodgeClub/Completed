import React, { useState } from "react";
import {
  View,
  Text,
  ScrollView,
  Pressable,
  StyleSheet,
  Alert,
  TextInput,
  Modal,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from "react-native";
import { router } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import Colors from "@/constants/colors";
import {
  adminListEvents,
  adminCreateEvent,
  adminUpdateEvent,
  adminDeleteEvent,
  type Event,
} from "@/lib/api";

type FormState = {
  title: string;
  description: string;
  date: string;
  location: string;
  ticketUrl: string;
  imageUrl: string;
};

const emptyForm: FormState = {
  title: "",
  description: "",
  date: "",
  location: "",
  ticketUrl: "",
  imageUrl: "",
};

function formatDateForInput(iso: string) {
  return iso.slice(0, 16).replace("T", " ");
}

function parseInputDate(s: string): string {
  return new Date(s.replace(" ", "T")).toISOString();
}

function EventCard({
  event,
  onEdit,
  onDelete,
}: {
  event: Event;
  onEdit: (e: Event) => void;
  onDelete: (e: Event) => void;
}) {
  const date = new Date(event.date);
  return (
    <View style={styles.card}>
      <View style={styles.cardLeft}>
        <View style={[styles.upcomingDot, { backgroundColor: event.isUpcoming ? Colors.success : Colors.textMuted }]} />
        <View style={{ flex: 1 }}>
          <Text style={styles.cardTitle} numberOfLines={1}>{event.title}</Text>
          <Text style={styles.cardMeta}>
            {date.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}
            {"  ·  "}
            {event.location}
          </Text>
        </View>
      </View>
      <View style={styles.cardActions}>
        <Pressable style={styles.actionBtn} onPress={() => onEdit(event)}>
          <Feather name="edit-2" size={16} color={Colors.secondary} />
        </Pressable>
        <Pressable style={styles.actionBtn} onPress={() => onDelete(event)}>
          <Feather name="trash-2" size={16} color={Colors.error} />
        </Pressable>
      </View>
    </View>
  );
}

function FormModal({
  visible,
  initial,
  onClose,
  onSave,
  saving,
}: {
  visible: boolean;
  initial: FormState;
  onClose: () => void;
  onSave: (f: FormState) => void;
  saving: boolean;
}) {
  const [form, setForm] = useState<FormState>(initial);
  const insets = useSafeAreaInsets();

  React.useEffect(() => {
    if (visible) setForm(initial);
  }, [visible, JSON.stringify(initial)]);

  const set = (key: keyof FormState) => (val: string) =>
    setForm(f => ({ ...f, [key]: val }));

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <KeyboardAvoidingView
        style={{ flex: 1, backgroundColor: Colors.background }}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <View style={[styles.modalHeader, { paddingTop: insets.top + 16 }]}>
          <Pressable onPress={onClose}>
            <Text style={styles.cancelBtn}>Cancel</Text>
          </Pressable>
          <Text style={styles.modalTitle}>{initial.title ? "Edit Event" : "New Event"}</Text>
          <Pressable onPress={() => onSave(form)} disabled={saving}>
            {saving ? (
              <ActivityIndicator size="small" color={Colors.primary} />
            ) : (
              <Text style={styles.saveBtn}>Save</Text>
            )}
          </Pressable>
        </View>
        <ScrollView style={{ flex: 1 }} contentContainerStyle={styles.modalBody} keyboardShouldPersistTaps="handled">
          <Text style={styles.fieldLabel}>Title *</Text>
          <TextInput style={styles.input} value={form.title} onChangeText={set("title")} placeholder="Event title" placeholderTextColor={Colors.textMuted} />

          <Text style={styles.fieldLabel}>Description *</Text>
          <TextInput style={[styles.input, styles.multilineInput]} value={form.description} onChangeText={set("description")} placeholder="What's this event about?" placeholderTextColor={Colors.textMuted} multiline numberOfLines={4} textAlignVertical="top" />

          <Text style={styles.fieldLabel}>Date & Time *  (YYYY-MM-DD HH:MM)</Text>
          <TextInput style={styles.input} value={form.date} onChangeText={set("date")} placeholder="2026-08-15 19:00" placeholderTextColor={Colors.textMuted} />

          <Text style={styles.fieldLabel}>Location *</Text>
          <TextInput style={styles.input} value={form.location} onChangeText={set("location")} placeholder="Venue, City" placeholderTextColor={Colors.textMuted} />

          <Text style={styles.fieldLabel}>Ticket URL</Text>
          <TextInput style={styles.input} value={form.ticketUrl} onChangeText={set("ticketUrl")} placeholder="https://..." placeholderTextColor={Colors.textMuted} autoCapitalize="none" keyboardType="url" />

          <Text style={styles.fieldLabel}>Image URL</Text>
          <TextInput style={styles.input} value={form.imageUrl} onChangeText={set("imageUrl")} placeholder="https://..." placeholderTextColor={Colors.textMuted} autoCapitalize="none" keyboardType="url" />
        </ScrollView>
      </KeyboardAvoidingView>
    </Modal>
  );
}

export default function AdminEventsScreen() {
  const insets = useSafeAreaInsets();
  const qc = useQueryClient();
  const [modalVisible, setModalVisible] = useState(false);
  const [editingEvent, setEditingEvent] = useState<Event | null>(null);

  const { data: events, isLoading } = useQuery({ queryKey: ["admin", "events"], queryFn: adminListEvents });

  const createMutation = useMutation({
    mutationFn: adminCreateEvent,
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["admin", "events"] }); setModalVisible(false); },
    onError: (e: Error) => Alert.alert("Error", e.message),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: Parameters<typeof adminUpdateEvent>[1] }) => adminUpdateEvent(id, data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["admin", "events"] }); setModalVisible(false); setEditingEvent(null); },
    onError: (e: Error) => Alert.alert("Error", e.message),
  });

  const deleteMutation = useMutation({
    mutationFn: adminDeleteEvent,
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin", "events"] }),
    onError: (e: Error) => Alert.alert("Error", e.message),
  });

  const saving = createMutation.isPending || updateMutation.isPending;

  const handleSave = (form: FormState) => {
    if (!form.title.trim() || !form.description.trim() || !form.date.trim() || !form.location.trim()) {
      Alert.alert("Validation", "Title, description, date and location are required.");
      return;
    }
    const data = {
      title: form.title.trim(),
      description: form.description.trim(),
      date: parseInputDate(form.date.trim()),
      location: form.location.trim(),
      ticketUrl: form.ticketUrl.trim() || undefined,
      imageUrl: form.imageUrl.trim() || undefined,
    };
    if (editingEvent) {
      updateMutation.mutate({ id: editingEvent.id, data });
    } else {
      createMutation.mutate(data);
    }
  };

  const handleEdit = (event: Event) => {
    setEditingEvent(event);
    setModalVisible(true);
  };

  const handleDelete = (event: Event) => {
    Alert.alert("Delete Event", `Delete "${event.title}"? This cannot be undone.`, [
      { text: "Cancel", style: "cancel" },
      { text: "Delete", style: "destructive", onPress: () => deleteMutation.mutate(event.id) },
    ]);
  };

  const formInitial: FormState = editingEvent
    ? {
        title: editingEvent.title,
        description: editingEvent.description,
        date: formatDateForInput(editingEvent.date),
        location: editingEvent.location,
        ticketUrl: editingEvent.ticketUrl ?? "",
        imageUrl: editingEvent.imageUrl ?? "",
      }
    : emptyForm;

  return (
    <View style={[styles.screen, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={styles.topBar}>
        <Pressable style={styles.backBtn} onPress={() => router.back()}>
          <Feather name="arrow-left" size={22} color={Colors.text} />
        </Pressable>
        <Text style={styles.screenTitle}>Events</Text>
        <Pressable
          style={styles.newBtn}
          onPress={() => { setEditingEvent(null); setModalVisible(true); }}
        >
          <Feather name="plus" size={20} color={Colors.background} />
          <Text style={styles.newBtnText}>New</Text>
        </Pressable>
      </View>

      {isLoading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={Colors.primary} />
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={[styles.list, { paddingBottom: insets.bottom + 24 }]}
          showsVerticalScrollIndicator={false}
        >
          {(!events || events.length === 0) && (
            <Text style={styles.empty}>No events yet. Tap + New to create one.</Text>
          )}
          {events?.map(e => (
            <EventCard key={e.id} event={e} onEdit={handleEdit} onDelete={handleDelete} />
          ))}
        </ScrollView>
      )}

      <FormModal
        visible={modalVisible}
        initial={formInitial}
        onClose={() => { setModalVisible(false); setEditingEvent(null); }}
        onSave={handleSave}
        saving={saving}
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
  newBtn: { flexDirection: "row", alignItems: "center", backgroundColor: Colors.primary, borderRadius: 20, paddingHorizontal: 14, paddingVertical: 7, gap: 5 },
  newBtnText: { color: Colors.background, fontSize: 14, fontWeight: "700" },
  list: { padding: 16, gap: 10 },
  empty: { color: Colors.textSecondary, textAlign: "center", marginTop: 60, fontSize: 15 },
  card: { backgroundColor: Colors.surface, borderRadius: 14, borderWidth: 1, borderColor: Colors.border, padding: 14, flexDirection: "row", alignItems: "center", gap: 10 },
  cardLeft: { flex: 1, flexDirection: "row", alignItems: "center", gap: 10 },
  upcomingDot: { width: 8, height: 8, borderRadius: 4 },
  cardTitle: { fontSize: 15, fontWeight: "600", color: Colors.text, marginBottom: 2 },
  cardMeta: { fontSize: 12, color: Colors.textSecondary },
  cardActions: { flexDirection: "row", gap: 8 },
  actionBtn: { padding: 8 },
  /* modal */
  modalHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 20, paddingBottom: 16, borderBottomWidth: 1, borderBottomColor: Colors.border },
  modalTitle: { fontSize: 17, fontWeight: "700", color: Colors.text },
  cancelBtn: { fontSize: 16, color: Colors.textSecondary },
  saveBtn: { fontSize: 16, fontWeight: "700", color: Colors.primary },
  modalBody: { padding: 20, gap: 4 },
  fieldLabel: { fontSize: 12, color: Colors.textSecondary, fontWeight: "600", marginTop: 12, marginBottom: 4, letterSpacing: 0.5 },
  input: { backgroundColor: Colors.surface, borderWidth: 1, borderColor: Colors.border, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12, color: Colors.text, fontSize: 15 },
  multilineInput: { minHeight: 100 },
});
