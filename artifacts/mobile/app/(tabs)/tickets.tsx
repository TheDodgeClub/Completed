import React, { useMemo, useState, useCallback } from "react";
import {
  View,
  Text,
  ScrollView,
  Pressable,
  StyleSheet,
  ActivityIndicator,
  RefreshControl,
  Alert,
  Modal,
  SafeAreaView,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import * as WebBrowser from "expo-web-browser";
import * as Haptics from "expo-haptics";
import QRCode from "react-native-qrcode-svg";
import { useColors } from "@/context/ThemeContext";
import { useAuth } from "@/context/AuthContext";
import {
  listEvents,
  getMyTickets,
  createCheckoutSession,
  registerFreeTicket,
  Event,
  Ticket,
} from "@/lib/api";

export default function TicketsScreen() {
  const insets = useSafeAreaInsets();
  const Colors = useColors();
  const styles = useMemo(() => makeStyles(Colors), [Colors]);
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [refreshing, setRefreshing] = useState(false);
  const [selectedTicket, setSelectedTicket] = useState<Ticket | null>(null);
  const [activeTab, setActiveTab] = useState<"my" | "buy">("my");

  const { data: events, isLoading: eventsLoading, refetch: refetchEvents } = useQuery({
    queryKey: ["all-events"],
    queryFn: listEvents,
  });

  const { data: myTickets, isLoading: ticketsLoading, refetch: refetchTickets } = useQuery({
    queryKey: ["my-tickets"],
    queryFn: getMyTickets,
    enabled: !!user,
  });

  const { mutate: registerFree, isPending: registeringFree } = useMutation({
    mutationFn: registerFreeTicket,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["my-tickets"] });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setActiveTab("my");
    },
    onError: (err: any) => Alert.alert("Error", err.message ?? "Could not register"),
  });

  const [buyingEventId, setBuyingEventId] = useState<number | null>(null);

  const handleBuyTicket = useCallback(async (event: Event) => {
    if (!user) {
      Alert.alert("Sign in required", "Please sign in to purchase tickets.");
      return;
    }

    // Check if already has ticket
    const existing = myTickets?.find(t => t.eventId === event.id);
    if (existing) {
      setSelectedTicket(existing);
      setActiveTab("my");
      return;
    }

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    // Free event
    if (!event.stripePriceId) {
      if (event.ticketPrice === 0) {
        registerFree(event.id);
      } else {
        Alert.alert("Tickets not available", "This event does not have tickets configured yet.");
      }
      return;
    }

    // Paid event — launch Stripe Checkout
    setBuyingEventId(event.id);
    try {
      const { url } = await createCheckoutSession(event.id);
      const result = await WebBrowser.openAuthSessionAsync(url, "");
      if (result.type === "success" || result.type === "dismiss") {
        // Refresh tickets after returning (payment may have completed)
        await refetchTickets();
        const fresh = await refetchTickets();
        const newTicket = (fresh.data ?? []).find(t => t.eventId === event.id);
        if (newTicket) {
          setSelectedTicket(newTicket);
          setActiveTab("my");
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        }
      }
    } catch (err: any) {
      Alert.alert("Error", err.message ?? "Could not start checkout");
    } finally {
      setBuyingEventId(null);
    }
  }, [user, myTickets, registerFree, refetchTickets]);

  const handleRefresh = async () => {
    setRefreshing(true);
    await Promise.all([refetchEvents(), refetchTickets()]);
    setRefreshing(false);
  };

  const upcomingEvents = events?.filter(e => e.isUpcoming) ?? [];
  const ticketEventIds = new Set(myTickets?.map(t => t.eventId) ?? []);

  const isLoading = eventsLoading || ticketsLoading;

  return (
    <View style={[styles.screen, { flex: 1 }]}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + 20 }]}>
        <Text style={styles.headerTitle}>Tickets</Text>

        {/* Tab switcher */}
        <View style={styles.tabs}>
          <Pressable
            style={[styles.tab, activeTab === "my" && styles.tabActive]}
            onPress={() => setActiveTab("my")}
          >
            <Text style={[styles.tabText, activeTab === "my" && styles.tabTextActive]}>My Tickets</Text>
          </Pressable>
          <Pressable
            style={[styles.tab, activeTab === "buy" && styles.tabActive]}
            onPress={() => setActiveTab("buy")}
          >
            <Text style={[styles.tabText, activeTab === "buy" && styles.tabTextActive]}>Buy Tickets</Text>
          </Pressable>
        </View>
      </View>

      {isLoading ? (
        <ActivityIndicator color={Colors.primary} style={{ marginTop: 60 }} />
      ) : (
        <ScrollView
          contentContainerStyle={{ paddingBottom: insets.bottom + 40 }}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={Colors.primary} />
          }
        >
          <View style={styles.body}>
            {activeTab === "my" ? (
              /* MY TICKETS TAB */
              !user ? (
                <EmptyState icon="lock" title="Sign in to see your tickets" subtitle="Your purchased tickets will appear here." />
              ) : (myTickets?.length ?? 0) === 0 ? (
                <EmptyState
                  icon="ticket"
                  title="No tickets yet"
                  subtitle="Head to Buy Tickets to get your spot at an upcoming event."
                  action={{ label: "Browse Events", onPress: () => setActiveTab("buy") }}
                />
              ) : (
                myTickets!.map(ticket => (
                  <TicketCard
                    key={ticket.id}
                    ticket={ticket}
                    Colors={Colors}
                    onPress={() => setSelectedTicket(ticket)}
                  />
                ))
              )
            ) : (
              /* BUY TICKETS TAB */
              upcomingEvents.length === 0 ? (
                <EmptyState icon="calendar" title="No upcoming events" subtitle="Check back soon — we're always planning something!" />
              ) : (
                upcomingEvents.map(event => (
                  <EventBuyCard
                    key={event.id}
                    event={event}
                    hasTicket={ticketEventIds.has(event.id)}
                    isBuying={buyingEventId === event.id}
                    isRegisteringFree={registeringFree}
                    onBuy={() => handleBuyTicket(event)}
                    onViewTicket={() => {
                      const t = myTickets?.find(ti => ti.eventId === event.id);
                      if (t) { setSelectedTicket(t); setActiveTab("my"); }
                    }}
                    Colors={Colors}
                  />
                ))
              )
            )}
          </View>
        </ScrollView>
      )}

      {/* QR Code Modal */}
      {selectedTicket && (
        <TicketQRModal
          ticket={selectedTicket}
          Colors={Colors}
          onClose={() => setSelectedTicket(null)}
        />
      )}
    </View>
  );
}

