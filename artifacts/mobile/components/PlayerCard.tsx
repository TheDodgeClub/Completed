import React, { forwardRef } from "react";
import { View, Text, Image, StyleSheet } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Feather } from "@expo/vector-icons";

const CARD_W = 340;
const CARD_H = 560;

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
  eventsAttended: number;
  medalsEarned: number;
  ringsEarned: number;
  skills: string | null;
};

const PlayerCard = forwardRef<View, Props>(function PlayerCard(
  { name, username, avatarUrl, level, xp, eventsAttended, medalsEarned, ringsEarned, skills },
  ref
) {
  const tierName = LEVEL_NAMES[Math.min(level - 1, LEVEL_NAMES.length - 1)] ?? "Player";
  const skillList = skills
    ? skills.split(",").filter(Boolean).map(s => s.trim()).slice(0, 3)
    : [];
  const initial = name.charAt(0).toUpperCase();

  return (
    <View ref={ref} style={styles.wrapper}>
      <LinearGradient
        colors={["#0B5E2F", "#052A15", "#000000"]}
        start={{ x: 0.2, y: 0 }}
        end={{ x: 0.8, y: 1 }}
        style={styles.card}
      >
        {/* Gold border overlay */}
        <View style={styles.goldBorder} pointerEvents="none" />

        {/* Foil shimmer strips */}
        <View style={styles.shimmer1} />
        <View style={styles.shimmer2} />

        {/* Header: logo + club name */}
        <View style={styles.header}>
          <Image
            source={require("@/assets/images/tdc-logo.png")}
            style={styles.logo}
            resizeMode="contain"
          />
          <Text style={styles.clubName}>THE DODGE CLUB</Text>
          <View style={styles.levelPill}>
            <Text style={styles.levelPillText}>LV {level}</Text>
          </View>
        </View>

        {/* Avatar */}
        <View style={styles.avatarWrap}>
          <View style={styles.avatarRing}>
            {avatarUrl ? (
              <Image source={{ uri: avatarUrl }} style={styles.avatar} />
            ) : (
              <View style={styles.avatarFallback}>
                <Text style={styles.avatarInitial}>{initial}</Text>
              </View>
            )}
          </View>
          {/* XP badge */}
          <View style={styles.xpBadge}>
            <Feather name="zap" size={9} color="#000" />
            <Text style={styles.xpBadgeText}>{xp.toLocaleString()} XP</Text>
          </View>
        </View>

        {/* Name + username */}
        <Text style={styles.playerName} numberOfLines={1}>{name}</Text>
        {username ? (
          <Text style={styles.playerUsername}>@{username}</Text>
        ) : null}

        {/* Tier name */}
        <View style={styles.tierRow}>
          <View style={styles.tierBadge}>
            <Text style={styles.tierText}>{tierName.toUpperCase()}</Text>
          </View>
        </View>

        {/* Divider */}
        <View style={styles.divider} />

        {/* Stats row */}
        <View style={styles.statsRow}>
          <View style={styles.stat}>
            <Text style={styles.statValue}>{eventsAttended}</Text>
            <Text style={styles.statLabel}>EVENTS</Text>
          </View>
          <View style={styles.statSep} />
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

        {/* Divider */}
        <View style={styles.divider} />

        {/* Skills */}
        {skillList.length > 0 && (
          <View style={styles.skillsSection}>
            <Text style={styles.skillsHeading}>SKILLS</Text>
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
          <View style={styles.footerLine} />
          <Text style={styles.footerText}>thedodgeclub.co.uk</Text>
        </View>
      </LinearGradient>
    </View>
  );
});

export default PlayerCard;

const GOLD = "#FFD700";
const GOLD_DIM = "rgba(255,215,0,0.35)";

const styles = StyleSheet.create({
  wrapper: {
    width: CARD_W,
    height: CARD_H,
    borderRadius: 20,
    overflow: "hidden",
    shadowColor: GOLD,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.45,
    shadowRadius: 20,
    elevation: 12,
  },
  card: {
    flex: 1,
    alignItems: "center",
    paddingHorizontal: 20,
    paddingTop: 18,
    paddingBottom: 14,
  },

  /* Gold border */
  goldBorder: {
    position: "absolute",
    inset: 0,
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: GOLD_DIM,
    pointerEvents: "none",
  } as any,

  /* Foil shimmer strips */
  shimmer1: {
    position: "absolute",
    top: 0,
    left: "10%",
    width: "30%",
    height: "100%",
    backgroundColor: "rgba(255,215,0,0.03)",
    transform: [{ skewX: "-15deg" }],
    pointerEvents: "none",
  } as any,
  shimmer2: {
    position: "absolute",
    top: 0,
    left: "55%",
    width: "15%",
    height: "100%",
    backgroundColor: "rgba(255,215,0,0.02)",
    transform: [{ skewX: "-15deg" }],
    pointerEvents: "none",
  } as any,

  /* Header */
  header: {
    flexDirection: "row",
    alignItems: "center",
    width: "100%",
    marginBottom: 14,
    gap: 8,
  },
  logo: { width: 28, height: 28 },
  clubName: {
    flex: 1,
    fontFamily: "Poppins_800ExtraBold",
    fontSize: 11,
    color: GOLD,
    letterSpacing: 1.5,
  },
  levelPill: {
    backgroundColor: GOLD,
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  levelPillText: {
    fontFamily: "Inter_700Bold",
    fontSize: 10,
    color: "#000",
  },

  /* Avatar */
  avatarWrap: {
    alignItems: "center",
    marginBottom: 12,
    position: "relative",
  },
  avatarRing: {
    width: 96,
    height: 96,
    borderRadius: 48,
    borderWidth: 2.5,
    borderColor: GOLD,
    overflow: "hidden",
    backgroundColor: "#1A1A1A",
  },
  avatar: { width: "100%", height: "100%" },
  avatarFallback: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#1A3D2A",
  },
  avatarInitial: {
    fontFamily: "Poppins_800ExtraBold",
    fontSize: 38,
    color: GOLD,
  },
  xpBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    backgroundColor: GOLD,
    borderRadius: 10,
    paddingHorizontal: 8,
    paddingVertical: 2,
    position: "absolute",
    bottom: -8,
    alignSelf: "center",
  },
  xpBadgeText: {
    fontFamily: "Inter_700Bold",
    fontSize: 9,
    color: "#000",
  },

  /* Name + username */
  playerName: {
    fontFamily: "Poppins_800ExtraBold",
    fontSize: 22,
    color: "#FFFFFF",
    marginTop: 12,
    textAlign: "center",
    letterSpacing: 0.3,
  },
  playerUsername: {
    fontFamily: "Inter_400Regular",
    fontSize: 13,
    color: "rgba(255,255,255,0.5)",
    marginTop: 2,
    textAlign: "center",
  },

  /* Tier */
  tierRow: { marginTop: 8, marginBottom: 14 },
  tierBadge: {
    backgroundColor: "rgba(255,215,0,0.12)",
    borderWidth: 1,
    borderColor: GOLD_DIM,
    borderRadius: 6,
    paddingHorizontal: 12,
    paddingVertical: 3,
  },
  tierText: {
    fontFamily: "Inter_700Bold",
    fontSize: 10,
    color: GOLD,
    letterSpacing: 1.8,
  },

  /* Divider */
  divider: {
    width: "100%",
    height: 1,
    backgroundColor: "rgba(255,215,0,0.15)",
    marginVertical: 12,
  },

  /* Stats */
  statsRow: {
    flexDirection: "row",
    alignItems: "center",
    width: "100%",
    justifyContent: "space-around",
  },
  stat: { alignItems: "center", flex: 1 },
  statValue: {
    fontFamily: "Poppins_800ExtraBold",
    fontSize: 22,
    color: "#FFFFFF",
    lineHeight: 26,
  },
  statLabel: {
    fontFamily: "Inter_700Bold",
    fontSize: 8,
    color: GOLD,
    letterSpacing: 1.2,
    marginTop: 2,
  },
  statSep: {
    width: 1,
    height: 32,
    backgroundColor: "rgba(255,215,0,0.2)",
  },

  /* Skills */
  skillsSection: { alignItems: "center", marginTop: 4 },
  skillsHeading: {
    fontFamily: "Inter_700Bold",
    fontSize: 8,
    color: GOLD,
    letterSpacing: 1.8,
    marginBottom: 6,
  },
  skillsRow: { flexDirection: "row", gap: 6 },
  skillChip: {
    borderWidth: 1,
    borderColor: GOLD_DIM,
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 3,
    backgroundColor: "rgba(255,215,0,0.06)",
  },
  skillChipText: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 10,
    color: "rgba(255,255,255,0.85)",
  },

  /* Footer */
  footer: { position: "absolute", bottom: 14, alignItems: "center", width: "100%" },
  footerLine: {
    width: 40,
    height: 1,
    backgroundColor: GOLD_DIM,
    marginBottom: 5,
    alignSelf: "center",
  },
  footerText: {
    fontFamily: "Inter_400Regular",
    fontSize: 9,
    color: "rgba(255,215,0,0.5)",
    letterSpacing: 1,
  },
});
