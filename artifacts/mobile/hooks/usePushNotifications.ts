import { useState, useEffect, useRef, useCallback } from "react";
import * as Notifications from "expo-notifications";
import { Platform } from "react-native";
import { savePushToken, setNotificationsEnabled, getNotificationStatus } from "@/lib/api";

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

async function registerForPushNotifications(): Promise<string | null> {
  if (Platform.OS === "web") return null;

  if (Platform.OS === "android") {
    await Notifications.setNotificationChannelAsync("default", {
      name: "Default",
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: "#0B5E2F",
    });
  }

  const { status: existing } = await Notifications.getPermissionsAsync();
  let finalStatus = existing;

  if (existing !== "granted") {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }

  if (finalStatus !== "granted") {
    return null;
  }

  const token = await Notifications.getExpoPushTokenAsync();
  return token.data;
}

export function usePushNotifications(isLoggedIn: boolean) {
  const [notificationsEnabled, setEnabled] = useState(false);
  const [loading, setLoading] = useState(false);
  const [initializing, setInitializing] = useState(true);
  const notificationListener = useRef<Notifications.EventSubscription | null>(null);
  const responseListener = useRef<Notifications.EventSubscription | null>(null);

  useEffect(() => {
    if (!isLoggedIn) {
      setInitializing(false);
      return;
    }

    (async () => {
      try {
        const status = await getNotificationStatus();
        setEnabled(status.notificationsEnabled);
      } catch {
        // not critical
      } finally {
        setInitializing(false);
      }
    })();

    notificationListener.current = Notifications.addNotificationReceivedListener(() => {});
    responseListener.current = Notifications.addNotificationResponseReceivedListener(() => {});

    return () => {
      notificationListener.current?.remove();
      responseListener.current?.remove();
    };
  }, [isLoggedIn]);

  const toggleNotifications = useCallback(async (enable: boolean) => {
    if (loading) return;
    setLoading(true);
    try {
      if (enable) {
        const token = await registerForPushNotifications();
        if (!token) {
          setLoading(false);
          return false;
        }
        await savePushToken(token);
        await setNotificationsEnabled(true);
        setEnabled(true);
        return true;
      } else {
        await setNotificationsEnabled(false);
        setEnabled(false);
        return true;
      }
    } catch {
      return false;
    } finally {
      setLoading(false);
    }
  }, [loading]);

  return { notificationsEnabled, toggleNotifications, loading, initializing };
}