/* ── Sub-components ── */

function TicketCard({ ticket, Colors, onPress }: { ticket: Ticket; Colors: any; onPress: () => void }) {
  const styles = useMemo(() => makeStyles(Colors), [Colors]);
  const date = new Date(ticket.eventDate);
  const day = date.toLocaleDateString("en-GB", { day: "2-digit" });
  const month = date.toLocaleDateString("en-GB", { month: "short" }).toUpperCase();

  return (
    <Pressable
      style={({ pressed }) => [styles.ticketCard, { opacity: pressed ? 0.85 : 1 }]}
      onPress={onPress}
    >
      <View style={styles.ticketCardLeft}>
        <View style={styles.dateBadge}>
          <Text style={styles.dateDay}>{day}</Text>
          <Text style={styles.dateMonth}>{month}</Text>
        </View>
        <View style={styles.ticketInfo}>
          <Text style={styles.ticketEventTitle} numberOfLines={2}>{ticket.eventTitle}</Text>
          <View style={styles.ticketMeta}>
            <Feather name="map-pin" size={11} color={Colors.textMuted} />
            <Text style={styles.ticketMetaText} numberOfLines={1}>{ticket.eventLocation}</Text>
          </View>
          <View style={styles.ticketCodeRow}>
            <Feather name="hash" size={11} color={Colors.primary} />
            <Text style={styles.ticketCode}>{ticket.ticketCode}</Text>
          </View>
        </View>
      </View>
      <View style={styles.qrHint}>
        <Feather name="maximize-2" size={20} color={Colors.primary} />
        <Text style={styles.qrHintText}>View{"\n"}QR</Text>
      </View>
    </Pressable>
  );
}

