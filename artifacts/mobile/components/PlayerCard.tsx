import React, { forwardRef } from "react";
import { View, Text, Image, StyleSheet, Platform } from "react-native";
import { LinearGradient } from "expo-linear-gradient";

const CARD_W = 340;
const CARD_H = 560;

const GOLD = "#FFD700";
const GOLD_DIM = "rgba(255,215,0,0.30)";
const NEON = "#39FF14";
const NEON_DIM = "rgba(57,255,20,0.22)";

const LEVEL_NAMES = [
  "Rookie", "Contender", "Hustler", "Baller", "Sharpshooter",
  "Enforcer", "Dodgemaster", "All-Star", "Legend", "Goat",
];

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
  const tierName = LEVEL_NAMES[Math.min(level - 1, LEVEL_NAMES.length - 1)] ?? "Player";
  const skillList = skills
    ? skills.split(",").filter(Boolean).map(s => s.trim()).slice(0, 3)
    : [];
  const initial = name.charAt(0).toUpperCase();

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

        {/* Top row: logo | spacer | LV pill */}
        <View style={styles.topRow}>
          <Image
            source={require("@/assets/images/tdc-logo.png")}
            style={styles.logo}
            resizeMode="contain"
            tintColor="#FFFFFF"
          />
          <View style={styles.levelPill}>
            <Text style={styles.levelNum}>{level}</Text>
            <Text style={styles.levelLabel}>LV</Text>
          </View>
        </View>

        {/* Avatar area */}
        <View style={styles.avatarArea}>
          {/* Glow rings — cheaper than boxShadow */}
          <View style={styles.glowRing3} />
          <View style={styles.glowRing2} />
          <View style={styles.glowRing1} />
          {/* Avatar */}
          <View style={styles.avatarRing}>
            {avatarUrl ? (
              <Image source={{ uri: avatarUrl }} style={styles.avatar} />
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

        {/* Tier + XP row */}
        <View style={styles.tierXpRow}>
          <View style={styles.tierChip}>
            <Text style={styles.tierText}>{tierName.toUpperCase()}</Text>
          </View>
          <View style={styles.xpChip}>
            <Text style={styles.xpText}>{xp.toLocaleString()} XP</Text>
          </View>
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
    paddingTop: 16,
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

  /* Top row */
  topRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    width: "100%",
    marginBottom: 10,
    paddingHorizontal: 4,
  },
  logo: { width: 42, height: 42 },
  levelPill: {
    alignItems: "center",
    backgroundColor: GOLD,
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 4,
    minWidth: 48,
  },
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

  /* Avatar area — glow via translucent rings, no expensive shadow */
  avatarArea: {
    alignItems: "center",
    justifyContent: "center",
    width: 200,
    height: 200,
    position: "relative",
  },
  glowRing3: {
    position: "absolute",
    width: 200,
    height: 200,
    borderRadius: 100,
    backgroundColor: "rgba(57,255,20,0.06)",
  } as any,
  glowRing2: {
    position: "absolute",
    width: 196,
    height: 196,
    borderRadius: 98,
    backgroundColor: "rgba(57,255,20,0.08)",
  } as any,
  glowRing1: {
    position: "absolute",
    width: 188,
    height: 188,
    borderRadius: 94,
    backgroundColor: "rgba(57,255,20,0.10)",
  } as any,
  avatarRing: {
    width: 180,
    height: 180,
    borderRadius: 90,
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
    fontSize: 72,
    color: GOLD,
    lineHeight: 80,
  },

  /* Name banner */
  nameBanner: {
    width: CARD_W - 36,
    alignItems: "center",
    backgroundColor: "rgba(0,0,0,0.70)",
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: GOLD_DIM,
    paddingVertical: 6,
    marginTop: 10,
  },
  playerName: {
    fontFamily: "Poppins_800ExtraBold",
    fontSize: 19,
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

  /* Tier + XP */
  tierXpRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginTop: 8,
    marginBottom: 2,
  },
  tierChip: {
    backgroundColor: "rgba(57,255,20,0.10)",
    borderWidth: 1,
    borderColor: NEON_DIM,
    borderRadius: 6,
    paddingHorizontal: 10,
    paddingVertical: 3,
  },
  tierText: {
    fontFamily: "Inter_700Bold",
    fontSize: 9,
    color: NEON,
    letterSpacing: 1.6,
  },
  xpChip: {
    backgroundColor: "rgba(255,215,0,0.10)",
    borderWidth: 1,
    borderColor: GOLD_DIM,
    borderRadius: 6,
    paddingHorizontal: 10,
    paddingVertical: 3,
  },
  xpText: {
    fontFamily: "Inter_700Bold",
    fontSize: 9,
    color: GOLD,
    letterSpacing: 1.2,
  },

  /* Stats band */
  statsBand: {
    flexDirection: "row",
    alignItems: "center",
    width: CARD_W - 36,
    backgroundColor: "rgba(255,215,0,0.05)",
    borderWidth: 1,
    borderColor: GOLD_DIM,
    borderRadius: 12,
    marginTop: 10,
    paddingVertical: 10,
    justifyContent: "space-around",
  },
  stat: { alignItems: "center", flex: 1 },
  statValue: {
    fontFamily: "Poppins_800ExtraBold",
    fontSize: 28,
    color: "#FFFFFF",
    lineHeight: 30,
  },
  statLabel: {
    fontFamily: "Inter_700Bold",
    fontSize: 8,
    color: GOLD,
    letterSpacing: 1.5,
    marginTop: 3,
  },
  statSep: {
    width: 1,
    height: 36,
    backgroundColor: GOLD_DIM,
  },

  /* Skills */
  skillsSection: { alignItems: "center", marginTop: 10 },
  skillsRow: { flexDirection: "row", gap: 6, flexWrap: "wrap", justifyContent: "center" },
  skillChip: {
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.18)",
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 3,
    backgroundColor: "rgba(255,255,255,0.04)",
  },
  skillChipText: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 10,
    color: "rgba(255,255,255,0.75)",
  },

  /* Footer */
  footer: { position: "absolute", bottom: 14, alignItems: "center", width: "100%" },
  footerText: {
    fontFamily: "Inter_400Regular",
    fontSize: 9,
    color: "rgba(57,255,20,0.4)",
    letterSpacing: 1.2,
  },
});
