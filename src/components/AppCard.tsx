/**
 * AppCard — Paper Surface-backed card with optional accent border and icon badge.
 */
import React, { ReactNode } from 'react';
import { View, StyleSheet, StyleProp, ViewStyle } from 'react-native';
import { Surface } from 'react-native-paper';
import { dark } from '../theme/colors';

interface AppCardProps {
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
  accentColor?: string;         // left-border accent colour
  accentWidth?: number;
  elevation?: 0 | 1 | 2 | 3 | 4 | 5;
}

export default function AppCard({
  children,
  style,
  accentColor,
  accentWidth = 4,
  elevation = 1,
}: AppCardProps) {
  return (
    <Surface
      style={[
        styles.card,
        accentColor && {
          borderLeftColor: accentColor,
          borderLeftWidth: accentWidth,
        },
        style,
      ]}
      elevation={elevation}>
      {children}
    </Surface>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 14,
    padding: 16,
    marginBottom: 14,
    backgroundColor: dark.surface,
  },
});
