import React, { useMemo, useState, useCallback, useRef } from "react";
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
  TextInput,
  KeyboardAvoidingView,
  Platform,
  TouchableOpacity,
  Dimensions,
  type ScrollView as RNScrollView,
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
  getEventAttendees,
  giftTicket,
  Event,
  Ticket,
  CheckoutField,
  EventAttendee,
} from "@/lib/api";

function getCountdown(dateStr: string): string | null {
  const diff = new Date(dateStr).getTime() - Date.now();
  if (diff <= 0 || diff > 60 * 86400000) return null;
  const d = Math.floor(diff / 86400000);
  const h = Math.floor((diff % 86400000) / 3600000);
  const m = Math.floor((diff % 3600000) / 60000);
  if (d >= 2) return `${d} days`;
  if (d === 1) return "Tomorrow";
  if (h >= 1) return `${h}h`;
  if (m >= 1) return `${m} mins`;
  return "Starting soon!";
}

export default function TicketsScreen() {
  const insets = useSafeAreaInsets();
  const Colors = useColors();
  const styles = useMemo(() => makeStyles(Colors), [Colors]);
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [refreshing, setRefreshing] = useState(false);
  const [selectedTicket, setSelectedTicket] = useState<Ticket | null>(null);
  const [activeTab, setActiveTab] = useState<"my" | "buy">("buy");

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
    mutationFn: ({ eventId, checkoutData }: { eventId: number; checkoutData?: Record<string, string> }) =>
      registerFreeTicket(eventId, checkoutData),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["my-tickets"] });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setActiveTab("my");
    },
    onError: (err: any) => Alert.alert("Error", err.message ?? "Could not register"),
  });

  const [buyingEventId, setBuyingEventId] = useState<number | null>(null);
  const [checkoutFormEvent, setCheckoutFormEvent] = useState<Event | null>(null);
  const [giftEvent, setGiftEvent] = useState<Event | null>(null);
  const [giftEmail, setGiftEmail] = useState("");
  const [giftingEventId, setGiftingEventId] = useState<number | null>(null);

  const needsForm = (event: Event) =>
    (event.checkoutFields?.length ?? 0) > 0 || !!event.waiverText;

  const doBuyTicket = useCallback(async (event: Event, checkoutData?: Record<string, string>) => {
    // Free event
    if (!event.stripePriceId) {
      if (event.ticketPrice === 0) {
        registerFree({ eventId: event.id, checkoutData });
      } else {
        Alert.alert("Tickets not available", "This event does not have tickets configured yet.");
      }
      return;
    }

    // Paid event — launch Stripe Checkout
    setBuyingEventId(event.id);
    try {
      const { url } = await createCheckoutSession(event.id, checkoutData);
      // openBrowserAsync opens SFSafariViewController on iOS (no OAuth dialog)
      // It resolves when the user dismisses the browser
      await WebBrowser.openBrowserAsync(url, {
        presentationStyle: WebBrowser.WebBrowserPresentationStyle.FULL_SCREEN,
        dismissButtonStyle: "done",
        toolbarColor: "#0B5E2F",
        controlsColor: "#FFD700",
      });
      // After browser closes, poll for the ticket (payment may have completed)
      const fresh = await refetchTickets();
      const newTicket = (fresh.data ?? []).find(t => t.eventId === event.id);
      if (newTicket) {
        setSelectedTicket(newTicket);
        setActiveTab("my");
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }
    } catch (err: any) {
      Alert.alert("Error", err.message ?? "Could not start checkout");
    } finally {
      setBuyingEventId(null);
    }
  }, [registerFree, refetchTickets]);

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

    // If event has checkout form or waiver, show modal first
    if (needsForm(event)) {
      setCheckoutFormEvent(event);
      return;
    }

    // No form — proceed directly
    await doBuyTicket(event, undefined);
  }, [user, myTickets, doBuyTicket]);

  const handleRefresh = async () => {
    setRefreshing(true);
    await Promise.all([refetchEvents(), refetchTickets()]);
    setRefreshing(false);
  };

  const handleGiftSubmit = async () => {
    if (!giftEvent || !giftEmail.trim()) return;
    const emailRx = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRx.test(giftEmail.trim())) {
      Alert.alert("Invalid email", "Please enter a valid email address.");
      return;
    }
    setGiftingEventId(giftEvent.id);
    try {
      const result = await giftTicket(giftEvent.id, giftEmail.trim());
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setGiftEvent(null);
      setGiftEmail("");
      if (result.checkoutUrl) {
        await WebBrowser.openBrowserAsync(result.checkoutUrl, {
          presentationStyle: WebBrowser.WebBrowserPresentationStyle.FULL_SCREEN,
          dismissButtonStyle: "done",
          toolbarColor: "#0B5E2F",
          controlsColor: "#FFD700",
        });
      } else {
        Alert.alert("Ticket Gifted!", `A ticket for ${giftEvent.title} has been sent to ${giftEmail.trim()}.`);
      }
    } catch (err: any) {
      Alert.alert("Error", err.message ?? "Could not gift ticket");
    } finally {
      setGiftingEventId(null);
    }
  };

  const upcomingEvents = events?.filter(e => e.isUpcoming) ?? [];
  const ticketEventIds = new Set(myTickets?.map(t => t.eventId) ?? []);

  const nextClubEvent = upcomingEvents[0] ?? null;
  const nextClubCountdown = nextClubEvent ? getCountdown(nextClubEvent.date) : null;

  const isLoading = eventsLoading || ticketsLoading;

  return (
    <View style={[styles.screen, { flex: 1 }]}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + 20 }]}>
        <Text style={styles.headerTitle}>Tickets</Text>

        {/* Countdown strip */}
        {nextClubEvent && nextClubCountdown && (
          <View style={styles.countdownStrip}>
            <Feather name="calendar" size={13} color={Colors.primary} />
            <Text style={styles.countdownStripEvent} numberOfLines={1}>
              {nextClubEvent.title}
            </Text>
            <View style={styles.countdownStripChip}>
              <Feather name="clock" size={11} color={Colors.primary} />
              <Text style={styles.countdownStripChipText}>
                {nextClubCountdown === "Tomorrow"
                  ? "Tomorrow's event"
                  : nextClubCountdown === "Starting soon!"
                  ? "Starting soon!"
                  : `${nextClubCountdown} till next event`}
              </Text>
            </View>
          </View>
        )}

        {/* Tab switcher */}
        <View style={styles.tabs}>
          <Pressable
            style={[styles.tab, activeTab === "buy" && styles.tabActive]}
            onPress={() => setActiveTab("buy")}
          >
            <Text style={[styles.tabText, activeTab === "buy" && styles.tabTextActive]}>Buy Tickets</Text>
          </Pressable>
          <Pressable
            style={[styles.tab, activeTab === "my" && styles.tabActive]}
            onPress={() => setActiveTab("my")}
          >
            <Text style={[styles.tabText, activeTab === "my" && styles.tabTextActive]}>My Tickets</Text>
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
                    onGift={() => { setGiftEvent(event); setGiftEmail(""); }}
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

      {/* Gift a Ticket Modal */}
      <Modal visible={!!giftEvent} transparent animationType="slide" onRequestClose={() => setGiftEvent(null)}>
        <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={{ flex: 1 }}>
          <Pressable style={styles.giftOverlay} onPress={() => setGiftEvent(null)} />
          <View style={styles.giftSheet}>
            <View style={styles.giftHandle} />
            <View style={styles.giftHeader}>
              <Feather name="gift" size={22} color={Colors.primary} />
              <Text style={styles.giftTitle}>Gift a Ticket</Text>
              <Pressable onPress={() => setGiftEvent(null)}>
                <Feather name="x" size={22} color={Colors.textMuted} />
              </Pressable>
            </View>
            {giftEvent && (
              <Text style={styles.giftSubtitle}>{giftEvent.title}</Text>
            )}
            <Text style={styles.giftDesc}>
              Enter the email address of the person you'd like to gift a ticket to. They'll receive it right in their inbox.
            </Text>
            <TextInput
              style={styles.giftInput}
              placeholder="friend@example.com"
              placeholderTextColor={Colors.textMuted}
              value={giftEmail}
              onChangeText={setGiftEmail}
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
            />
            <Pressable
              style={({ pressed }) => [styles.giftSubmitBtn, { opacity: pressed || !!giftingEventId ? 0.75 : 1 }]}
              onPress={handleGiftSubmit}
              disabled={!!giftingEventId}
            >
              {giftingEventId ? (
                <ActivityIndicator color="#fff" size="small" />
              ) : (
                <>
                  <Feather name="send" size={16} color="#fff" />
                  <Text style={styles.giftSubmitText}>Send Gift Ticket</Text>
                </>
              )}
            </Pressable>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* Checkout Form & Waiver Modal */}
      {checkoutFormEvent && (
        <CheckoutFormModal
          event={checkoutFormEvent}
          Colors={Colors}
          onClose={() => setCheckoutFormEvent(null)}
          onSubmit={(formData) => {
            const event = checkoutFormEvent;
            setCheckoutFormEvent(null);
            doBuyTicket(event, formData);
          }}
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
  onGift,
  Colors,
}: {
  event: Event;
  hasTicket: boolean;
  isBuying: boolean;
  isRegisteringFree: boolean;
  onBuy: () => void;
  onViewTicket: () => void;
  onGift: () => void;
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

  const { data: attendees } = useQuery<EventAttendee[]>({
    queryKey: ["event-attendees", event.id],
    queryFn: () => getEventAttendees(event.id),
    staleTime: 60000,
  });

  const visibleAttendees = attendees?.slice(0, 5) ?? [];
  const extraCount = (attendees?.length ?? 0) - visibleAttendees.length;

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
          {(event.xpReward ?? 50) > 0 && (
            <View style={styles.xpEarnBadge}>
              <Feather name="zap" size={10} color="#FFC107" />
              <Text style={styles.xpEarnText}>Earn {event.xpReward ?? 50} XP</Text>
            </View>
          )}
        </View>
        {priceLabel && (
          <View style={[styles.priceBadge, isFree && styles.priceBadgeFree]}>
            <Text style={[styles.priceText, isFree && styles.priceTextFree]}>{priceLabel}</Text>
          </View>
        )}
      </View>

      {/* Who's Going */}
      {visibleAttendees.length > 0 && (
        <View style={styles.whoGoingRow}>
          <View style={styles.whoGoingAvatars}>
            {visibleAttendees.map((a, i) => (
              <View key={a.id} style={[styles.whoGoingAvatar, { marginLeft: i === 0 ? 0 : -8, zIndex: 10 - i }]}>
                <Text style={styles.whoGoingInitial}>{a.name.charAt(0).toUpperCase()}</Text>
              </View>
            ))}
            {extraCount > 0 && (
              <View style={[styles.whoGoingAvatar, styles.whoGoingExtra, { marginLeft: -8, zIndex: 0 }]}>
                <Text style={styles.whoGoingExtraText}>+{extraCount}</Text>
              </View>
            )}
          </View>
          <Text style={styles.whoGoingLabel}>
            {attendees!.length === 1
              ? `${attendees![0].name.split(" ")[0]} is going`
              : `${visibleAttendees[0].name.split(" ")[0]} & ${attendees!.length - 1} other${attendees!.length - 1 > 1 ? "s" : ""} going`}
          </Text>
        </View>
      )}

      {hasTicketing && (
        hasTicket ? (
          <View style={styles.ticketOwnerRow}>
            <Pressable style={[styles.buyBtn, styles.buyBtnOwned, { flex: 1, marginHorizontal: 0, marginBottom: 0 }]} onPress={onViewTicket}>
              <Feather name="check-circle" size={15} color={Colors.primary} />
              <Text style={[styles.buyBtnText, { color: Colors.primary }]}>View My Ticket</Text>
            </Pressable>
            <Pressable
              style={styles.giftBtn}
              onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); onGift(); }}
            >
              <Feather name="gift" size={16} color={Colors.primary} />
            </Pressable>
          </View>
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

function CheckoutFormModal({
  event,
  Colors,
  onClose,
  onSubmit,
}: {
  event: Event;
  Colors: any;
  onClose: () => void;
  onSubmit: (formData: Record<string, string>) => void;
}) {
  const insets = useSafeAreaInsets();
  const [formData, setFormData] = useState<Record<string, string>>({});
  const [waiverAgreed, setWaiverAgreed] = useState(false);
  const [waiverExpanded, setWaiverExpanded] = useState(false);
  const scrollRef = useRef<RNScrollView>(null);
  const fieldYPositions = useRef<Record<string, number>>({});

  const fields: CheckoutField[] = event.checkoutFields ?? [];
  const hasWaiver = !!event.waiverText;

  const SCREEN_HEIGHT = Dimensions.get("window").height;

  const scrollToField = useCallback((fieldId: string) => {
    const y = fieldYPositions.current[fieldId];
    if (y !== undefined) {
      // Small delay so the keyboard is already animating
      setTimeout(() => {
        scrollRef.current?.scrollTo({ y: Math.max(0, y - 12), animated: true });
      }, 80);
    }
  }, []);

  const cfStyles = StyleSheet.create({
    backdrop: { flex: 1, backgroundColor: "rgba(0,0,0,0.6)", flexDirection: "column" },
    kav: { justifyContent: "flex-end" },
    sheet: {
      backgroundColor: Colors.surface,
      borderTopLeftRadius: 24,
      borderTopRightRadius: 24,
      maxHeight: SCREEN_HEIGHT * 0.88,
    },
    sheetInner: { flex: 1 },
    sheetHandle: { width: 40, height: 4, borderRadius: 2, backgroundColor: Colors.border, alignSelf: "center" as const, marginTop: 12, marginBottom: 8 },
    sheetHeader: { flexDirection: "row" as const, alignItems: "center" as const, justifyContent: "space-between" as const, paddingHorizontal: 20, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: Colors.border },
    sheetTitle: { fontSize: 18, fontWeight: "700" as const, color: Colors.text },
    sheetSubtitle: { fontSize: 13, color: Colors.textMuted, marginTop: 2 },
    scrollContent: { paddingHorizontal: 20, paddingTop: 16, paddingBottom: 8 },
    fieldGroup: { marginBottom: 16 },
    fieldLabel: { fontSize: 13, fontWeight: "600" as const, color: Colors.textMuted, marginBottom: 6, textTransform: "uppercase" as const, letterSpacing: 0.5 },
    input: { backgroundColor: Colors.background, borderRadius: 12, borderWidth: 1, borderColor: Colors.border, color: Colors.text, paddingHorizontal: 14, paddingVertical: 12, fontSize: 15 },
    inputMulti: { backgroundColor: Colors.background, borderRadius: 12, borderWidth: 1, borderColor: Colors.border, color: Colors.text, paddingHorizontal: 14, paddingTop: 12, paddingBottom: 12, fontSize: 15, minHeight: 80, textAlignVertical: "top" as const },
    chipRow: { flexDirection: "row" as const, flexWrap: "wrap" as const, marginTop: 6, gap: 8 },
    optionChip: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20, borderWidth: 1, borderColor: Colors.border, backgroundColor: Colors.background },
    optionChipActive: { borderColor: Colors.primary, backgroundColor: Colors.primary + "20" },
    optionChipText: { fontSize: 14, color: Colors.textMuted },
    optionChipTextActive: { color: Colors.primary, fontWeight: "600" as const },
    waiverBox: { backgroundColor: Colors.background, borderRadius: 12, borderWidth: 1, borderColor: Colors.border, padding: 14, marginBottom: 16 },
    waiverToggleRow: { flexDirection: "row" as const, alignItems: "center" as const, justifyContent: "space-between" as const },
    waiverTitle: { fontSize: 13, fontWeight: "700" as const, color: Colors.textMuted, textTransform: "uppercase" as const, letterSpacing: 0.5 },
    waiverCollapsedHint: { fontSize: 12, color: Colors.textMuted, opacity: 0.6, marginTop: 2 },
    waiverAgreedBadge: { flexDirection: "row" as const, alignItems: "center" as const, gap: 5, marginTop: 8 },
    waiverAgreedText: { fontSize: 12, color: Colors.primary, fontWeight: "600" as const },
    waiverText: { fontSize: 13, color: Colors.textMuted, lineHeight: 19 },
    waiverCheck: { flexDirection: "row" as const, alignItems: "flex-start" as const, marginTop: 14 },
    waiverCheckBox: { width: 22, height: 22, borderRadius: 6, borderWidth: 2, borderColor: Colors.primary, alignItems: "center" as const, justifyContent: "center" as const, backgroundColor: "transparent", marginRight: 12, marginTop: 1 },
    waiverCheckBoxChecked: { backgroundColor: Colors.primary },
    waiverCheckLabel: { flex: 1, fontSize: 13, color: Colors.text, fontWeight: "500" as const, lineHeight: 18 },
    footer: { paddingBottom: insets.bottom + 8 },
    proceedBtn: { marginHorizontal: 20, marginTop: 12, backgroundColor: Colors.primary, borderRadius: 14, paddingVertical: 15, alignItems: "center" as const },
    proceedBtnText: { color: "#fff", fontSize: 16, fontWeight: "700" as const },
    cancelBtn: { marginHorizontal: 20, paddingVertical: 12, alignItems: "center" as const },
    cancelBtnText: { color: Colors.textMuted, fontSize: 15 },
  });

  const handleSubmit = () => {
    // Validate required fields
    for (const field of fields) {
      if (field.required && !formData[field.id]?.trim()) {
        Alert.alert("Required field", `Please fill in: ${field.label}`);
        return;
      }
    }
    if (hasWaiver && !waiverAgreed) {
      Alert.alert("Waiver required", "Please agree to the waiver before proceeding.");
      return;
    }
    onSubmit(formData);
  };

  const renderField = (field: CheckoutField) => {
    if (field.type === "select" && field.options?.length) {
      return (
        <View
          key={field.id}
          style={cfStyles.fieldGroup}
          onLayout={(e) => { fieldYPositions.current[field.id] = e.nativeEvent.layout.y; }}
        >
          <Text style={cfStyles.fieldLabel}>{field.label}{field.required ? " *" : ""}</Text>
          <View style={cfStyles.chipRow}>
            {field.options.map((opt) => (
              <TouchableOpacity
                key={opt}
                style={[cfStyles.optionChip, formData[field.id] === opt && cfStyles.optionChipActive]}
                onPress={() => setFormData((d) => ({ ...d, [field.id]: opt }))}
              >
                <Text style={[cfStyles.optionChipText, formData[field.id] === opt && cfStyles.optionChipTextActive]}>
                  {opt}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      );
    }

    const isMultiline = field.type === "textarea";
    return (
      <View
        key={field.id}
        style={cfStyles.fieldGroup}
        onLayout={(e) => { fieldYPositions.current[field.id] = e.nativeEvent.layout.y; }}
      >
        <Text style={cfStyles.fieldLabel}>{field.label}{field.required ? " *" : ""}</Text>
        <TextInput
          style={isMultiline ? cfStyles.inputMulti : cfStyles.input}
          value={formData[field.id] ?? ""}
          onChangeText={(val) => setFormData((d) => ({ ...d, [field.id]: val }))}
          onFocus={() => scrollToField(field.id)}
          placeholder={field.type === "date" ? "DD/MM/YYYY" : field.type === "email" ? "you@example.com" : field.type === "phone" ? "+44 7000 000000" : ""}
          placeholderTextColor={Colors.textMuted}
          keyboardType={field.type === "email" ? "email-address" : field.type === "phone" ? "phone-pad" : "default"}
          multiline={isMultiline}
          numberOfLines={isMultiline ? 3 : 1}
          returnKeyType={isMultiline ? "default" : "next"}
          blurOnSubmit={!isMultiline}
        />
      </View>
    );
  };

  const hitSlop = { top: 12, bottom: 12, left: 12, right: 12 };

  return (
    <Modal visible transparent animationType="none" onRequestClose={onClose} statusBarTranslucent>
      <View style={{ flex: 1 }}>
        {/* Dark dismissable backdrop */}
        <Pressable
          style={[StyleSheet.absoluteFillObject, { backgroundColor: "rgba(0,0,0,0.6)" }]}
          onPress={onClose}
        />
        {/* KAV fills the screen and pushes sheet above keyboard on iOS */}
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          style={[StyleSheet.absoluteFillObject, { justifyContent: "flex-end" }]}
          keyboardVerticalOffset={0}
        >
          {/* Sheet anchored to the bottom — maxHeight keeps it from filling full screen */}
          <View style={cfStyles.sheet}>
            {/* Handle + header — always visible, never scrolls */}
            <View style={cfStyles.sheetHandle} />
            <View style={cfStyles.sheetHeader}>
              <View style={{ flex: 1 }}>
                <Text style={cfStyles.sheetTitle}>Buyer Details</Text>
                <Text style={cfStyles.sheetSubtitle}>{event.title}</Text>
              </View>
              <TouchableOpacity onPress={onClose} hitSlop={hitSlop}>
                <Feather name="x" size={22} color={Colors.textMuted} />
              </TouchableOpacity>
            </View>

            {/* Scrollable form — flexShrink:1 lets it shrink within maxHeight on iOS */}
            <ScrollView
              ref={scrollRef}
              style={{ flexShrink: 1 }}
              contentContainerStyle={cfStyles.scrollContent}
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
              automaticallyAdjustKeyboardInsets={Platform.OS === "ios"}
            >
              {fields.map(renderField)}

              {hasWaiver && (
                <View style={cfStyles.waiverBox}>
                  {/* Collapsible header row */}
                  <TouchableOpacity
                    style={cfStyles.waiverToggleRow}
                    onPress={() => setWaiverExpanded((v) => !v)}
                    activeOpacity={0.7}
                  >
                    <View style={{ flex: 1 }}>
                      <Text style={cfStyles.waiverTitle}>Waiver & Agreement</Text>
                      {!waiverExpanded && (
                        <Text style={cfStyles.waiverCollapsedHint}>Tap to read before agreeing</Text>
                      )}
                    </View>
                    <Feather
                      name={waiverExpanded ? "chevron-up" : "chevron-down"}
                      size={18}
                      color={Colors.textMuted}
                    />
                  </TouchableOpacity>

                  {/* Expanded content */}
                  {waiverExpanded && (
                    <>
                      <Text style={[cfStyles.waiverText, { marginTop: 10 }]}>{event.waiverText}</Text>
                      <TouchableOpacity
                        style={cfStyles.waiverCheck}
                        onPress={() => setWaiverAgreed((v) => !v)}
                        activeOpacity={0.7}
                      >
                        <View style={[cfStyles.waiverCheckBox, waiverAgreed && cfStyles.waiverCheckBoxChecked]}>
                          {waiverAgreed && <Feather name="check" size={14} color="#fff" />}
                        </View>
                        <Text style={cfStyles.waiverCheckLabel}>I have read and agree to the waiver above</Text>
                      </TouchableOpacity>
                    </>
                  )}

                  {/* Agreed indicator when collapsed */}
                  {!waiverExpanded && waiverAgreed && (
                    <View style={cfStyles.waiverAgreedBadge}>
                      <Feather name="check-circle" size={13} color={Colors.primary} />
                      <Text style={cfStyles.waiverAgreedText}>Agreed</Text>
                    </View>
                  )}
                </View>
              )}
            </ScrollView>

            {/* Sticky footer buttons */}
            <View style={cfStyles.footer}>
              <TouchableOpacity style={cfStyles.proceedBtn} onPress={handleSubmit} activeOpacity={0.85}>
                <Text style={cfStyles.proceedBtnText}>Proceed to Checkout</Text>
              </TouchableOpacity>
              <TouchableOpacity style={cfStyles.cancelBtn} onPress={onClose}>
                <Text style={cfStyles.cancelBtnText}>Cancel</Text>
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </View>
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
    countdownStrip: {
      flexDirection: "row",
      alignItems: "center",
      gap: 8,
      backgroundColor: `${Colors.primary}12`,
      borderRadius: 10,
      paddingHorizontal: 12,
      paddingVertical: 8,
      marginBottom: 14,
      borderWidth: 1,
      borderColor: `${Colors.primary}30`,
    },
    countdownStripEvent: { flex: 1, fontFamily: "Inter_600SemiBold", fontSize: 12, color: Colors.text },
    countdownStripChip: {
      flexDirection: "row",
      alignItems: "center",
      gap: 4,
      backgroundColor: `${Colors.primary}20`,
      borderRadius: 20,
      paddingHorizontal: 8,
      paddingVertical: 4,
    },
    countdownStripChipText: { fontFamily: "Inter_700Bold", fontSize: 11, color: Colors.primary },
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
    xpEarnBadge: {
      flexDirection: "row",
      alignItems: "center",
      gap: 3,
      backgroundColor: "#FFC10720",
      borderRadius: 6,
      paddingHorizontal: 6,
      paddingVertical: 2,
      alignSelf: "flex-start",
      marginTop: 4,
    },
    xpEarnText: {
      fontFamily: "Inter_600SemiBold",
      fontSize: 11,
      color: "#FFC107",
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
    ticketOwnerRow: {
      flexDirection: "row", alignItems: "center", gap: 10,
      paddingHorizontal: 16, paddingBottom: 16,
    },
    giftBtn: {
      width: 46, height: 46, borderRadius: 14,
      borderWidth: 1, borderColor: Colors.primary,
      backgroundColor: `${Colors.primary}10`,
      alignItems: "center", justifyContent: "center", flexShrink: 0,
    },
    /* Who's Going */
    whoGoingRow: {
      flexDirection: "row", alignItems: "center", gap: 10,
      paddingHorizontal: 16, paddingBottom: 12,
    },
    whoGoingAvatars: { flexDirection: "row" },
    whoGoingAvatar: {
      width: 28, height: 28, borderRadius: 14,
      backgroundColor: Colors.primary,
      alignItems: "center", justifyContent: "center",
      borderWidth: 2, borderColor: Colors.surface,
    },
    whoGoingInitial: { fontFamily: "Inter_700Bold", fontSize: 12, color: "#fff" },
    whoGoingExtra: { backgroundColor: Colors.surface2 },
    whoGoingExtraText: { fontFamily: "Inter_700Bold", fontSize: 10, color: Colors.textSecondary },
    whoGoingLabel: { fontFamily: "Inter_400Regular", fontSize: 12, color: Colors.textSecondary, flex: 1 },
    /* Gift modal */
    giftOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.5)" },
    giftSheet: {
      backgroundColor: Colors.background, borderTopLeftRadius: 28, borderTopRightRadius: 28,
      padding: 24, paddingBottom: 40, gap: 14,
    },
    giftHandle: {
      width: 40, height: 4, borderRadius: 2, backgroundColor: Colors.border,
      alignSelf: "center", marginBottom: 6,
    },
    giftHeader: { flexDirection: "row", alignItems: "center", gap: 10 },
    giftTitle: { fontFamily: "Poppins_800ExtraBold", fontSize: 20, color: Colors.text, flex: 1 },
    giftSubtitle: { fontFamily: "Inter_600SemiBold", fontSize: 14, color: Colors.primary },
    giftDesc: { fontFamily: "Inter_400Regular", fontSize: 14, color: Colors.textSecondary, lineHeight: 20 },
    giftInput: {
      backgroundColor: Colors.surface, borderRadius: 14, padding: 14,
      color: Colors.text, fontFamily: "Inter_400Regular", fontSize: 15,
      borderWidth: 1, borderColor: Colors.border,
    },
    giftSubmitBtn: {
      flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8,
      backgroundColor: Colors.primary, borderRadius: 14, paddingVertical: 15,
    },
    giftSubmitText: { fontFamily: "Inter_700Bold", fontSize: 15, color: "#fff" },
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
