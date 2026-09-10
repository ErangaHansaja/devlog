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

export type ThemeColors = typeof Colors.dark;
