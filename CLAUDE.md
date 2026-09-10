@AGENTS.md

# DevLog

DevLog is a developer daily standup and log tracking mobile application built with **Expo SDK 57**, **React Native 0.86**, **React 19**, and **TypeScript**.

## Architecture & Project Structure

The project uses **Expo Router v57** file-based routing alongside a modular `src/` architecture:

```
devlog/
├── app/
│   ├── _layout.tsx                 # Root layout (Stack with dark theme)
│   ├── (tabs)/
│   │   ├── _layout.tsx             # Tabs layout (Bottom tab bar)
│   │   ├── index.tsx               # Standup / Today tab
│   │   ├── projects.tsx            # Projects tab
│   │   └── settings.tsx            # Settings tab
│   ├── log/
│   │   ├── [id].tsx                # Log detail screen
│   │   └── new.tsx                 # Create new log screen
│   └── +not-found.tsx              # Unmatched route fallback
│
├── src/
│   ├── api/                        # API clients (e.g., Gemini API client)
│   ├── components/                 # Reusable UI widgets
│   ├── services/                   # Storage (AsyncStorage) & business logic
│   ├── hooks/                      # Custom React hooks
│   ├── models/                     # TypeScript interfaces and data models
│   ├── validation/                 # Input validation and schema definitions
│   ├── constants/                  # Color tokens and design constants
│   └── utils/                      # Date/string formatting & helper utilities
│
├── assets/                         # Static app icons and images
├── app.json                        # Expo application config
├── tsconfig.json                   # TypeScript configuration (extends expo/tsconfig.base)
└── package.json                    # Project dependencies and scripts
```

## Key Commands

- **Start Dev Server**: `npm start` or `npx expo start`
- **Run on Android**: `npm run android`
- **Run on iOS**: `npm run ios`
- **Run on Web**: `npm run web`
- **TypeScript Typecheck**: `npx tsc --noEmit`

## Styling & Design System

- **Default Theme**: Dark theme (`#121212` root background, `#1e1e1e` card/surface, `#38bdf8` accent/primary).
- **Navigation Theming**: Styled at `app/_layout.tsx` (Root Stack) and `app/(tabs)/_layout.tsx` (Tabs).
- **Theme Constants**: Centralized in `src/constants/index.ts`.

## Guidelines

- Refer to the exact Expo SDK 57 documentation at [https://docs.expo.dev/versions/v57.0.0/](https://docs.expo.dev/versions/v57.0.0/).
- Keep entry point configured as `"main": "expo-router/entry"` in `package.json`.
- All screen components under `app/` should have default exports.
- Maintain type safety and verify with `npx tsc --noEmit` on every change.
