import { BlurView } from "expo-blur";
import { isLiquidGlassAvailable } from "expo-glass-effect";
import { Tabs } from "expo-router";
import { Icon, Label, NativeTabs } from "expo-router/unstable-native-tabs";
import { SymbolView } from "expo-symbols";
import { Feather } from "@expo/vector-icons";
import React from "react";
import { Platform, StyleSheet, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useColors } from "@/context/ThemeContext";
import { useAuth } from "@/context/AuthContext";

function NativeTabLayout({ isAdmin }: { isAdmin: boolean }) {
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
      <NativeTabs.Trigger name="updates">
        <Icon sf={{ default: "megaphone", selected: "megaphone.fill" }} />
        <Label>Updates</Label>
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="community">
        <Icon sf={{ default: "person.2", selected: "person.2.fill" }} />
        <Label>Club</Label>
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="member">
        <Icon sf={{ default: "person.badge.shield.checkmark", selected: "person.badge.shield.checkmark.fill" }} />
        <Label>Member</Label>
      </NativeTabs.Trigger>
      {isAdmin && (
        <NativeTabs.Trigger name="admin">
          <Icon sf={{ default: "gearshape", selected: "gearshape.fill" }} />
          <Label>Admin</Label>
        </NativeTabs.Trigger>
      )}
    </NativeTabs>
  );
}

function ClassicTabLayout({ isAdmin }: { isAdmin: boolean }) {
  const isIOS = Platform.OS === "ios";
  const isWeb = Platform.OS === "web";
  const safeAreaInsets = useSafeAreaInsets();
  const Colors = useColors();

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: Colors.primary,
        tabBarInactiveTintColor: Colors.tabIconDefault,
        headerShown: false,
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
          title: "Home",
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
      <Tabs.Screen name="merch" options={{ href: null }} />
      <Tabs.Screen
        name="updates"
        options={{
          title: "Updates",
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
      <Tabs.Screen
        name="member"
        options={{
          title: "Member",
          tabBarIcon: ({ color }) =>
            isIOS ? <SymbolView name="person.circle" tintColor={color} size={22} /> : <Feather name="user" size={21} color={color} />,
        }}
      />
      <Tabs.Screen
        name="admin"
        options={
          isAdmin
            ? {
                title: "Admin",
                tabBarIcon: ({ color }) =>
                  isIOS ? <SymbolView name="gearshape" tintColor={color} size={22} /> : <Feather name="settings" size={21} color={color} />,
              }
            : { href: null }
        }
      />
    </Tabs>
  );
}

export default function TabLayout() {
  const { user } = useAuth();
  const isAdmin = user?.isAdmin === true;

  if (isLiquidGlassAvailable()) {
    return <NativeTabLayout isAdmin={isAdmin} />;
  }
  return <ClassicTabLayout isAdmin={isAdmin} />;
}
