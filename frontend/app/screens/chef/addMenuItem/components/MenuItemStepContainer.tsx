import React, { useContext } from 'react';
import { View, Text, StyleSheet, ScrollView, KeyboardAvoidingView, Platform } from 'react-native';
import { AppColors, Spacing } from '../../../../../constants/theme';

interface MenuItemStepContainerProps {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  currentStep?: number;
  totalSteps?: number;
}

// Lets the wizard override each step's progress numbers, so the same step
// components show the right count whether the flow is 8 steps (standard) or
// 9 steps (meal prep). A provided value of `undefined` hides the dots
// entirely (used in edit mode). When there's no provider, the step's own
// props are used.
export const MenuWizardStepContext = React.createContext<
  { currentStep?: number; totalSteps?: number } | null
>(null);

export const MenuItemStepContainer: React.FC<MenuItemStepContainerProps> = ({
  title,
  subtitle,
  children,
  currentStep,
  totalSteps = 7,
}) => {
  const ctx = useContext(MenuWizardStepContext);
  const effectiveStep = ctx ? ctx.currentStep : currentStep;
  const effectiveTotal = ctx ? (ctx.totalSteps ?? 8) : totalSteps;

  // Generate progress dots
  const renderProgressDots = () => {
    if (!effectiveStep) return null;

    return (
      <View style={styles.progressContainer}>
        <Text style={styles.progressText}>
          {Array.from({ length: effectiveTotal }, (_, i) => i < effectiveStep ? '●' : '○').join('')}
          {' '}
          {effectiveStep}/{effectiveTotal}
        </Text>
      </View>
    );
  };

  return (
    <KeyboardAvoidingView 
      style={styles.container} 
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
    >
      <ScrollView 
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {renderProgressDots()}
        <View style={styles.header}>
          <Text style={styles.title}>{title}</Text>
          {subtitle && <Text style={styles.subtitle}>{subtitle}</Text>}
        </View>
        <View style={styles.content}>
          {children}
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: Spacing.xl,
    paddingTop: Spacing.lg,
    paddingBottom: Spacing.xl,
  },
  progressContainer: {
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  progressText: {
    fontSize: 14,
    color: AppColors.textSecondary,
    letterSpacing: 2,
  },
  header: {
    marginBottom: Spacing.xl,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: AppColors.text,
    marginBottom: Spacing.xs,
  },
  subtitle: {
    fontSize: 15,
    color: AppColors.textSecondary,
    lineHeight: 22,
  },
  content: {
    gap: Spacing.lg,
  },
});











