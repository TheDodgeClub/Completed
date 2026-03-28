import React, { useEffect, useRef } from "react";
import {
  View,
  Text,
  Modal,
  Animated,
  StyleSheet,
} from "react-native";
import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";

interface TicketSuccessOverlayProps {
  visible: boolean;
  eventName: string;
  quantity: number;
  ticketTypeName: string;
  onDismiss: () => void;
}

export function TicketSuccessOverlay({
  visible,
  eventName,
  quantity,
  ticketTypeName,
  onDismiss,
}: TicketSuccessOverlayProps) {
  const overlayOpacity = useRef(new Animated.Value(0)).current;
  const checkScale = useRef(new Animated.Value(0)).current;
  const textOpacity = useRef(new Animated.Value(0)).current;
  const textTranslateY = useRef(new Animated.Value(20)).current;
  const dismissTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!visible) return;

    overlayOpacity.setValue(0);
    checkScale.setValue(0);
    textOpacity.setValue(0);
    textTranslateY.setValue(20);

    Animated.sequence([
      Animated.timing(overlayOpacity, {
        toValue: 1,
        duration: 180,
        useNativeDriver: true,
      }),
      Animated.parallel([
        Animated.spring(checkScale, {
          toValue: 1,
          friction: 5,
          tension: 130,
          useNativeDriver: true,
        }),
        Animated.timing(textOpacity, {
          toValue: 1,
          duration: 420,
          delay: 80,
          useNativeDriver: true,
        }),
        Animated.timing(textTranslateY, {
          toValue: 0,
          duration: 380,
          delay: 80,
          useNativeDriver: true,
        }),
      ]),
    ]).start(() => {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      dismissTimerRef.current = setTimeout(() => {
        Animated.timing(overlayOpacity, {
          toValue: 0,
          duration: 350,
          useNativeDriver: true,
        }).start(() => {
          onDismiss();
        });
      }, 1800);
    });

    return () => {
      if (dismissTimerRef.current) {
        clearTimeout(dismissTimerRef.current);
        dismissTimerRef.current = null;
      }
    };
  }, [visible]);

  if (!visible) return null;

  const summary = `${quantity} × ${ticketTypeName} — ${eventName}`;

  return (
    <Modal visible transparent animationType="none" statusBarTranslucent>
      <Animated.View style={[styles.container, { opacity: overlayOpacity }]}>
        <Animated.View style={[styles.checkWrap, { transform: [{ scale: checkScale }] }]}>
          <View style={styles.checkCircle}>
            <Feather name="check" size={56} color="#fff" />
          </View>
        </Animated.View>

        <Animated.View
          style={[
            styles.textBlock,
            { opacity: textOpacity, transform: [{ translateY: textTranslateY }] },
          ]}
        >
          <Text style={styles.heading}>You're in! 🎉</Text>
          <Text style={styles.summary} numberOfLines={2}>
            {summary}
          </Text>
          <Text style={styles.subtext}>Your ticket is ready below</Text>
        </Animated.View>
      </Animated.View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#074A24",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 32,
  },
  checkWrap: {
    marginBottom: 36,
  },
  checkCircle: {
    width: 110,
    height: 110,
    borderRadius: 55,
    backgroundColor: "rgba(255,255,255,0.18)",
    borderWidth: 3,
    borderColor: "rgba(255,255,255,0.35)",
    alignItems: "center",
    justifyContent: "center",
  },
  textBlock: {
    alignItems: "center",
    gap: 10,
  },
  heading: {
    fontFamily: "Poppins_800ExtraBold",
    fontSize: 34,
    color: "#fff",
    textAlign: "center",
  },
  summary: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 16,
    color: "rgba(255,255,255,0.88)",
    textAlign: "center",
    lineHeight: 23,
  },
  subtext: {
    fontFamily: "Inter_400Regular",
    fontSize: 14,
    color: "rgba(255,255,255,0.65)",
    textAlign: "center",
    marginTop: 2,
  },
});
