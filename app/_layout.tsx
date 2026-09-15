import { useEffect } from 'react';
import { Platform } from 'react-native';
import { DarkTheme, ThemeProvider } from 'expo-router';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { NavigationBar } from 'expo-navigation-bar';

export default function RootLayout() {
  useEffect(() => {
    if (Platform.OS === 'android') {
      try {
        if (typeof NavigationBar.setStyle === 'function') {
          NavigationBar.setStyle('light');
        }
      } catch {
        // Safe fallback in environments where native module is unavailable
      }
    }
  }, []);

  return (
    <ThemeProvider value={DarkTheme}>
      <NavigationBar style="light" />
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
