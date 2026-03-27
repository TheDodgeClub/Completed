import { BlurView } from "expo-blur";
import { isLiquidGlassAvailable } from "expo-glass-effect";
import { Tabs } from "expo-router";
import { Icon, Label, NativeTabs } from "expo-router/unstable-native-tabs";
import { SymbolView } from "expo-symbols";
import { Feather } from "@expo/vector-icons";
import React from "react";
import { Alert, Platform, Pressable, StyleSheet, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useColors, useTheme } from "@/context/ThemeContext";
import { useAuth } from "@/context/AuthContext";
import { usePushNotifications } from "@/hooks/usePushNotifications";
import { useAnnouncements } from "@/hooks/useAnnouncements";
import * as Haptics from "expo-haptics";

function HeaderControls() {
  const { isDark, toggleTheme } = useTheme();
  const Colors = useColors();
  const { isAuthenticated } = useAuth();
  const { notificationsEnabled, toggleNotifications } = usePushNotifications(isAuthenticated);

  return (
    <View style={{ flexDirection: "row", gap: 4, marginRight: 12 }}>
      <Pressable
        style={{ padding: 8 }}
        onPress={async () => {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          const ok = await toggleNotifications(!notificationsEnabled);
          if (!notificationsEnabled && !ok) {
            Alert.alert(
              "Notifications Blocked",
              "Allow notifications in your device settings to receive Dodge Club alerts.",
            );
          }
        }}
      >
        <Feather
          name={notificationsEnabled ? "bell" : "bell-off"}
          size={18}
          color={notificationsEnabled ? Colors.accent : Colors.textMuted}
        />
      </Pressable>
      <Pressable
        style={{ padding: 8 }}
        onPress={() => {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          toggleTheme();
        }}
      >
        <Feather name={isDark ? "sun" : "moon"} size={18} color={Colors.textMuted} />
      </Pressable>
    </View>
  );
}

function NativeTabLayout() {
  return (
    <NativeTabs>
      <NativeTabs.Trigger name="index">
        <Icon sf={{ default: "house", selected: "house.fill" }} />
        <Label>Home</Label>
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="tickets">
        <Icon sf={{ default: "ticket", selected: "ticket.fill" }} />
        <Label>Tickets</Label>
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="member">
        <Icon sf={{ default: "person.badge.shield.checkmark", selected: "person.badge.shield.checkmark.fill" }} />
        <Label>Member</Label>
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="updates">
        <Icon sf={{ default: "megaphone", selected: "megaphone.fill" }} />
        <Label>Updates</Label>
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="community">
        <Icon sf={{ default: "person.2", selected: "person.2.fill" }} />
        <Label>Club</Label>
      </NativeTabs.Trigger>
    </NativeTabs>
  );
}

function ClassicTabLayout() {
  const isIOS = Platform.OS === "ios";
  const isWeb = Platform.OS === "web";
  const safeAreaInsets = useSafeAreaInsets();
  const Colors = useColors();
  const { isDark } = useTheme();
  const { unreadCount } = useAnnouncements();

  const headerControls = () => <HeaderControls />;

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: Colors.primary,
        tabBarInactiveTintColor: Colors.tabIconDefault,
        headerShown: true,
        headerRight: headerControls,
        headerStyle: { backgroundColor: Colors.surface },
        headerTintColor: Colors.text,
        headerShadowVisible: false,
        tabBarStyle: {
          position: "absolute",
          backgroundColor: isIOS ? "transparent" : Colors.surface,
          borderTopWidth: 1,
          borderTopColor: Colors.border,
          elevation: 0,
          paddingBottom: safeAreaInsets.bottom,
          ...(isWeb ? { height: 84 } : {}),
        },
        tabBarBackground: () =>
          isIOS ? (
            <BlurView intensity={80} tint="dark" style={StyleSheet.absoluteFill} />
          ) : isWeb ? (
            <View style={[StyleSheet.absoluteFill, { backgroundColor: Colors.surface }]} />
          ) : null,
        tabBarLabelStyle: { fontSize: 10 },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: "",
          headerTransparent: true,
          headerRight: headerControls,
          tabBarIcon: ({ color }) =>
            isIOS ? <SymbolView name="house" tintColor={color} size={22} /> : <Feather name="home" size={21} color={color} />,
        }}
      />
      <Tabs.Screen
        name="tickets"
        options={{
          title: "Tickets",
          tabBarIcon: ({ color }) =>
            isIOS ? <SymbolView name="ticket" tintColor={color} size={22} /> : <Feather name="tag" size={21} color={color} />,
        }}
      />
      <Tabs.Screen name="merch" options={{ href: null, headerShown: false }} />
      <Tabs.Screen
        name="member"
        options={{
          title: "Member",
          tabBarIcon: ({ color }) =>
            isIOS ? <SymbolView name="person.circle" tintColor={color} size={22} /> : <Feather name="user" size={21} color={color} />,
        }}
      />
      <Tabs.Screen
        name="updates"
        options={{
          title: "Updates",
          tabBarBadge: unreadCount > 0 ? (unreadCount > 9 ? "9+" : unreadCount) : undefined,
          tabBarBadgeStyle: { backgroundColor: Colors.primary, fontSize: 10 },
          tabBarIcon: ({ color }) =>
            isIOS ? <SymbolView name="megaphone" tintColor={color} size={22} /> : <Feather name="rss" size={21} color={color} />,
        }}
      />
      <Tabs.Screen
        name="community"
        options={{
          title: "Club",
          tabBarIcon: ({ color }) =>
            isIOS ? <SymbolView name="person.2" tintColor={color} size={22} /> : <Feather name="users" size={21} color={color} />,
        }}
      />
    </Tabs>
  );
}

export default function TabLayout() {
  if (isLiquidGlassAvailable()) {
    return <NativeTabLayout />;
  }
  return <ClassicTabLayout />;
}
