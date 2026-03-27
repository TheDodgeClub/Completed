import React, { useEffect, useState } from "react";
import { Pressable, Text, Image, ActivityIndicator, StyleSheet, View } from "react-native";
import * as Google from "expo-auth-session/providers/google";
import * as Haptics from "expo-haptics";
import { useColors } from "@/context/ThemeContext";
import { useAuth } from "@/context/AuthContext";

const GOOGLE_CLIENT_ID = process.env.EXPO_PUBLIC_GOOGLE_CLIENT_ID;

function GoogleSignInButtonInner({ label, onError }: { label: string; onError: (msg: string) => void }) {
  const Colors = useColors();
  const { googleLogin } = useAuth();
  const [loading, setLoading] = useState(false);

  const [, response, promptAsync] = Google.useAuthRequest({
    webClientId: GOOGLE_CLIENT_ID,
    iosClientId: GOOGLE_CLIENT_ID,
    androidClientId: GOOGLE_CLIENT_ID,
  });

  useEffect(() => {
    if (response?.type === "success") {
      const accessToken = response.authentication?.accessToken;
      if (accessToken) {
        setLoading(true);
        googleLogin(accessToken)
          .catch(err => onError(err.message || "Google sign-in failed. Please try again."))
          .finally(() => setLoading(false));
      }
    } else if (response?.type === "error") {
      onError("Google sign-in was cancelled or failed.");
    }
  }, [response]);

  const handlePress = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onError("");
    promptAsync();
  };

  return (
    <Pressable
      style={({ pressed }) => [styles.btn, { borderColor: Colors.border, opacity: pressed ? 0.85 : 1 }]}
      onPress={handlePress}
      disabled={loading}
    >
      {loading ? (
        <ActivityIndicator color="#444" />
      ) : (
        <>
          <Image source={{ uri: "https://www.google.com/favicon.ico" }} style={styles.icon} />
          <Text style={styles.text}>{label}</Text>
        </>
      )}
    </Pressable>
  );
}

export function GoogleSignInButton({ label = "Continue with Google", onError }: { label?: string; onError: (msg: string) => void }) {
  if (!GOOGLE_CLIENT_ID) return null;
  return (
    <>
      <View style={styles.dividerRow}>
        <View style={styles.dividerLine} />
        <Text style={styles.dividerText}>or</Text>
        <View style={styles.dividerLine} />
      </View>
      <GoogleSignInButtonInner label={label} onError={onError} />
    </>
  );
}

const styles = StyleSheet.create({
  dividerRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 20,
    marginBottom: 4,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: "#E0E0E0",
  },
  dividerText: {
    marginHorizontal: 12,
    color: "#888",
    fontSize: 13,
  },
  btn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#fff",
    borderWidth: 1.5,
    borderRadius: 12,
    paddingVertical: 14,
    marginTop: 12,
    gap: 10,
  },
  icon: {
    width: 18,
    height: 18,
  },
  text: {
    color: "#333",
    fontSize: 15,
    fontWeight: "600",
  },
});
