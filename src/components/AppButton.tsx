/**
 * AppButton — Paper-backed button with icon support and theme-aware variants.
 *
 * mode: 'contained' | 'outlined' | 'text' | 'elevated' | 'contained-tonal'
 * variant: 'primary' | 'success' | 'danger' | 'warning'
 */
import React from 'react';
import { StyleProp, ViewStyle } from 'react-native';
import { Button } from 'react-native-paper';
import { dark } from '../theme/colors';

type ButtonVariant = 'primary' | 'success' | 'danger' | 'warning';
type ButtonMode = 'contained' | 'outlined' | 'text' | 'elevated' | 'contained-tonal';

interface AppButtonProps {
  label: string;
  onPress: () => void;
  mode?: ButtonMode;
  variant?: ButtonVariant;
  icon?: string;
  loading?: boolean;
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
  contentStyle?: StyleProp<ViewStyle>;
  compact?: boolean;
}

const VARIANT_COLORS: Record<ButtonVariant, string> = {
  primary: dark.primary,
  success: dark.success,
  danger: dark.errorDark,
  warning: dark.warning,
};

export default function AppButton({
  label,
  onPress,
  mode = 'contained',
  variant = 'primary',
  icon,
  loading = false,
  disabled = false,
  style,
  contentStyle,
  compact = false,
}: AppButtonProps) {
  return (
    <Button
      mode={mode}
      onPress={onPress}
      icon={icon}
      loading={loading}
      disabled={disabled}
      compact={compact}
      buttonColor={mode === 'contained' ? VARIANT_COLORS[variant] : undefined}
      textColor={mode === 'contained' ? '#fff' : VARIANT_COLORS[variant]}
      style={[{ borderRadius: 10 }, style]}
      contentStyle={[{ paddingVertical: 4 }, contentStyle]}
      labelStyle={{ fontSize: 15, fontWeight: '700', letterSpacing: 0.3 }}>
      {label}
    </Button>
  );
}
