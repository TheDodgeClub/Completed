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
  adminListMerch,
  adminCreateMerch,
  adminUpdateMerch,
  adminDeleteMerch,
  type MerchProduct,
} from "@/lib/api";

type FormState = {
  name: string;
  description: string;
  price: string;
  imageUrl: string;
  buyUrl: string;
  category: string;
  inStock: boolean;
};

const emptyForm: FormState = { name: "", description: "", price: "", imageUrl: "", buyUrl: "", category: "apparel", inStock: true };

const CATEGORIES = ["apparel", "accessories", "equipment", "other"];

function ProductCard({
  product,
  onEdit,
  onDelete,
}: {
  product: MerchProduct;
  onEdit: (p: MerchProduct) => void;
  onDelete: (p: MerchProduct) => void;
}) {
  return (
    <View style={styles.card}>
      <View style={styles.cardLeft}>
        <View style={[styles.stockDot, { backgroundColor: product.inStock ? Colors.success : Colors.error }]} />
        <View style={{ flex: 1 }}>
          <Text style={styles.cardTitle} numberOfLines={1}>{product.name}</Text>
          <Text style={styles.cardMeta}>£{product.price.toFixed(2)}  ·  {product.category}</Text>
        </View>
      </View>
      <View style={styles.cardActions}>
        <Pressable style={styles.actionBtn} onPress={() => onEdit(product)}>
          <Feather name="edit-2" size={16} color={Colors.secondary} />
        </Pressable>
        <Pressable style={styles.actionBtn} onPress={() => onDelete(product)}>
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
          <Text style={styles.modalTitle}>{initial.name ? "Edit Product" : "New Product"}</Text>
          <Pressable onPress={() => onSave(form)} disabled={saving}>
            {saving ? (
              <ActivityIndicator size="small" color={Colors.primary} />
            ) : (
              <Text style={styles.saveBtn}>Save</Text>
            )}
          </Pressable>
        </View>
        <ScrollView style={{ flex: 1 }} contentContainerStyle={styles.modalBody} keyboardShouldPersistTaps="handled">
          <Text style={styles.fieldLabel}>Name *</Text>
          <TextInput style={styles.input} value={form.name} onChangeText={set("name")} placeholder="Product name" placeholderTextColor={Colors.textMuted} />

          <Text style={styles.fieldLabel}>Description *</Text>
          <TextInput style={[styles.input, styles.multilineInput]} value={form.description} onChangeText={set("description")} placeholder="What is it?" placeholderTextColor={Colors.textMuted} multiline numberOfLines={3} textAlignVertical="top" />

          <Text style={styles.fieldLabel}>Price (£) *</Text>
          <TextInput style={styles.input} value={form.price} onChangeText={set("price")} placeholder="24.99" placeholderTextColor={Colors.textMuted} keyboardType="decimal-pad" />

          <Text style={styles.fieldLabel}>Category</Text>
          <View style={styles.categoryRow}>
            {CATEGORIES.map(c => (
              <Pressable
                key={c}
                style={[styles.catChip, form.category === c && styles.catChipActive]}
                onPress={() => set("category")(c)}
              >
                <Text style={[styles.catChipText, form.category === c && styles.catChipTextActive]}>
                  {c}
                </Text>
              </Pressable>
            ))}
          </View>

          <Text style={styles.fieldLabel}>Buy URL</Text>
          <TextInput style={styles.input} value={form.buyUrl} onChangeText={set("buyUrl")} placeholder="https://..." placeholderTextColor={Colors.textMuted} autoCapitalize="none" keyboardType="url" />

          <Text style={styles.fieldLabel}>Image URL</Text>
          <TextInput style={styles.input} value={form.imageUrl} onChangeText={set("imageUrl")} placeholder="https://..." placeholderTextColor={Colors.textMuted} autoCapitalize="none" keyboardType="url" />

          <View style={styles.switchRow}>
            <View>
              <Text style={styles.switchLabel}>In Stock</Text>
              <Text style={styles.switchHint}>Show as available to buy</Text>
            </View>
            <Switch
              value={form.inStock}
              onValueChange={set("inStock")}
              trackColor={{ false: Colors.border, true: Colors.success + "88" }}
              thumbColor={form.inStock ? Colors.success : Colors.textMuted}
            />
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </Modal>
  );
}

