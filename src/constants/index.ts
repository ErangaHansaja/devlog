import type { FeatureStatus } from '../models';

/** Color palette design tokens for light and dark themes. */
export const Colors = {
  dark: {
    background: '#121212',
    surface: '#1e1e1e',
    card: '#27272a',
    primary: '#38bdf8',
    secondary: '#818cf8',
    text: '#f3f4f6',
    textMuted: '#9ca3af',
    border: '#27272a',
  },
  light: {
    background: '#ffffff',
    surface: '#f3f4f6',
    card: '#ffffff',
    primary: '#0284c7',
    secondary: '#6366f1',
    text: '#111827',
    textMuted: '#6b7280',
    border: '#e5e7eb',
  },
} as const;

/** Type representation of the dark theme color palette. */
export type ThemeColors = typeof Colors.dark;

/** Color values mapped to feature lifecycle statuses. */
export const FeatureStatusColors: Record<FeatureStatus, string> = {
  backlog: '#6b7280',
  in_progress: '#f59e0b',
  completed: '#22c55e',
};

/** Human-readable display labels for feature statuses. */
export const FeatureStatusLabels: Record<FeatureStatus, string> = {
  backlog: 'Backlog',
  in_progress: 'In Progress',
  completed: 'Completed',
};
