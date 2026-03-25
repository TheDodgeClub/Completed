import React, { useState, useMemo } from "react";
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
import { router } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { useColors } from "@/context/ThemeContext";
import { useAuth } from "@/context/AuthContext";

export default function LoginScreen() {
  const insets = useSafeAreaInsets();
  const Colors = useColors();
  const styles = useMemo(() => makeStyles(Colors), [Colors]);
  const { login } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  const handleLogin = async () => {
    setErrorMsg("");
    if (!email.trim() || !password.trim()) {
      setErrorMsg("Please enter your email and password.");
      return;
    }
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setLoading(true);
    try {
      await login(email.trim().toLowerCase(), password);
      router.dismissAll();
    } catch (err: any) {
      setErrorMsg(err.message || "Invalid email or password.");
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
        contentContainerStyle={[styles.container, { paddingBottom: insets.bottom + 32 }]}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.logoRow}>
          <Image
            source={require("@/assets/images/tdc-logo.png")}
            style={styles.logoImg}
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

        {!!errorMsg && (
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
      paddingTop: 160,
      paddingHorizontal: 24,
      paddingBottom: 24,
      gap: 0,
      backgroundColor: Colors.background,
      flexGrow: 1,
    },
    logoRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: 12,
      marginBottom: 16,
      marginTop: 8,
    },
    logoImg: {
      width: 180,
      height: 54,
    },
    title: {
      fontFamily: "Poppins_800ExtraBold",
      fontSize: 32,
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
  });
}
