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
  Switch,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from "react-native";
import { router } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import Colors from "@/constants/colors";
import { useAuth } from "@/context/AuthContext";
import {
  adminListPosts,
  adminCreatePost,
  adminUpdatePost,
  adminDeletePost,
  type Post,
} from "@/lib/api";

type FormState = {
  title: string;
  content: string;
  imageUrl: string;
  isMembersOnly: boolean;
};

const emptyForm: FormState = { title: "", content: "", imageUrl: "", isMembersOnly: false };

function PostCard({
  post,
  onEdit,
  onDelete,
}: {
  post: Post;
  onEdit: (p: Post) => void;
  onDelete: (p: Post) => void;
}) {
  return (
    <View style={styles.card}>
      <View style={styles.cardLeft}>
        {post.isMembersOnly && (
          <View style={styles.lockBadge}>
            <Feather name="lock" size={10} color={Colors.accent} />
          </View>
        )}
        <View style={{ flex: 1 }}>
          <Text style={styles.cardTitle} numberOfLines={1}>{post.title}</Text>
          <Text style={styles.cardMeta} numberOfLines={1}>{post.content}</Text>
        </View>
      </View>
      <View style={styles.cardActions}>
        <Pressable style={styles.actionBtn} onPress={() => onEdit(post)}>
          <Feather name="edit-2" size={16} color={Colors.secondary} />
        </Pressable>
        <Pressable style={styles.actionBtn} onPress={() => onDelete(post)}>
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

  const set = (key: keyof FormState) => (val: any) =>
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
          <Text style={styles.modalTitle}>{initial.title ? "Edit Post" : "New Post"}</Text>
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
          <TextInput style={styles.input} value={form.title} onChangeText={set("title")} placeholder="Post title" placeholderTextColor={Colors.textMuted} />

          <Text style={styles.fieldLabel}>Content *</Text>
          <TextInput style={[styles.input, styles.multilineInput]} value={form.content} onChangeText={set("content")} placeholder="What's the news?" placeholderTextColor={Colors.textMuted} multiline numberOfLines={6} textAlignVertical="top" />

          <Text style={styles.fieldLabel}>Image URL</Text>
          <TextInput style={styles.input} value={form.imageUrl} onChangeText={set("imageUrl")} placeholder="https://..." placeholderTextColor={Colors.textMuted} autoCapitalize="none" keyboardType="url" />

          <View style={styles.switchRow}>
            <View>
              <Text style={styles.switchLabel}>Members Only</Text>
              <Text style={styles.switchHint}>Only signed-in members can see this post</Text>
            </View>
            <Switch
              value={form.isMembersOnly}
              onValueChange={set("isMembersOnly")}
              trackColor={{ false: Colors.border, true: Colors.primary + "88" }}
              thumbColor={form.isMembersOnly ? Colors.primary : Colors.textMuted}
            />
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </Modal>
  );
}

