import React, { useState, useMemo, useEffect, useRef, useCallback } from "react";
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
import { forgotPassword, resetPassword } from "@/lib/api";

type Step = "email" | "reset";

const CODE_TTL = 600;

function formatCountdown(secs: number): string {
  const m = Math.floor(secs / 60);
  const s = secs % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}

export default function ForgotPasswordScreen() {
  const insets = useSafeAreaInsets();
  const Colors = useColors();
  const styles = useMemo(() => makeStyles(Colors), [Colors]);

  const [step, setStep] = useState<Step>("email");
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  const [secondsLeft, setSecondsLeft] = useState(CODE_TTL);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const startTimer = useCallback(() => {
    setSecondsLeft(CODE_TTL);
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = setInterval(() => {
      setSecondsLeft(s => {
        if (s <= 1) {
          clearInterval(timerRef.current!);
          timerRef.current = null;
          return 0;
        }
        return s - 1;
      });
    }, 1000);
  }, []);

  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  const isExpired = step === "reset" && secondsLeft === 0;

  const handleSendCode = async () => {
    setErrorMsg("");
    if (!email.trim()) {
      setErrorMsg("Please enter your email address.");
      return;
    }
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setLoading(true);
    try {
      await forgotPassword(email.trim().toLowerCase());
      setSuccessMsg("A 6-digit reset code has been sent to your email.");
      setStep("reset");
      startTimer();
    } catch (err: any) {
      setErrorMsg(err.message || "Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleResendCode = async () => {
    setErrorMsg("");
    setCode("");
    setNewPassword("");
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setLoading(true);
    try {
      await forgotPassword(email.trim().toLowerCase());
      setSuccessMsg("A new code has been sent to your email.");
      startTimer();
    } catch (err: any) {
      setErrorMsg(err.message || "Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async () => {
    setErrorMsg("");
    if (!code.trim() || !newPassword.trim()) {
      setErrorMsg("Please enter the code and your new password.");
      return;
    }
    if (newPassword.length < 6) {
      setErrorMsg("Password must be at least 6 characters.");
      return;
    }
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setLoading(true);
    try {
      await resetPassword(email.trim().toLowerCase(), code.trim(), newPassword);
      if (timerRef.current) clearInterval(timerRef.current);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setSuccessMsg("Password updated! You can now sign in.");
      setTimeout(() => router.replace("/(auth)/login"), 1800);
    } catch (err: any) {
      setErrorMsg(err.message || "Invalid or expired code.");
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
        contentContainerStyle={[styles.container, { paddingBottom: insets.bottom + 32, paddingTop: insets.top + 128 }]}
        keyboardShouldPersistTaps="handled"
      >
        <Pressable style={styles.backBtn} onPress={() => router.back()}>
          <Feather name="arrow-left" size={20} color={Colors.text} />
        </Pressable>

        <View style={styles.logoRow}>
          <Image
            source={require("@/assets/images/tdc-logo.png")}
            style={styles.logoImg}
            resizeMode="contain"
          />
        </View>

        <Text style={styles.title}>
          {step === "email" ? "Forgot Password?" : "Reset Password"}
        </Text>
        <Text style={styles.subtitle}>
          {step === "email"
            ? "Enter your email and we'll send you a reset code."
            : `We sent a code to ${email}. Enter it below with your new password.`}
        </Text>

        {step === "email" ? (
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Email Address</Text>
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
                autoFocus
              />
            </View>
          </View>
        ) : (
          <>
            <View style={[styles.countdownBox, isExpired && styles.countdownBoxExpired]}>
              <Feather
                name={isExpired ? "alert-circle" : "clock"}
                size={15}
                color={isExpired ? "#FF6B6B" : Colors.textSecondary}
                style={{ marginRight: 7 }}
              />
              {isExpired ? (
                <Text style={styles.countdownTextExpired}>Code expired — tap Resend below</Text>
              ) : (
                <Text style={styles.countdownText}>
                  Code expires in{" "}
                  <Text style={styles.countdownValue}>{formatCountdown(secondsLeft)}</Text>
                </Text>
              )}
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Reset Code</Text>
              <View style={styles.inputWrap}>
                <Feather name="hash" size={18} color={Colors.textMuted} style={styles.inputIcon} />
                <TextInput
                  style={[styles.input, styles.codeInput]}
                  placeholder="123456"
                  placeholderTextColor={Colors.textMuted}
                  value={code}
                  onChangeText={setCode}
                  keyboardType="number-pad"
                  maxLength={6}
                  autoFocus
                  editable={!isExpired}
                />
              </View>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>New Password</Text>
              <View style={styles.inputWrap}>
                <Feather name="lock" size={18} color={Colors.textMuted} style={styles.inputIcon} />
                <TextInput
                  style={[styles.input, { flex: 1 }]}
                  placeholder="Min. 6 characters"
                  placeholderTextColor={Colors.textMuted}
                  value={newPassword}
                  onChangeText={setNewPassword}
                  secureTextEntry={!showPassword}
                  editable={!isExpired}
                />
                <Pressable onPress={() => setShowPassword(v => !v)} style={styles.eyeBtn}>
                  <Feather name={showPassword ? "eye-off" : "eye"} size={18} color={Colors.textMuted} />
                </Pressable>
              </View>
            </View>
          </>
        )}

        {!!errorMsg && (
          <View style={styles.errorBox}>
            <Feather name="alert-circle" size={15} color="#FF6B6B" style={{ marginRight: 7 }} />
            <Text style={styles.errorText}>{errorMsg}</Text>
          </View>
        )}

        {!!successMsg && (
          <View style={styles.successBox}>
            <Feather name="check-circle" size={15} color="#4CAF50" style={{ marginRight: 7 }} />
            <Text style={styles.successText}>{successMsg}</Text>
          </View>
        )}

        {step === "reset" && isExpired ? (
          <Pressable
            style={({ pressed }) => [styles.primaryBtn, { opacity: pressed ? 0.85 : 1 }]}
            onPress={handleResendCode}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <>
                <Feather name="refresh-cw" size={16} color="#fff" style={{ marginRight: 8 }} />
                <Text style={styles.primaryBtnText}>Resend Code</Text>
              </>
            )}
          </Pressable>
        ) : (
          <Pressable
            style={({ pressed }) => [styles.primaryBtn, { opacity: pressed ? 0.85 : 1 }]}
            onPress={step === "email" ? handleSendCode : handleResetPassword}
            disabled={loading || isExpired}
          >
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.primaryBtnText}>
                {step === "email" ? "Send Reset Code" : "Update Password"}
              </Text>
            )}
          </Pressable>
        )}

        {step === "reset" && !isExpired && (
          <Pressable
            style={styles.resendRow}
            onPress={handleResendCode}
            disabled={loading}
          >
            <Text style={styles.resendText}>Didn't get a code? Resend</Text>
          </Pressable>
        )}

        <View style={styles.footer}>
          <Text style={styles.footerText}>Remember your password? </Text>
          <Pressable onPress={() => router.replace("/(auth)/login")}>
            <Text style={styles.link}>Sign in</Text>
          </Pressable>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

function makeStyles(Colors: ReturnType<typeof useColors>) {
  return StyleSheet.create({
    container: {
      padding: 24,
      backgroundColor: Colors.background,
      flexGrow: 1,
    },
    backBtn: {
      width: 40, height: 40, borderRadius: 20,
      backgroundColor: Colors.surface,
      alignItems: "center", justifyContent: "center",
      marginBottom: 24,
    },
    logoRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: 12,
      marginBottom: 16,
    },
    logoImg: {
      width: 180,
      height: 54,
    },
    title: {
      fontFamily: "Poppins_800ExtraBold",
      fontSize: 30,
      color: Colors.text,
      marginBottom: 8,
    },
    subtitle: {
      fontFamily: "Inter_400Regular",
      fontSize: 15,
      color: Colors.textSecondary,
      marginBottom: 32,
      lineHeight: 22,
    },
    countdownBox: {
      flexDirection: "row",
      alignItems: "center",
      backgroundColor: Colors.surface,
      borderWidth: 1,
      borderColor: Colors.border,
      borderRadius: 10,
      paddingHorizontal: 12,
      paddingVertical: 10,
      marginBottom: 20,
    },
    countdownBoxExpired: {
      backgroundColor: "rgba(255,107,107,0.1)",
      borderColor: "rgba(255,107,107,0.35)",
    },
    countdownText: {
      fontFamily: "Inter_400Regular",
      fontSize: 13,
      color: Colors.textSecondary,
    },
    countdownValue: {
      fontFamily: "Inter_700Bold",
      color: Colors.text,
    },
    countdownTextExpired: {
      fontFamily: "Inter_600SemiBold",
      fontSize: 13,
      color: "#FF6B6B",
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
    codeInput: {
      fontFamily: "Poppins_800ExtraBold",
      fontSize: 22,
      letterSpacing: 6,
      textAlign: "center",
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
    successBox: {
      flexDirection: "row",
      alignItems: "center",
      backgroundColor: "rgba(76,175,80,0.12)",
      borderWidth: 1,
      borderColor: "rgba(76,175,80,0.35)",
      borderRadius: 10,
      paddingHorizontal: 12,
      paddingVertical: 10,
      marginBottom: 14,
    },
    successText: {
      fontFamily: "Inter_400Regular",
      fontSize: 13,
      color: "#4CAF50",
      flex: 1,
    },
    primaryBtn: {
      backgroundColor: Colors.primary,
      borderRadius: 14,
      paddingVertical: 17,
      alignItems: "center",
      flexDirection: "row",
      justifyContent: "center",
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
    resendRow: {
      alignItems: "center",
      marginTop: 16,
    },
    resendText: {
      fontFamily: "Inter_600SemiBold",
      fontSize: 14,
      color: Colors.textSecondary,
      textDecorationLine: "underline",
    },
    footer: {
      flexDirection: "row",
      justifyContent: "center",
      marginTop: 28,
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
