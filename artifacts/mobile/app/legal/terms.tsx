import React from "react";
import {
  View,
  Text,
  ScrollView,
  Pressable,
  ActivityIndicator,
  StyleSheet,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";
import { Feather } from "@expo/vector-icons";
import { useQuery } from "@tanstack/react-query";
import { useColors } from "@/context/ThemeContext";
import { getAppSettings } from "@/lib/api";

export default function TermsOfServiceScreen() {
  const Colors = useColors();
  const styles = makeStyles(Colors);

  const { data: settings, isLoading } = useQuery({
    queryKey: ["app-settings"],
    queryFn: getAppSettings,
    staleTime: 5 * 60 * 1000,
  });

  return (
    <SafeAreaView style={styles.container} edges={["top", "bottom"]}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.backBtn} hitSlop={12}>
          <Feather name="arrow-left" size={22} color={Colors.text} />
        </Pressable>
        <Text style={styles.title}>Terms of Service</Text>
        <View style={{ width: 46 }} />
      </View>

      {isLoading ? (
        <View style={styles.loading}>
          <ActivityIndicator color={Colors.primary} />
        </View>
      ) : (
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.body}
          showsVerticalScrollIndicator={false}
        >
          {settings?.termsOfService ? (
            <Text style={styles.content}>{settings.termsOfService}</Text>
          ) : (
            <View style={styles.placeholder}>
              <Feather name="file-text" size={40} color={Colors.textMuted} />
              <Text style={styles.placeholderTitle}>Terms of service coming soon</Text>
              <Text style={styles.placeholderText}>
                Our full terms of service are being finalised and will be published here shortly.
              </Text>
            </View>
          )}
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

function makeStyles(Colors: ReturnType<typeof useColors>) {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: Colors.background },
    header: {
      flexDirection: "row",
      alignItems: "center",
      paddingHorizontal: 16,
      paddingVertical: 14,
      borderBottomWidth: 1,
      borderBottomColor: Colors.border,
    },
    backBtn: { padding: 8 },
    title: { flex: 1, textAlign: "center", fontFamily: "Inter_700Bold", fontSize: 17, color: Colors.text },
    loading: { flex: 1, alignItems: "center", justifyContent: "center" },
    scroll: { flex: 1 },
    body: { padding: 20, paddingBottom: 40 },
    content: { fontFamily: "Inter_400Regular", fontSize: 14, color: Colors.textMuted, lineHeight: 22 },
    placeholder: { flex: 1, alignItems: "center", paddingTop: 60, gap: 14 },
    placeholderTitle: { fontFamily: "Inter_600SemiBold", fontSize: 17, color: Colors.text },
    placeholderText: { fontFamily: "Inter_400Regular", fontSize: 14, color: Colors.textMuted, textAlign: "center", lineHeight: 20, maxWidth: 280 },
  });
}
