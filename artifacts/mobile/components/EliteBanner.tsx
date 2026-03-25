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
        colors={["#3d2500", "#1f1200"]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        style={styles.gradient}
      >
        <View style={styles.left}>
          <View style={[styles.iconWrap, { backgroundColor: "#FFC10730", borderColor: "#FFC10780", borderWidth: 1.5 }]}>
            <Feather name="star" size={20} color="#FFC107" />
          </View>
          <View>
            <Text style={[styles.title, { color: "#FFC107", textShadowColor: "#FFDD6080", textShadowOffset: { width: 0, height: 0 }, textShadowRadius: 8 }]}>Go Elite</Text>
            <Text style={[styles.sub, { color: "rgba(255,193,7,0.65)" }]}>
              {isAuthenticated ? "£8.99/month · Cancel anytime" : "Log in to join · £8.99/month"}
            </Text>
          </View>
        </View>
        <View style={[styles.cta, { backgroundColor: "#FFC107", shadowColor: "#FFC107", shadowOpacity: 0.5, shadowOffset: { width: 0, height: 2 }, shadowRadius: 8, elevation: 4 }]}>
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