function EventBuyCard({
  event,
  hasTicket,
  isBuying,
  isRegisteringFree,
  onBuy,
  onViewTicket,
  Colors,
}: {
  event: Event;
  hasTicket: boolean;
  isBuying: boolean;
  isRegisteringFree: boolean;
  onBuy: () => void;
  onViewTicket: () => void;
  Colors: any;
}) {
  const styles = useMemo(() => makeStyles(Colors), [Colors]);
  const date = new Date(event.date);
  const day = date.toLocaleDateString("en-GB", { day: "2-digit" });
  const month = date.toLocaleDateString("en-GB", { month: "short" }).toUpperCase();
  const time = date.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" });

  const isFree = event.ticketPrice === 0 || (!event.stripePriceId && event.ticketPrice == null);
  const hasTicketing = event.stripePriceId || event.ticketPrice === 0;
  const priceLabel = !hasTicketing
    ? null
    : isFree
      ? "FREE"
      : `£${event.ticketPrice?.toFixed(2)}`;

  return (
    <View style={styles.eventCard}>
      <View style={styles.eventCardTop}>
        <View style={styles.dateBadge}>
          <Text style={styles.dateDay}>{day}</Text>
          <Text style={styles.dateMonth}>{month}</Text>
        </View>
        <View style={styles.eventInfo}>
          <Text style={styles.eventTitle} numberOfLines={2}>{event.title}</Text>
          <View style={styles.ticketMeta}>
            <Feather name="map-pin" size={11} color={Colors.textMuted} />
            <Text style={styles.ticketMetaText} numberOfLines={1}>{event.location}</Text>
          </View>
          <View style={styles.ticketMeta}>
            <Feather name="clock" size={11} color={Colors.textMuted} />
            <Text style={styles.ticketMetaText}>{time}</Text>
          </View>
        </View>
        {priceLabel && (
          <View style={[styles.priceBadge, isFree && styles.priceBadgeFree]}>
            <Text style={[styles.priceText, isFree && styles.priceTextFree]}>{priceLabel}</Text>
          </View>
        )}
      </View>

      {hasTicketing && (
        hasTicket ? (
          <Pressable style={[styles.buyBtn, styles.buyBtnOwned]} onPress={onViewTicket}>
            <Feather name="check-circle" size={15} color={Colors.primary} />
            <Text style={[styles.buyBtnText, { color: Colors.primary }]}>View My Ticket</Text>
          </Pressable>
        ) : (
          <Pressable
            style={({ pressed }) => [styles.buyBtn, { opacity: pressed || isBuying || isRegisteringFree ? 0.7 : 1 }]}
            onPress={onBuy}
            disabled={isBuying || isRegisteringFree}
          >
            {isBuying || isRegisteringFree ? (
              <ActivityIndicator color="#fff" size="small" />
            ) : (
              <>
                <Feather name="credit-card" size={15} color="#fff" />
                <Text style={styles.buyBtnText}>{isFree ? "Register Free" : "Buy Ticket"}</Text>
              </>
            )}
          </Pressable>
        )
      )}
    </View>
  );
}

function EmptyState({ icon, title, subtitle, action }: {
  icon: string; title: string; subtitle: string;
  action?: { label: string; onPress: () => void };
}) {
  const Colors = useColors();
  const styles = useMemo(() => makeStyles(Colors), [Colors]);
  return (
    <View style={styles.empty}>
      <Feather name={icon as any} size={42} color={Colors.textMuted} />
      <Text style={styles.emptyTitle}>{title}</Text>
      <Text style={styles.emptyText}>{subtitle}</Text>
      {action && (
        <Pressable style={styles.emptyAction} onPress={action.onPress}>
          <Text style={styles.emptyActionText}>{action.label}</Text>
        </Pressable>
      )}
    </View>
  );
}

function TicketQRModal({ ticket, Colors, onClose }: { ticket: Ticket; Colors: any; onClose: () => void }) {
  const styles = useMemo(() => makeStyles(Colors), [Colors]);
  const date = new Date(ticket.eventDate);
  const dateStr = date.toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long", year: "numeric" });

  return (
    <Modal visible animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <SafeAreaView style={[styles.modalContainer, { backgroundColor: Colors.background }]}>
        <View style={styles.modalHeader}>
          <Text style={styles.modalTitle}>Your Ticket</Text>
          <Pressable onPress={onClose} style={styles.closeBtn}>
            <Feather name="x" size={22} color={Colors.text} />
          </Pressable>
        </View>

        <ScrollView contentContainerStyle={styles.modalBody} showsVerticalScrollIndicator={false}>
          {/* Ticket card */}
          <View style={styles.qrTicketCard}>
            {/* Header stripe */}
            <View style={styles.qrTicketHeader}>
              <Text style={styles.qrClubName}>THE DODGE CLUB</Text>
              <Feather name="check-circle" size={18} color="rgba(255,255,255,0.9)" />
            </View>

            {/* Event info */}
            <View style={styles.qrEventInfo}>
              <Text style={styles.qrEventTitle}>{ticket.eventTitle}</Text>
              <Text style={styles.qrEventDate}>{dateStr}</Text>
              <View style={styles.qrEventMeta}>
                <Feather name="map-pin" size={13} color={Colors.textMuted} />
                <Text style={styles.qrEventMetaText}>{ticket.eventLocation}</Text>
              </View>
            </View>

            {/* Dashed divider */}
            <View style={styles.divider} />

            {/* QR code */}
            <View style={styles.qrContainer}>
              <QRCode
                value={ticket.ticketCode}
                size={200}
                color={Colors.text}
                backgroundColor={Colors.surface}
                quietZone={12}
              />
            </View>

            {/* Ticket code */}
            <Text style={styles.qrCodeLabel}>TICKET CODE</Text>
            <Text style={styles.qrCodeValue}>{ticket.ticketCode.match(/.{1,4}/g)?.join(" ") ?? ticket.ticketCode}</Text>

            {ticket.checkedIn && (
              <View style={styles.checkedInBadge}>
                <Feather name="check" size={14} color="#fff" />
                <Text style={styles.checkedInText}>Checked In</Text>
              </View>
            )}
          </View>

          <Text style={styles.qrInstructions}>
            Show this QR code at the event entrance. Keep your screen bright for scanning.
          </Text>
        </ScrollView>
      </SafeAreaView>
    </Modal>
  );
}

