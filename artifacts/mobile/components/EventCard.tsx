import React, { useMemo } from "react";
import { View, Text, Pressable, StyleSheet, Linking } from "react-native";
import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { useColors } from "@/context/ThemeContext";
import type { Event } from "@/lib/api";

type Props = {
  event: Event;
  compact?: boolean;
};

export function EventCard({ event, compact }: Props) {
  const Colors = useColors();
  const styles = useMemo(() => makeStyles(Colors), [Colors]);
  const date = new Date(event.date);
  const day = date.toLocaleDateString("en-GB", { day: "2-digit" });
  const month = date.toLocaleDateString("en-GB", { month: "short" }).toUpperCase();
  const time = date.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" });

  const handleBuyTicket = async () => {
    if (!event.ticketUrl) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    await Linking.openURL(event.ticketUrl);
  };

  return (
    <View style={[styles.card, compact && styles.cardCompact]}>
      <View style={styles.dateBadge}>
        <Text style={styles.dateDay}>{day}</Text>
        <Text style={styles.dateMonth}>{month}</Text>
      </View>

      <View style={styles.info}>
        <Text style={styles.title} numberOfLines={compact ? 1 : 2}>{event.title}</Text>
        <View style={styles.meta}>
          <Feather name="map-pin" size={12} color={Colors.textMuted} />
          <Text style={styles.metaText} numberOfLines={1}>{event.location}</Text>
        </View>
        <View style={styles.meta}>
          <Feather name="clock" size={12} color={Colors.textMuted} />
          <Text style={styles.metaText}>{time}</Text>
        </View>
        {!compact && event.description && (
          <Text style={styles.description} numberOfLines={2}>{event.description}</Text>
        )}
      </View>

      {!compact && event.ticketUrl && (
        <Pressable
          style={({ pressed }) => [styles.ticketBtn, { opacity: pressed ? 0.8 : 1 }]}
          onPress={handleBuyTicket}
        >
          <Text style={styles.ticketBtnText}>Get Ticket</Text>
          <Feather name="arrow-right" size={14} color="#fff" />
        </Pressable>
      )}
    </View>
  );
}

function makeStyles(Colors: ReturnType<typeof useColors>) {
  return StyleSheet.create({
    card: {
      backgroundColor: Colors.surface,
      borderRadius: 18,
      padding: 16,
      flexDirection: "row",
      gap: 14,
      borderWidth: 1,
      borderColor: Colors.border,
      marginBottom: 12,
    },
    cardCompact: {
      padding: 12,
      marginBottom: 0,
    },
    dateBadge: {
      width: 52,
      height: 60,
      backgroundColor: Colors.primary,
      borderRadius: 12,
      alignItems: "center",
      justifyContent: "center",
      flexShrink: 0,
    },
    dateDay: {
      fontFamily: "Poppins_800ExtraBold",
      fontSize: 20,
      color: "#fff",
      lineHeight: 24,
    },
    dateMonth: {
      fontFamily: "Inter_600SemiBold",
      fontSize: 11,
      color: "rgba(255,255,255,0.85)",
      letterSpacing: 0.5,
    },
    info: { flex: 1, justifyContent: "center", gap: 4 },
    title: {
      fontFamily: "Inter_700Bold",
      fontSize: 15,
      color: Colors.text,
    },
    meta: {
      flexDirection: "row",
      alignItems: "center",
      gap: 4,
    },
    metaText: {
      fontFamily: "Inter_400Regular",
      fontSize: 12,
      color: Colors.textMuted,
      flex: 1,
    },
    description: {
      fontFamily: "Inter_400Regular",
      fontSize: 13,
      color: Colors.textSecondary,
      marginTop: 4,
    },
    ticketBtn: {
      backgroundColor: Colors.primary,
      borderRadius: 10,
      paddingHorizontal: 14,
      paddingVertical: 8,
      flexDirection: "row",
      alignItems: "center",
      gap: 4,
      alignSelf: "flex-end",
      marginTop: 8,
    },
    ticketBtnText: {
      fontFamily: "Inter_600SemiBold",
      fontSize: 13,
      color: "#fff",
    },
  });
}
