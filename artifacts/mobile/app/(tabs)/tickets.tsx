import React, { useMemo, useState, useCallback, useRef, useEffect } from "react";
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
  PanResponder,
  Dimensions,
  type ScrollView as RNScrollView,
} from "react-native";
import { TicketSuccessOverlay } from "@/components/TicketSuccessOverlay";
import WebStripeModal from "@/components/WebStripeModal";
import Svg, { Path as SvgPath } from "react-native-svg";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import * as WebBrowser from "expo-web-browser";
import * as Haptics from "expo-haptics";
import QRCode from "react-native-qrcode-svg";
import { useLocalSearchParams } from "expo-router";
import Constants from "expo-constants";
import { useColors } from "@/context/ThemeContext";
import { useAuth } from "@/context/AuthContext";
import { useNativeStripe } from "@/hooks/useNativeStripe";
import {
  listEvents,
  getMyTickets,
  createCheckoutSession,
  createPaymentIntent,
  confirmPaymentIntentTicket,
  registerFreeTicket,
  validateDiscountCode,
  getEventAttendees,
  createGiftPaymentIntent,
  confirmGiftPayment,
  Event,
  Ticket,
  TicketType,
  CheckoutField,
  EventAttendee,
} from "@/lib/api";

const isExpoGo = Constants.executionEnvironment === "storeClient";

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
  const { initPaymentSheet, presentPaymentSheet } = useNativeStripe();
  const { tab } = useLocalSearchParams<{ tab?: string }>();
  const [refreshing, setRefreshing] = useState(false);
  const [selectedTicket, setSelectedTicket] = useState<Ticket | null>(null);
  const [activeTab, setActiveTab] = useState<"my" | "buy">(tab === "my" ? "my" : "buy");

  useEffect(() => {
    if (tab === "my" || tab === "buy") setActiveTab(tab);
  }, [tab]);

  const { data: events, isLoading: eventsLoading, refetch: refetchEvents } = useQuery({
    queryKey: ["all-events"],
    queryFn: listEvents,
  });

  const { data: myTickets, isLoading: ticketsLoading, refetch: refetchTickets } = useQuery({
    queryKey: ["my-tickets"],
    queryFn: getMyTickets,
    enabled: !!user,
  });

  type SuccessOverlayInfo = { eventName: string; quantity: number; ticketTypeName: string; pendingTicket?: Ticket };
  const [successOverlay, setSuccessOverlay] = useState<SuccessOverlayInfo | null>(null);
  const pendingFreeEventRef = useRef<{ eventName: string; quantity: number; ticketTypeName: string } | null>(null);
  const [webStripeModal, setWebStripeModal] = useState<{
    clientSecret: string;
    publishableKey: string;
    paymentIntentId: string;
    eventId: number;
    eventName: string;
    ticketTypeName: string;
    quantity: number;
  } | null>(null);
  const [webGiftStripeModal, setWebGiftStripeModal] = useState<{
    clientSecret: string;
    publishableKey: string;
    paymentIntentId: string;
    recipientEmail: string;
    eventTitle: string;
  } | null>(null);

  const handleSuccessDismiss = useCallback(() => {
    const pending = successOverlay?.pendingTicket ?? null;
    setSuccessOverlay(null);
    if (pending) setSelectedTicket(pending);
    setActiveTab("my");
  }, [successOverlay]);

  const { mutate: registerFree, isPending: registeringFree } = useMutation({
    mutationFn: ({ eventId, checkoutData, ticketTypeId, quantity }: { eventId: number; checkoutData?: Record<string, string>; ticketTypeId?: number; quantity?: number }) =>
      registerFreeTicket(eventId, checkoutData, ticketTypeId, quantity),
    onSuccess: async (data) => {
      await refetchTickets();
      const info = pendingFreeEventRef.current;
      pendingFreeEventRef.current = null;
      if (info) {
        setSuccessOverlay({ ...info, pendingTicket: data.ticket });
      } else {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        setSelectedTicket(data.ticket);
        setActiveTab("my");
      }
    },
    onError: (err: any) => Alert.alert("Error", err.message ?? "Could not register"),
  });

  const [buyingEventId, setBuyingEventId] = useState<number | null>(null);
  const [checkoutSheetEvent, setCheckoutSheetEvent] = useState<Event | null>(null);
  const [giftEvent, setGiftEvent] = useState<{ id: number; title: string } | null>(null);
  const [giftEmail, setGiftEmail] = useState("");
  const [giftingEventId, setGiftingEventId] = useState<number | null>(null);

  const doBuyTicket = useCallback(async (event: Event, checkoutData?: Record<string, string>, ticketTypeId?: number, discountCode?: string, quantity: number = 1) => {
    // If a specific ticket type is provided and it's free (or discount makes it free), use free flow
    const selectedType = ticketTypeId ? event.ticketTypes?.find(t => t.id === ticketTypeId) : null;
    const typePrice = selectedType?.price ?? null;
    const isFreeType = selectedType !== null && typePrice === 0;
    const typeName = selectedType?.name ?? "Ticket";

    // Free event (no type selected, or free type)
    if (isFreeType || (!ticketTypeId && !event.stripePriceId)) {
      if (isFreeType || event.ticketPrice === 0) {
        pendingFreeEventRef.current = { eventName: event.title, quantity, ticketTypeName: typeName };
        registerFree({ eventId: event.id, checkoutData, ticketTypeId, quantity });
      } else {
        Alert.alert("Tickets not available", "This event does not have tickets configured yet.");
      }
      return;
    }

    // Paid — on native use Stripe PaymentSheet; on web use in-app Payment Element modal
    setBuyingEventId(event.id);
    try {
      if (Platform.OS !== "web") {
        // Native PaymentSheet flow
        const result = await createPaymentIntent(event.id, checkoutData, ticketTypeId, discountCode, quantity);

        // If server already issued a free ticket (after discount)
        if (result.free && result.ticket) {
          await refetchTickets();
          setSuccessOverlay({ eventName: event.title, quantity, ticketTypeName: typeName, pendingTicket: result.ticket });
          return;
        }

        const { error: initError } = await initPaymentSheet({
          merchantDisplayName: "The Dodge Club",
          paymentIntentClientSecret: result.clientSecret,
          defaultBillingDetails: {},
          allowsDelayedPaymentMethods: false,
          returnURL: "mobile://stripe-redirect",
        });

        if (initError) {
          Alert.alert("Error", initError.message ?? "Could not initialise payment");
          return;
        }

        const { error: presentError } = await presentPaymentSheet();

        if (presentError) {
          if (presentError.code !== "Canceled") {
            Alert.alert("Payment Failed", presentError.message ?? "Your payment could not be completed.");
          }
          return;
        }

        // Payment succeeded — confirm ticket on server then show success overlay
        const { ticket } = await confirmPaymentIntentTicket(result.paymentIntentId);
        await refetchTickets();
        setSuccessOverlay({ eventName: event.title, quantity, ticketTypeName: typeName, pendingTicket: ticket });
      } else if (Platform.OS === "web") {
        // Web — in-app Stripe Payment Element modal (no external browser)
        const result = await createPaymentIntent(event.id, checkoutData, ticketTypeId, discountCode, quantity);
        if (result.free && result.ticket) {
          await refetchTickets();
          setSuccessOverlay({ eventName: event.title, quantity, ticketTypeName: typeName, pendingTicket: result.ticket });
          return;
        }
        setWebStripeModal({
          clientSecret: result.clientSecret,
          publishableKey: result.publishableKey,
          paymentIntentId: result.paymentIntentId,
          eventId: event.id,
          eventName: event.title,
          ticketTypeName: typeName,
          quantity,
        });
        return;
      } else {
        // Expo Go fallback — Stripe Checkout redirect
        const { url } = await createCheckoutSession(event.id, checkoutData, ticketTypeId, discountCode, quantity);
        await WebBrowser.openBrowserAsync(url, {
          presentationStyle: WebBrowser.WebBrowserPresentationStyle.FULL_SCREEN,
          dismissButtonStyle: "done",
          toolbarColor: "#0B5E2F",
          controlsColor: "#FFD700",
        });
        const fresh = await refetchTickets();
        const eventTickets = (fresh.data ?? []).filter(t => t.eventId === event.id);
        const newTicket = eventTickets.sort((a, b) => b.id - a.id)[0];
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
  }, [registerFree, refetchTickets, initPaymentSheet, presentPaymentSheet]);

  const handleBuyTicket = useCallback((event: Event) => {
    if (!user) {
      Alert.alert("Sign in required", "Please sign in to purchase tickets.");
      return;
    }
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setCheckoutSheetEvent(event);
  }, [user]);

  const handleRefresh = async () => {
    setRefreshing(true);
    await Promise.all([refetchEvents(), refetchTickets()]);
    setRefreshing(false);
  };

  const handleWebStripeSuccess = useCallback(async () => {
    const info = webStripeModal;
    setWebStripeModal(null);
    if (!info) return;
    try {
      const { ticket } = await confirmPaymentIntentTicket(info.paymentIntentId);
      await refetchTickets();
      setSuccessOverlay({ eventName: info.eventName, quantity: info.quantity, ticketTypeName: info.ticketTypeName, pendingTicket: ticket });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch {
      await refetchTickets();
    }
  }, [webStripeModal, refetchTickets]);

  const handleWebGiftStripeSuccess = useCallback(async () => {
    const info = webGiftStripeModal;
    setWebGiftStripeModal(null);
    if (!info) return;
    try {
      await confirmGiftPayment(info.paymentIntentId);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      Alert.alert("Ticket Gifted! 🎁", `A ticket for ${info.eventTitle} has been sent to ${info.recipientEmail}.`);
    } catch {
      Alert.alert("Gift Confirmed", `Your friend will receive their ticket for ${info.eventTitle} shortly.`);
    }
  }, [webGiftStripeModal]);

  const handleGiftSubmit = async () => {
    if (!giftEvent || !giftEmail.trim()) return;
    const emailRx = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRx.test(giftEmail.trim())) {
      Alert.alert("Invalid email", "Please enter a valid email address.");
      return;
    }
    setGiftingEventId(giftEvent.id);
    const savedEventTitle = giftEvent.title;
    const savedEmail = giftEmail.trim();
    try {
      if (Platform.OS !== "web") {
        // Native — use in-app PaymentSheet (no browser redirect)
        const pi = await createGiftPaymentIntent(giftEvent.id, savedEmail);
        if (!pi.clientSecret) {
          // Free gift — already created
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          setGiftEvent(null);
          setGiftEmail("");
          Alert.alert("Ticket Gifted!", `A ticket for ${savedEventTitle} has been sent to ${savedEmail}.`);
          return;
        }
        const { error: initError } = await initPaymentSheet({
          merchantDisplayName: "The Dodge Club",
          paymentIntentClientSecret: pi.clientSecret,
          defaultBillingDetails: {},
          allowsDelayedPaymentMethods: false,
          returnURL: "mobile://stripe-redirect",
        });
        if (initError) { Alert.alert("Error", initError.message ?? "Could not initialise payment"); return; }
        const { error: presentError } = await presentPaymentSheet();
        if (presentError) {
          if (presentError.code !== "Canceled") Alert.alert("Payment Failed", presentError.message ?? "Your payment could not be completed.");
          return;
        }
        await confirmGiftPayment(pi.paymentIntentId);
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        setGiftEvent(null);
        setGiftEmail("");
        Alert.alert("Ticket Gifted! 🎁", `A ticket for ${savedEventTitle} has been sent to ${savedEmail}.`);
      } else {
        // Web — in-app Stripe modal (no external browser)
        const pi = await createGiftPaymentIntent(giftEvent.id, savedEmail);
        if (!pi.clientSecret) {
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          setGiftEvent(null);
          setGiftEmail("");
          Alert.alert("Ticket Gifted!", `A ticket for ${savedEventTitle} has been sent to ${savedEmail}.`);
          return;
        }
        setGiftEvent(null);
        setGiftEmail("");
        setWebGiftStripeModal({
          clientSecret: pi.clientSecret,
          publishableKey: pi.publishableKey ?? "",
          paymentIntentId: pi.paymentIntentId ?? "",
          recipientEmail: savedEmail,
          eventTitle: savedEventTitle,
        });
      }
    } catch (err: any) {
      Alert.alert("Error", err.message ?? "Could not gift ticket");
    } finally {
      setGiftingEventId(null);
    }
  };

  const upcomingEvents = events?.filter(e => e.isUpcoming) ?? [];
  const ticketCountByEvent = new Map<number, number>();
  for (const t of myTickets ?? []) {
    ticketCountByEvent.set(t.eventId, (ticketCountByEvent.get(t.eventId) ?? 0) + 1);
  }

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
          contentContainerStyle={{ paddingBottom: insets.bottom + 40 + (Platform.OS === "web" ? 84 : 0) }}
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
                  icon="tag"
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
                    onGift={() => { setGiftEvent({ id: ticket.eventId, title: ticket.eventTitle }); setGiftEmail(""); }}
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
                    ticketCount={ticketCountByEvent.get(event.id) ?? 0}
                    isBuying={buyingEventId === event.id}
                    isRegisteringFree={registeringFree}
                    onBuy={() => handleBuyTicket(event)}
                    onViewTickets={() => setActiveTab("my")}
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

      {/* Purchase success overlay */}
      {successOverlay && (
        <TicketSuccessOverlay
          visible={!!successOverlay}
          eventName={successOverlay.eventName}
          quantity={successOverlay.quantity}
          ticketTypeName={successOverlay.ticketTypeName}
          onDismiss={handleSuccessDismiss}
        />
      )}

      {/* In-app Stripe Payment Modal (web only) */}
      {Platform.OS === "web" && (
        <WebStripeModal
          visible={!!webStripeModal}
          clientSecret={webStripeModal?.clientSecret ?? ""}
          publishableKey={webStripeModal?.publishableKey ?? ""}
          onSuccess={handleWebStripeSuccess}
          onClose={() => setWebStripeModal(null)}
        />
      )}

      {/* In-app Stripe Gift Payment Modal (web only) */}
      {Platform.OS === "web" && (
        <WebStripeModal
          visible={!!webGiftStripeModal}
          clientSecret={webGiftStripeModal?.clientSecret ?? ""}
          publishableKey={webGiftStripeModal?.publishableKey ?? ""}
          onSuccess={handleWebGiftStripeSuccess}
          onClose={() => setWebGiftStripeModal(null)}
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

      {/* Unified Checkout Sheet */}
      {checkoutSheetEvent && (
        <UnifiedCheckoutSheet
          event={checkoutSheetEvent}
          user={user}
          Colors={Colors}
          onClose={() => setCheckoutSheetEvent(null)}
          onSubmit={(formData, ticketTypeId, discountCode, quantity) => {
            const event = checkoutSheetEvent;
            setCheckoutSheetEvent(null);
            doBuyTicket(event, formData, ticketTypeId, discountCode, quantity);
          }}
        />
      )}
    </View>
  );
}

/* ── Sub-components ── */

function TicketCard({ ticket, Colors, onPress, onGift }: { ticket: Ticket; Colors: any; onPress: () => void; onGift: () => void }) {
  const styles = useMemo(() => makeStyles(Colors), [Colors]);
  const date = new Date(ticket.eventDate);
  const day = date.toLocaleDateString("en-GB", { day: "2-digit" });
  const month = date.toLocaleDateString("en-GB", { month: "short" }).toUpperCase();

  return (
    <View style={styles.ticketCardWrap}>
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
            {ticket.checkedIn ? (
              <View style={styles.ticketXpRow}>
                <Feather name="zap" size={10} color="#4CAF50" />
                <Text style={[styles.ticketXpText, { color: "#4CAF50" }]}>XP earned · checked in</Text>
              </View>
            ) : (ticket.eventXpReward ?? 0) > 0 ? (
              <View style={styles.ticketXpRow}>
                <Feather name="zap" size={10} color="#FFC107" />
                <Text style={styles.ticketXpText}>+{ticket.eventXpReward} XP on check-in</Text>
              </View>
            ) : null}
          </View>
        </View>
        <View style={styles.qrHint}>
          <Feather name="maximize-2" size={20} color={Colors.primary} />
          <Text style={styles.qrHintText}>View{"\n"}QR</Text>
        </View>
      </Pressable>
      <Pressable
        style={({ pressed }) => [styles.ticketGiftRow, { opacity: pressed ? 0.7 : 1 }]}
        onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); onGift(); }}
      >
        <Feather name="gift" size={14} color={Colors.primary} />
        <Text style={styles.ticketGiftText}>Gift a ticket to a friend</Text>
        <Feather name="chevron-right" size={14} color={Colors.textMuted} style={{ marginLeft: "auto" }} />
      </Pressable>
    </View>
  );
}

