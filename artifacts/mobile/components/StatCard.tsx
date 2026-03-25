import React, { useMemo } from "react";
import { View, Text, StyleSheet } from "react-native";
import { useColors } from "@/context/ThemeContext";

type Props = {
  value: number | string;
  label: string;
  color?: string;
};

export function StatCard({ value, label, color }: Props) {
  const Colors = useColors();
  const styles = useMemo(() => makeStyles(Colors), [Colors]);
  const resolvedColor = color ?? Colors.primary;

  return (
    <View style={styles.card}>
      <Text style={[styles.value, { color: resolvedColor }]}>{value}</Text>
      <Text style={styles.label}>{label}</Text>
    </View>
  );
}

function makeStyles(Colors: ReturnType<typeof useColors>) {
  return StyleSheet.create({
    card: {
      flex: 1,
      backgroundColor: Colors.surface,
      borderRadius: 16,
      padding: 16,
      alignItems: "center",
      borderWidth: 1,
      borderColor: Colors.border,
    },
    value: {
      fontFamily: "Poppins_800ExtraBold",
      fontSize: 28,
      lineHeight: 34,
    },
    label: {
      fontFamily: "Inter_400Regular",
      fontSize: 12,
      color: Colors.textSecondary,
      textAlign: "center",
      marginTop: 2,
      textTransform: "uppercase",
      letterSpacing: 0.5,
    },
  });
}
