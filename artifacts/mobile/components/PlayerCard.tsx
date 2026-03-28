import React, { forwardRef } from "react";
import { View, Text, Image, StyleSheet, Platform } from "react-native";
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

  return (
    <View
      ref={ref}
      style={styles.wrapper}
      renderToHardwareTextureAndroid
      shouldRasterizeIOS
    >
      <LinearGradient
        colors={["#071E0F", "#031008", "#000000"]}
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
  );
});

export default PlayerCard;

const styles = StyleSheet.create({
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
    paddingHorizontal: 18,
    paddingTop: 14,
    paddingBottom: 14,
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
  cornerV: { position: "absolute", width: 2, height: 20, backgroundColor: NEON, opacity: 0.85 } as any,
  cornerH: { position: "absolute", height: 2, width: 20, backgroundColor: NEON, opacity: 0.85 } as any,
  cTL:  { top: 10, left: 10 },
  cTLH: { top: 10, left: 10 },
  cTR:  { top: 10, right: 10 },
  cTRH: { top: 10, right: 10 },
  cBL:  { bottom: 10, left: 10 },
  cBLH: { bottom: 10, left: 10 },
  cBR:  { bottom: 10, right: 10 },
  cBRH: { bottom: 10, right: 10 },

  /* Top section — logo centred, LV pill pinned absolute top-right */
  topSection: {
    alignItems: "center",
    width: "100%",
    marginBottom: 8,
    paddingHorizontal: 4,
  },
  logo: { width: CARD_W - 72, height: 52 },
  officialLabel: {
    fontFamily: "Inter_700Bold",
    fontSize: 8,
    color: "rgba(255,215,0,0.55)",
    letterSpacing: 2.5,
    marginTop: 3,
    marginBottom: 2,
  },
  levelPill: {
    position: "absolute",
    top: 0,
    right: 4,
    alignItems: "center",
    backgroundColor: GOLD,
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 4,
    minWidth: 48,
  } as any,
  levelNum: {
    fontFamily: "Poppins_800ExtraBold",
    fontSize: 20,
    color: "#000",
    lineHeight: 22,
  },
  levelLabel: {
    fontFamily: "Inter_700Bold",
    fontSize: 8,
    color: "#000",
    letterSpacing: 1,
    lineHeight: 9,
  },

  /* Avatar area */
  avatarArea: {
    alignItems: "center",
    justifyContent: "center",
    width: 196,
    height: 196,
    position: "relative",
  },
  glowRing3: {
    position: "absolute",
    width: 196,
    height: 196,
    borderRadius: 98,
    backgroundColor: "rgba(57,255,20,0.06)",
  } as any,
  glowRing2: {
    position: "absolute",
    width: 192,
    height: 192,
    borderRadius: 96,
    backgroundColor: "rgba(57,255,20,0.08)",
  } as any,
  glowRing1: {
    position: "absolute",
    width: 186,
    height: 186,
    borderRadius: 93,
    backgroundColor: "rgba(57,255,20,0.10)",
  } as any,
  avatarRing: {
    width: 178,
    height: 178,
    borderRadius: 89,
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
    fontSize: 68,
    color: GOLD,
    lineHeight: 76,
  },

  /* Name banner */
  nameBanner: {
    width: CARD_W - 36,
    alignItems: "center",
    backgroundColor: "rgba(0,0,0,0.70)",
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: GOLD_DIM,
    paddingVertical: 5,
    marginTop: 8,
  },
  playerName: {
    fontFamily: "Poppins_800ExtraBold",
    fontSize: 18,
    color: "#FFFFFF",
    letterSpacing: 1.5,
    textAlign: "center",
  },
  playerUsername: {
    fontFamily: "Inter_400Regular",
    fontSize: 11,
    color: "rgba(255,255,255,0.45)",
    textAlign: "center",
    marginTop: 1,
  },

  /* Level name + XP combined band */
  xpBand: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    marginTop: 8,
    width: CARD_W - 36,
    backgroundColor: "rgba(255,215,0,0.07)",
    borderWidth: 1,
    borderColor: GOLD_DIM,
    borderRadius: 10,
    paddingVertical: 6,
    paddingHorizontal: 12,
  },
  xpLevelName: {
    fontFamily: "Inter_700Bold",
    fontSize: 12,
    color: GOLD,
    letterSpacing: 1,
    opacity: 0.8,
  },
  xpDot: {
    fontFamily: "Inter_700Bold",
    fontSize: 12,
    color: "rgba(255,215,0,0.35)",
  },
  xpValue: {
    fontFamily: "Poppins_800ExtraBold",
    fontSize: 15,
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
    borderRadius: 12,
    marginTop: 8,
    paddingVertical: 9,
    justifyContent: "space-around",
  },
  stat: { alignItems: "center", flex: 1 },
  statValue: {
    fontFamily: "Poppins_800ExtraBold",
    fontSize: 26,
    color: "#FFFFFF",
    lineHeight: 28,
  },
  statLabel: {
    fontFamily: "Inter_700Bold",
    fontSize: 8,
    color: "rgba(255,255,255,0.5)",
    letterSpacing: 1.5,
    marginTop: 2,
  },
  statSep: {
    width: 1,
    height: 32,
    backgroundColor: "rgba(255,255,255,0.12)",
  },

  /* Skills */
  skillsSection: { alignItems: "center", marginTop: 10, width: CARD_W - 36 },
  skillsHeading: {
    fontFamily: "Inter_700Bold",
    fontSize: 9,
    color: GOLD,
    letterSpacing: 2.5,
    marginBottom: 8,
    opacity: 0.7,
  },
  skillsRow: { flexDirection: "row", gap: 8, flexWrap: "wrap", justifyContent: "center" },
  skillChip: {
    borderWidth: 1.5,
    borderColor: GOLD_DIM,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 6,
    backgroundColor: "rgba(255,215,0,0.07)",
  },
  skillChipText: {
    fontFamily: "Inter_700Bold",
    fontSize: 12,
    color: GOLD,
    letterSpacing: 0.4,
  },

  /* Footer */
  footer: { position: "absolute", bottom: 12, alignItems: "center", width: "100%" },
  footerText: {
    fontFamily: "Inter_400Regular",
    fontSize: 9,
    color: "rgba(57,255,20,0.4)",
    letterSpacing: 1.2,
  },
});
