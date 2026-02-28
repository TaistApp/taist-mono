import {StyleSheet} from 'react-native';
import { AppColors, Shadows, Spacing } from '../../../../constants/theme';


export const styles = StyleSheet.create({
  main: {
    flex: 1,
    backgroundColor: AppColors.background, // White background
  },
  pageView: {
    padding: Spacing.xl,
    alignItems: 'center',
    gap: Spacing.lg,
    width: '100%',
    paddingBottom: Spacing.xxl,
  },
  heading: {
    width: '100%',
    marginTop: Spacing.sm,
    marginBottom: Spacing.md,
  },
  backIcon: {
    width: 24,
    height: 24,
  },
  pageTitle: {
    fontSize: 28,
    fontWeight: '700',
    color: AppColors.text,
    textAlign: 'center',
    marginBottom: Spacing.lg,
  },
  
  // Card-like sections
  checkoutBlock: {
    width: '100%',
    backgroundColor: AppColors.surface, // Light gray card background
    borderRadius: 16,
    padding: Spacing.lg,
    marginBottom: Spacing.md,
    ...Shadows.sm,
  },
  checkoutSubheading: {
    fontSize: 18,
    fontWeight: '700',
    color: AppColors.text,
    marginBottom: Spacing.md,
    letterSpacing: 0.3,
  },
  checkoutText: {
    fontSize: 15,
    color: AppColors.textSecondary,
    marginBottom: Spacing.xs,
    lineHeight: 22,
  },
  
  // Date pills
  datePillRow: {
    flexDirection: 'row',
    gap: 8,
    paddingVertical: Spacing.xs,
    marginTop: Spacing.sm,
  },
  datePill: {
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 12,
    backgroundColor: AppColors.background,
    borderWidth: 1,
    borderColor: AppColors.border,
    minWidth: 56,
  },
  datePillSelected: {
    backgroundColor: AppColors.primary,
    borderColor: AppColors.primary,
  },
  datePillDisabled: {
    opacity: 0.35,
  },
  datePillDay: {
    fontSize: 12,
    fontWeight: '600',
    color: AppColors.textSecondary,
  },
  datePillNum: {
    fontSize: 16,
    fontWeight: '700',
    color: AppColors.text,
    marginTop: 2,
  },
  datePillTextSelected: {
    color: AppColors.textOnPrimary,
  },
  datePillTextDisabled: {
    color: AppColors.disabledText,
  },

  // Time pills
  timeLabel: {
    fontSize: 15,
    fontWeight: '600',
    color: AppColors.text,
    marginTop: Spacing.md,
    marginBottom: Spacing.sm,
  },
  timePillRow: {
    flexDirection: 'row',
    gap: 8,
    paddingVertical: Spacing.xs,
  },
  timePill: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: AppColors.background,
    ...Shadows.xs,
  },
  timePillSelected: {
    backgroundColor: AppColors.primary,
  },
  timePillText: {
    fontSize: 14,
    fontWeight: '600',
    color: AppColors.text,
  },
  timePillTextSelected: {
    color: AppColors.textOnPrimary,
  },
  noTimesText: {
    fontSize: 14,
    color: AppColors.textSecondary,
    fontStyle: 'italic',
    paddingVertical: Spacing.sm,
  },
  loadingTimesContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    paddingVertical: Spacing.sm,
  },
  loadingTimesText: {
    fontSize: 14,
    color: AppColors.textSecondary,
  },
  estimated: {
    fontSize: 13,
    fontWeight: '600',
    color: AppColors.textSecondary,
    marginTop: Spacing.md,
    fontStyle: 'italic',
  },
  
  // Order summary items
  checkoutSummaryItemWrapper: {
    width: '100%',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: Spacing.md,
    paddingVertical: Spacing.sm,
  },
  checkoutSummaryItemTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: AppColors.text,
  },
  checkoutSummaryItemAddon: {
    fontSize: 14,
    color: AppColors.textSecondary,
    marginTop: Spacing.xs,
  },
  checkoutSummaryItemPriceWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  
  // Address section
  checkoutAddressItemTitle: {
    fontSize: 15,
    color: AppColors.text,
    marginBottom: Spacing.xs,
    lineHeight: 22,
  },
  
  // Payment section
  checkoutPaymentItemWrapper: {
    width: '100%',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: Spacing.lg,
    paddingVertical: Spacing.md,
    borderBottomColor: AppColors.border,
    borderBottomWidth: 1,
  },
  checkoutApplianceItemTitle: {
    fontSize: 16,
    color: AppColors.text,
  },
  
  // Switch/Toggle section
  switchWrapper: {
    flexDirection: 'row',
    gap: Spacing.md,
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: Spacing.sm,
  },
  switchText: {
    flex: 1,
    fontSize: 15,
    color: AppColors.text,
    lineHeight: 22,
  },
  
  // Button section
  vcenter: {
    justifyContent: 'center',
    marginTop: Spacing.xl,
    marginBottom: Spacing.lg,
    width: '100%',
  },
  button: {
    borderRadius: 12,
    backgroundColor: AppColors.primary, // Orange button
    width: '100%',
    paddingVertical: 16,
    marginBottom: Spacing.sm,
    ...Shadows.md,
  },
  buttonText: {
    color: AppColors.textOnPrimary, // White text on orange
    fontSize: 16,
    fontWeight: '700',
    textAlign: 'center',
    letterSpacing: 0.5,
  },
  buttonDisabled: {
    borderRadius: 12,
    backgroundColor: AppColors.disabled,
    width: '100%',
    paddingVertical: 16,
    marginBottom: Spacing.sm,
  },
  cardStyle: {
    width: '100%',
    height: 100,
    borderRadius: 12,
  },
});
