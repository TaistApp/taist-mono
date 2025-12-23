import { MD3LightTheme as DefaultTheme } from 'react-native-paper';

/**
 * Professional Color Palette
 * Primary: White backgrounds (clean, modern)
 * Secondary: Orange accents (brand color)
 * Neutral grays for hierarchy and depth
 */
export const AppColors = {
  // Primary colors
  primary: '#fa4616',           // Orange - for CTAs, accents, important actions
  primaryLight: '#ff6b40',      // Lighter orange for hover states
  primaryDark: '#c43512',       // Darker orange for pressed states

  // Background colors
  background: '#ffffff',        // White - main background
  surface: '#f5f5f5',          // Light gray - cards, elevated surfaces
  surfaceVariant: '#fafafa',   // Very light gray - subtle backgrounds

  // Text colors
  text: '#1a1a1a',             // Near black - primary text
  textSecondary: '#666666',    // Medium gray - secondary text
  textTertiary: '#999999',     // Light gray - tertiary text, hints
  textOnPrimary: '#ffffff',    // White text on orange backgrounds

  // Border and divider colors
  border: '#e0e0e0',           // Light gray - borders
  divider: '#f0f0f0',          // Very light gray - dividers

  // State colors
  disabled: '#f0f0f0',         // Very light gray - disabled backgrounds
  disabledText: '#999999',     // Light gray - disabled text

  // Semantic colors
  error: '#d32f2f',            // Red - errors, destructive actions
  success: '#388e3c',          // Green - success states
  warning: '#f57c00',          // Amber - warnings
  info: '#0288d1',             // Blue - informational

  // Legacy support (for gradual migration)
  orange: '#fa4616',           // Original primary orange
  white: '#ffffff',            // Original white
  black: '#000000',            // Original black
  red: '#ff3100',              // Original red accent
  backgroundSecondary: '#f5f5f5', // Secondary background (alias for surface)
};

/**
 * React Native Paper Theme Configuration
 * Configured for professional white primary, orange secondary design
 */
export const AppTheme = {
  ...DefaultTheme,
  colors: {
    ...DefaultTheme.colors,
    primary: AppColors.primary,               // Orange for buttons, CTAs
    primaryContainer: AppColors.primaryLight, // Lighter orange container
    secondary: AppColors.text,                // Dark text for secondary elements
    secondaryContainer: AppColors.surface,    // Light gray for secondary containers
    tertiary: AppColors.textSecondary,

    background: AppColors.background,         // White background
    surface: AppColors.surface,               // Light gray surface
    surfaceVariant: AppColors.surfaceVariant,
    surfaceDisabled: AppColors.disabled,

    error: AppColors.error,
    errorContainer: '#ffebee',

    onPrimary: AppColors.textOnPrimary,       // White text on orange
    onPrimaryContainer: AppColors.text,
    onSecondary: AppColors.text,
    onSecondaryContainer: AppColors.text,
    onSurface: AppColors.text,                // Dark text on light surfaces
    onSurfaceVariant: AppColors.textSecondary,
    onSurfaceDisabled: AppColors.disabledText,
    onError: '#ffffff',
    onErrorContainer: AppColors.error,
    onBackground: AppColors.text,

    outline: AppColors.border,
    outlineVariant: AppColors.divider,

    inverseSurface: AppColors.text,
    inverseOnSurface: AppColors.background,
    inversePrimary: AppColors.primaryLight,

    backdrop: 'rgba(0, 0, 0, 0.5)',

    // Custom additions
    elevation: {
      level0: 'transparent',
      level1: '#ffffff',
      level2: '#f9f9f9',
      level3: '#f5f5f5',
      level4: '#f0f0f0',
      level5: '#ebebeb',
    },
  },
  roundness: 10, // Consistent with existing border radius
};

/**
 * Font sizes - imported from existing utils/styles.ts
 * Keep consistent with current typography
 */
export const FontSize = {
  f10: 10,
  f11: 11,
  f12: 12,
  f13: 13,
  f14: 14,
  f15: 15,
  f16: 16,
  f17: 17,
  f18: 18,
  f19: 19,
  f20: 20,
  f22: 22,
  f24: 24,
  f25: 25,
  f30: 30,
};

/**
 * Spacing system for consistent padding/margins
 */
export const Spacing = {
  xs: 5,
  sm: 10,
  md: 15,
  lg: 20,
  xl: 30,
  xxl: 40,
};

/**
 * Shadow configurations for elevation
 */
export const Shadows = {
  xs: {
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 0.5 },
    shadowOpacity: 0.05,
    shadowRadius: 1,
    elevation: 1,
  },
  sm: {
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  md: {
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 4,
  },
  lg: {
    shadowColor: '#000000',
    shadowOffset: { width: 2.5, height: 2.5 },
    shadowOpacity: 0.2,
    shadowRadius: 5,
    elevation: 5,
  },
};

export default AppTheme;
