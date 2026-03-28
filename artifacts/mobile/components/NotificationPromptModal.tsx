import React from "react";
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  Modal,
  Platform,
} from "react-native";
import { Feather } from "@expo/vector-icons";
import { useColors } from "@/context/ThemeContext";

interface NotificationPromptModalProps {
  visible: boolean;
  onAllow: () => void;
  onDismiss: () => void;
}

export function NotificationPromptModal({ visible, onAllow, onDismiss }: NotificationPromptModalProps) {
  const Colors = useColors();

  if (Platform.OS === "web") return null;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      statusBarTranslucent
      onRequestClose={onDismiss}
    >
      <View style={styles.overlay}>
        <View style={[styles.card, { backgroundColor: Colors.surface }]}>
          <View style={[styles.iconWrap, { backgroundColor: `${Colors.primary}1A` }]}>
            <Feather name="bell" size={36} color={Colors.primary} />
          </View>

          <Text style={[styles.heading, { color: Colors.text }]}>Stay in the loop</Text>

          <Text style={[styles.body, { color: Colors.textSecondary }]}>
            We'll remind you before events and let you know when you've been checked in.
          </Text>

          <Pressable
            style={({ pressed }) => [
              styles.allowBtn,
              { backgroundColor: Colors.primary, opacity: pressed ? 0.87 : 1 },
            ]}
            onPress={onAllow}
          >
            <Feather name="bell" size={17} color="#fff" style={{ marginRight: 8 }} />
            <Text style={styles.allowBtnText}>Allow notifications</Text>
          </Pressable>

          <Pressable style={styles.dismissBtn} onPress={onDismiss}>
            <Text style={[styles.dismissBtnText, { color: Colors.textMuted }]}>Not now</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.6)",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 28,
  },
  card: {
    width: "100%",
    maxWidth: 360,
    borderRadius: 24,
    padding: 32,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.35,
    shadowRadius: 20,
    elevation: 12,
  },
  iconWrap: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 20,
  },
  heading: {
    fontFamily: "Poppins_800ExtraBold",
    fontSize: 22,
    textAlign: "center",
    marginBottom: 10,
  },
  body: {
    fontFamily: "Inter_400Regular",
    fontSize: 14,
    textAlign: "center",
    lineHeight: 21,
    marginBottom: 28,
  },
  allowBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    width: "100%",
    paddingVertical: 16,
    borderRadius: 14,
    marginBottom: 12,
    shadowColor: "#0B5E2F",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
  allowBtnText: {
    fontFamily: "Inter_700Bold",
    fontSize: 15,
    color: "#fff",
    letterSpacing: 0.2,
  },
  dismissBtn: {
    paddingVertical: 10,
    paddingHorizontal: 20,
  },
  dismissBtnText: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 14,
  },
});
