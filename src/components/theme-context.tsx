"use client";

import type React from "react";
import { createContext, useContext, useEffect } from "react";

export interface ThemeTokens {
  colorPrimary: string;
  colorSuccess: string;
  colorWarning: string;
  colorError: string;
  colorInfo: string;
  colorTextBase: string;
  colorTextSecondary: string;
  colorBgContainer: string;
  colorBgLayout: string;
  colorBorder: string;
  labelBg: string;
  fontSizeBase: number;
  fontFamily: string;
  borderRadius: number;
}

interface ThemeContextType {
  tokens: ThemeTokens;
  isDark?: boolean;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

const tokens: ThemeTokens = {
  colorPrimary: "#007bff",
  colorSuccess: "#28a745",
  colorWarning: "#faad14",
  colorError: "#dc3545",
  colorInfo: "#17a2b8",
  colorBorder: "#c4cdd5",
  colorTextBase: "#212b35",
  colorTextSecondary: "#6b7280",
  colorBgContainer: "#ffffff",
  colorBgLayout: "#f4f6f8",
  labelBg: "#f3f4fa",
  fontSizeBase: 14,
  fontFamily:
    "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif",
  borderRadius: 3,
};

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    const root = document.documentElement;
    Object.entries(tokens).forEach(([key, value]) => {
      const cssKey = key.replace(/([A-Z])/g, "-$1").toLowerCase();
      root.style.setProperty(`--${cssKey}`, value.toString());
    });
  }, []);

  return (
    <ThemeContext.Provider value={{ tokens, isDark: false }}>{children}</ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error("useTheme must be used within a ThemeProvider");
  }
  return context;
}
