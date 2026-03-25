import React, { useMemo } from "react";
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
  Dimensions,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import { useQuery } from "@tanstack/react-query";
import * as Haptics from "expo-haptics";
import { useColors } from "@/context/ThemeContext";
import { resolveImageUrl } from "@/constants/api";
import { listMerch, MerchProduct } from "@/lib/api";

const COLUMN_COUNT = 2;
const GUTTER = 12;
const EDGE = 16;
const CARD_WIDTH = (Dimensions.get("window").width - EDGE * 2 - GUTTER) / COLUMN_COUNT;

function MerchCard({ item }: { item: MerchProduct }) {
  const Colors = useColors();
  const styles = useMemo(() => makeStyles(Colors), [Colors]);
  const imageUri = resolveImageUrl(item.imageUrl);

  const handleBuy = async () => {
    if (!item.buyUrl) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    await Linking.openURL(item.buyUrl);
  };

  return (
    <View style={[styles.card, { width: CARD_WIDTH }]}>
      <View style={styles.imageContainer}>
        {imageUri ? (
          <Image source={{ uri: imageUri }} style={styles.productImage} resizeMode="cover" />
        ) : (
          <View style={styles.imagePlaceholder}>
            <Feather name="shopping-bag" size={26} color={Colors.textMuted} />
          </View>
        )}
        <View style={styles.categoryBadge}>
          <Text style={styles.categoryText}>{item.category.toUpperCase()}</Text>
        </View>
        {!item.inStock && (
          <View style={styles.soldOutOverlay}>
            <Text style={styles.soldOutText}>SOLD OUT</Text>
          </View>
        )}
      </View>

      <View style={styles.cardBody}>
        <Text style={styles.productName} numberOfLines={2}>{item.name}</Text>
        <View style={styles.cardFooter}>
          <Text style={styles.price}>£{item.price.toFixed(2)}</Text>
          <Pressable
            style={({ pressed }) => [
              styles.buyBtn,
              !item.inStock && styles.buyBtnDisabled,
              { opacity: pressed ? 0.8 : 1 },
            ]}
            onPress={handleBuy}
            disabled={!item.inStock}
          >
            {item.inStock
              ? <Feather name="arrow-right" size={14} color="#fff" />
              : <Feather name="x" size={12} color={Colors.textMuted} />}
          </Pressable>
        </View>
      </View>
    </View>
  );
}

export default function MerchScreen() {
  const insets = useSafeAreaInsets();
  const Colors = useColors();
  const styles = useMemo(() => makeStyles(Colors), [Colors]);
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
      <View style={[styles.header, { paddingTop: insets.top + 20 }]}>
        <Text style={styles.headerTitle}>Merch</Text>
        <Text style={styles.headerSubtitle}>Rep the Dodge Club</Text>
      </View>

      {isLoading ? (
        <ActivityIndicator color={Colors.primary} style={{ marginTop: 40 }} />
      ) : products && products.length > 0 ? (
        <FlatList
          data={products}
          keyExtractor={item => String(item.id)}
          numColumns={COLUMN_COUNT}
          columnWrapperStyle={styles.row}
          contentContainerStyle={[styles.listContent, { paddingBottom: insets.bottom + 24 }]}
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

function makeStyles(Colors: ReturnType<typeof useColors>) {
  return StyleSheet.create({
    screen: { flex: 1 },
    header: {
      paddingHorizontal: 20,
      paddingBottom: 16,
      backgroundColor: Colors.surface,
      borderBottomWidth: 1,
      borderBottomColor: Colors.border,
    },
    headerTitle: {
      fontFamily: "Poppins_800ExtraBold",
      fontSize: 32,
      color: Colors.text,
    },
    headerSubtitle: {
      fontFamily: "Inter_400Regular",
      fontSize: 13,
      color: Colors.textSecondary,
      marginTop: 1,
    },

    listContent: { padding: EDGE, gap: GUTTER },
    row: { gap: GUTTER },

    card: {
      backgroundColor: Colors.surface,
      borderRadius: 16,
      overflow: "hidden",
      borderWidth: 1,
      borderColor: Colors.border,
    },
    imageContainer: {
      height: 110,
      backgroundColor: Colors.surface2,
      overflow: "hidden",
    },
    productImage: {
      width: "100%",
      height: 110,
    },
    imagePlaceholder: {
      height: 110,
      alignItems: "center",
      justifyContent: "center",
    },
    categoryBadge: {
      position: "absolute",
      top: 8,
      left: 8,
      backgroundColor: `${Colors.primary}CC`,
      borderRadius: 6,
      paddingHorizontal: 6,
      paddingVertical: 3,
    },
    categoryText: {
      fontFamily: "Inter_600SemiBold",
      fontSize: 8,
      color: "#fff",
      letterSpacing: 0.5,
    },
    soldOutOverlay: {
      ...StyleSheet.absoluteFillObject,
      backgroundColor: "rgba(0,0,0,0.55)",
      alignItems: "center",
      justifyContent: "center",
    },
    soldOutText: {
      fontFamily: "Inter_700Bold",
      fontSize: 11,
      color: "rgba(255,255,255,0.9)",
      letterSpacing: 1,
    },

    cardBody: {
      padding: 10,
      gap: 6,
    },
    productName: {
      fontFamily: "Inter_600SemiBold",
      fontSize: 13,
      color: Colors.text,
      lineHeight: 17,
    },
    cardFooter: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
    },
    price: {
      fontFamily: "Poppins_800ExtraBold",
      fontSize: 15,
      color: Colors.accent,
    },
    buyBtn: {
      backgroundColor: Colors.primary,
      borderRadius: 8,
      width: 28,
      height: 28,
      alignItems: "center",
      justifyContent: "center",
    },
    buyBtnDisabled: {
      backgroundColor: Colors.surface2,
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
}
