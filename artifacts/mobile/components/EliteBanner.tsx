import React, { useMemo } from "react";
import { View, Text, Pressable, StyleSheet } from "react-native";
import { router } from "expo-router";
import { Feather } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import * as Haptics from "expo-haptics";
import { useColors } from "@/context/ThemeContext";

type Props = {
  isElite: boolean;
  isAuthenticated: boolean;
};

export function EliteBanner({ isElite, isAuthenticated }: Props) {
  const Colors = useColors();
  const styles = useMemo(() => makeStyles(Colors), [Colors]);

  if (isElite) {
    return (
      <Pressable
        style={({ pressed }) => [styles.banner, { opacity: pressed ? 0.88 : 1 }]}
        onPress={() => {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          router.push("/elite");
        }}
      >
        <LinearGradient
          colors={[Colors.accent, "#B8860B"]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.gradient}
        >
          <View style={styles.left}>
            <View style={styles.iconWrap}>
              <Feather name="star" size={20} color="#0D0D0D" />
            </View>
            <View>
              <Text style={styles.title}>You're Elite</Text>
              <Text style={styles.sub}>Manage your membership</Text>
            </View>
          </View>
          <Feather name="chevron-right" size={20} color="rgba(0,0,0,0.5)" />
        </LinearGradient>
      </Pressable>
    );
  }

  return (
    <Pressable
      style={({ pressed }) => [styles.banner, { opacity: pressed ? 0.88 : 1 }]}
      onPress={() => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        router.push("/elite");
      }}
    >
      <LinearGradient
        colors={["#1a1200", "#2a1d00"]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.gradient}
      >
        <View style={styles.left}>
          <View style={[styles.iconWrap, { backgroundColor: Colors.accent + "25", borderColor: Colors.accent + "50", borderWidth: 1 }]}>
            <Feather name="star" size={20} color={Colors.accent} />
          </View>
          <View>
            <Text style={[styles.title, { color: Colors.accent }]}>Go Elite</Text>
            <Text style={[styles.sub, { color: "rgba(255,215,0,0.6)" }]}>
              {isAuthenticated ? "£8.99/month · Cancel anytime" : "Log in to join · £8.99/month"}
            </Text>
          </View>
        </View>
        <View style={styles.cta}>
          <Text style={styles.ctaText}>Join</Text>
        </View>
      </LinearGradient>
    </Pressable>
  );
}

function makeStyles(Colors: ReturnType<typeof useColors>) {
  return StyleSheet.create({
    banner: {
      borderRadius: 16,
      overflow: "hidden",
      marginBottom: 28,
    },
    gradient: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      paddingHorizontal: 16,
      paddingVertical: 14,
    },
    left: {
      flexDirection: "row",
      alignItems: "center",
      gap: 12,
      flex: 1,
    },
    iconWrap: {
      width: 40,
      height: 40,
      borderRadius: 12,
      backgroundColor: "rgba(0,0,0,0.15)",
      alignItems: "center",
      justifyContent: "center",
    },
    title: {
      fontFamily: "Poppins_800ExtraBold",
      fontSize: 15,
      color: "#0D0D0D",
      lineHeight: 20,
    },
    sub: {
      fontFamily: "Inter_400Regular",
      fontSize: 12,
      color: "rgba(0,0,0,0.55)",
      marginTop: 1,
    },
    cta: {
      backgroundColor: Colors.accent,
      paddingHorizontal: 14,
      paddingVertical: 7,
      borderRadius: 20,
    },
    ctaText: {
      fontFamily: "Inter_700Bold",
      fontSize: 13,
      color: "#0D0D0D",
    },
  });
}
