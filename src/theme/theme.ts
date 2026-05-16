import { MD3DarkTheme, MD3LightTheme, MD3Theme } from 'react-native-paper';
import { dark, light } from './colors';

export const AppDarkTheme: MD3Theme = {
  ...MD3DarkTheme,
  dark: true,
  colors: {
    ...MD3DarkTheme.colors,
    primary: dark.primary,
    primaryContainer: dark.primaryDark,
    secondary: dark.secondary,
    background: dark.bg,
    surface: dark.surface,
    surfaceVariant: dark.elevated,
    onBackground: dark.textPrimary,
    onSurface: dark.textPrimary,
    onSurfaceVariant: dark.textSecondary,
    outline: dark.border,
    error: dark.error,
    onError: dark.textOnPrimary,
    elevation: {
      ...MD3DarkTheme.colors.elevation,
      level0: 'transparent',
      level1: dark.surface,
      level2: dark.elevated,
      level3: '#2d3f56',
      level4: '#304560',
      level5: '#354d6a',
    },
  },
};

export const AppLightTheme: MD3Theme = {
  ...MD3LightTheme,
  dark: false,
  colors: {
    ...MD3LightTheme.colors,
    primary: light.primary,
    primaryContainer: light.primaryLight,
    secondary: light.secondary,
    background: light.bg,
    surface: light.surface,
    surfaceVariant: light.surfaceVariant,
    onBackground: light.textPrimary,
    onSurface: light.textPrimary,
    onSurfaceVariant: light.textSecondary,
    outline: light.border,
    error: light.error,
    onError: light.textOnPrimary,
  },
};

// Default export — the app ships in dark mode
export default AppDarkTheme;
