import type { FeatureStatus } from '../models';

/** Color palette design tokens for light and dark themes (Linear / Obsidian style). */
export const Colors = {
  dark: {
    background: '#09090b',
    surface: '#121215',
    card: '#121215',
    input: '#18181b',
    border: '#27272a',
    borderFocus: '#3f3f46',
    primary: '#fafafa',
    primaryHover: '#f4f4f5',
    accent: '#e4e4e7',
    secondary: '#71717a',
    text: '#fafafa',
    textMuted: '#71717a',
    emerald: '#10b981',
    violet: '#8b5cf6',
    amber: '#f59e0b',
    rose: '#f43f5e',
  },
  light: {
    background: '#ffffff',
    surface: '#f4f4f5',
    card: '#ffffff',
    input: '#f4f4f5',
    border: '#e4e4e7',
    borderFocus: '#a1a1aa',
    primary: '#18181b',
    primaryHover: '#27272a',
    accent: '#27272a',
    secondary: '#71717a',
    text: '#09090b',
    textMuted: '#71717a',
    emerald: '#059669',
    violet: '#7c3aed',
    amber: '#d97706',
    rose: '#e11d48',
  },
} as const;

/** Type representation of the dark theme color palette. */
export type ThemeColors = typeof Colors.dark;

/** Color values mapped to feature lifecycle statuses. */
export const FeatureStatusColors: Record<FeatureStatus, string> = {
  backlog: '#71717a',
  in_progress: '#f59e0b',
  completed: '#10b981',
};

/** Human-readable display labels for feature statuses. */
export const FeatureStatusLabels: Record<FeatureStatus, string> = {
  backlog: 'Backlog',
  in_progress: 'In Progress',
  completed: 'Completed',
};