export default function AdminPostsScreen() {
  const insets = useSafeAreaInsets();
  const qc = useQueryClient();
  const { user } = useAuth();
  const [modalVisible, setModalVisible] = useState(false);
  const [editingPost, setEditingPost] = useState<Post | null>(null);

  const isAdmin = user?.isAdmin === true;

  const { data: posts, isLoading } = useQuery({
    queryKey: ["admin", "posts"],
    queryFn: adminListPosts,
    enabled: isAdmin,
  });

  const createMutation = useMutation({
    mutationFn: adminCreatePost,
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["admin", "posts"] }); setModalVisible(false); },
    onError: (e: Error) => Alert.alert("Error", e.message),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: Parameters<typeof adminUpdatePost>[1] }) => adminUpdatePost(id, data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["admin", "posts"] }); setModalVisible(false); setEditingPost(null); },
    onError: (e: Error) => Alert.alert("Error", e.message),
  });

  const deleteMutation = useMutation({
    mutationFn: adminDeletePost,
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin", "posts"] }),
    onError: (e: Error) => Alert.alert("Error", e.message),
  });

  const saving = createMutation.isPending || updateMutation.isPending;

  if (!isAdmin) {
    return (
      <View style={[styles.screen, styles.center]}>
        <Feather name="lock" size={48} color={Colors.error} />
        <Text style={{ color: Colors.text, fontSize: 18, fontWeight: "700", marginTop: 16 }}>Access Denied</Text>
      </View>
    );
  }

  const handleSave = (form: FormState) => {
    if (!form.title.trim() || !form.content.trim()) {
      Alert.alert("Validation", "Title and content are required.");
      return;
    }
    const data = {
      title: form.title.trim(),
      content: form.content.trim(),
      imageUrl: form.imageUrl.trim() || undefined,
      isMembersOnly: form.isMembersOnly,
    };
    if (editingPost) {
      updateMutation.mutate({ id: editingPost.id, data });
    } else {
      createMutation.mutate(data);
    }
  };

  const handleEdit = (post: Post) => {
    setEditingPost(post);
    setModalVisible(true);
  };

  const handleDelete = (post: Post) => {
    Alert.alert("Delete Post", `Delete "${post.title}"?`, [
      { text: "Cancel", style: "cancel" },
      { text: "Delete", style: "destructive", onPress: () => deleteMutation.mutate(post.id) },
    ]);
  };

  const formInitial: FormState = editingPost
    ? { title: editingPost.title, content: editingPost.content, imageUrl: editingPost.imageUrl ?? "", isMembersOnly: editingPost.isMembersOnly }
    : emptyForm;

  return (
    <View style={[styles.screen, { paddingTop: insets.top }]}>
      <View style={styles.topBar}>
        <Pressable style={styles.backBtn} onPress={() => router.back()}>
          <Feather name="arrow-left" size={22} color={Colors.text} />
        </Pressable>
        <Text style={styles.screenTitle}>Posts</Text>
        <Pressable style={styles.newBtn} onPress={() => { setEditingPost(null); setModalVisible(true); }}>
          <Feather name="plus" size={20} color={Colors.background} />
          <Text style={styles.newBtnText}>New</Text>
        </Pressable>
      </View>

      {isLoading ? (
        <View style={styles.center}><ActivityIndicator size="large" color={Colors.primary} /></View>
      ) : (
        <ScrollView contentContainerStyle={[styles.list, { paddingBottom: insets.bottom + 24 }]} showsVerticalScrollIndicator={false}>
          {(!posts || posts.length === 0) && (
            <Text style={styles.empty}>No posts yet. Tap + New to write one.</Text>
          )}
          {posts?.map(p => (
            <PostCard key={p.id} post={p} onEdit={handleEdit} onDelete={handleDelete} />
          ))}
        </ScrollView>
      )}

      <FormModal
        visible={modalVisible}
        initial={formInitial}
        onClose={() => { setModalVisible(false); setEditingPost(null); }}
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
  cardLeft: { flex: 1, flexDirection: "row", alignItems: "flex-start", gap: 8 },
  lockBadge: { backgroundColor: Colors.accent + "22", borderRadius: 10, padding: 4, marginTop: 2 },
  cardTitle: { fontSize: 15, fontWeight: "600", color: Colors.text, marginBottom: 2 },
  cardMeta: { fontSize: 12, color: Colors.textSecondary },
  cardActions: { flexDirection: "row", gap: 8 },
  actionBtn: { padding: 8 },
  modalHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 20, paddingBottom: 16, borderBottomWidth: 1, borderBottomColor: Colors.border },
  modalTitle: { fontSize: 17, fontWeight: "700", color: Colors.text },
  cancelBtn: { fontSize: 16, color: Colors.textSecondary },
  saveBtn: { fontSize: 16, fontWeight: "700", color: Colors.primary },
  modalBody: { padding: 20, gap: 4 },
  fieldLabel: { fontSize: 12, color: Colors.textSecondary, fontWeight: "600", marginTop: 12, marginBottom: 4, letterSpacing: 0.5 },
  input: { backgroundColor: Colors.surface, borderWidth: 1, borderColor: Colors.border, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12, color: Colors.text, fontSize: 15 },
  multilineInput: { minHeight: 130 },
  switchRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginTop: 20, backgroundColor: Colors.surface, borderRadius: 14, borderWidth: 1, borderColor: Colors.border, padding: 16 },
  switchLabel: { fontSize: 15, fontWeight: "600", color: Colors.text, marginBottom: 2 },
  switchHint: { fontSize: 12, color: Colors.textSecondary },
});
