import React from "react";
import {
  View,
  Text,
  ScrollView,
  FlatList,
  Pressable,
  StyleSheet,
  ActivityIndicator,
  Linking,
  RefreshControl,
  Image,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import { useQuery } from "@tanstack/react-query";
import * as Haptics from "expo-haptics";
import Colors from "@/constants/colors";
import { resolveImageUrl } from "@/constants/api";
import { listMerch, MerchProduct } from "@/lib/api";

function MerchCard({ item }: { item: MerchProduct }) {
  const imageUri = resolveImageUrl(item.imageUrl);

  const handleBuy = async () => {
    if (!item.buyUrl) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    await Linking.openURL(item.buyUrl);
  };

  return (
    <View style={styles.card}>
      {/* Product image */}
      <View style={styles.imageContainer}>
        {imageUri ? (
          <Image source={{ uri: imageUri }} style={styles.productImage} resizeMode="cover" />
        ) : (
          <View style={styles.imagePlaceholder}>
            <Feather name="shopping-bag" size={36} color={Colors.textMuted} />
          </View>
        )}
      </View>

      {/* Category badge */}
      <View style={styles.categoryBadge}>
        <Text style={styles.categoryText}>{item.category.toUpperCase()}</Text>
      </View>

      <View style={styles.cardBody}>
        <Text style={styles.productName} numberOfLines={2}>{item.name}</Text>
        <Text style={styles.productDesc} numberOfLines={2}>{item.description}</Text>

        <View style={styles.cardFooter}>
          <Text style={styles.price}>£{item.price.toFixed(2)}</Text>
          <Pressable
            style={({ pressed }) => [
              styles.buyBtn,
              !item.inStock && styles.buyBtnDisabled,
              { opacity: pressed ? 0.85 : 1 },
            ]}
            onPress={handleBuy}
            disabled={!item.inStock}
          >
            <Text style={styles.buyBtnText}>
              {item.inStock ? "Buy Now" : "Sold Out"}
            </Text>
            {item.inStock && <Feather name="arrow-right" size={13} color="#fff" />}
          </Pressable>
        </View>
      </View>
    </View>
  );
}

export default function MerchScreen() {
  const insets = useSafeAreaInsets();
  const [refreshing, setRefreshing] = React.useState(false);

  const { data: products, isLoading, refetch } = useQuery({
    queryKey: ["merch"],
    queryFn: listMerch,
  });

  const handleRefresh = async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  };

  return (
    <View style={[styles.screen, { backgroundColor: Colors.background }]}>
      <View style={[styles.header, { paddingTop: insets.top + 24 }]}>
        <Text style={styles.headerTitle}>Merch</Text>
        <Text style={styles.headerSubtitle}>Rep the Dodge Club</Text>
      </View>

      {isLoading ? (
        <ActivityIndicator color={Colors.primary} style={{ marginTop: 40 }} />
      ) : products && products.length > 0 ? (
        <FlatList
          data={products}
          keyExtractor={item => String(item.id)}
          numColumns={2}
          columnWrapperStyle={styles.row}
          contentContainerStyle={styles.listContent}
          contentInsetAdjustmentBehavior="automatic"
          renderItem={({ item }) => <MerchCard item={item} />}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={Colors.primary} />
          }
        />
      ) : (
        <View style={styles.empty}>
          <Feather name="shopping-bag" size={48} color={Colors.textMuted} />
          <Text style={styles.emptyTitle}>No products yet</Text>
          <Text style={styles.emptyText}>Merch is coming soon. Stay tuned!</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  header: {
    paddingHorizontal: 24,
    paddingBottom: 24,
    backgroundColor: Colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  headerTitle: {
    fontFamily: "Poppins_800ExtraBold",
    fontSize: 36,
    color: Colors.text,
  },
  headerSubtitle: {
    fontFamily: "Inter_400Regular",
    fontSize: 14,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  listContent: { padding: 16, paddingBottom: 32 },
  row: { gap: 12, marginBottom: 12 },
  card: {
    flex: 1,
    backgroundColor: Colors.surface,
    borderRadius: 18,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: Colors.border,
  },
  imageContainer: {
    height: 140,
    backgroundColor: Colors.surface2,
    overflow: "hidden",
  },
  productImage: {
    width: "100%",
    height: 140,
  },
  imagePlaceholder: {
    height: 140,
    backgroundColor: Colors.surface2,
    alignItems: "center",
    justifyContent: "center",
  },
  categoryBadge: {
    position: "absolute",
    top: 10,
    left: 10,
    backgroundColor: `${Colors.primary}CC`,
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  categoryText: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 9,
    color: "#fff",
    letterSpacing: 0.5,
  },
  cardBody: { padding: 12, gap: 6 },
  productName: {
    fontFamily: "Inter_700Bold",
    fontSize: 14,
    color: Colors.text,
  },
  productDesc: {
    fontFamily: "Inter_400Regular",
    fontSize: 12,
    color: Colors.textMuted,
    lineHeight: 17,
  },
  cardFooter: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 8,
  },
  price: {
    fontFamily: "Poppins_800ExtraBold",
    fontSize: 16,
    color: Colors.text,
  },
  buyBtn: {
    backgroundColor: Colors.primary,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 7,
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  buyBtnDisabled: {
    backgroundColor: Colors.border,
  },
  buyBtnText: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 12,
    color: "#fff",
  },
  empty: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
    paddingHorizontal: 40,
  },
  emptyTitle: {
    fontFamily: "Inter_700Bold",
    fontSize: 18,
    color: Colors.textSecondary,
  },
  emptyText: {
    fontFamily: "Inter_400Regular",
    fontSize: 14,
    color: Colors.textMuted,
    textAlign: "center",
  },
});
