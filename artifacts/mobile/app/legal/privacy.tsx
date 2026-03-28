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

const BUILT_IN_POLICY = `Last updated: January 2025

The Dodge Club ("we", "us", or "our") operates The Dodge Club mobile application. This Privacy Policy explains how we collect, use, and protect your personal information when you use our app and services.

1. WHO WE ARE

The Dodge Club is operated by The Dodge Club Ltd, based in the United Kingdom. We are the data controller for the personal information described in this policy. If you have any questions, contact us at privacy@thedodgeclub.co.uk.

2. INFORMATION WE COLLECT

Account information: When you register, we collect your name, email address, and a password. You may also optionally provide a profile photo and a short bio.

Usage data: We collect information about how you use the app, including events you attend, XP earned, achievements unlocked, and content you post in the community section.

Device information: We may collect your device type and operating system version to ensure the app works correctly on your device.

Push notification token: If you grant permission, we store a push notification token to send you event reminders and updates.

Location: If you grant permission, we use your approximate location to show nearby events. Location data is not stored on our servers.

3. HOW WE USE YOUR INFORMATION

We use your information to:
- Create and manage your account
- Process event ticket purchases
- Send event reminders and check-in confirmations
- Display your profile and player card to other members
- Administer the XP and achievements system
- Ensure the safety and security of our community
- Comply with our legal obligations

4. LEGAL BASIS FOR PROCESSING (UK GDPR)

We process your personal data under the following legal bases:
- Performance of a contract: to provide the services you signed up for
- Legitimate interests: to improve our app and ensure community safety
- Consent: for push notifications and optional location access
- Legal obligation: where required by law

5. DATA SHARING

We do not sell your personal data. We share your information only with:
- Stripe: to process ticket payments securely (Stripe's privacy policy applies to payment data)
- Cloud hosting providers: to store app data securely
- Law enforcement: only when required by law

6. DATA RETENTION

We retain your account data for as long as your account is active. You can delete your account at any time from the Profile section of the app, which will permanently remove your personal data from our systems within 30 days. Some data may be retained longer where required by law.

7. YOUR RIGHTS

Under UK GDPR, you have the right to:
- Access the personal data we hold about you
- Correct inaccurate data
- Request deletion of your data ("right to be forgotten")
- Restrict or object to processing
- Data portability

To exercise any of these rights, contact us at info@thedodgeclub.co.uk. You also have the right to complain to the Information Commissioner's Office (ICO) at ico.org.uk.

8. SECURITY

We use industry-standard security measures including encrypted connections (HTTPS) and hashed passwords to protect your data. No method of transmission over the internet is 100% secure, and we cannot guarantee absolute security.

9. CHILDREN

Our service is not directed at children under 13. If you believe a child has provided us with personal information, please contact us and we will delete it promptly.

10. CHANGES TO THIS POLICY

We may update this policy from time to time. We will notify you of significant changes through the app or by email. Continued use of the app after changes constitutes acceptance of the updated policy.

11. CONTACT US

For any privacy-related questions or requests:
Email: info@thedodgeclub.co.uk
Website: thedodgeclub.co.uk`;

export default function PrivacyPolicyScreen() {
  const Colors = useColors();
  const styles = makeStyles(Colors);

  const { data: settings, isLoading } = useQuery({
    queryKey: ["app-settings"],
    queryFn: getAppSettings,
    staleTime: 5 * 60 * 1000,
  });

  const policyContent = settings?.privacyPolicyContent || BUILT_IN_POLICY;

  return (
    <SafeAreaView style={styles.container} edges={["top", "bottom"]}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.backBtn} hitSlop={12}>
          <Feather name="arrow-left" size={22} color={Colors.text} />
        </Pressable>
        <Text style={styles.title}>Privacy Policy</Text>
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
          <Text style={styles.content}>{policyContent}</Text>
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
  });
}
