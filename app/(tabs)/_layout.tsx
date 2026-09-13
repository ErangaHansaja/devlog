import { Tabs } from 'expo-router/js-tabs';

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        headerStyle: {
          backgroundColor: '#121212',
        },
        headerTintColor: '#ffffff',
        tabBarStyle: {
          backgroundColor: '#0f172a',
          borderTopColor: '#1e293b',
        },
        tabBarActiveTintColor: '#38bdf8',
        tabBarInactiveTintColor: '#94a3b8',
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Standup',
          headerShown: false,
        }}
      />
      <Tabs.Screen
        name="projects"
        options={{
          title: 'Projects',
          headerShown: false,
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: 'Settings',
          headerTitle: 'Settings',
        }}
      />
    </Tabs>
  );
}
