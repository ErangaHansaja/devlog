import { StyleSheet, Text, View } from 'react-native';

export default function NewLogScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Create New Log</Text>
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
