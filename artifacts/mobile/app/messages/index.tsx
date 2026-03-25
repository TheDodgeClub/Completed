import React, { useMemo } from "react";
import {
  View,
  Text,
  FlatList,
  Pressable,
  StyleSheet,
  ActivityIndicator,
  Image,
  RefreshControl,
} from "react-native";
import { router } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import { useQuery } from "@tanstack/react-query";
import * as Haptics from "expo-haptics";
import { useColors } from "@/context/ThemeContext";
import { useAuth } from "@/context/AuthContext";
import { resolveImageUrl } from "@/constants/api";
import { listConversations, Conversation } from "@/lib/api";

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

function ConversationRow({ convo }: { convo: Conversation }) {
  const Colors = useColors();
  const styles = useMemo(() => makeStyles(Colors), [Colors]);
  const uri = resolveImageUrl(convo.partnerAvatar);

  const handlePress = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.push(`/messages/${convo.partnerId}` as any);
  };

  return (
    <Pressable style={({ pressed }) => [styles.row, { opacity: pressed ? 0.85 : 1 }]} onPress={handlePress}>
      <View style={styles.avatarWrap}>
        {uri ? (
          <Image source={{ uri }} style={styles.avatar} />
        ) : (
          <View style={[styles.avatar, styles.avatarFallback]}>
            <Text style={styles.avatarLetter}>{convo.partnerName.charAt(0).toUpperCase()}</Text>
          </View>
        )}
        {convo.unreadCount > 0 && (
          <View style={styles.badge}>
            <Text style={styles.badgeText}>{convo.unreadCount > 9 ? "9+" : convo.unreadCount}</Text>
          </View>
        )}
      </View>
      <View style={styles.info}>
        <View style={styles.infoTop}>
          <Text style={[styles.name, convo.unreadCount > 0 && styles.nameBold]}>{convo.partnerName}</Text>
          <Text style={styles.time}>{timeAgo(convo.lastMessageAt)}</Text>
        </View>
        <Text style={[styles.preview, convo.unreadCount > 0 && styles.previewBold]} numberOfLines={1}>
          {convo.lastMessage}
        </Text>
      </View>
    </Pressable>
  );
}

export default function MessagesScreen() {
  const insets = useSafeAreaInsets();
  const Colors = useColors();
  const styles = useMemo(() => makeStyles(Colors), [Colors]);
  const { isAuthenticated } = useAuth();
  const [refreshing, setRefreshing] = React.useState(false);

  const { data: conversations, isLoading, refetch } = useQuery({
    queryKey: ["conversations"],
    queryFn: listConversations,
    enabled: isAuthenticated,
    refetchInterval: 15000,
  });

  const handleRefresh = async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  };

  return (
    <View style={[styles.screen, { backgroundColor: Colors.background }]}>
      <View style={[styles.header, { paddingTop: insets.top + 20 }]}>
        <Pressable style={styles.backBtn} onPress={() => router.back()}>
          <Feather name="arrow-left" size={22} color={Colors.text} />
        </Pressable>
        <Text style={styles.title}>Messages</Text>
        <Pressable
          style={styles.newBtn}
          onPress={() => router.push("/community" as any)}
        >
          <Feather name="edit" size={20} color={Colors.primary} />
        </Pressable>
      </View>

      {!isAuthenticated ? (
        <View style={styles.empty}>
          <Feather name="lock" size={40} color={Colors.textMuted} />
          <Text style={styles.emptyTitle}>Sign in to message</Text>
          <Text style={styles.emptyText}>You need to be logged in to send and receive messages.</Text>
        </View>
      ) : isLoading ? (
        <ActivityIndicator color={Colors.primary} style={{ marginTop: 40 }} />
      ) : (
        <FlatList
          data={conversations ?? []}
          keyExtractor={c => String(c.partnerId)}
          contentContainerStyle={[styles.list, { paddingBottom: insets.bottom + 24 }]}
          renderItem={({ item }) => <ConversationRow convo={item} />}
          ItemSeparatorComponent={() => <View style={styles.sep} />}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={Colors.primary} />
          }
          ListEmptyComponent={
            <View style={styles.empty}>
              <Feather name="message-circle" size={48} color={Colors.textMuted} />
              <Text style={styles.emptyTitle}>No messages yet</Text>
              <Text style={styles.emptyText}>Find a member in the Community tab and send them a message.</Text>
            </View>
          }
        />
      )}
    </View>
  );
}

function makeStyles(Colors: ReturnType<typeof useColors>) {
  return StyleSheet.create({
    screen: { flex: 1 },
    header: {
      flexDirection: "row", alignItems: "center",
      paddingHorizontal: 16, paddingBottom: 14,
      backgroundColor: Colors.surface,
      borderBottomWidth: 1, borderBottomColor: Colors.border,
    },
    backBtn: { padding: 6, marginRight: 8 },
    title: { flex: 1, fontFamily: "Poppins_800ExtraBold", fontSize: 22, color: Colors.text },
    newBtn: {
      width: 40, height: 40, borderRadius: 20,
      backgroundColor: `${Colors.primary}18`, alignItems: "center", justifyContent: "center",
    },
    list: { paddingTop: 8 },
    row: {
      flexDirection: "row", alignItems: "center",
      paddingHorizontal: 16, paddingVertical: 14, gap: 14,
    },
    sep: { height: 1, backgroundColor: Colors.border, marginLeft: 78 },
    avatarWrap: { position: "relative" },
    avatar: { width: 50, height: 50, borderRadius: 25 },
    avatarFallback: { backgroundColor: `${Colors.primary}25`, alignItems: "center", justifyContent: "center" },
    avatarLetter: { fontFamily: "Inter_700Bold", fontSize: 20, color: Colors.primary },
    badge: {
      position: "absolute", top: -2, right: -2,
      backgroundColor: Colors.accent, borderRadius: 10,
      minWidth: 18, height: 18, paddingHorizontal: 4,
      alignItems: "center", justifyContent: "center",
    },
    badgeText: { fontFamily: "Inter_700Bold", fontSize: 10, color: "#000" },
    info: { flex: 1 },
    infoTop: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
    name: { fontFamily: "Inter_500Medium", fontSize: 15, color: Colors.text },
    nameBold: { fontFamily: "Inter_700Bold" },
    time: { fontFamily: "Inter_400Regular", fontSize: 12, color: Colors.textMuted },
    preview: { fontFamily: "Inter_400Regular", fontSize: 13, color: Colors.textMuted, marginTop: 2 },
    previewBold: { fontFamily: "Inter_500Medium", color: Colors.text },
    empty: { flex: 1, alignItems: "center", paddingTop: 80, paddingHorizontal: 40, gap: 12 },
    emptyTitle: { fontFamily: "Inter_700Bold", fontSize: 18, color: Colors.textSecondary },
    emptyText: { fontFamily: "Inter_400Regular", fontSize: 14, color: Colors.textMuted, textAlign: "center" },
  });
}
