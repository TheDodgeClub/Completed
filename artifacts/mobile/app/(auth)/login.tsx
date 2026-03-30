import React, { useState, useMemo, useEffect } from "react";
import {
  View,
  Text,
  TextInput,
  Pressable,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Image,
} from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { useColors, useTheme } from "@/context/ThemeContext";
import { useAuth } from "@/context/AuthContext";
import { API_BASE } from "@/constants/api";

function GoogleIcon() {
  if (Platform.OS !== "web") return null;
  return (
    <svg width="20" height="20" viewBox="0 0 48 48" style={{ marginRight: 10, flexShrink: 0 }}>
      <path fill="#4285F4" d="M44.5 20H24v8.5h11.8C34.7 33.9 30.1 37 24 37c-7.2 0-13-5.8-13-13s5.8-13 13-13c3.1 0 5.9 1.1 8.1 2.9l6.4-6.4C34.6 5.1 29.6 3 24 3 12.4 3 3 12.4 3 24s9.4 21 21 21c10.5 0 20-7.6 20-21 0-1.4-.1-2.7-.5-4z"/>
      <path fill="#34A853" d="M6.3 14.7l7 5.1C15.1 16 19.2 13 24 13c3.1 0 5.9 1.1 8.1 2.9l6.4-6.4C34.6 5.1 29.6 3 24 3 16.3 3 9.7 7.8 6.3 14.7z"/>
      <path fill="#FBBC05" d="M24 45c5.6 0 10.5-1.8 14.4-5l-6.7-5.5C29.5 36.1 26.9 37 24 37c-6.1 0-10.7-3.1-11.8-8.5l-7 5.4C8.8 41.1 15.9 45 24 45z"/>
      <path fill="#EA4335" d="M44.5 20H24v8.5h11.8c-1 3.2-3.3 5.8-6.4 7.5l6.7 5.5C40.3 38.1 44 31.5 44 24c0-1.4-.1-2.7-.5-4z"/>
    </svg>
  );
}

export default function LoginScreen() {
  const insets = useSafeAreaInsets();
  const Colors = useColors();
  const { isDark } = useTheme();
  const styles = useMemo(() => makeStyles(Colors), [Colors]);
  const { login, refreshUser } = useAuth();
  const params = useLocalSearchParams<{ auth_error?: string }>();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [suspended, setSuspended] = useState(false);

  useEffect(() => {
    if (params.auth_error === "banned") setErrorMsg("Your account has been suspended.");
    else if (params.auth_error) setErrorMsg("Google Sign-In failed. Please try again.");
  }, [params.auth_error]);

  const handleGoogleSignIn = () => {
    if (Platform.OS === "web" && typeof window !== "undefined") {
      window.location.href = `${API_BASE.replace("/api", "")}/api/auth/google`;
    }
  };

  const handleLogin = async () => {
    setErrorMsg("");
    setSuspended(false);
    if (!email.trim() || !password.trim()) {
      setErrorMsg("Please enter your email and password.");
      return;
    }
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setLoading(true);
    try {
      await login(email.trim().toLowerCase(), password);
    } catch (err: any) {
      const msg: string = err.message || "";
      if (msg.toLowerCase().includes("suspend") || msg.toLowerCase().includes("banned")) {
        setSuspended(true);
      } else {
        setErrorMsg(msg || "Invalid email or password.");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: Colors.background }}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <ScrollView
        contentContainerStyle={[styles.container, { paddingBottom: insets.bottom + 32, paddingTop: insets.top + 64 }]}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.logoRow}>
          <Image
            source={require("@/assets/images/tdc-logo.png")}
            style={[styles.logoImg, { tintColor: isDark ? "#FFFFFF" : "#000000" }]}
            resizeMode="contain"
          />
        </View>

        <Text style={styles.title}>Welcome back</Text>
        <Text style={styles.subtitle}>Sign in to access the Member Zone</Text>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>Email</Text>
          <View style={styles.inputWrap}>
            <Feather name="mail" size={18} color={Colors.textMuted} style={styles.inputIcon} />
            <TextInput
              style={styles.input}
              placeholder="your@email.com"
              placeholderTextColor={Colors.textMuted}
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
              autoComplete="email"
            />
          </View>
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>Password</Text>
          <View style={styles.inputWrap}>
            <Feather name="lock" size={18} color={Colors.textMuted} style={styles.inputIcon} />
            <TextInput
              style={[styles.input, { flex: 1 }]}
              placeholder="••••••••"
              placeholderTextColor={Colors.textMuted}
              value={password}
              onChangeText={setPassword}
              secureTextEntry={!showPassword}
              autoComplete="password"
            />
            <Pressable onPress={() => setShowPassword(v => !v)} style={styles.eyeBtn}>
              <Feather name={showPassword ? "eye-off" : "eye"} size={18} color={Colors.textMuted} />
            </Pressable>
          </View>
        </View>

        {suspended && (
          <View style={styles.suspendedBox}>
            <Feather name="slash" size={20} color="#FF6B6B" style={{ marginBottom: 8 }} />
            <Text style={styles.suspendedTitle}>Account suspended</Text>
            <Text style={styles.suspendedBody}>
              Your account has been suspended. If you believe this is a mistake, please contact us at{" "}
              <Text style={styles.suspendedEmail}>hello@thedodgeclub.co.uk</Text>.
            </Text>
          </View>
        )}

        {!suspended && !!errorMsg && (
          <View style={styles.errorBox}>
            <Feather name="alert-circle" size={15} color="#FF6B6B" style={{ marginRight: 7 }} />
            <Text style={styles.errorText}>{errorMsg}</Text>
          </View>
        )}

        <Pressable
          style={({ pressed }) => [styles.primaryBtn, { opacity: pressed ? 0.85 : 1 }]}
          onPress={handleLogin}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.primaryBtnText}>Sign In</Text>
          )}
        </Pressable>

        <Pressable
          style={styles.forgotRow}
          onPress={() => router.push("/(auth)/forgot-password")}
        >
          <Text style={styles.forgotLink}>Forgot your password?</Text>
        </Pressable>

        {Platform.OS === "web" && (
          <>
            <View style={styles.dividerRow}>
              <View style={styles.dividerLine} />
              <Text style={styles.dividerText}>or</Text>
              <View style={styles.dividerLine} />
            </View>
            <Pressable
              style={({ pressed }) => [styles.googleBtn, { opacity: pressed ? 0.85 : 1 }]}
              onPress={handleGoogleSignIn}
            >
              <GoogleIcon />
              <Text style={styles.googleBtnText}>Continue with Google</Text>
            </Pressable>
          </>
        )}

        <View style={styles.footer}>
          <Text style={styles.footerText}>Don't have an account? </Text>
          <Pressable onPress={() => router.replace("/(auth)/register")}>
            <Text style={styles.link}>Join now</Text>
          </Pressable>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

