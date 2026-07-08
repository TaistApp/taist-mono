import {StyleSheet} from 'react-native';
import { AppColors, Spacing } from '../../../../constants/theme';


export const styles = StyleSheet.create({
  main: {
    flex: 1,
    backgroundColor: AppColors.background, // White background
  },
  pageView: {
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.md,
    gap: Spacing.md,
    width: '100%',
    // Extra bottom padding so content clears the sticky bottom bar
    paddingBottom: 120,
  },
  heading: {
    width: '100%',
    marginTop: Spacing.sm,
    marginBottom: Spacing.sm,
  },
  backIcon: {
    width: 24,
    height: 24,
  },
  pageTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: AppColors.text,
    marginBottom: Spacing.sm,
  },

  // Card section titles
  checkoutSubheading: {
    fontSize: 16,
    fontWeight: '600',
    color: AppColors.text,
    marginBottom: Spacing.sm,
  },
  checkoutText: {
    fontSize: 13,
    color: AppColors.textSecondary,
    marginBottom: Spacing.xs,
    lineHeight: 19,
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
    fontSize: 14,
    fontWeight: '600',
    color: AppColors.textSecondary,
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
    borderRadius: 999,
    backgroundColor: AppColors.background,
    borderWidth: 1,
    borderColor: AppColors.border,
  },
  timePillSelected: {
    backgroundColor: AppColors.primary,
    borderColor: AppColors.primary,
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
    color: AppColors.textSecondary,
    marginTop: Spacing.md,
    fontStyle: 'italic',
  },

  // Receipt / order summary rows
  receiptRow: {
    width: '100%',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: Spacing.md,
    paddingVertical: 7,
    borderTopWidth: 1,
    borderTopColor: AppColors.border,
  },
  receiptRowFirst: {
    borderTopWidth: 0,
  },
  receiptLabel: {
    fontSize: 14,
    color: AppColors.textSecondary,
  },
  receiptValue: {
    fontSize: 14,
    color: AppColors.textSecondary,
  },
  receiptDiscount: {
    color: AppColors.success,
  },
  receiptTotalRow: {
    width: '100%',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: Spacing.md,
    paddingTop: 10,
    marginTop: 2,
    borderTopWidth: 1,
    borderTopColor: AppColors.border,
  },
  receiptTotalLabel: {
    fontSize: 16,
    fontWeight: '700',
    color: AppColors.text,
  },
  receiptTotalValue: {
    fontSize: 16,
    fontWeight: '700',
    color: AppColors.primary,
  },

  // Order line items (used by orderItem.tsx)
  checkoutSummaryItemWrapper: {
    width: '100%',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: Spacing.md,
    paddingVertical: Spacing.sm,
  },
  checkoutSummaryItemTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: AppColors.text,
  },
  checkoutSummaryItemAddon: {
    fontSize: 13,
    color: AppColors.textSecondary,
    marginTop: Spacing.xs,
  },
  checkoutSummaryItemPriceWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  checkoutSummaryItemQty: {
    fontSize: 14,
    color: AppColors.textSecondary,
  },

  // Minimum-order notice
  minimumNotice: {
    backgroundColor: '#FEF3C7',
    borderRadius: 10,
    padding: 12,
    marginTop: 12,
  },
  minimumNoticeText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#92400E',
  },

  // Address section
  checkoutAddressItemTitle: {
    fontSize: 14,
    color: AppColors.text,
    marginBottom: Spacing.xs,
    lineHeight: 20,
  },
  addressDivider: {
    borderTopWidth: 1,
    borderTopColor: AppColors.border,
    paddingTop: 12,
    marginTop: 4,
  },
  addressEditRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  addressEditTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: AppColors.text,
  },
  addressEditAction: {
    fontSize: 14,
    fontWeight: '600',
    color: AppColors.primary,
  },

  // Payment section
  checkoutPaymentItemWrapper: {
    width: '100%',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: Spacing.lg,
    paddingVertical: Spacing.xs,
  },
  checkoutApplianceItemTitle: {
    fontSize: 15,
    color: AppColors.text,
  },

  // Switch/Toggle section
  switchWrapper: {
    flexDirection: 'row',
    gap: Spacing.md,
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  switchText: {
    flex: 1,
    fontSize: 14,
    color: AppColors.text,
    lineHeight: 20,
  },

  // Sticky bottom bar
  bottomBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.md,
    paddingBottom: Spacing.md,
    backgroundColor: AppColors.background,
    borderTopWidth: 1,
    borderTopColor: AppColors.border,
  },
  bottomBarTotalWrapper: {
    justifyContent: 'center',
  },
  bottomBarTotalLabel: {
    fontSize: 11,
    color: AppColors.textSecondary,
    marginBottom: 2,
  },
  bottomBarTotalValue: {
    fontSize: 18,
    fontWeight: '600',
    color: AppColors.text,
  },
  bottomBarButton: {
    flex: 1,
    minHeight: 52,
    paddingVertical: 16,
    borderRadius: 12,
    backgroundColor: AppColors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  bottomBarButtonDisabled: {
    backgroundColor: AppColors.disabled,
  },
  bottomBarButtonText: {
    color: AppColors.textOnPrimary,
    fontSize: 16,
    fontWeight: '600',
  },
  bottomBarButtonTextDisabled: {
    color: AppColors.disabledText,
  },
});
