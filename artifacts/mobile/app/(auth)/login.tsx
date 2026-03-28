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
    } catch (err: any) {
      setErrorMsg(err.message || "Invalid email or password.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: "#FFFFFF" }}
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
            <Feather name="mail" size={18} color="#999999" style={styles.inputIcon} />
            <TextInput
              style={styles.input}
              placeholder="your@email.com"
              placeholderTextColor="#999999"
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
            <Feather name="lock" size={18} color="#999999" style={styles.inputIcon} />
            <TextInput
              style={[styles.input, { flex: 1 }]}
              placeholder="••••••••"
              placeholderTextColor="#999999"
              value={password}
              onChangeText={setPassword}
              secureTextEntry={!showPassword}
              autoComplete="password"
            />
            <Pressable onPress={() => setShowPassword(v => !v)} style={styles.eyeBtn}>
              <Feather name={showPassword ? "eye-off" : "eye"} size={18} color="#999999" />
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
      paddingTop: 128,
      paddingHorizontal: 24,
      paddingBottom: 24,
      gap: 0,
      backgroundColor: "#FFFFFF",
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
      tintColor: "#000000",
    },
    title: {
      fontFamily: "Poppins_800ExtraBold",
      fontSize: 28,
      color: "#111111",
      marginBottom: 6,
    },
    subtitle: {
      fontFamily: "Inter_400Regular",
      fontSize: 15,
      color: "#666666",
      marginBottom: 36,
    },
    inputGroup: { marginBottom: 18 },
    label: {
      fontFamily: "Inter_600SemiBold",
      fontSize: 13,
      color: "#666666",
      marginBottom: 8,
      letterSpacing: 0.5,
      textTransform: "uppercase",
    },
    inputWrap: {
      flexDirection: "row",
      alignItems: "center",
      backgroundColor: "#F5F5F5",
      borderRadius: 14,
      borderWidth: 1,
      borderColor: "#E8E8E8",
      paddingHorizontal: 14,
    },
    inputIcon: { marginRight: 10 },
    input: {
      flex: 1,
      fontFamily: "Inter_400Regular",
      fontSize: 16,
      color: "#111111",
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
      color: "#666666",
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
      color: "#666666",
    },
    link: {
      fontFamily: "Inter_600SemiBold",
      fontSize: 14,
      color: Colors.primary,
    },
  });
}
