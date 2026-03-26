import React, { useMemo, useRef, useState, useEffect } from "react";
import {
  View,
  Text,
  FlatList,
  Pressable,
  StyleSheet,
  ActivityIndicator,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  Image,
} from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import * as Haptics from "expo-haptics";
import { useColors } from "@/context/ThemeContext";
import { useAuth } from "@/context/AuthContext";
import { resolveImageUrl } from "@/constants/api";
import { getThread, sendMessage, getMemberProfile, MessageItem } from "@/lib/api";

function timeLabel(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" });
}

function Bubble({ msg, isMine, Colors }: { msg: MessageItem; isMine: boolean; Colors: any }) {
  const uri = resolveImageUrl(msg.senderAvatar);
  return (
    <View style={{ flexDirection: "row", justifyContent: isMine ? "flex-end" : "flex-start", marginVertical: 3, paddingHorizontal: 16 }}>
      {!isMine && (
        uri
          ? <Image source={{ uri }} style={{ width: 30, height: 30, borderRadius: 15, marginRight: 8, alignSelf: "flex-end" }} />
          : <View style={{ width: 30, height: 30, borderRadius: 15, backgroundColor: `${Colors.primary}25`, alignItems: "center", justifyContent: "center", marginRight: 8, alignSelf: "flex-end" }}>
              <Text style={{ fontFamily: "Inter_700Bold", fontSize: 12, color: Colors.primary }}>{msg.senderName.charAt(0)}</Text>
            </View>
      )}
      <View style={{ maxWidth: "72%" }}>
        <View style={{
          backgroundColor: isMine ? Colors.primary : Colors.surface,
          borderRadius: 18,
          borderBottomRightRadius: isMine ? 4 : 18,
          borderBottomLeftRadius: isMine ? 18 : 4,
          paddingHorizontal: 14, paddingVertical: 10,
          borderWidth: isMine ? 0 : 1,
          borderColor: Colors.border,
        }}>
          <Text style={{ fontFamily: "Inter_400Regular", fontSize: 15, color: isMine ? "#fff" : Colors.text, lineHeight: 21 }}>
            {msg.content}
          </Text>
        </View>
        <Text style={{ fontFamily: "Inter_400Regular", fontSize: 10, color: Colors.textMuted, marginTop: 3, textAlign: isMine ? "right" : "left", marginHorizontal: 4 }}>
          {timeLabel(msg.createdAt)}
        </Text>
      </View>
    </View>
  );
}

export default function ChatScreen() {
  const insets = useSafeAreaInsets();
  const Colors = useColors();
  const { userId: partnerIdStr } = useLocalSearchParams<{ userId: string }>();
  const partnerId = Number(partnerIdStr);
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const flatListRef = useRef<FlatList>(null);
  const [text, setText] = useState("");

  const { data: partner } = useQuery({
    queryKey: ["member-profile", partnerId],
    queryFn: () => getMemberProfile(partnerId),
    enabled: !!partnerId,
  });

  const { data: thread, isLoading } = useQuery({
    queryKey: ["thread", partnerId],
    queryFn: () => getThread(partnerId),
    enabled: !!partnerId,
    refetchInterval: 5000,
  });

  const { mutate: doSend, isPending: sending } = useMutation({
    mutationFn: (content: string) => sendMessage(partnerId, content),
    onSuccess: (msg) => {
      queryClient.setQueryData<MessageItem[]>(["thread", partnerId], (old) => [...(old ?? []), msg]);
      flatListRef.current?.scrollToEnd({ animated: true });
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    },
  });

  useEffect(() => {
    if (thread?.length) {
      setTimeout(() => flatListRef.current?.scrollToEnd({ animated: false }), 100);
    }
  }, [thread?.length]);

  const handleSend = () => {
    const content = text.trim();
    if (!content || sending) return;
    setText("");
    doSend(content);
  };

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: Colors.background }}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      keyboardVerticalOffset={0}
    >
      {/* Header */}
      <View style={{ paddingTop: insets.top + 12, paddingBottom: 12, paddingHorizontal: 16, flexDirection: "row", alignItems: "center", gap: 12, backgroundColor: Colors.surface, borderBottomWidth: 1, borderBottomColor: Colors.border }}>
        <Pressable onPress={() => router.back()} style={{ padding: 4 }}>
          <Feather name="arrow-left" size={22} color={Colors.text} />
        </Pressable>
        <View style={{ flex: 1 }}>
          <Text style={{ fontFamily: "Inter_700Bold", fontSize: 17, color: Colors.text }}>{partner?.name ?? "…"}</Text>
        </View>
        <Pressable
          onPress={() => {}}
          style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: `${Colors.primary}15`, alignItems: "center", justifyContent: "center" }}
        >
          <Feather name="user" size={16} color={Colors.primary} />
        </Pressable>
      </View>

      {isLoading ? (
        <ActivityIndicator color={Colors.primary} style={{ marginTop: 40 }} />
      ) : (
        <FlatList
          ref={flatListRef}
          data={thread ?? []}
          keyExtractor={m => String(m.id)}
          contentContainerStyle={{ paddingTop: 16, paddingBottom: 8 }}
          renderItem={({ item }) => (
            <Bubble
              msg={item}
              isMine={item.senderId === user?.id}
              Colors={Colors}
            />
          )}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <View style={{ alignItems: "center", paddingTop: 60, gap: 12 }}>
              <Feather name="message-circle" size={40} color={Colors.textMuted} />
              <Text style={{ fontFamily: "Inter_400Regular", fontSize: 15, color: Colors.textMuted }}>No messages yet. Say hi!</Text>
            </View>
          }
        />
      )}

      {/* Input */}
      <View style={{
        flexDirection: "row", alignItems: "flex-end", gap: 10,
        paddingHorizontal: 16, paddingTop: 10,
        paddingBottom: insets.bottom + 10,
        backgroundColor: Colors.surface, borderTopWidth: 1, borderTopColor: Colors.border,
      }}>
        <TextInput
          style={{
            flex: 1, minHeight: 42, maxHeight: 120,
            backgroundColor: Colors.surface2, borderRadius: 22,
            paddingHorizontal: 16, paddingVertical: 10,
            fontFamily: "Inter_400Regular", fontSize: 15, color: Colors.text,
            borderWidth: 1, borderColor: Colors.border,
          }}
          value={text}
          onChangeText={setText}
          placeholder="Type a message…"
          placeholderTextColor={Colors.textMuted}
          multiline
          returnKeyType="default"
        />
        <Pressable
          style={({ pressed }) => [{
            width: 42, height: 42, borderRadius: 21,
            backgroundColor: text.trim() ? Colors.primary : Colors.surface2,
            alignItems: "center", justifyContent: "center",
            opacity: pressed ? 0.8 : 1,
          }]}
          onPress={handleSend}
          disabled={!text.trim() || sending}
        >
          {sending
            ? <ActivityIndicator size="small" color={Colors.primary} />
            : <Feather name="send" size={18} color={text.trim() ? "#fff" : Colors.textMuted} />}
        </Pressable>
      </View>
    </KeyboardAvoidingView>
  );
}
