import { StyleSheet, Text, View } from 'react-native';

export default function StandupScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Standup / Today</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#121212',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
  },
  title: {
    color: '#ffffff',
    fontSize: 20,
    fontWeight: '600',
  },
});