export default function AdminMerchScreen() {
  const insets = useSafeAreaInsets();
  const qc = useQueryClient();
  const { user } = useAuth();
  const [modalVisible, setModalVisible] = useState(false);
  const [editingProduct, setEditingProduct] = useState<MerchProduct | null>(null);

  const isAdmin = user?.isAdmin === true;

  const { data: products, isLoading } = useQuery({
    queryKey: ["admin", "merch"],
    queryFn: adminListMerch,
    enabled: isAdmin,
  });

  const createMutation = useMutation({
    mutationFn: adminCreateMerch,
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["admin", "merch"] }); setModalVisible(false); },
    onError: (e: Error) => Alert.alert("Error", e.message),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: Parameters<typeof adminUpdateMerch>[1] }) => adminUpdateMerch(id, data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["admin", "merch"] }); setModalVisible(false); setEditingProduct(null); },
    onError: (e: Error) => Alert.alert("Error", e.message),
  });

  const deleteMutation = useMutation({
    mutationFn: adminDeleteMerch,
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin", "merch"] }),
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
    if (!form.name.trim() || !form.description.trim() || !form.price.trim()) {
      Alert.alert("Validation", "Name, description and price are required.");
      return;
    }
    const price = parseFloat(form.price);
    if (isNaN(price) || price < 0) {
      Alert.alert("Validation", "Please enter a valid price.");
      return;
    }
    const data = {
      name: form.name.trim(),
      description: form.description.trim(),
      price,
      imageUrl: form.imageUrl.trim() || undefined,
      buyUrl: form.buyUrl.trim() || undefined,
      category: form.category,
      inStock: form.inStock,
    };
    if (editingProduct) {
      updateMutation.mutate({ id: editingProduct.id, data });
    } else {
      createMutation.mutate(data);
    }
  };

  const handleEdit = (product: MerchProduct) => {
    setEditingProduct(product);
    setModalVisible(true);
  };

  const handleDelete = (product: MerchProduct) => {
    Alert.alert("Delete Product", `Delete "${product.name}"?`, [
      { text: "Cancel", style: "cancel" },
      { text: "Delete", style: "destructive", onPress: () => deleteMutation.mutate(product.id) },
    ]);
  };

  const formInitial: FormState = editingProduct
    ? {
        name: editingProduct.name,
        description: editingProduct.description,
        price: String(editingProduct.price),
        imageUrl: editingProduct.imageUrl ?? "",
        buyUrl: editingProduct.buyUrl ?? "",
        category: editingProduct.category,
        inStock: editingProduct.inStock,
      }
    : emptyForm;

  return (
    <View style={[styles.screen, { paddingTop: insets.top }]}>
      <View style={styles.topBar}>
        <Pressable style={styles.backBtn} onPress={() => router.back()}>
          <Feather name="arrow-left" size={22} color={Colors.text} />
        </Pressable>
        <Text style={styles.screenTitle}>Merch</Text>
        <Pressable style={styles.newBtn} onPress={() => { setEditingProduct(null); setModalVisible(true); }}>
          <Feather name="plus" size={20} color={Colors.background} />
          <Text style={styles.newBtnText}>New</Text>
        </Pressable>
      </View>

      {isLoading ? (
        <View style={styles.center}><ActivityIndicator size="large" color={Colors.primary} /></View>
      ) : (
        <ScrollView contentContainerStyle={[styles.list, { paddingBottom: insets.bottom + 24 }]} showsVerticalScrollIndicator={false}>
          {(!products || products.length === 0) && (
            <Text style={styles.empty}>No products yet. Tap + New to add one.</Text>
          )}
          {products?.map(p => (
            <ProductCard key={p.id} product={p} onEdit={handleEdit} onDelete={handleDelete} />
          ))}
        </ScrollView>
      )}

      <FormModal
        visible={modalVisible}
        initial={formInitial}
        onClose={() => { setModalVisible(false); setEditingProduct(null); }}
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
  stockDot: { width: 8, height: 8, borderRadius: 4 },
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
  multilineInput: { minHeight: 90 },
  categoryRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  catChip: { paddingHorizontal: 14, paddingVertical: 7, borderRadius: 20, borderWidth: 1, borderColor: Colors.border, backgroundColor: Colors.surface },
  catChipActive: { borderColor: Colors.primary, backgroundColor: Colors.primary + "22" },
  catChipText: { color: Colors.textSecondary, fontSize: 13, fontWeight: "600" },
  catChipTextActive: { color: Colors.primary },
  switchRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginTop: 20, backgroundColor: Colors.surface, borderRadius: 14, borderWidth: 1, borderColor: Colors.border, padding: 16 },
  switchLabel: { fontSize: 15, fontWeight: "600", color: Colors.text, marginBottom: 2 },
  switchHint: { fontSize: 12, color: Colors.textSecondary },
});
