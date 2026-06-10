"use client";
import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import config from "@/config/visibility.json";

type Theme = "light" | "dark" | "system";
type Overrides = Record<string, { visible: boolean }>;

type Ctx = {
  theme: Theme;
  effectiveTheme: "light" | "dark";
  setTheme: (t: Theme) => void;
  isAdmin: boolean;
  enterAdmin: (pass: string) => boolean;
  exitAdmin: () => void;
  overrides: Overrides;
  setOverride: (key: string, visible: boolean) => void;
  resetOverrides: () => void;
  isVisible: (key: string, opts?: { adminContext?: boolean }) => boolean;
};

const ConsoleCtx = createContext<Ctx | null>(null);

const ADMIN_KEY = "console.admin";
const THEME_KEY = "console.theme";
const OVR_KEY = "console.visibility.overrides";

function readSystemDark(): boolean {
  if (typeof window === "undefined") return false;
  return window.matchMedia?.("(prefers-color-scheme: dark)").matches ?? false;
}

export function ConsoleProviders({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState<Theme>("system");
  const [systemDark, setSystemDark] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [overrides, setOverrides] = useState<Overrides>({});

  // Hydrate from localStorage on mount
  useEffect(() => {
    try {
      const t = localStorage.getItem(THEME_KEY) as Theme | null;
      if (t === "light" || t === "dark" || t === "system") setThemeState(t);
      setIsAdmin(localStorage.getItem(ADMIN_KEY) === "1");
      const raw = localStorage.getItem(OVR_KEY);
      if (raw) setOverrides(JSON.parse(raw));
      setSystemDark(readSystemDark());
      const mq = window.matchMedia("(prefers-color-scheme: dark)");
      const onChange = () => setSystemDark(mq.matches);
      mq.addEventListener?.("change", onChange);
      return () => mq.removeEventListener?.("change", onChange);
    } catch {}
  }, []);

  const effectiveTheme: "light" | "dark" = theme === "system" ? (systemDark ? "dark" : "light") : theme;

  // Apply theme to <html>
  useEffect(() => {
    const root = document.documentElement;
    if (effectiveTheme === "dark") root.classList.add("dark");
    else root.classList.remove("dark");
  }, [effectiveTheme]);

  const setTheme = (t: Theme) => {
    setThemeState(t);
    try { localStorage.setItem(THEME_KEY, t); } catch {}
  };

  const enterAdmin = (pass: string) => {
    const ok = pass === (config as { defaultPassphrase: string }).defaultPassphrase;
    if (ok) {
      setIsAdmin(true);
      try { localStorage.setItem(ADMIN_KEY, "1"); } catch {}
    }
    return ok;
  };
  const exitAdmin = () => {
    setIsAdmin(false);
    try { localStorage.removeItem(ADMIN_KEY); } catch {}
  };

  const setOverride = (key: string, visible: boolean) => {
    setOverrides((prev) => {
      const next = { ...prev, [key]: { visible } };
      try { localStorage.setItem(OVR_KEY, JSON.stringify(next)); } catch {}
      return next;
    });
  };
  const resetOverrides = () => {
    setOverrides({});
    try { localStorage.removeItem(OVR_KEY); } catch {}
  };

  const isVisible: Ctx["isVisible"] = (key, opts) => {
    const adminContext = opts?.adminContext ?? false;
    // Override has highest priority
    if (key in overrides) return overrides[key].visible;
    // Look up in config
    const all: Record<string, { visible: boolean; adminOnly?: boolean }> = {
      ...(config.pages as Record<string, { visible: boolean; adminOnly?: boolean }>),
      ...(config.sections as Record<string, { visible: boolean; adminOnly?: boolean }>),
    };
    const entry = all[key];
    if (!entry) return true; // unknown → visible by default
    if (entry.adminOnly && !isAdmin && !adminContext) return false;
    return entry.visible;
  };

  const value = useMemo<Ctx>(
    () => ({ theme, effectiveTheme, setTheme, isAdmin, enterAdmin, exitAdmin, overrides, setOverride, resetOverrides, isVisible }),
    [theme, effectiveTheme, isAdmin, overrides]
  );

  return <ConsoleCtx.Provider value={value}>{children}</ConsoleCtx.Provider>;
}

export function useConsole() {
  const ctx = useContext(ConsoleCtx);
  if (!ctx) throw new Error("useConsole must be used within ConsoleProviders");
  return ctx;
}