function EventBuyCard({
  event,
  ticketCount,
  isBuying,
  isRegisteringFree,
  onBuy,
  onViewTickets,
  Colors,
}: {
  event: Event;
  ticketCount: number;
  isBuying: boolean;
  isRegisteringFree: boolean;
  onBuy: () => void;
  onViewTickets: () => void;
  Colors: any;
}) {
  const styles = useMemo(() => makeStyles(Colors), [Colors]);
  const date = new Date(event.date);
  const day = date.toLocaleDateString("en-GB", { day: "2-digit" });
  const month = date.toLocaleDateString("en-GB", { month: "short" }).toUpperCase();
  const time = date.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" });

  const activeTypes = event.ticketTypes?.filter(t => t.isActive && t.saleOpen) ?? [];
  const hasActiveTypes = activeTypes.length > 0;
  const minTypePrice = hasActiveTypes ? Math.min(...activeTypes.map(t => t.price)) : null;
  const allTypesSoldOut = hasActiveTypes && activeTypes.every(t => t.isSoldOut);
  const isFree = !hasActiveTypes && (event.ticketPrice === 0 || (!event.stripePriceId && event.ticketPrice == null));
  const hasTicketing = !!event.stripePriceId || event.ticketPrice === 0 || hasActiveTypes;
  const priceLabel = !hasTicketing
    ? null
    : hasActiveTypes
      ? (minTypePrice === 0 ? "Limited" : `From £${((minTypePrice ?? 0) / 100).toFixed(2)}`)
      : isFree
        ? "Limited"
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
          <View style={[styles.priceBadge, isFree && styles.priceBadgeLimited]}>
            <Text style={[styles.priceText, isFree && styles.priceTextLimited]}>{priceLabel}</Text>
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
        <>
          {allTypesSoldOut ? (
            <View style={[styles.buyBtn, { backgroundColor: Colors.border ?? "#333", opacity: 0.6 }]}>
              <Feather name="x-circle" size={15} color={Colors.textMuted} />
              <Text style={[styles.buyBtnText, { color: Colors.textMuted }]}>Sold Out</Text>
            </View>
          ) : (
            <Pressable
              style={({ pressed }) => [styles.buyBtn, { opacity: pressed || isBuying || isRegisteringFree ? 0.7 : 1 }]}
              onPress={() => onBuy()}
              disabled={isBuying || isRegisteringFree}
            >
              {isBuying || isRegisteringFree ? (
                <ActivityIndicator color="#fff" size="small" />
              ) : (
                <>
                  <Feather name="credit-card" size={15} color="#fff" />
                  <Text style={styles.buyBtnText}>
                    {isFree
                      ? "Register Free"
                      : ticketCount > 0
                        ? "Buy Another Ticket"
                        : "Buy Ticket"}
                  </Text>
                </>
              )}
            </Pressable>
          )}
          {ticketCount > 0 && (
            <Pressable
              style={({ pressed }) => [styles.viewTicketsRow, { opacity: pressed ? 0.7 : 1 }]}
              onPress={onViewTickets}
            >
              <Feather name="check-circle" size={13} color={Colors.primary} />
              <Text style={styles.viewTicketsText}>
                You have {ticketCount} ticket{ticketCount > 1 ? "s" : ""} → View
              </Text>
            </Pressable>
          )}
        </>
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

function UnifiedCheckoutSheet({
  event,
  user,
  Colors,
  onClose,
  onSubmit,
}: {
  event: Event;
  user: ReturnType<typeof useAuth>["user"];
  Colors: any;
  onClose: () => void;
  onSubmit: (formData: Record<string, string>, ticketTypeId: number | undefined, discountCode: string | undefined, quantity: number) => void;
}) {
  const insets = useSafeAreaInsets();
  const SCREEN_HEIGHT = Dimensions.get("window").height;

  const activeTypes = event.ticketTypes?.filter(t => t.isActive && t.saleOpen) ?? [];
  const hasActiveTypes = activeTypes.length > 0;
  const allTypesSoldOut = hasActiveTypes && activeTypes.every(t => t.isSoldOut);
  const fields: CheckoutField[] = event.checkoutFields ?? [];
  const hasWaiver = !!event.waiverText;
  const isFreeEvent = !hasActiveTypes && (event.ticketPrice === 0 || (!event.stripePriceId && event.ticketPrice == null));

  const nonSoldOutTypes = activeTypes.filter(t => !t.isSoldOut);

  const [quantity, setQuantity] = useState(1);
  const [selectedTypeId, setSelectedTypeId] = useState<number | null>(
    activeTypes.length === 1 ? activeTypes[0].id : null
  );
  const [discountInput, setDiscountInput] = useState("");
  const [validating, setValidating] = useState(false);
  const [appliedCode, setAppliedCode] = useState<{ code: string; discountType: "percent" | "fixed"; discountAmount: number } | null>(null);
  const [codeError, setCodeError] = useState("");

  const selectedType = activeTypes.find(t => t.id === selectedTypeId) ?? null;

  const stepperMax = (() => {
    if (!hasActiveTypes) return 10;
    if (selectedType && !selectedType.isSoldOut) {
      const cap = selectedType.maxPerOrder !== null ? selectedType.maxPerOrder : (selectedType.available !== null ? selectedType.available : 10);
      return Math.max(1, cap);
    }
    if (nonSoldOutTypes.length === 0) return 1;
    return nonSoldOutTypes.reduce<number>((min, t) => {
      const cap = t.maxPerOrder !== null ? t.maxPerOrder : (t.available !== null ? t.available : 10);
      return Math.min(min, cap);
    }, 10);
  })();
  const discountedPrice = appliedCode && selectedType
    ? (appliedCode.discountType === "percent"
        ? Math.max(0, Math.round(selectedType.price * (1 - appliedCode.discountAmount / 100)))
        : Math.max(0, selectedType.price - appliedCode.discountAmount))
    : null;

  const isElite = !!user?.isElite;
  // Elite 15% discount — applied per ticket type (server mirrors this calculation)
  const elitePrice = (pence: number) => pence > 0 ? Math.round(pence * 0.85) : 0;

  const initialFormData = useMemo(() => {
    const init: Record<string, string> = {};
    for (const field of fields) {
      const idL = field.id.toLowerCase();
      const labelL = field.label.toLowerCase();
      if (field.type === "email" || idL.includes("email") || labelL.includes("email")) {
        if (user?.email) init[field.id] = user.email;
      } else if (field.type === "text" && (/name/.test(idL) || /name/.test(labelL))) {
        if (user?.name) init[field.id] = user.name;
      }
    }
    return init;
  }, [fields, user?.email, user?.name]);

  const [formData, setFormData] = useState<Record<string, string>>(initialFormData);
  const [waiverExpanded, setWaiverExpanded] = useState(false);
  const [signaturePaths, setSignaturePaths] = useState<string[]>([]);
  const [, setRenderTick] = useState(0);
  const [scrollEnabled, setScrollEnabled] = useState(true);
  const currentStroke = useRef<string>("");
  const scrollRef = useRef<RNScrollView>(null);
  const sigContainerRef = useRef<any>(null);
  const pointerDownRef = useRef(false);
  const isSigned = signaturePaths.length > 0;

  useEffect(() => {
    if (Platform.OS === "web") {
      const prev = (document as any).body.style.overflow;
      (document as any).body.style.overflow = "hidden";
      return () => { (document as any).body.style.overflow = prev; };
    }
  }, []);

  useEffect(() => {
    if (Platform.OS !== "web") return;
    if (!waiverExpanded) return;
    let rafId: number;
    let cleanupListeners: (() => void) | null = null;
    rafId = requestAnimationFrame(() => {
      const el: HTMLElement | null = sigContainerRef.current;
      if (!el) return;
      el.style.touchAction = "none";
      el.style.cursor = "crosshair";
      (el.style as any).userSelect = "none";
      function localCoords(e: PointerEvent) {
        const rect = el!.getBoundingClientRect();
        return { x: e.clientX - rect.left, y: e.clientY - rect.top };
      }
      function onDown(e: PointerEvent) {
        e.preventDefault();
        pointerDownRef.current = true;
        el!.setPointerCapture(e.pointerId);
        const { x, y } = localCoords(e);
        currentStroke.current = `M${x.toFixed(1)},${y.toFixed(1)}`;
        setScrollEnabled(false);
        setRenderTick(t => t + 1);
      }
      function onMove(e: PointerEvent) {
        if (!pointerDownRef.current) return;
        e.preventDefault();
        const { x, y } = localCoords(e);
        currentStroke.current += ` L${x.toFixed(1)},${y.toFixed(1)}`;
        setRenderTick(t => t + 1);
      }
      function onUp(e: PointerEvent) {
        if (!pointerDownRef.current) return;
        pointerDownRef.current = false;
        try { el!.releasePointerCapture(e.pointerId); } catch {}
        if (currentStroke.current) {
          const completed = currentStroke.current;
          currentStroke.current = "";
          setSignaturePaths(prev => [...prev, completed]);
        }
        setScrollEnabled(true);
        setRenderTick(t => t + 1);
      }
      el.addEventListener("pointerdown", onDown);
      el.addEventListener("pointermove", onMove);
      el.addEventListener("pointerup", onUp);
      el.addEventListener("pointercancel", onUp);
      cleanupListeners = () => {
        el.removeEventListener("pointerdown", onDown);
        el.removeEventListener("pointermove", onMove);
        el.removeEventListener("pointerup", onUp);
        el.removeEventListener("pointercancel", onUp);
      };
    });
    return () => {
      cancelAnimationFrame(rafId);
      cleanupListeners?.();
    };
  }, [waiverExpanded]);

  const signaturePanResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponderCapture: () => true,
      onMoveShouldSetPanResponderCapture: () => true,
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: (e) => {
        const { locationX: x, locationY: y } = e.nativeEvent;
        currentStroke.current = `M${x.toFixed(1)},${y.toFixed(1)}`;
        setScrollEnabled(false);
        setRenderTick(t => t + 1);
      },
      onPanResponderMove: (e) => {
        const { locationX: x, locationY: y } = e.nativeEvent;
        currentStroke.current += ` L${x.toFixed(1)},${y.toFixed(1)}`;
        setRenderTick(t => t + 1);
      },
      onPanResponderRelease: () => {
        if (currentStroke.current) {
          const completed = currentStroke.current;
          currentStroke.current = "";
          setSignaturePaths(prev => [...prev, completed]);
        }
        setScrollEnabled(true);
        setRenderTick(t => t + 1);
      },
      onPanResponderTerminate: () => {
        currentStroke.current = "";
        setScrollEnabled(true);
        setRenderTick(t => t + 1);
      },
    })
  ).current;

  const handleValidateCode = async () => {
    if (!discountInput.trim()) return;
    setValidating(true);
    setCodeError("");
    setAppliedCode(null);
    try {
      const result = await validateDiscountCode(event.id, discountInput.trim());
      setAppliedCode({ code: result.code, discountType: result.discountType, discountAmount: result.discountAmount });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (err: any) {
      setCodeError(err.message ?? "Invalid discount code");
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    } finally {
      setValidating(false);
    }
  };

  const handleSubmit = () => {
    if (hasActiveTypes && !selectedTypeId) {
      Alert.alert("Select a ticket type", "Please choose a ticket type to continue.");
      return;
    }
    for (const field of fields) {
      if (field.required && !formData[field.id]?.trim()) {
        Alert.alert("Required field", `Please fill in: ${field.label}`);
        return;
      }
    }
    if (hasWaiver && !isSigned) {
      Alert.alert("Signature required", "Please sign the waiver before proceeding.");
      return;
    }
    const finalData = hasWaiver ? { ...formData, __waiver_signed: "true" } : formData;
    onSubmit(finalData, selectedTypeId ?? undefined, appliedCode?.code, quantity);
  };

  const S = StyleSheet.create({
    sheet: { backgroundColor: Colors.surface, borderTopLeftRadius: 24, borderTopRightRadius: 24, maxHeight: SCREEN_HEIGHT * 0.92 },
    handle: { width: 40, height: 4, borderRadius: 2, backgroundColor: Colors.border, alignSelf: "center" as const, marginTop: 12, marginBottom: 8 },
    sheetHeader: { flexDirection: "row" as const, alignItems: "center" as const, justifyContent: "space-between" as const, paddingHorizontal: 20, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: Colors.border },
    sheetTitle: { fontSize: 18, fontWeight: "700" as const, color: Colors.text },
    sheetSubtitle: { fontSize: 13, color: Colors.textMuted, marginTop: 2 },
    scrollContent: { paddingHorizontal: 20, paddingTop: 16, paddingBottom: 8 },
    sectionLabel: { fontSize: 11, fontWeight: "700" as const, color: Colors.textMuted, textTransform: "uppercase" as const, letterSpacing: 1, marginBottom: 8 },
    stepperRow: { flexDirection: "row" as const, alignItems: "center" as const, gap: 12, backgroundColor: Colors.background, borderRadius: 14, padding: 14, borderWidth: 1, borderColor: Colors.border },
    stepperBtn: { width: 36, height: 36, borderRadius: 10, backgroundColor: Colors.surface, borderWidth: 1, borderColor: Colors.border, alignItems: "center" as const, justifyContent: "center" as const },
    stepperValue: { fontSize: 20, fontWeight: "700" as const, color: Colors.text, minWidth: 32, textAlign: "center" as const },
    stepperLabel: { flex: 1, fontSize: 13, color: Colors.textSecondary },
    typeCard: { borderRadius: 14, borderWidth: 2, padding: 14, flexDirection: "row" as const, justifyContent: "space-between" as const, alignItems: "center" as const, marginBottom: 10 },
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
    sigPadLabel: { fontSize: 12, fontWeight: "600" as const, color: Colors.textMuted, textTransform: "uppercase" as const, letterSpacing: 0.5, marginTop: 14, marginBottom: 6 },
    sigPadContainer: { borderWidth: 1.5, borderColor: Colors.border, borderRadius: 10, overflow: "hidden" as const, backgroundColor: "#fff", height: 140, position: "relative" as const },
    sigPadPlaceholder: { position: "absolute" as const, top: 0, left: 0, right: 0, bottom: 0, alignItems: "center" as const, justifyContent: "center" as const },
    sigPadPlaceholderLine: { width: "60%", height: 1, backgroundColor: Colors.border, marginTop: 60 },
    sigPadPlaceholderText: { fontSize: 12, color: Colors.border, marginTop: 6, fontStyle: "italic" as const },
    sigPadClearBtn: { position: "absolute" as const, top: 6, right: 6, paddingHorizontal: 10, paddingVertical: 4, backgroundColor: Colors.background, borderRadius: 8, borderWidth: 1, borderColor: Colors.border },
    sigPadClearText: { fontSize: 11, color: Colors.textMuted, fontWeight: "600" as const },
    footer: { paddingBottom: insets.bottom + 8 },
    proceedBtn: { marginHorizontal: 20, marginTop: 12, backgroundColor: Colors.primary, borderRadius: 14, paddingVertical: 15, alignItems: "center" as const },
    proceedBtnText: { color: "#fff", fontSize: 16, fontWeight: "700" as const },
    cancelBtn: { marginHorizontal: 20, paddingVertical: 12, alignItems: "center" as const },
    cancelBtnText: { color: Colors.textMuted, fontSize: 15 },
    totalRow: { flexDirection: "row" as const, justifyContent: "space-between" as const, alignItems: "center" as const, backgroundColor: Colors.background, borderRadius: 14, padding: 14, marginBottom: 4, borderWidth: 1, borderColor: Colors.border },
  });

  const renderField = (field: CheckoutField) => {
    if (field.type === "yes_no") {
      const val = formData[field.id] ?? "";
      return (
        <View key={field.id} style={S.fieldGroup}>
          <Text style={S.fieldLabel}>{field.label}{field.required ? " *" : ""}</Text>
          <View style={S.chipRow}>
            {["Yes", "No"].map((opt) => (
              <TouchableOpacity key={opt} style={[S.optionChip, { minWidth: 80, alignItems: "center" }, val === opt && S.optionChipActive]} onPress={() => setFormData((d) => ({ ...d, [field.id]: opt }))}>
                <Text style={[S.optionChipText, val === opt && S.optionChipTextActive]}>{opt}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      );
    }
    if (field.type === "select" && field.options?.length) {
      return (
        <View key={field.id} style={S.fieldGroup}>
          <Text style={S.fieldLabel}>{field.label}{field.required ? " *" : ""}</Text>
          <View style={S.chipRow}>
            {field.options.map((opt) => (
              <TouchableOpacity key={opt} style={[S.optionChip, formData[field.id] === opt && S.optionChipActive]} onPress={() => setFormData((d) => ({ ...d, [field.id]: opt }))}>
                <Text style={[S.optionChipText, formData[field.id] === opt && S.optionChipTextActive]}>{opt}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      );
    }
    const isMultiline = field.type === "textarea";
    return (
      <View key={field.id} style={S.fieldGroup}>
        <Text style={S.fieldLabel}>{field.label}{field.required ? " *" : ""}</Text>
        <TextInput
          style={isMultiline ? S.inputMulti : S.input}
          value={formData[field.id] ?? ""}
          onChangeText={(val) => setFormData((d) => ({ ...d, [field.id]: val }))}
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

  const perTicketPence = (() => {
    if (selectedType) {
      const base = discountedPrice !== null ? discountedPrice : selectedType.price;
      return isElite && base > 0 ? elitePrice(base) : base;
    }
    if (!hasActiveTypes && event.ticketPrice != null) {
      const base = Math.round(event.ticketPrice * 100);
      return isElite && base > 0 ? elitePrice(base) : base;
    }
    return 0;
  })();
  const totalPence = perTicketPence * quantity;
  const originalTotalPence = (selectedType?.price ?? 0) * quantity;
  const showTotal = !!selectedType || (!hasActiveTypes && event.ticketPrice != null && event.ticketPrice > 0);

  return (
    <Modal visible transparent animationType="none" onRequestClose={onClose} statusBarTranslucent>
      <View style={{ flex: 1 }}>
        <Pressable style={[StyleSheet.absoluteFillObject, { backgroundColor: "rgba(0,0,0,0.6)" }]} onPress={onClose} />
        <View style={[StyleSheet.absoluteFillObject, { justifyContent: "flex-end" }]}>
          <View style={S.sheet}>
            <View style={S.handle} />
            <View style={S.sheetHeader}>
              <View style={{ flex: 1 }}>
                <Text style={S.sheetTitle}>Get Tickets</Text>
                <Text style={S.sheetSubtitle}>{event.title}</Text>
              </View>
              <TouchableOpacity onPress={onClose} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
                <Feather name="x" size={22} color={Colors.textMuted} />
              </TouchableOpacity>
            </View>

            <ScrollView
              ref={scrollRef}
              style={{ flexShrink: 1 }}
              contentContainerStyle={S.scrollContent}
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
              scrollEnabled={scrollEnabled}
              automaticallyAdjustKeyboardInsets
            >
              {/* Quantity stepper */}
              {!isFreeEvent && !allTypesSoldOut && (
                <View style={{ marginBottom: 20 }}>
                  <Text style={S.sectionLabel}>How many tickets?</Text>
                  <View style={S.stepperRow}>
                    <Pressable
                      style={[S.stepperBtn, { opacity: quantity <= 1 ? 0.4 : 1 }]}
                      onPress={() => setQuantity(q => Math.max(1, q - 1))}
                      disabled={quantity <= 1}
                    >
                      <Feather name="minus" size={16} color={Colors.text} />
                    </Pressable>
                    <Text style={S.stepperValue}>{quantity}</Text>
                    <Pressable
                      style={[S.stepperBtn, { opacity: quantity >= stepperMax ? 0.4 : 1 }]}
                      onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); setQuantity(q => Math.min(stepperMax, q + 1)); }}
                      disabled={quantity >= stepperMax}
                    >
                      <Feather name="plus" size={16} color={Colors.text} />
                    </Pressable>
                    <Text style={S.stepperLabel}>
                      ticket{quantity > 1 ? "s" : ""}{stepperMax < 10 ? `  (max ${stepperMax})` : ""}
                    </Text>
                  </View>
                </View>
              )}

              {/* Ticket type selector */}
              {hasActiveTypes && (
                <View style={{ marginBottom: 20 }}>
                  <Text style={S.sectionLabel}>Ticket type</Text>
                  {activeTypes.map(type => {
                    const isSelected = selectedTypeId === type.id;
                    return (
                      <Pressable
                        key={type.id}
                        onPress={() => {
                          if (!type.isSoldOut) {
                            setSelectedTypeId(type.id);
                            const newCap = type.maxPerOrder !== null ? type.maxPerOrder : (type.available !== null ? type.available : 10);
                            setQuantity(q => Math.min(q, Math.max(1, newCap)));
                            setAppliedCode(null);
                            setCodeError("");
                            setDiscountInput("");
                          }
                        }}
                        style={[S.typeCard, {
                          borderColor: isSelected ? Colors.primary : Colors.border,
                          backgroundColor: isSelected ? `${Colors.primary}15` : Colors.background,
                          opacity: type.isSoldOut ? 0.5 : 1,
                        }]}
                      >
                        <View style={{ flex: 1 }}>
                          <Text style={{ color: Colors.text, fontSize: 15, fontWeight: "600" }}>{type.name}</Text>
                          {type.description && (
                            <Text style={{ color: Colors.textSecondary, fontSize: 12, marginTop: 2 }}>{type.description}</Text>
                          )}
                          {type.available !== null && type.available <= 10 && !type.isSoldOut && (
                            <Text style={{ color: "#F59E0B", fontSize: 11, marginTop: 4, fontWeight: "600" }}>Only {type.available} left!</Text>
                          )}
                          {type.maxPerOrder !== null && !type.isSoldOut && (
                            <Text style={{ color: Colors.textMuted, fontSize: 11, marginTop: 2 }}>Max {type.maxPerOrder} per order</Text>
                          )}
                          {type.isSoldOut && (
                            <Text style={{ color: "#EF4444", fontSize: 11, marginTop: 4, fontWeight: "600" }}>Sold Out</Text>
                          )}
                        </View>
                        <View style={{ alignItems: "flex-end", marginLeft: 12 }}>
                          {isElite && type.price > 0 ? (
                            <>
                              <Text style={{ color: Colors.textMuted, fontSize: 12, textDecorationLine: "line-through" }}>
                                £{(type.price / 100).toFixed(2)}
                              </Text>
                              <Text style={{ color: Colors.accent, fontSize: 18, fontWeight: "700" }}>
                                £{(elitePrice(type.price) / 100).toFixed(2)}
                              </Text>
                              <Text style={{ color: Colors.accent, fontSize: 10, fontWeight: "600" }}>Elite Price</Text>
                            </>
                          ) : (
                            <Text style={{ color: Colors.primary, fontSize: 18, fontWeight: "700" }}>
                              {type.price === 0 ? "FREE" : `£${(type.price / 100).toFixed(2)}`}
                            </Text>
                          )}
                          {isSelected && (
                            <View style={{ width: 20, height: 20, borderRadius: 10, backgroundColor: Colors.primary, alignItems: "center", justifyContent: "center", marginTop: 6 }}>
                              <Feather name="check" size={12} color="#fff" />
                            </View>
                          )}
                        </View>
                      </Pressable>
                    );
                  })}
                </View>
              )}

              {/* Discount code */}
              {selectedType && selectedType.price > 0 && (
                <View style={{ marginBottom: 20 }}>
                  <Text style={S.sectionLabel}>Discount code (optional)</Text>
                  {appliedCode ? (
                    <View style={{ flexDirection: "row", alignItems: "center", backgroundColor: Colors.primary + "22", borderRadius: 12, borderWidth: 1, borderColor: Colors.primary, padding: 12, gap: 10 }}>
                      <Feather name="tag" size={16} color={Colors.primary} />
                      <View style={{ flex: 1 }}>
                        <Text style={{ color: Colors.primary, fontWeight: "700", fontSize: 14 }}>{appliedCode.code} applied!</Text>
                        <Text style={{ color: Colors.textSecondary, fontSize: 12 }}>
                          {appliedCode.discountType === "percent"
                            ? `${appliedCode.discountAmount}% off`
                            : `£${(appliedCode.discountAmount / 100).toFixed(2)} off`}
                          {discountedPrice !== null && ` → £${(discountedPrice / 100).toFixed(2)}`}
                          {discountedPrice === 0 && " (FREE!)"}
                        </Text>
                      </View>
                      <Pressable onPress={() => { setAppliedCode(null); setDiscountInput(""); }} style={{ padding: 4 }}>
                        <Feather name="x" size={16} color={Colors.textSecondary} />
                      </Pressable>
                    </View>
                  ) : (
                    <View style={{ flexDirection: "row", gap: 8 }}>
                      <TextInput
                        value={discountInput}
                        onChangeText={t => { setDiscountInput(t.toUpperCase()); setCodeError(""); }}
                        placeholder="Enter code"
                        placeholderTextColor={Colors.textSecondary}
                        autoCapitalize="characters"
                        style={{ flex: 1, backgroundColor: Colors.background, borderRadius: 12, borderWidth: 1, borderColor: codeError ? "#EF4444" : Colors.border, paddingHorizontal: 14, paddingVertical: 12, color: Colors.text, fontSize: 14 }}
                      />
                      <Pressable
                        onPress={handleValidateCode}
                        disabled={validating || !discountInput.trim()}
                        style={{ backgroundColor: Colors.primary, borderRadius: 12, paddingHorizontal: 16, justifyContent: "center", opacity: validating || !discountInput.trim() ? 0.5 : 1 }}
                      >
                        {validating
                          ? <ActivityIndicator size="small" color="#fff" />
                          : <Text style={{ color: "#fff", fontWeight: "600", fontSize: 14 }}>Apply</Text>
                        }
                      </Pressable>
                    </View>
                  )}
                  {!!codeError && <Text style={{ color: "#EF4444", fontSize: 12, marginTop: 6 }}>{codeError}</Text>}
                </View>
              )}

              {/* Checkout fields */}
              {fields.length > 0 && (
                <View style={{ marginBottom: 4 }}>
                  <Text style={S.sectionLabel}>Your details</Text>
                  {fields.map(renderField)}
                </View>
              )}

              {/* Waiver */}
              {hasWaiver && (
                <View style={S.waiverBox}>
                  <TouchableOpacity style={S.waiverToggleRow} onPress={() => setWaiverExpanded(v => !v)} activeOpacity={0.7}>
                    <View style={{ flex: 1 }}>
                      <Text style={S.waiverTitle}>Waiver & Agreement</Text>
                      {!waiverExpanded && (
                        <Text style={S.waiverCollapsedHint}>{isSigned ? "Tap to view — signed" : "Tap to read and sign"}</Text>
                      )}
                    </View>
                    <Feather name={waiverExpanded ? "chevron-up" : "chevron-down"} size={18} color={Colors.textMuted} />
                  </TouchableOpacity>

                  {waiverExpanded && (
                    <>
                      <Text style={[S.waiverText, { marginTop: 10 }]}>{event.waiverText}</Text>
                      <Text style={S.sigPadLabel}>Your Signature *</Text>
                      <View ref={sigContainerRef} style={S.sigPadContainer}>
                        {signaturePaths.length === 0 && !currentStroke.current && (
                          <View style={S.sigPadPlaceholder} pointerEvents="none">
                            <View style={S.sigPadPlaceholderLine} />
                            <Text style={S.sigPadPlaceholderText}>Sign here with your finger</Text>
                          </View>
                        )}
                        <Svg style={{ flex: 1 }} {...(Platform.OS !== "web" ? signaturePanResponder.panHandlers : {})}>
                          {signaturePaths.map((d, i) => (
                            <SvgPath key={i} d={d} stroke="#1a1a1a" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" fill="none" />
                          ))}
                          {currentStroke.current ? (
                            <SvgPath d={currentStroke.current} stroke="#1a1a1a" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" fill="none" />
                          ) : null}
                        </Svg>
                        {(signaturePaths.length > 0 || currentStroke.current) && (
                          <TouchableOpacity
                            style={S.sigPadClearBtn}
                            onPress={() => { setSignaturePaths([]); currentStroke.current = ""; setRenderTick(t => t + 1); }}
                            activeOpacity={0.7}
                          >
                            <Text style={S.sigPadClearText}>Clear</Text>
                          </TouchableOpacity>
                        )}
                      </View>
                    </>
                  )}

                  {!waiverExpanded && isSigned && (
                    <View style={S.waiverAgreedBadge}>
                      <Feather name="edit-3" size={13} color={Colors.primary} />
                      <Text style={S.waiverAgreedText}>Signed</Text>
                    </View>
                  )}
                </View>
              )}

              {/* Order total */}
              {showTotal && (
                <View style={S.totalRow}>
                  <View>
                    <Text style={{ color: Colors.textSecondary, fontSize: 12 }}>
                      {quantity > 1 ? `Total (${quantity} tickets)` : "Total"}
                    </Text>
                    <Text style={{ color: Colors.text, fontSize: 22, fontWeight: "700" }}>
                      {totalPence === 0 ? "FREE" : `£${(totalPence / 100).toFixed(2)}`}
                    </Text>
                    {(appliedCode && discountedPrice !== null && discountedPrice > 0) && (
                      <Text style={{ color: Colors.textSecondary, fontSize: 11, textDecorationLine: "line-through" }}>
                        £{(originalTotalPence / 100).toFixed(2)}
                      </Text>
                    )}
                    {isElite && selectedType && selectedType.price > 0 && !appliedCode && (
                      <Text style={{ color: Colors.textSecondary, fontSize: 11, textDecorationLine: "line-through" }}>
                        £{((selectedType.price * quantity) / 100).toFixed(2)}
                      </Text>
                    )}
                    {isElite && selectedType && selectedType.price > 0 && (
                      <Text style={{ color: Colors.accent, fontSize: 11, fontWeight: "600" }}>Elite 15% discount applied</Text>
                    )}
                    {quantity > 1 && perTicketPence > 0 && (
                      <Text style={{ color: Colors.textMuted, fontSize: 11, marginTop: 2 }}>
                        £{(perTicketPence / 100).toFixed(2)} per ticket
                      </Text>
                    )}
                  </View>
                  <Feather name="shopping-bag" size={22} color={Colors.primary} />
                </View>
              )}
            </ScrollView>

            <View style={S.footer}>
              <TouchableOpacity style={S.proceedBtn} onPress={handleSubmit} activeOpacity={0.85}>
                <Text style={S.proceedBtnText}>
                  {isFreeEvent || selectedType?.price === 0 || discountedPrice === 0
                    ? "Register Free"
                    : "Proceed to Checkout"}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity style={S.cancelBtn} onPress={onClose}>
                <Text style={S.cancelBtnText}>Cancel</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
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
    ticketCardWrap: {
      backgroundColor: Colors.surface,
      borderRadius: 18,
      borderWidth: 1,
      borderColor: Colors.border,
      marginBottom: 12,
      overflow: "hidden",
    },
    ticketCard: {
      padding: 16,
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
    },
    ticketGiftRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: 8,
      paddingHorizontal: 16,
      paddingVertical: 11,
      borderTopWidth: 1,
      borderTopColor: Colors.border,
    },
    ticketGiftText: {
      fontFamily: "Inter_500Medium",
      fontSize: 13,
      color: Colors.primary,
      flex: 1,
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
    ticketXpRow: { flexDirection: "row", alignItems: "center", gap: 3, marginTop: 3 },
    ticketXpText: {
      fontFamily: "Inter_500Medium",
      fontSize: 10,
      color: "#FFC107",
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
    priceBadgeLimited: { backgroundColor: "#FF3B3022" },
    priceText: {
      fontFamily: "Poppins_800ExtraBold",
      fontSize: 13,
      color: Colors.primary,
    },
    priceTextLimited: { color: "#FF3B30" },
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
    viewTicketsRow: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: 6,
      paddingBottom: 12,
      marginTop: -4,
    },
    viewTicketsText: {
      fontFamily: "Inter_600SemiBold",
      fontSize: 13,
      color: Colors.primary,
    },
    quantityRow: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: 12,
      paddingHorizontal: 16,
      paddingBottom: 12,
    },
    quantityBtn: {
      width: 32,
      height: 32,
      borderRadius: 8,
      backgroundColor: Colors.card,
      borderWidth: 1,
      borderColor: Colors.border,
      alignItems: "center",
      justifyContent: "center",
    },
    quantityValue: {
      fontFamily: "Inter_700Bold",
      fontSize: 18,
      color: Colors.text,
      minWidth: 28,
      textAlign: "center",
    },
    quantityLabel: {
      fontFamily: "Inter_400Regular",
      fontSize: 14,
      color: Colors.textSecondary,
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
