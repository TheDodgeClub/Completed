import React, { forwardRef, useEffect, useRef } from "react";
import { View, Text, Image, StyleSheet, Platform, Animated, Easing } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { resolveImageUrl } from "@/constants/api";

const CARD_W = 340;
const CARD_H = 520;

const GOLD = "#FFD700";
const GOLD_DIM = "rgba(255,215,0,0.30)";
const NEON = "#39FF14";
const NEON_DIM = "rgba(57,255,20,0.22)";

const LEVEL_NAMES = ["Beginner", "Developing", "Experienced", "Skilled", "Advanced", "Pro", "League", "Expert", "Master", "Icon"];

const ACHIEVE_ICONS_ORDERED = ["🎯", "⚡", "🏅", "🥇", "🤝"];
const ACHIEVE_IDS_ORDERED = ["first_event", "earn_50xp", "three_events", "first_medal", "invite_friend"];

type AchievementBadge = { id: string; unlocked: boolean };

type Props = {
  name: string;
  username: string | null;
  avatarUrl: string | null;
  level: number;
  xp: number;
  medalsEarned: number;
  ringsEarned: number;
  skills: string | null;
  isElite?: boolean;
  achievements?: AchievementBadge[];
};

const PlayerCard = forwardRef<View, Props>(function PlayerCard(
  { name, username, avatarUrl, level, xp, medalsEarned, ringsEarned, isElite, achievements },
  ref
) {
  const levelName = LEVEL_NAMES[Math.min(level - 1, LEVEL_NAMES.length - 1)] ?? "Player";
  const initial = name.charAt(0).toUpperCase();
  const resolvedAvatar = resolveImageUrl(avatarUrl);

  const enterAnim = useRef(new Animated.Value(0)).current;
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
        Animated.timing(pulseAnim, { toValue: 1, duration: 1800, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 0, duration: 1800, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
      ])
    ).start();
  }, []);

  const translateY = enterAnim.interpolate({ inputRange: [0, 1], outputRange: [40, 0] });
  const cardOpacity = enterAnim.interpolate({ inputRange: [0, 1], outputRange: [0, 1] });
  const glowOpacity = pulseAnim.interpolate({ inputRange: [0, 1], outputRange: [0.3, 0.85] });

  return (
    <Animated.View style={[styles.animOuter, { opacity: cardOpacity, transform: [{ translateY }] }]}>
      <Animated.View style={[styles.glowHalo, { opacity: glowOpacity }]} />

      <View ref={ref} style={styles.wrapper}>
        <LinearGradient
          colors={["#0D3D1A", "#0A2E13", "#04180A"]}
          start={{ x: 0.5, y: 0 }}
          end={{ x: 0.5, y: 1 }}
          style={styles.card}
        >
          {/* Neon border */}
          <View style={styles.neonBorder} />

          {/* Corner brackets */}
          <View style={[styles.cornerV, styles.cTL]} />
          <View style={[styles.cornerH, styles.cTLH]} />
          <View style={[styles.cornerV, styles.cTR]} />
          <View style={[styles.cornerH, styles.cTRH]} />
          <View style={[styles.cornerV, styles.cBL]} />
          <View style={[styles.cornerH, styles.cBLH]} />
          <View style={[styles.cornerV, styles.cBR]} />
          <View style={[styles.cornerH, styles.cBRH]} />

          {/* Top bar: logo centred, level pill right */}
          <View style={styles.topBar}>
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

          {/* Avatar */}
          <View style={styles.avatarArea}>
            <View style={styles.avatarGlow} />
            <View style={styles.avatarRing}>
              {resolvedAvatar ? (
                <Image source={{ uri: resolvedAvatar }} style={styles.avatar} />
              ) : (
                <View style={styles.avatarFallback}>
                  <Text style={styles.avatarInitial}>{initial}</Text>
                </View>
              )}
            </View>
            {isElite && (
              <View style={styles.eliteBadge}>
                <Text style={styles.eliteBadgeText}>⭐ ELITE</Text>
              </View>
            )}
          </View>

          {/* Name */}
          <View style={styles.nameBanner}>
            <Text style={styles.playerName} numberOfLines={1}>{name.toUpperCase()}</Text>
            {username ? (
              <Text style={styles.playerUsername}>@{username}</Text>
            ) : null}
          </View>

          {/* Stats: Level/XP | Medals | Rings — single merged band */}
          <View style={styles.statsBand}>
            <View style={styles.statCenter}>
              <Text style={styles.statPrimary}>{xp.toLocaleString()}</Text>
              <Text style={styles.statSub}>XP · {levelName.toUpperCase()}</Text>
            </View>
            <View style={styles.statSep} />
            <View style={styles.statSmall}>
              <Text style={styles.statNum}>{medalsEarned}</Text>
              <Text style={styles.statLabel}>MEDALS</Text>
            </View>
            <View style={styles.statSep} />
            <View style={styles.statSmall}>
              <Text style={styles.statNum}>{ringsEarned}</Text>
              <Text style={styles.statLabel}>RINGS</Text>
            </View>
          </View>

          {/* Achievement icons — no heading, 5 small circles */}
          <View style={styles.achieveRow}>
            {ACHIEVE_IDS_ORDERED.map((id, i) => {
              const unlocked = achievements?.find(a => a.id === id)?.unlocked ?? false;
              return (
                <View
                  key={id}
                  style={[styles.achieveBadge, unlocked && styles.achieveBadgeUnlocked]}
                >
                  <Text style={[styles.achieveEmoji, !unlocked && { opacity: 0.2 }]}>
                    {ACHIEVE_ICONS_ORDERED[i]}
                  </Text>
                </View>
              );
            })}
          </View>

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
    borderWidth: 6,
    borderColor: GOLD,
    ...Platform.select({
      ios: { shadowColor: GOLD, shadowOffset: { width: 0, height: 0 }, shadowOpacity: 1, shadowRadius: 24 },
      android: { elevation: 0 },
    }),
  } as any,
  wrapper: {
    width: CARD_W,
    height: CARD_H,
    borderRadius: 20,
    overflow: "hidden",
  },
  card: {
    flex: 1,
    alignItems: "center",
    paddingHorizontal: 20,
    paddingTop: 0,
    paddingBottom: 0,
    gap: 0,
  },

  /* Neon border */
  neonBorder: {
    position: "absolute",
    top: 0, left: 0, right: 0, bottom: 0,
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: NEON_DIM,
    pointerEvents: "none",
  } as any,

  /* Corner brackets */
  cornerV: { position: "absolute", width: 2, height: 14, backgroundColor: NEON, opacity: 0.8 } as any,
  cornerH: { position: "absolute", height: 2, width: 14, backgroundColor: NEON, opacity: 0.8 } as any,
  cTL:  { top: 10, left: 10 },
  cTLH: { top: 10, left: 10 },
  cTR:  { top: 10, right: 10 },
  cTRH: { top: 10, right: 10 },
  cBL:  { bottom: 10, left: 10 },
  cBLH: { bottom: 10, left: 10 },
  cBR:  { bottom: 10, right: 10 },
  cBRH: { bottom: 10, right: 10 },

  /* Top bar */
  topBar: {
    width: "100%",
    alignItems: "center",
    paddingTop: 28,
    paddingBottom: 10,
    position: "relative",
  },
  logo: { width: 110, height: 28 },
  officialLabel: {
    fontFamily: "Poppins_800ExtraBold",
    fontSize: 8,
    color: "rgba(255,215,0,0.75)",
    letterSpacing: 2.5,
    marginTop: 2,
  },
  levelPill: {
    position: "absolute",
    top: 24,
    right: 0,
    alignItems: "center",
    backgroundColor: GOLD,
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 2,
    minWidth: 38,
  } as any,
  levelNum: {
    fontFamily: "Poppins_800ExtraBold",
    fontSize: 16,
    color: "#000",
    lineHeight: 18,
  },
  levelLabel: {
    fontFamily: "Inter_700Bold",
    fontSize: 6,
    color: "#000",
    letterSpacing: 1,
    lineHeight: 7,
  },

  /* Avatar */
  avatarArea: {
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 10,
    position: "relative",
  },
  avatarGlow: {
    position: "absolute",
    width: 150,
    height: 150,
    borderRadius: 75,
    backgroundColor: "rgba(57,255,20,0.08)",
  } as any,
  avatarRing: {
    width: 130,
    height: 130,
    borderRadius: 65,
    borderWidth: 2.5,
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
    fontSize: 50,
    color: GOLD,
    lineHeight: 56,
  },
  eliteBadge: {
    position: "absolute",
    bottom: -6,
    backgroundColor: GOLD,
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  eliteBadgeText: {
    fontFamily: "Inter_700Bold",
    fontSize: 8,
    color: "#000",
    letterSpacing: 0.8,
  },

  /* Name */
  nameBanner: {
    width: "100%",
    alignItems: "center",
    backgroundColor: "rgba(0,0,0,0.55)",
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: GOLD_DIM,
    paddingVertical: 6,
    marginBottom: 10,
  },
  playerName: {
    fontFamily: "Poppins_800ExtraBold",
    fontSize: 15,
    color: "#FFFFFF",
    letterSpacing: 1.5,
    textAlign: "center",
  },
  playerUsername: {
    fontFamily: "Inter_400Regular",
    fontSize: 10,
    color: "rgba(255,255,255,0.40)",
    textAlign: "center",
    marginTop: 1,
  },

  /* Stats — single merged band */
  statsBand: {
    flexDirection: "row",
    alignItems: "center",
    width: "100%",
    backgroundColor: "rgba(255,255,255,0.04)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.09)",
    borderRadius: 12,
    paddingVertical: 10,
    justifyContent: "space-around",
    marginBottom: 12,
  },
  statCenter: { alignItems: "center", flex: 2 },
  statPrimary: {
    fontFamily: "Poppins_800ExtraBold",
    fontSize: 22,
    color: GOLD,
    lineHeight: 24,
  },
  statSub: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 8,
    color: "rgba(255,215,0,0.55)",
    letterSpacing: 1,
    marginTop: 1,
  },
  statSmall: { alignItems: "center", flex: 1 },
  statNum: {
    fontFamily: "Poppins_800ExtraBold",
    fontSize: 20,
    color: "#FFFFFF",
    lineHeight: 22,
  },
  statLabel: {
    fontFamily: "Inter_700Bold",
    fontSize: 7,
    color: "rgba(255,255,255,0.45)",
    letterSpacing: 1.5,
    marginTop: 2,
  },
  statSep: {
    width: 1,
    height: 28,
    backgroundColor: "rgba(255,255,255,0.10)",
  },

  /* Achievement icons */
  achieveRow: {
    flexDirection: "row",
    gap: 9,
    justifyContent: "center",
    marginBottom: 14,
  },
  achieveBadge: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "rgba(255,255,255,0.05)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.10)",
    alignItems: "center",
    justifyContent: "center",
  },
  achieveBadgeUnlocked: {
    backgroundColor: "rgba(255,215,0,0.12)",
    borderColor: "rgba(255,215,0,0.45)",
  },
  achieveEmoji: { fontSize: 16 },

  /* Footer */
  footer: {
    position: "absolute",
    bottom: 16,
    alignItems: "center",
    width: "100%",
  },
  footerText: {
    fontFamily: "Inter_700Bold",
    fontSize: 10,
    color: "rgba(255,255,255,0.50)",
    letterSpacing: 1.2,
  },
});
