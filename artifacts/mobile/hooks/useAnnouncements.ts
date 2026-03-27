import { useState, useCallback, useEffect } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useQuery } from "@tanstack/react-query";
import { getAnnouncements, Announcement } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";

const SEEN_KEY = "dodge_club_last_seen_announcement";

export function useAnnouncements() {
  const { isAuthenticated } = useAuth();
  const [unreadCount, setUnreadCount] = useState(0);

  const { data: announcements = [], isLoading, refetch } = useQuery<Announcement[]>({
    queryKey: ["announcements"],
    queryFn: getAnnouncements,
    enabled: isAuthenticated,
    staleTime: 60_000,
  });

  useEffect(() => {
    if (!isAuthenticated || announcements.length === 0) {
      setUnreadCount(0);
      return;
    }
    AsyncStorage.getItem(SEEN_KEY).then(lastSeen => {
      if (!lastSeen) {
        setUnreadCount(announcements.length);
      } else {
        const lastSeenId = parseInt(lastSeen, 10);
        setUnreadCount(announcements.filter(a => a.id > lastSeenId).length);
      }
    }).catch(() => setUnreadCount(0));
  }, [announcements, isAuthenticated]);

  const markAllSeen = useCallback(async () => {
    if (announcements.length > 0) {
      await AsyncStorage.setItem(SEEN_KEY, String(announcements[0].id));
      setUnreadCount(0);
    }
  }, [announcements]);

  return { announcements, isLoading, refetch, markAllSeen, unreadCount };
}
