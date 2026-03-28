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
import { useColors, useTheme } from "@/context/ThemeContext";
import { useAuth } from "@/context/AuthContext";
import { updateProfile } from "@/lib/api";

type AccountType = "player" | "supporter";

const ROLE_OPTIONS: {
  type: AccountType;
  label: string;
  description: string;
  icon: string;
  benefits: string[];
}[] = [
  {
    type: "player",
    label: "Player",
    description: "I play dodgeball",
    icon: "zap",
    benefits: [
      "Track your XP & event stats",
      "Earn medals and achievements",
      "Compete on the leaderboard",
    ],
  },
  {
    type: "supporter",
    label: "Supporter",
    description: "I cheer from the sidelines",
    icon: "heart",
    benefits: [
      "Buy and gift event tickets",
      "Follow players and cheer them on",
      "Access member-only news",
    ],
  },
];

const SKILL_OPTIONS = ["Throwing", "Catching", "Dodging", "Tactical", "All Rounder"] as const;
type Skill = typeof SKILL_OPTIONS[number];

const SKILL_ICONS: Record<Skill, string> = {
  "Throwing": "crosshair",
  "Catching": "wind",
  "Dodging": "zap",
  "Tactical": "target",
  "All Rounder": "star",
};

export default function RegisterScreen() {
  const insets = useSafeAreaInsets();
  const Colors = useColors();
  const { isDark, toggleTheme } = useTheme();
  const styles = useMemo(() => makeStyles(Colors), [Colors]);
  const { register } = useAuth();

  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [referralCode, setReferralCode] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [accountType, setAccountType] = useState<AccountType>("player");
  const [selectedSkills, setSelectedSkills] = useState<Skill[]>([]);
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

  const handleNextToSkills = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setStep(3);
  };

  const toggleSkill = (skill: Skill) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setSelectedSkills(prev =>
      prev.includes(skill) ? prev.filter(s => s !== skill) : [...prev, skill]
    );
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
      if (accountType === "player" && selectedSkills.length > 0) {
        try {
          await updateProfile({ skills: [...selectedSkills] });
        } catch {
        }
      }
    } catch (err: any) {
      setErrorMsg(err.message || "Something went wrong. Please try again.");
      setStep(accountType === "player" ? 3 : 2);
    } finally {
      setLoading(false);
    }
  };

  const handleThemeSelect = (dark: boolean) => {
    if (dark !== isDark) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      toggleTheme();
    }
  };

  if (step === 2) {
    return (
      <KeyboardAvoidingView
        style={{ flex: 1, backgroundColor: Colors.background }}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <ScrollView
          contentContainerStyle={[styles.container2, { paddingBottom: insets.bottom + 32 }]}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.logoRow}>
            <Image
              source={require("@/assets/images/tdc-logo.png")}
              style={styles.logoImg}
              resizeMode="contain"
            />
          </View>

          <View style={styles.stepIndicator}>
            <View style={[styles.stepDot, styles.stepDotActive]} />
            <View style={styles.stepLine} />
            <View style={[styles.stepDot, styles.stepDotActive]} />
            {accountType === "player" && <><View style={styles.stepLine} /><View style={styles.stepDot} /></>}
          </View>

          <Text style={styles.title}>How do you roll?</Text>
          <Text style={styles.subtitle}>Pick your role — it shapes your profile and experience.</Text>

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
                    <Feather name={opt.icon as any} size={26} color={selected ? "#fff" : Colors.primary} />
                  </View>
                  <Text style={[styles.roleLabel, selected && styles.roleLabelSelected]}>{opt.label}</Text>
                  <Text style={[styles.roleTagline, selected && styles.roleTaglineSelected]}>{opt.description}</Text>
                  <View style={styles.benefitsList}>
                    {opt.benefits.map(b => (
                      <View key={b} style={styles.benefitRow}>
                        <Feather name="check-circle" size={12} color={selected ? Colors.primary : Colors.textMuted} style={{ marginTop: 1 }} />
                        <Text style={[styles.benefitText, selected && styles.benefitTextSelected]}>{b}</Text>
                      </View>
                    ))}
                  </View>
                  {selected && (
                    <View style={styles.roleCheck}>
                      <Feather name="check" size={13} color="#fff" />
                    </View>
                  )}
                </Pressable>
              );
            })}
          </View>

          <View style={styles.themeSection}>
            <Text style={styles.themeSectionLabel}>Choose your look</Text>
            <View style={styles.themeToggleRow}>
              <Pressable
                style={[styles.themeOption, !isDark && styles.themeOptionSelected]}
                onPress={() => handleThemeSelect(false)}
              >
                <Feather name="sun" size={20} color={!isDark ? Colors.primary : Colors.textSecondary} />
                <Text style={[styles.themeOptionText, !isDark && styles.themeOptionTextSelected]}>Light</Text>
                {!isDark && (
                  <View style={styles.themeCheck}>
                    <Feather name="check" size={11} color="#fff" />
                  </View>
                )}
              </Pressable>

              <Pressable
                style={[styles.themeOption, isDark && styles.themeOptionSelected]}
                onPress={() => handleThemeSelect(true)}
              >
                <Feather name="moon" size={20} color={isDark ? Colors.primary : Colors.textSecondary} />
                <Text style={[styles.themeOptionText, isDark && styles.themeOptionTextSelected]}>Dark</Text>
                {isDark && (
                  <View style={styles.themeCheck}>
                    <Feather name="check" size={11} color="#fff" />
                  </View>
                )}
              </Pressable>
            </View>
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Referral Code (optional)</Text>
            <View style={styles.inputWrap}>
              <Feather name="gift" size={18} color={Colors.textMuted} style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                placeholder="e.g. JOHN0042"
                placeholderTextColor={Colors.textMuted}
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
            onPress={accountType === "player" ? handleNextToSkills : handleRegister}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : accountType === "player" ? (
              <>
                <Text style={styles.primaryBtnText}>Next</Text>
                <Feather name="arrow-right" size={18} color="#fff" style={{ marginLeft: 6 }} />
              </>
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

  if (step === 3) {
    return (
      <KeyboardAvoidingView
        style={{ flex: 1, backgroundColor: Colors.background }}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <ScrollView
          contentContainerStyle={[styles.container2, { paddingBottom: insets.bottom + 32 }]}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.logoRow}>
            <Image
              source={require("@/assets/images/tdc-logo.png")}
              style={styles.logoImg}
              resizeMode="contain"
            />
          </View>

          <View style={styles.stepIndicator}>
            <View style={[styles.stepDot, styles.stepDotActive]} />
            <View style={styles.stepLine} />
            <View style={[styles.stepDot, styles.stepDotActive]} />
            <View style={styles.stepLine} />
            <View style={[styles.stepDot, styles.stepDotActive]} />
          </View>

          <Text style={styles.title}>What are your strengths?</Text>
          <Text style={styles.subtitle}>Pick the skills that describe your game. You can update these later.</Text>

          <View style={styles.skillsGrid}>
            {SKILL_OPTIONS.map(skill => {
              const selected = selectedSkills.includes(skill);
              return (
                <Pressable
                  key={skill}
                  style={[styles.skillCard, selected && styles.skillCardSelected]}
                  onPress={() => toggleSkill(skill)}
                >
                  <View style={[styles.skillIconWrap, selected && styles.skillIconWrapSelected]}>
                    <Feather name={SKILL_ICONS[skill] as any} size={22} color={selected ? "#fff" : Colors.primary} />
                  </View>
                  <Text style={[styles.skillLabel, selected && styles.skillLabelSelected]}>{skill}</Text>
                  {selected && (
                    <View style={styles.skillCheck}>
                      <Feather name="check" size={11} color="#fff" />
                    </View>
                  )}
                </Pressable>
              );
            })}
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

          <Pressable style={styles.backBtn} onPress={() => setStep(2)}>
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

        <Text style={styles.titleDark}>Join the Club</Text>
        <Text style={styles.subtitleDark}>Create your free account and enter the Member Zone</Text>

        <View style={styles.stepIndicator}>
          <View style={[styles.stepDot, styles.stepDotActive]} />
          <View style={styles.stepLine} />
          <View style={styles.stepDot} />
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.labelDark}>Full Name</Text>
          <View style={styles.inputWrapLight}>
            <Feather name="user" size={18} color="#999999" style={styles.inputIcon} />
            <TextInput
              style={styles.inputLight}
              placeholder="Your name"
              placeholderTextColor="#999999"
              value={name}
              onChangeText={setName}
              autoCapitalize="words"
            />
          </View>
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.labelDark}>Email</Text>
          <View style={styles.inputWrapLight}>
            <Feather name="mail" size={18} color="#999999" style={styles.inputIcon} />
            <TextInput
              style={styles.inputLight}
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
          <Text style={styles.labelDark}>Password</Text>
          <View style={styles.inputWrapLight}>
            <Feather name="lock" size={18} color="#999999" style={styles.inputIcon} />
            <TextInput
              style={[styles.inputLight, { flex: 1 }]}
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

        <View style={styles.termsRow}>
          <Text style={styles.termsText}>By creating an account you agree to our </Text>
          <Pressable onPress={() => router.push("/legal/terms")}>
            <Text style={styles.termsLink}>Terms of Service</Text>
          </Pressable>
          <Text style={styles.termsText}> and </Text>
          <Pressable onPress={() => router.push("/legal/privacy")}>
            <Text style={styles.termsLink}>Privacy Policy</Text>
          </Pressable>
        </View>

        <View style={styles.footer}>
          <Text style={styles.footerTextDark}>Already a member? </Text>
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
    container2: {
      paddingTop: 100,
      paddingHorizontal: 24,
      paddingBottom: 24,
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
      tintColor: Colors.primary,
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
    title: {
      fontFamily: "Poppins_800ExtraBold",
      fontSize: 28,
      color: Colors.text,
      marginBottom: 6,
    },
    titleDark: {
      fontFamily: "Poppins_800ExtraBold",
      fontSize: 28,
      color: "#111111",
      marginBottom: 6,
    },
    subtitle: {
      fontFamily: "Inter_400Regular",
      fontSize: 15,
      color: Colors.textSecondary,
      marginBottom: 24,
    },
    subtitleDark: {
      fontFamily: "Inter_400Regular",
      fontSize: 15,
      color: "#666666",
      marginBottom: 24,
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
    labelDark: {
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
      color: Colors.textMuted,
      marginTop: 6,
    },
    inputWrap: {
      flexDirection: "row",
      alignItems: "center",
      backgroundColor: Colors.surface2,
      borderRadius: 14,
      borderWidth: 1,
      borderColor: Colors.border,
      paddingHorizontal: 14,
    },
    inputWrapLight: {
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
      color: Colors.text,
      paddingVertical: 16,
    },
    inputLight: {
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
    termsRow: {
      flexDirection: "row",
      flexWrap: "wrap",
      justifyContent: "center",
      alignItems: "center",
      marginTop: 16,
      paddingHorizontal: 8,
    },
    termsText: {
      fontFamily: "Inter_400Regular",
      fontSize: 12,
      color: "#999999",
      lineHeight: 18,
    },
    termsLink: {
      fontFamily: "Inter_600SemiBold",
      fontSize: 12,
      color: Colors.primary,
      lineHeight: 18,
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
    footerTextDark: {
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
      borderColor: Colors.border,
      backgroundColor: Colors.surface,
      padding: 16,
      alignItems: "center",
      gap: 8,
      position: "relative",
    },
    roleCardSelected: {
      borderColor: Colors.primary,
      backgroundColor: `${Colors.primary}12`,
    },
    roleIconWrap: {
      width: 52,
      height: 52,
      borderRadius: 26,
      backgroundColor: `${Colors.primary}15`,
      alignItems: "center",
      justifyContent: "center",
    },
    roleIconWrapSelected: {
      backgroundColor: Colors.primary,
    },
    roleLabel: {
      fontFamily: "Inter_700Bold",
      fontSize: 16,
      color: Colors.text,
    },
    roleLabelSelected: {
      color: Colors.primary,
    },
    roleTagline: {
      fontFamily: "Inter_400Regular",
      fontSize: 11,
      color: Colors.textMuted,
      textAlign: "center",
      lineHeight: 15,
    },
    roleTaglineSelected: {
      color: Colors.textSecondary,
    },
    benefitsList: {
      width: "100%",
      gap: 5,
      marginTop: 4,
    },
    benefitRow: {
      flexDirection: "row",
      alignItems: "flex-start",
      gap: 5,
    },
    benefitText: {
      fontFamily: "Inter_400Regular",
      fontSize: 11,
      color: Colors.textMuted,
      flex: 1,
      lineHeight: 15,
    },
    benefitTextSelected: {
      color: Colors.textSecondary,
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
    themeSection: {
      marginBottom: 24,
    },
    themeSectionLabel: {
      fontFamily: "Inter_600SemiBold",
      fontSize: 13,
      color: Colors.textSecondary,
      marginBottom: 10,
      letterSpacing: 0.5,
      textTransform: "uppercase",
    },
    themeToggleRow: {
      flexDirection: "row",
      gap: 12,
    },
    themeOption: {
      flex: 1,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: 8,
      paddingVertical: 14,
      borderRadius: 14,
      borderWidth: 2,
      borderColor: Colors.border,
      backgroundColor: Colors.surface,
      position: "relative",
    },
    themeOptionSelected: {
      borderColor: Colors.primary,
      backgroundColor: `${Colors.primary}12`,
    },
    themeOptionText: {
      fontFamily: "Inter_600SemiBold",
      fontSize: 15,
      color: Colors.textSecondary,
    },
    themeOptionTextSelected: {
      color: Colors.primary,
    },
    themeCheck: {
      position: "absolute",
      top: 8,
      right: 8,
      width: 18,
      height: 18,
      borderRadius: 9,
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
    skillsGrid: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: 12,
      marginBottom: 28,
      justifyContent: "center",
    },
    skillCard: {
      width: "44%",
      borderRadius: 16,
      borderWidth: 2,
      borderColor: Colors.border,
      backgroundColor: Colors.surface,
      padding: 16,
      alignItems: "center",
      gap: 8,
      position: "relative",
    },
    skillCardSelected: {
      borderColor: Colors.primary,
      backgroundColor: `${Colors.primary}12`,
    },
    skillIconWrap: {
      width: 46,
      height: 46,
      borderRadius: 23,
      backgroundColor: `${Colors.primary}15`,
      alignItems: "center",
      justifyContent: "center",
    },
    skillIconWrapSelected: {
      backgroundColor: Colors.primary,
    },
    skillLabel: {
      fontFamily: "Inter_600SemiBold",
      fontSize: 13,
      color: Colors.text,
      textAlign: "center",
    },
    skillLabelSelected: {
      color: Colors.primary,
    },
    skillCheck: {
      position: "absolute",
      top: 10,
      right: 10,
      width: 20,
      height: 20,
      borderRadius: 10,
      backgroundColor: Colors.primary,
      alignItems: "center",
      justifyContent: "center",
    },
  });
}
