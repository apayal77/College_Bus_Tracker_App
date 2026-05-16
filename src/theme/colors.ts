/**
 * Centralized color palette for CollegeBus Tracker
 * Used by both the RN Paper theme and raw StyleSheet styles.
 */

export const dark = {
  // ── Backgrounds ───────────────────────────────────────────────
  bg: '#0a1628',          // deepest background
  surface: '#1e293b',     // card / input surfaces
  surfaceVariant: '#0f172a', // slightly lighter than bg
  elevated: '#243044',    // elevated card surface

  // ── Borders ───────────────────────────────────────────────────
  border: '#334155',
  borderFaint: '#1e293b',

  // ── Brand / Accent ────────────────────────────────────────────
  primary: '#3b82f6',     // blue-500
  primaryDark: '#1d4ed8', // blue-700
  primaryLight: '#60a5fa',// blue-400
  secondary: '#8b5cf6',   // violet-500

  // ── Semantic ──────────────────────────────────────────────────
  success: '#4ade80',     // green-400
  warning: '#f59e0b',     // amber-500
  error: '#f87171',       // red-400
  errorDark: '#dc2626',   // red-600
  info: '#38bdf8',        // sky-400

  // ── Text ──────────────────────────────────────────────────────
  textPrimary: '#f1f5f9', // slate-100
  textSecondary: '#94a3b8', // slate-400
  textMuted: '#64748b',   // slate-500
  textOnPrimary: '#ffffff',

  // ── Role accents ──────────────────────────────────────────────
  student: '#3b82f6',
  driver: '#4ade80',
  admin: '#f59e0b',
};

export const light = {
  bg: '#f8fafc',
  surface: '#ffffff',
  surfaceVariant: '#f1f5f9',
  elevated: '#ffffff',

  border: '#e2e8f0',
  borderFaint: '#f1f5f9',

  primary: '#2563eb',
  primaryDark: '#1d4ed8',
  primaryLight: '#3b82f6',
  secondary: '#7c3aed',

  success: '#16a34a',
  warning: '#d97706',
  error: '#dc2626',
  errorDark: '#b91c1c',
  info: '#0284c7',

  textPrimary: '#0f172a',
  textSecondary: '#475569',
  textMuted: '#94a3b8',
  textOnPrimary: '#ffffff',

  student: '#2563eb',
  driver: '#16a34a',
  admin: '#d97706',
};

export type ColorPalette = typeof dark;
