import React, { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { Platform } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  UserProfile,
  login as apiLogin,
  register as apiRegister,
  logout as apiLogout,
  getMe,
  getToken,
} from "@/lib/api";

type AuthState = {
  user: UserProfile | null;
  token: string | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  justRegistered: boolean;
};

type AuthContextType = AuthState & {
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, name: string, accountType?: "player" | "supporter", referralCode?: string) => Promise<void>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
  clearJustRegistered: () => void;
};

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AuthState>({
    user: null,
    token: null,
    isLoading: true,
    isAuthenticated: false,
    justRegistered: false,
  });

  useEffect(() => {
    (async () => {
      try {
        const token = await getToken();
        if (token) {
          const user = await getMe();
          setState({ user, token, isLoading: false, isAuthenticated: true });
          return;
        }
        // On web, a user may have authenticated via Google OAuth which sets a
        // session cookie but stores no token in AsyncStorage.  Attempt a
        // session-cookie-based getMe() so those users aren't bounced to register.
        if (Platform.OS === "web") {
          try {
            const user = await getMe();
            setState({ user, token: null, isLoading: false, isAuthenticated: true, justRegistered: false });
            return;
          } catch {
            // No valid session cookie — fall through to unauthenticated state.
          }
        }
        setState(s => ({ ...s, isLoading: false }));
      } catch {
        await AsyncStorage.removeItem("dodge_club_auth_token");
        setState(s => ({ ...s, isLoading: false }));
      }
    })();
  }, []);

  const login = async (email: string, password: string) => {
    const data = await apiLogin(email, password);
    setState({ user: data.user, token: data.token, isLoading: false, isAuthenticated: true, justRegistered: false });
  };

  const register = async (email: string, password: string, name: string, accountType: "player" | "supporter" = "player", referralCode?: string) => {
    const data = await apiRegister(email, password, name, accountType, referralCode);
    setState({ user: data.user, token: data.token, isLoading: false, isAuthenticated: true, justRegistered: true });
  };

  const clearJustRegistered = () => {
    setState(s => ({ ...s, justRegistered: false }));
  };

  const logout = async () => {
    await apiLogout();
    setState({ user: null, token: null, isLoading: false, isAuthenticated: false, justRegistered: false });
  };

  const refreshUser = async () => {
    try {
      const user = await getMe();
      setState(s => ({ ...s, user }));
    } catch {}
  };

  return (
    <AuthContext.Provider value={{ ...state, login, register, logout, refreshUser, clearJustRegistered }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
