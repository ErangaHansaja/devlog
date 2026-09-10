import React from 'react';
import { StyleSheet, Text, View, type ViewProps } from 'react-native';

export interface CardProps extends ViewProps {
  title?: string;
  children?: React.ReactNode;
}

export function Card({ title, children, style, ...rest }: CardProps) {
  return (
    <View style={[styles.card, style]} {...rest}>
      {title ? <Text style={styles.title}>{title}</Text> : null}
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#1e1e1e',
    borderRadius: 8,
    padding: 16,
    marginVertical: 8,
  },
  title: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
  },
});
