import React from 'react';
import { Platform, StyleSheet } from 'react-native';
import { Tabs } from 'expo-router/js-tabs';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function TabLayout() {
  const insets = useSafeAreaInsets();
  const bottomPadding = Math.max(insets.bottom, Platform.OS === 'android' ? 8 : 4);

  return (
    <Tabs
      screenOptions={{
        headerStyle: {
          backgroundColor: '#0e0e11',
          borderBottomColor: '#1f1f23',
          borderBottomWidth: 1,
        },
        headerTintColor: '#fafafa',
        tabBarStyle: {
          backgroundColor: '#0e0e11',
          borderTopColor: '#1f1f23',
          borderTopWidth: 1,
          height: 56 + bottomPadding,
          paddingBottom: bottomPadding,
          paddingTop: 6,
        },
        tabBarActiveTintColor: '#38bdf8',
        tabBarInactiveTintColor: '#71717a',
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: '500',
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Standup',
          headerShown: false,
          tabBarIcon: ({ color, focused }) => (
            <Ionicons
              name={focused ? 'today' : 'today-outline'}
              size={22}
              color={color}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="projects"
        options={{
          title: 'Projects',
          headerShown: false,
          tabBarIcon: ({ color, focused }) => (
            <Ionicons
              name={focused ? 'folder' : 'folder-outline'}
              size={22}
              color={color}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: 'Settings',
          headerShown: false,
          tabBarIcon: ({ color, focused }) => (
            <Ionicons
              name={focused ? 'settings' : 'settings-outline'}
              size={22}
              color={color}
            />
          ),
        }}
      />
    </Tabs>
  );
}
