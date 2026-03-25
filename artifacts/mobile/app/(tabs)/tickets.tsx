import React, { useMemo } from "react";
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
  RefreshControl,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import { useQuery } from "@tanstack/react-query";
import { useColors } from "@/context/ThemeContext";
import { listEvents } from "@/lib/api";
import { EventCard } from "@/components/EventCard";

export default function TicketsScreen() {
  const insets = useSafeAreaInsets();
  const Colors = useColors();
  const styles = useMemo(() => makeStyles(Colors), [Colors]);
  const [refreshing, setRefreshing] = React.useState(false);

  const { data: events, isLoading, refetch } = useQuery({
    queryKey: ["all-events"],
    queryFn: listEvents,
  });

  const upcoming = events?.filter(e => e.isUpcoming) ?? [];
  const past = events?.filter(e => !e.isUpcoming) ?? [];

  const handleRefresh = async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  };

  return (
    <ScrollView
      style={styles.screen}
      contentInsetAdjustmentBehavior="automatic"
      showsVerticalScrollIndicator={false}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={Colors.primary} />
      }
    >
      <View style={[styles.header, { paddingTop: insets.top + 24 }]}>
        <Text style={styles.headerTitle}>Tickets</Text>
        <Text style={styles.headerSubtitle}>Get your spot at the next event</Text>
      </View>

      <View style={styles.body}>
        {isLoading ? (
          <ActivityIndicator color={Colors.primary} style={{ marginTop: 40 }} />
        ) : (
          <>
            <Text style={styles.sectionTitle}>Upcoming Events</Text>
            {upcoming.length > 0 ? (
              upcoming.map(event => <EventCard key={event.id} event={event} />)
            ) : (
              <View style={styles.empty}>
                <Feather name="calendar" size={40} color={Colors.textMuted} />
                <Text style={styles.emptyTitle}>No upcoming events</Text>
                <Text style={styles.emptyText}>Check back soon — we're always planning something!</Text>
              </View>
            )}

            {past.length > 0 && (
              <>
                <Text style={[styles.sectionTitle, { marginTop: 8 }]}>Past Events</Text>
                {past.map(event => (
                  <View key={event.id} style={styles.pastEvent}>
                    <EventCard event={event} compact />
                    <View style={styles.pastBadge}>
                      <Text style={styles.pastBadgeText}>Finished</Text>
                    </View>
                  </View>
                ))}
              </>
            )}
          </>
        )}
      </View>
    </ScrollView>
  );
}

function makeStyles(Colors: ReturnType<typeof useColors>) {
  return StyleSheet.create({
    screen: {
      flex: 1,
      backgroundColor: Colors.background,
    },
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
    body: { padding: 20 },
    sectionTitle: {
      fontFamily: "Poppins_800ExtraBold",
      fontSize: 20,
      color: Colors.text,
      marginBottom: 14,
    },
    empty: {
      alignItems: "center",
      paddingVertical: 48,
      gap: 10,
    },
    emptyTitle: {
      fontFamily: "Inter_700Bold",
      fontSize: 16,
      color: Colors.textSecondary,
    },
    emptyText: {
      fontFamily: "Inter_400Regular",
      fontSize: 14,
      color: Colors.textMuted,
      textAlign: "center",
      paddingHorizontal: 20,
    },
    pastEvent: { position: "relative" },
    pastBadge: {
      position: "absolute",
      top: 12,
      right: 12,
      backgroundColor: Colors.surface2,
      borderRadius: 8,
      paddingHorizontal: 8,
      paddingVertical: 4,
      borderWidth: 1,
      borderColor: Colors.border,
    },
    pastBadgeText: {
      fontFamily: "Inter_600SemiBold",
      fontSize: 11,
      color: Colors.textMuted,
    },
  });
}
