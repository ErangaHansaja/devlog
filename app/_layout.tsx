import { useEffect } from 'react';
import { Platform } from 'react-native';
import { DarkTheme, ThemeProvider } from 'expo-router';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import * as NavigationBar from 'expo-navigation-bar';

export default function RootLayout() {
  useEffect(() => {
    if (Platform.OS === 'android') {
      if (typeof NavigationBar.setBackgroundColorAsync !== 'function') {
        (NavigationBar as any).setBackgroundColorAsync = async (color: string) => {
          try {
            const ExpoNavBar = require('expo-navigation-bar/build/ExpoNavigationBar').default;
            return await ExpoNavBar?.setBackgroundColorAsync?.(color);
          } catch {}
        };
      }
      if (typeof NavigationBar.setButtonStyleAsync !== 'function') {
        (NavigationBar as any).setButtonStyleAsync = async (style: 'light' | 'dark') => {
          try {
            const ExpoNavBar = require('expo-navigation-bar/build/ExpoNavigationBar').default;
            if (ExpoNavBar?.setButtonStyleAsync) {
              return await ExpoNavBar.setButtonStyleAsync(style);
            }
            if (typeof NavigationBar.setStyle === 'function') {
              NavigationBar.setStyle(style === 'light' ? 'dark' : 'light');
            }
          } catch {}
        };
      }

      NavigationBar.setBackgroundColorAsync('#09090b');
      NavigationBar.setButtonStyleAsync('light');
    }
  }, []);

  return (
    <ThemeProvider value={DarkTheme}>
      <Stack
        screenOptions={{
          headerStyle: {
            backgroundColor: '#09090b',
          },
          headerTintColor: '#fafafa',
          headerTitleStyle: {
            fontWeight: '600',
          },
          contentStyle: {
            backgroundColor: '#09090b',
          },
        }}
      >
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen
          name="log/[id]"
          options={{
            title: 'Log Detail',
          }}
        />
        <Stack.Screen
          name="log/new"
          options={{
            headerShown: false,
          }}
        />
        <Stack.Screen
          name="+not-found"
          options={{
            title: 'Not Found',
          }}
        />
      </Stack>
      <StatusBar style="light" />
    </ThemeProvider>
  );
}