function makeStyles(Colors: ReturnType<typeof useColors>) {
  return StyleSheet.create({
    screen: { backgroundColor: Colors.background },
    header: {
      backgroundColor: Colors.surface,
      paddingHorizontal: 24,
      paddingBottom: 0,
      borderBottomWidth: 1,
      borderBottomColor: Colors.border,
    },
    headerTitle: {
      fontFamily: "Poppins_800ExtraBold",
      fontSize: 34,
      color: Colors.text,
      marginBottom: 16,
    },
    tabs: {
      flexDirection: "row",
      gap: 0,
    },
    tab: {
      flex: 1,
      paddingVertical: 12,
      alignItems: "center",
      borderBottomWidth: 2,
      borderBottomColor: "transparent",
    },
    tabActive: {
      borderBottomColor: Colors.primary,
    },
    tabText: {
      fontFamily: "Inter_600SemiBold",
      fontSize: 14,
      color: Colors.textMuted,
    },
    tabTextActive: {
      color: Colors.primary,
    },
    body: { padding: 20, gap: 0 },
    empty: {
      alignItems: "center",
      paddingTop: 60,
      paddingBottom: 40,
      gap: 12,
    },
    emptyTitle: {
      fontFamily: "Inter_700Bold",
      fontSize: 17,
      color: Colors.textSecondary,
      textAlign: "center",
    },
    emptyText: {
      fontFamily: "Inter_400Regular",
      fontSize: 14,
      color: Colors.textMuted,
      textAlign: "center",
      paddingHorizontal: 20,
    },
    emptyAction: {
      marginTop: 8,
      backgroundColor: Colors.primary,
      paddingHorizontal: 20,
      paddingVertical: 10,
      borderRadius: 12,
    },
    emptyActionText: {
      fontFamily: "Inter_600SemiBold",
      fontSize: 14,
      color: "#fff",
    },
    /* Ticket card (my tickets) */
    ticketCard: {
      backgroundColor: Colors.surface,
      borderRadius: 18,
      padding: 16,
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      borderWidth: 1,
      borderColor: Colors.border,
      marginBottom: 12,
    },
    ticketCardLeft: { flexDirection: "row", gap: 14, flex: 1 },
    dateBadge: {
      width: 50,
      height: 56,
      backgroundColor: Colors.primary,
      borderRadius: 12,
      alignItems: "center",
      justifyContent: "center",
      flexShrink: 0,
    },
    dateDay: {
      fontFamily: "Poppins_800ExtraBold",
      fontSize: 18,
      color: "#fff",
      lineHeight: 22,
    },
    dateMonth: {
      fontFamily: "Inter_600SemiBold",
      fontSize: 11,
      color: "rgba(255,255,255,0.85)",
    },
    ticketInfo: { flex: 1, justifyContent: "center", gap: 4 },
    ticketEventTitle: {
      fontFamily: "Inter_700Bold",
      fontSize: 15,
      color: Colors.text,
    },
    ticketMeta: { flexDirection: "row", alignItems: "center", gap: 4 },
    ticketMetaText: {
      fontFamily: "Inter_400Regular",
      fontSize: 12,
      color: Colors.textMuted,
      flex: 1,
    },
    ticketCodeRow: { flexDirection: "row", alignItems: "center", gap: 4, marginTop: 2 },
    ticketCode: {
      fontFamily: "Inter_600SemiBold",
      fontSize: 11,
      color: Colors.primary,
      letterSpacing: 1,
    },
    qrHint: { alignItems: "center", gap: 4, paddingLeft: 12 },
    qrHintText: {
      fontFamily: "Inter_400Regular",
      fontSize: 10,
      color: Colors.textMuted,
      textAlign: "center",
    },
    /* Event buy card */
    eventCard: {
      backgroundColor: Colors.surface,
      borderRadius: 18,
      borderWidth: 1,
      borderColor: Colors.border,
      marginBottom: 14,
      overflow: "hidden",
    },
    eventCardTop: {
      flexDirection: "row",
      gap: 14,
      padding: 16,
      alignItems: "flex-start",
    },
    eventInfo: { flex: 1, gap: 4 },
    eventTitle: {
      fontFamily: "Inter_700Bold",
      fontSize: 15,
      color: Colors.text,
    },
    priceBadge: {
      backgroundColor: Colors.primary + "22",
      borderRadius: 10,
      paddingHorizontal: 10,
      paddingVertical: 5,
      alignSelf: "flex-start",
      flexShrink: 0,
    },
    priceBadgeFree: { backgroundColor: Colors.accent + "22" },
    priceText: {
      fontFamily: "Poppins_800ExtraBold",
      fontSize: 13,
      color: Colors.primary,
    },
    priceTextFree: { color: Colors.accent },
    buyBtn: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: 8,
      backgroundColor: Colors.primary,
      marginHorizontal: 16,
      marginBottom: 16,
      paddingVertical: 12,
      borderRadius: 14,
    },
    buyBtnOwned: {
      backgroundColor: Colors.primary + "15",
      borderWidth: 1,
      borderColor: Colors.primary + "40",
    },
    buyBtnText: {
      fontFamily: "Inter_700Bold",
      fontSize: 14,
      color: "#fff",
    },
    /* QR modal */
    modalContainer: { flex: 1 },
    modalHeader: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      paddingHorizontal: 24,
      paddingVertical: 16,
      borderBottomWidth: 1,
      borderBottomColor: Colors.border,
    },
    modalTitle: {
      fontFamily: "Poppins_800ExtraBold",
      fontSize: 24,
      color: Colors.text,
    },
    closeBtn: {
      width: 36,
      height: 36,
      borderRadius: 18,
      backgroundColor: Colors.surface2,
      alignItems: "center",
      justifyContent: "center",
    },
    modalBody: { padding: 24, alignItems: "center" },
    qrTicketCard: {
      width: "100%",
      backgroundColor: Colors.surface,
      borderRadius: 24,
      overflow: "hidden",
      borderWidth: 1,
      borderColor: Colors.border,
      marginBottom: 20,
    },
    qrTicketHeader: {
      backgroundColor: Colors.primary,
      paddingHorizontal: 24,
      paddingVertical: 16,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
    },
    qrClubName: {
      fontFamily: "Poppins_800ExtraBold",
      fontSize: 16,
      color: "#fff",
      letterSpacing: 1.5,
    },
    qrEventInfo: {
      padding: 24,
      paddingBottom: 20,
      gap: 6,
    },
    qrEventTitle: {
      fontFamily: "Poppins_800ExtraBold",
      fontSize: 22,
      color: Colors.text,
    },
    qrEventDate: {
      fontFamily: "Inter_400Regular",
      fontSize: 14,
      color: Colors.textSecondary,
    },
    qrEventMeta: { flexDirection: "row", alignItems: "center", gap: 6, marginTop: 4 },
    qrEventMetaText: {
      fontFamily: "Inter_400Regular",
      fontSize: 13,
      color: Colors.textMuted,
    },
    divider: {
      height: 1,
      backgroundColor: Colors.border,
      marginHorizontal: 24,
      marginBottom: 24,
    },
    qrContainer: {
      alignItems: "center",
      paddingBottom: 20,
    },
    qrCodeLabel: {
      fontFamily: "Inter_600SemiBold",
      fontSize: 10,
      color: Colors.textMuted,
      letterSpacing: 2,
      textAlign: "center",
      marginBottom: 6,
    },
    qrCodeValue: {
      fontFamily: "Inter_700Bold",
      fontSize: 18,
      color: Colors.text,
      letterSpacing: 4,
      textAlign: "center",
      paddingBottom: 20,
    },
    checkedInBadge: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: 6,
      backgroundColor: Colors.primary,
      marginHorizontal: 24,
      marginBottom: 20,
      paddingVertical: 10,
      borderRadius: 12,
    },
    checkedInText: {
      fontFamily: "Inter_600SemiBold",
      fontSize: 13,
      color: "#fff",
    },
    qrInstructions: {
      fontFamily: "Inter_400Regular",
      fontSize: 13,
      color: Colors.textMuted,
      textAlign: "center",
      lineHeight: 20,
      paddingHorizontal: 20,
    },
  });
}
