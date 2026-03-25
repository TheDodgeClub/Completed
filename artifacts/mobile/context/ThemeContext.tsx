import React, { createContext, useContext, useState, useEffect } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";

export const darkColors = {
  primary: "#0B5E2F",
  secondary: "#1A8C4E",
  background: "#0D0D0D",
  accent: "#FFC107",
  surface: "#1A1A1A",
  surface2: "#242424",
  border: "#2E2E2E",
  text: "#FFFFFF",
  textSecondary: "#A0A0A0",
  textMuted: "#666666",
  success: "#22C55E",
  warning: "#F59E0B",
  error: "#D97706",
  tabIconDefault: "#666666",
  tabIconSelected: "#0B5E2F",
  tint: "#0B5E2F",
};

export const lightColors = {
  primary: "#0B5E2F",
  secondary: "#1A8C4E",
  background: "#F2F5F2",
  accent: "#E09B00",
  surface: "#FFFFFF",
  surface2: "#EAEEEA",
  border: "#CCCCCC",
  text: "#111111",
  textSecondary: "#555555",
  textMuted: "#888888",
  success: "#16A34A",
  warning: "#D97706",
  error: "#DC2626",
  tabIconDefault: "#888888",
  tabIconSelected: "#0B5E2F",
  tint: "#0B5E2F",
};

export type AppColors = typeof darkColors;

interface ThemeContextType {
  isDark: boolean;
  toggleTheme: () => void;
  colors: AppColors;
}

const ThemeContext = createContext<ThemeContextType>({
  isDark: true,
  toggleTheme: () => {},
  colors: darkColors,
});

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [isDark, setIsDark] = useState(true);

  useEffect(() => {
    AsyncStorage.getItem("dc_theme").then(val => {
      if (val === "light") setIsDark(false);
    });
  }, []);

  const toggleTheme = () => {
    setIsDark(d => {
      const next = !d;
      AsyncStorage.setItem("dc_theme", next ? "dark" : "light");
      return next;
    });
  };

  return (
    <ThemeContext.Provider value={{ isDark, toggleTheme, colors: isDark ? darkColors : lightColors }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  return useContext(ThemeContext);
}

export function useColors(): AppColors {
  return useContext(ThemeContext).colors;
}
