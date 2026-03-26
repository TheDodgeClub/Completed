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

type AccountType = "player" | "supporter";

const ROLE_OPTIONS: { type: AccountType; label: string; description: string; icon: string }[] = [
  {
    type: "player",
    label: "Player",
    description: "I play dodgeball — track stats, earn achievements, and climb the leaderboard.",
    icon: "zap",
  },
  {
    type: "supporter",
    label: "Supporter",
    description: "I cheer from the sidelines — follow events, buy tickets, and support my favourite players.",
    icon: "heart",
  },
];

export default function RegisterScreen() {
  const insets = useSafeAreaInsets();
  const Colors = useColors();
  const styles = useMemo(() => makeStyles(Colors), [Colors]);
  const { register } = useAuth();

  const [step, setStep] = useState<1 | 2>(1);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [referralCode, setReferralCode] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [accountType, setAccountType] = useState<AccountType>("player");
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  const isValidEmail = (e: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e);

  const handleNextStep = () => {
    setErrorMsg("");
    if (!name.trim() || !email.trim() || !password.trim()) {
      setErrorMsg("Please fill in all fields.");
      return;
    }
    if (!isValidEmail(email.trim())) {
      setErrorMsg("Please enter a valid email address.");
      return;
    }
    if (password.length < 6) {
      setErrorMsg("Password must be at least 6 characters.");
      return;
    }
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setStep(2);
  };

  const handleRegister = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setLoading(true);
    try {
      await register(
        email.trim().toLowerCase(),
        password,
        name.trim(),
        accountType,
        referralCode.trim().toUpperCase() || undefined,
      );
      router.dismissAll();
    } catch (err: any) {
      setErrorMsg(err.message || "Something went wrong. Please try again.");
      setStep(1);
    } finally {
      setLoading(false);
    }
  };

  if (step === 2) {
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

          <Text style={styles.title}>How do you roll?</Text>
          <Text style={styles.subtitle}>This shapes your profile and experience in the app.</Text>

          <View style={styles.roleGrid}>
            {ROLE_OPTIONS.map(opt => {
              const selected = accountType === opt.type;
              return (
                <Pressable
                  key={opt.type}
                  style={[styles.roleCard, selected && styles.roleCardSelected]}
                  onPress={() => {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    setAccountType(opt.type);
                  }}
                >
                  <View style={[styles.roleIconWrap, selected && styles.roleIconWrapSelected]}>
                    <Feather name={opt.icon as any} size={28} color={selected ? "#fff" : Colors.primary} />
                  </View>
                  <Text style={[styles.roleLabel, selected && styles.roleLabelSelected]}>{opt.label}</Text>
                  <Text style={[styles.roleDesc, selected && styles.roleDescSelected]}>{opt.description}</Text>
                  {selected && (
                    <View style={styles.roleCheck}>
                      <Feather name="check" size={14} color="#fff" />
                    </View>
                  )}
                </Pressable>
              );
            })}
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Referral Code (optional)</Text>
            <View style={styles.inputWrap}>
              <Feather name="gift" size={18} color="#999999" style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                placeholder="e.g. JOHN0042"
                placeholderTextColor="#999999"
                value={referralCode}
                onChangeText={setReferralCode}
                autoCapitalize="characters"
              />
            </View>
            <Text style={styles.hintText}>Enter a friend's code to track your referral</Text>
          </View>

          {!!errorMsg && (
            <View style={styles.errorBox}>
              <Feather name="alert-circle" size={15} color="#FF6B6B" style={{ marginRight: 7 }} />
              <Text style={styles.errorText}>{errorMsg}</Text>
            </View>
          )}

          <Pressable
            style={({ pressed }) => [styles.primaryBtn, { opacity: pressed ? 0.85 : 1 }]}
            onPress={handleRegister}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.primaryBtnText}>Create Account</Text>
            )}
          </Pressable>

          <Pressable style={styles.backBtn} onPress={() => setStep(1)}>
            <Feather name="arrow-left" size={16} color={Colors.primary} />
            <Text style={styles.backBtnText}>Back</Text>
          </Pressable>
        </ScrollView>
      </KeyboardAvoidingView>
    );
  }

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

        <Text style={styles.title}>Join the Club</Text>
        <Text style={styles.subtitle}>Create your free account and enter the Member Zone</Text>

        <View style={styles.stepIndicator}>
          <View style={[styles.stepDot, styles.stepDotActive]} />
          <View style={styles.stepLine} />
          <View style={styles.stepDot} />
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>Full Name</Text>
          <View style={styles.inputWrap}>
            <Feather name="user" size={18} color="#999999" style={styles.inputIcon} />
            <TextInput
              style={styles.input}
              placeholder="Your name"
              placeholderTextColor="#999999"
              value={name}
              onChangeText={setName}
              autoCapitalize="words"
            />
          </View>
        </View>

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
              placeholder="Min. 6 characters"
              placeholderTextColor="#999999"
              value={password}
              onChangeText={setPassword}
              secureTextEntry={!showPassword}
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
          onPress={handleNextStep}
        >
          <Text style={styles.primaryBtnText}>Continue</Text>
          <Feather name="arrow-right" size={18} color="#fff" style={{ marginLeft: 8 }} />
        </Pressable>

        <View style={styles.footer}>
          <Text style={styles.footerText}>Already a member? </Text>
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
      paddingTop: 100,
      paddingHorizontal: 24,
      paddingBottom: 24,
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
      tintColor: "#0B5E2F",
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
      marginBottom: 24,
    },
    stepIndicator: {
      flexDirection: "row",
      alignItems: "center",
      marginBottom: 28,
      gap: 8,
    },
    stepDot: {
      width: 10,
      height: 10,
      borderRadius: 5,
      backgroundColor: "#E0E0E0",
    },
    stepDotActive: {
      backgroundColor: Colors.primary,
      width: 28,
      borderRadius: 5,
    },
    stepLine: {
      flex: 1,
      height: 2,
      backgroundColor: "#E0E0E0",
      borderRadius: 1,
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
    hintText: {
      fontFamily: "Inter_400Regular",
      fontSize: 12,
      color: "#999",
      marginTop: 6,
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
      flexDirection: "row",
      justifyContent: "center",
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
    footer: {
      flexDirection: "row",
      justifyContent: "center",
      marginTop: 28,
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
    roleGrid: {
      flexDirection: "row",
      gap: 14,
      marginBottom: 24,
    },
    roleCard: {
      flex: 1,
      borderRadius: 16,
      borderWidth: 2,
      borderColor: "#E8E8E8",
      backgroundColor: "#F9F9F9",
      padding: 18,
      alignItems: "center",
      gap: 10,
      position: "relative",
    },
    roleCardSelected: {
      borderColor: Colors.primary,
      backgroundColor: `${Colors.primary}08`,
    },
    roleIconWrap: {
      width: 56,
      height: 56,
      borderRadius: 28,
      backgroundColor: `${Colors.primary}15`,
      alignItems: "center",
      justifyContent: "center",
    },
    roleIconWrapSelected: {
      backgroundColor: Colors.primary,
    },
    roleLabel: {
      fontFamily: "Inter_700Bold",
      fontSize: 17,
      color: "#111",
    },
    roleLabelSelected: {
      color: Colors.primary,
    },
    roleDesc: {
      fontFamily: "Inter_400Regular",
      fontSize: 12,
      color: "#777",
      textAlign: "center",
      lineHeight: 17,
    },
    roleDescSelected: {
      color: "#555",
    },
    roleCheck: {
      position: "absolute",
      top: 10,
      right: 10,
      width: 22,
      height: 22,
      borderRadius: 11,
      backgroundColor: Colors.primary,
      alignItems: "center",
      justifyContent: "center",
    },
    backBtn: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: 6,
      marginTop: 20,
      paddingVertical: 12,
    },
    backBtnText: {
      fontFamily: "Inter_600SemiBold",
      fontSize: 15,
      color: Colors.primary,
    },
  });
}