function makeStyles(Colors: ReturnType<typeof useColors>) {
  return StyleSheet.create({
    container: {
      paddingHorizontal: 24,
      paddingBottom: 24,
      backgroundColor: Colors.background,
      flexGrow: 1,
    },
    logoRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: 12,
      marginBottom: 32,
      marginTop: 8,
    },
    logoImg: {
      width: 180,
      height: 54,
    },
    title: {
      fontFamily: "Poppins_800ExtraBold",
      fontSize: 28,
      color: Colors.text,
      marginBottom: 6,
    },
    subtitle: {
      fontFamily: "Inter_400Regular",
      fontSize: 15,
      color: Colors.textSecondary,
      marginBottom: 36,
    },
    inputGroup: { marginBottom: 18 },
    label: {
      fontFamily: "Inter_600SemiBold",
      fontSize: 13,
      color: Colors.textSecondary,
      marginBottom: 8,
      letterSpacing: 0.5,
      textTransform: "uppercase",
    },
    inputWrap: {
      flexDirection: "row",
      alignItems: "center",
      backgroundColor: Colors.surface,
      borderRadius: 14,
      borderWidth: 1,
      borderColor: Colors.border,
      paddingHorizontal: 14,
    },
    inputIcon: { marginRight: 10 },
    input: {
      flex: 1,
      fontFamily: "Inter_400Regular",
      fontSize: 16,
      color: Colors.text,
      paddingVertical: 16,
    },
    eyeBtn: { padding: 8 },
    suspendedBox: {
      backgroundColor: "rgba(255,107,107,0.09)",
      borderWidth: 1.5,
      borderColor: "rgba(255,107,107,0.45)",
      borderRadius: 14,
      paddingHorizontal: 18,
      paddingVertical: 18,
      marginBottom: 16,
      alignItems: "center",
    },
    suspendedTitle: {
      fontFamily: "Poppins_700Bold",
      fontSize: 16,
      color: "#CC3333",
      marginBottom: 6,
      textAlign: "center",
    },
    suspendedBody: {
      fontFamily: "Inter_400Regular",
      fontSize: 13,
      color: "#AA3333",
      textAlign: "center",
      lineHeight: 19,
    },
    suspendedEmail: {
      fontFamily: "Inter_600SemiBold",
      textDecorationLine: "underline",
    },
    errorBox: {
      flexDirection: "row",
      alignItems: "center",
      backgroundColor: "rgba(255,107,107,0.12)",
      borderWidth: 1,
      borderColor: "rgba(255,107,107,0.35)",
      borderRadius: 10,
      paddingHorizontal: 12,
      paddingVertical: 10,
      marginBottom: 14,
    },
    errorText: {
      fontFamily: "Inter_400Regular",
      fontSize: 13,
      color: "#FF6B6B",
      flex: 1,
    },
    primaryBtn: {
      backgroundColor: Colors.primary,
      borderRadius: 14,
      paddingVertical: 17,
      alignItems: "center",
      marginTop: 8,
      shadowColor: Colors.primary,
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.35,
      shadowRadius: 10,
      elevation: 6,
    },
    primaryBtnText: {
      fontFamily: "Inter_700Bold",
      fontSize: 16,
      color: "#fff",
      letterSpacing: 0.3,
    },
    forgotRow: {
      alignItems: "center",
      marginTop: 16,
    },
    forgotLink: {
      fontFamily: "Inter_600SemiBold",
      fontSize: 14,
      color: Colors.textSecondary,
      textDecorationLine: "underline",
    },
    footer: {
      flexDirection: "row",
      justifyContent: "center",
      marginTop: 20,
    },
    footerText: {
      fontFamily: "Inter_400Regular",
      fontSize: 14,
      color: Colors.textSecondary,
    },
    link: {
      fontFamily: "Inter_600SemiBold",
      fontSize: 14,
      color: Colors.primary,
    },
    dividerRow: {
      flexDirection: "row",
      alignItems: "center",
      marginVertical: 20,
      gap: 12,
    },
    dividerLine: {
      flex: 1,
      height: 1,
      backgroundColor: Colors.border,
    },
    dividerText: {
      fontFamily: "Inter_400Regular",
      fontSize: 13,
      color: Colors.textMuted,
    },
    googleBtn: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: Colors.surface,
      borderWidth: 1,
      borderColor: Colors.border,
      borderRadius: 14,
      paddingVertical: 15,
      paddingHorizontal: 20,
      marginBottom: 4,
    },
    googleBtnText: {
      fontFamily: "Inter_600SemiBold",
      fontSize: 15,
      color: Colors.text,
    },
  });
}
