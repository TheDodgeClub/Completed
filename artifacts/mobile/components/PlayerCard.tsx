import React, { forwardRef, useEffect, useRef } from "react";
import { View, Text, Image, StyleSheet, Platform, Animated, Easing } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { resolveImageUrl } from "@/constants/api";

const CARD_W = 340;
const CARD_H = 560;

const GOLD = "#FFD700";
const GOLD_DIM = "rgba(255,215,0,0.30)";
const NEON = "#39FF14";
const NEON_DIM = "rgba(57,255,20,0.22)";

const LEVEL_NAMES = ["Beginner", "Developing", "Experienced", "Skilled", "Advanced", "Pro", "League", "Expert", "Master", "Icon"];

type Props = {
  name: string;
  username: string | null;
  avatarUrl: string | null;
  level: number;
  xp: number;
  medalsEarned: number;
  ringsEarned: number;
  skills: string | null;
};

const PlayerCard = forwardRef<View, Props>(function PlayerCard(
  { name, username, avatarUrl, level, xp, medalsEarned, ringsEarned, skills },
  ref
) {
  const levelName = LEVEL_NAMES[Math.min(level - 1, LEVEL_NAMES.length - 1)] ?? "Player";
  const skillList = skills
    ? skills.split(",").filter(Boolean).map(s => s.trim()).slice(0, 3)
    : [];
  const initial = name.charAt(0).toUpperCase();
  const resolvedAvatar = resolveImageUrl(avatarUrl);

  // Entrance animation
  const enterAnim = useRef(new Animated.Value(0)).current;
  // Gold glow pulse
  const pulseAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.spring(enterAnim, {
      toValue: 1,
      damping: 14,
      stiffness: 90,
      useNativeDriver: true,
    }).start();

    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 500,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 0,
          duration: 500,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
      ])
    ).start();
  }, []);

  const translateY = enterAnim.interpolate({ inputRange: [0, 1], outputRange: [50, 0] });
  const cardOpacity = enterAnim.interpolate({ inputRange: [0, 1], outputRange: [0, 1] });
  const glowOpacity = pulseAnim.interpolate({ inputRange: [0, 1], outputRange: [0.4, 1.0] });

  return (
    <Animated.View style={[styles.animOuter, { opacity: cardOpacity, transform: [{ translateY }] }]}>
      {/* Pulsing gold glow halo behind the card */}
      <Animated.View style={[styles.glowHalo, { opacity: glowOpacity }]} />

      <View
        ref={ref}
        style={styles.wrapper}
      >
      <LinearGradient
        colors={["#0D3D1A", "#0A2E13", "#04180A"]}
        start={{ x: 0.5, y: 0 }}
        end={{ x: 0.5, y: 1 }}
        style={styles.card}
      >
        {/* Neon border overlay */}
        <View style={styles.neonBorder} />

        {/* Corner bracket accents */}
        <View style={[styles.cornerV, styles.cTL]} />
        <View style={[styles.cornerH, styles.cTLH]} />
        <View style={[styles.cornerV, styles.cTR]} />
        <View style={[styles.cornerH, styles.cTRH]} />
        <View style={[styles.cornerV, styles.cBL]} />
        <View style={[styles.cornerH, styles.cBLH]} />
        <View style={[styles.cornerV, styles.cBR]} />
        <View style={[styles.cornerH, styles.cBRH]} />

        {/* Top section: centred logo + subtitle, LV pill pinned top-right */}
        <View style={styles.topSection}>
          <Image
            source={require("@/assets/images/tdc-logo.png")}
            style={styles.logo}
            resizeMode="contain"
            tintColor="#FFFFFF"
          />
          <Text style={styles.officialLabel}>OFFICIAL PLAYER CARD</Text>
          <View style={styles.levelPill}>
            <Text style={styles.levelNum}>{level}</Text>
            <Text style={styles.levelLabel}>LV</Text>
          </View>
        </View>

        {/* Avatar area */}
        <View style={styles.avatarArea}>
          <View style={styles.glowRing3} />
          <View style={styles.glowRing2} />
          <View style={styles.glowRing1} />
          <View style={styles.avatarRing}>
            {resolvedAvatar ? (
              <Image source={{ uri: resolvedAvatar }} style={styles.avatar} />
            ) : (
              <View style={styles.avatarFallback}>
                <Text style={styles.avatarInitial}>{initial}</Text>
              </View>
            )}
          </View>
        </View>

        {/* Name banner */}
        <View style={styles.nameBanner}>
          <Text style={styles.playerName} numberOfLines={1}>{name.toUpperCase()}</Text>
          {username ? (
            <Text style={styles.playerUsername}>@{username}</Text>
          ) : null}
        </View>

        {/* Level name + XP */}
        <View style={styles.xpBand}>
          <Text style={styles.xpLevelName}>{levelName.toUpperCase()}</Text>
          <Text style={styles.xpDot}>·</Text>
          <Text style={styles.xpValue}>{xp.toLocaleString()} XP</Text>
        </View>

        {/* Stats row */}
        <View style={styles.statsBand}>
          <View style={styles.stat}>
            <Text style={styles.statValue}>{medalsEarned}</Text>
            <Text style={styles.statLabel}>MEDALS</Text>
          </View>
          <View style={styles.statSep} />
          <View style={styles.stat}>
            <Text style={styles.statValue}>{ringsEarned}</Text>
            <Text style={styles.statLabel}>RINGS</Text>
          </View>
        </View>

        {/* Skills */}
        {skillList.length > 0 && (
          <View style={styles.skillsSection}>
            <Text style={styles.skillsHeading}>TOP SKILLS</Text>
            <View style={styles.skillsRow}>
              {skillList.map(skill => (
                <View key={skill} style={styles.skillChip}>
                  <Text style={styles.skillChipText}>{skill}</Text>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* Footer */}
        <View style={styles.footer}>
          <Text style={styles.footerText}>thedodgeclub.co.uk</Text>
        </View>
      </LinearGradient>
      </View>
    </Animated.View>
  );
});

export default PlayerCard;

const styles = StyleSheet.create({
  animOuter: {
    width: CARD_W,
    height: CARD_H,
    alignItems: "center",
    justifyContent: "center",
  },
  glowHalo: {
    position: "absolute",
    width: CARD_W + 20,
    height: CARD_H + 20,
    borderRadius: 26,
    borderWidth: 8,
    borderColor: GOLD,
    ...Platform.select({
      ios: {
        shadowColor: GOLD,
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 1,
        shadowRadius: 28,
      },
      android: { elevation: 0 },
    }),
  } as any,
  wrapper: {
    width: CARD_W,
    height: CARD_H,
    borderRadius: 20,
    overflow: "hidden",
    ...Platform.select({
      ios: {
        shadowColor: NEON,
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0.55,
        shadowRadius: 20,
      },
      android: { elevation: 16 },
    }),
  },
  card: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 16,
    paddingTop: 60,
    paddingBottom: 32,
  },

  /* Neon border */
  neonBorder: {
    position: "absolute",
    top: 0, left: 0, right: 0, bottom: 0,
    borderRadius: 20,
    borderWidth: 2,
    borderColor: NEON_DIM,
    pointerEvents: "none",
  } as any,

  /* Corner brackets */
  cornerV: { position: "absolute", width: 2, height: 18, backgroundColor: NEON, opacity: 0.85 } as any,
  cornerH: { position: "absolute", height: 2, width: 18, backgroundColor: NEON, opacity: 0.85 } as any,
  cTL:  { top: 10, left: 10 },
  cTLH: { top: 10, left: 10 },
  cTR:  { top: 10, right: 10 },
  cTRH: { top: 10, right: 10 },
  cBL:  { bottom: 10, left: 10 },
  cBLH: { bottom: 10, left: 10 },
  cBR:  { bottom: 10, right: 10 },
  cBRH: { bottom: 10, right: 10 },

  /* Top section — absolutely pinned to card top, logo centred */
  topSection: {
    position: "absolute",
    top: 42,
    left: 16,
    right: 16,
    alignItems: "center",
    paddingHorizontal: 4,
  } as any,
  logo: { width: Math.round((CARD_W - 72) * 0.54), height: Math.round(52 * 0.54) },
  officialLabel: {
    fontFamily: "Poppins_800ExtraBold",
    fontSize: 9,
    color: "rgba(255,215,0,0.85)",
    letterSpacing: 2.5,
    marginTop: 3,
    marginBottom: 1,
  },
  levelPill: {
    position: "absolute",
    top: 0,
    right: 4,
    alignItems: "center",
    backgroundColor: GOLD,
    borderRadius: 9,
    paddingHorizontal: 9,
    paddingVertical: 3,
    minWidth: 43,
  } as any,
  levelNum: {
    fontFamily: "Poppins_800ExtraBold",
    fontSize: 18,
    color: "#000",
    lineHeight: 20,
  },
  levelLabel: {
    fontFamily: "Inter_700Bold",
    fontSize: 7,
    color: "#000",
    letterSpacing: 1,
    lineHeight: 8,
  },

  /* Avatar area */
  avatarArea: {
    alignItems: "center",
    justifyContent: "center",
    width: 176,
    height: 176,
    position: "relative",
  },
  glowRing3: {
    position: "absolute",
    width: 176,
    height: 176,
    borderRadius: 88,
    backgroundColor: "rgba(57,255,20,0.06)",
  } as any,
  glowRing2: {
    position: "absolute",
    width: 172,
    height: 172,
    borderRadius: 86,
    backgroundColor: "rgba(57,255,20,0.08)",
  } as any,
  glowRing1: {
    position: "absolute",
    width: 167,
    height: 167,
    borderRadius: 84,
    backgroundColor: "rgba(57,255,20,0.10)",
  } as any,
  avatarRing: {
    width: 160,
    height: 160,
    borderRadius: 80,
    borderWidth: 3,
    borderColor: GOLD,
    overflow: "hidden",
    backgroundColor: "#0B2E17",
  },
  avatar: { width: "100%", height: "100%" },
  avatarFallback: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#0B2E17",
  },
  avatarInitial: {
    fontFamily: "Poppins_800ExtraBold",
    fontSize: 61,
    color: GOLD,
    lineHeight: 68,
  },

  /* Name banner */
  nameBanner: {
    width: CARD_W - 36,
    alignItems: "center",
    backgroundColor: "rgba(0,0,0,0.70)",
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: GOLD_DIM,
    paddingVertical: 4,
    marginTop: 7,
  },
  playerName: {
    fontFamily: "Poppins_800ExtraBold",
    fontSize: 16,
    color: "#FFFFFF",
    letterSpacing: 1.5,
    textAlign: "center",
  },
  playerUsername: {
    fontFamily: "Inter_400Regular",
    fontSize: 10,
    color: "rgba(255,255,255,0.45)",
    textAlign: "center",
    marginTop: 1,
  },

  /* Level name + XP combined band */
  xpBand: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 5,
    marginTop: 6,
    width: CARD_W - 36,
    backgroundColor: "rgba(255,215,0,0.07)",
    borderWidth: 1,
    borderColor: GOLD_DIM,
    borderRadius: 9,
    paddingVertical: 5,
    paddingHorizontal: 11,
  },
  xpLevelName: {
    fontFamily: "Inter_700Bold",
    fontSize: 11,
    color: GOLD,
    letterSpacing: 1,
    opacity: 0.8,
  },
  xpDot: {
    fontFamily: "Inter_700Bold",
    fontSize: 11,
    color: "rgba(255,215,0,0.35)",
  },
  xpValue: {
    fontFamily: "Poppins_800ExtraBold",
    fontSize: 13,
    color: GOLD,
    letterSpacing: 0.5,
  },

  /* Stats band */
  statsBand: {
    flexDirection: "row",
    alignItems: "center",
    width: CARD_W - 36,
    backgroundColor: "rgba(255,255,255,0.04)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.10)",
    borderRadius: 11,
    marginTop: 6,
    paddingVertical: 8,
    justifyContent: "space-around",
  },
  stat: { alignItems: "center", flex: 1 },
  statValue: {
    fontFamily: "Poppins_800ExtraBold",
    fontSize: 23,
    color: "#FFFFFF",
    lineHeight: 25,
  },
  statLabel: {
    fontFamily: "Inter_700Bold",
    fontSize: 7,
    color: "rgba(255,255,255,0.5)",
    letterSpacing: 1.5,
    marginTop: 2,
  },
  statSep: {
    width: 1,
    height: 29,
    backgroundColor: "rgba(255,255,255,0.12)",
  },

  /* Skills */
  skillsSection: { alignItems: "center", marginTop: 8, width: CARD_W - 36 },
  skillsHeading: {
    fontFamily: "Poppins_800ExtraBold",
    fontSize: 9,
    color: GOLD,
    letterSpacing: 2.5,
    marginBottom: 6,
    opacity: 0.85,
  },
  skillsRow: { flexDirection: "row", gap: 6, flexWrap: "wrap", justifyContent: "center" },
  skillChip: {
    borderWidth: 1.5,
    borderColor: GOLD_DIM,
    borderRadius: 9,
    paddingHorizontal: 12,
    paddingVertical: 5,
    backgroundColor: "rgba(255,215,0,0.07)",
  },
  skillChipText: {
    fontFamily: "Inter_700Bold",
    fontSize: 11,
    color: GOLD,
    letterSpacing: 0.4,
  },

  /* Footer */
  footer: { position: "absolute", bottom: 38, alignItems: "center", width: "100%" },
  footerText: {
    fontFamily: "Inter_700Bold",
    fontSize: 11,
    color: "rgba(255,255,255,0.80)",
    letterSpacing: 1.2,
  },
});
