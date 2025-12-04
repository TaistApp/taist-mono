import React from 'react';
import { View, Text, StyleSheet, ScrollView, KeyboardAvoidingView, Platform } from 'react-native';
import { AppColors, Spacing } from '../../../../../constants/theme';

interface MenuItemStepContainerProps {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  currentStep?: number;
  totalSteps?: number;
}

export const MenuItemStepContainer: React.FC<MenuItemStepContainerProps> = ({
  title,
  subtitle,
  children,
  currentStep,
  totalSteps = 7,
}) => {
  // Generate progress dots
  const renderProgressDots = () => {
    if (!currentStep) return null;
    
    return (
      <View style={styles.progressContainer}>
        <Text style={styles.progressText}>
          {Array.from({ length: totalSteps }, (_, i) => i < currentStep ? '●' : '○').join('')}
          {' '}
          {currentStep}/{totalSteps}
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





