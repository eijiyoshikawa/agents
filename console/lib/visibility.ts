import config from "@/config/visibility.json";

export type VisibilityEntry = { label?: string; visible: boolean; adminOnly?: boolean };
export type VisibilityConfig = typeof config;

export const visibilityConfig = config as VisibilityConfig;

/** Server-side: tells whether a given page/section is visible at all (not admin-only or admin-only). */
export function getDefaultVisibility(): VisibilityConfig {
  return visibilityConfig;
}
