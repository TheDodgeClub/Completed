import React, { createContext, useContext, useState, useEffect, ReactNode } from "react";
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
};

type AuthContextType = AuthState & {
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, name: string) => Promise<void>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
};

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AuthState>({
    user: null,
    token: null,
    isLoading: true,
    isAuthenticated: false,
  });

  useEffect(() => {
    (async () => {
      try {
        const token = await getToken();
        if (token) {
          const user = await getMe();
          setState({ user, token, isLoading: false, isAuthenticated: true });
        } else {
          setState(s => ({ ...s, isLoading: false }));
        }
      } catch {
        await AsyncStorage.removeItem("dodge_club_auth_token");
        setState(s => ({ ...s, isLoading: false }));
      }
    })();
  }, []);

  const login = async (email: string, password: string) => {
    const data = await apiLogin(email, password);
    setState({ user: data.user, token: data.token, isLoading: false, isAuthenticated: true });
  };

  const register = async (email: string, password: string, name: string) => {
    const data = await apiRegister(email, password, name);
    setState({ user: data.user, token: data.token, isLoading: false, isAuthenticated: true });
  };

  const logout = async () => {
    await apiLogout();
    setState({ user: null, token: null, isLoading: false, isAuthenticated: false });
  };

  const refreshUser = async () => {
    try {
      const user = await getMe();
      setState(s => ({ ...s, user }));
    } catch {}
  };

  return (
    <AuthContext.Provider value={{ ...state, login, register, logout, refreshUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
