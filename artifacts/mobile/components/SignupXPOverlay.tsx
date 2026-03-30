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

interface SignupXPOverlayProps {
  visible: boolean;
  onDismiss: () => void;
}

export function SignupXPOverlay({ visible, onDismiss }: SignupXPOverlayProps) {
  const overlayOpacity = useRef(new Animated.Value(0)).current;
  const iconScale = useRef(new Animated.Value(0)).current;
  const textOpacity = useRef(new Animated.Value(0)).current;
  const textTranslateY = useRef(new Animated.Value(20)).current;
  const xpScale = useRef(new Animated.Value(0)).current;
  const dismissTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!visible) return;

    overlayOpacity.setValue(0);
    iconScale.setValue(0);
    textOpacity.setValue(0);
    textTranslateY.setValue(20);
    xpScale.setValue(0);

    Animated.sequence([
      Animated.timing(overlayOpacity, {
        toValue: 1,
        duration: 200,
        useNativeDriver: true,
      }),
      Animated.parallel([
        Animated.spring(iconScale, {
          toValue: 1,
          friction: 5,
          tension: 130,
          useNativeDriver: true,
        }),
        Animated.timing(textOpacity, {
          toValue: 1,
          duration: 400,
          delay: 100,
          useNativeDriver: true,
        }),
        Animated.timing(textTranslateY, {
          toValue: 0,
          duration: 360,
          delay: 100,
          useNativeDriver: true,
        }),
      ]),
      Animated.spring(xpScale, {
        toValue: 1,
        friction: 5,
        tension: 160,
        useNativeDriver: true,
      }),
    ]).start(() => {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      dismissTimerRef.current = setTimeout(() => {
        Animated.timing(overlayOpacity, {
          toValue: 0,
          duration: 380,
          useNativeDriver: true,
        }).start(() => onDismiss());
      }, 2400);
    });

    return () => {
      if (dismissTimerRef.current) {
        clearTimeout(dismissTimerRef.current);
        dismissTimerRef.current = null;
      }
    };
  }, [visible]);

  if (!visible) return null;

  return (
    <Modal visible transparent animationType="none" statusBarTranslucent>
      <Animated.View style={[styles.container, { opacity: overlayOpacity }]}>
        <Animated.View style={[styles.iconWrap, { transform: [{ scale: iconScale }] }]}>
          <View style={styles.iconCircle}>
            <Feather name="star" size={54} color="#FFD700" />
          </View>
        </Animated.View>

        <Animated.View
          style={[
            styles.textBlock,
            { opacity: textOpacity, transform: [{ translateY: textTranslateY }] },
          ]}
        >
          <Text style={styles.heading}>Welcome to{"\n"}The Dodge Club!</Text>
          <Text style={styles.subtext}>You're officially a member</Text>
        </Animated.View>

        <Animated.View style={[styles.xpBadge, { transform: [{ scale: xpScale }] }]}>
          <Text style={styles.xpText}>+25 XP</Text>
          <Text style={styles.xpLabel}>Signup bonus</Text>
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
    gap: 0,
  },
  iconWrap: {
    marginBottom: 32,
  },
  iconCircle: {
    width: 114,
    height: 114,
    borderRadius: 57,
    backgroundColor: "rgba(255,215,0,0.12)",
    borderWidth: 3,
    borderColor: "rgba(255,215,0,0.35)",
    alignItems: "center",
    justifyContent: "center",
  },
  textBlock: {
    alignItems: "center",
    gap: 8,
    marginBottom: 36,
  },
  heading: {
    fontFamily: "Poppins_800ExtraBold",
    fontSize: 32,
    color: "#fff",
    textAlign: "center",
    lineHeight: 40,
  },
  subtext: {
    fontFamily: "Inter_400Regular",
    fontSize: 15,
    color: "rgba(255,255,255,0.65)",
    textAlign: "center",
  },
  xpBadge: {
    backgroundColor: "rgba(255,215,0,0.15)",
    borderWidth: 2,
    borderColor: "rgba(255,215,0,0.5)",
    borderRadius: 20,
    paddingHorizontal: 32,
    paddingVertical: 14,
    alignItems: "center",
    gap: 2,
  },
  xpText: {
    fontFamily: "Poppins_800ExtraBold",
    fontSize: 36,
    color: "#FFD700",
    lineHeight: 42,
  },
  xpLabel: {
    fontFamily: "Inter_500Medium",
    fontSize: 13,
    color: "rgba(255,215,0,0.75)",
    letterSpacing: 0.5,
    textTransform: "uppercase",
  },
});
