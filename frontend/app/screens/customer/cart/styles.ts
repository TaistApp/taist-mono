import { StyleSheet } from 'react-native';
import { AppColors, Shadows, Spacing } from '../../../../constants/theme';

export const styles = StyleSheet.create({
  main: {
    flex: 1,
    backgroundColor: AppColors.background,
  },
  pageView: {
    padding: Spacing.lg,
    gap: Spacing.lg,
  },
  chefSection: {
    backgroundColor: AppColors.surface,
    borderRadius: 12,
    padding: Spacing.md,
    ...Shadows.sm,
    gap: Spacing.md,
  },
  chefHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingBottom: Spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: AppColors.border,
  },
  chefInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  chefImage: {
    width: 40,
    height: 40,
    borderRadius: 20,
  },
  chefName: {
    fontSize: 18,
    fontWeight: '700',
    color: AppColors.text,
  },
  clearButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    padding: Spacing.xs,
  },
  clearButtonText: {
    color: '#fa4616',
    fontSize: 14,
    fontWeight: '600',
  },
  cartItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: Spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: AppColors.border,
  },
  itemInfo: {
    flex: 1,
    gap: Spacing.xs,
    marginRight: Spacing.md,
  },
  itemName: {
    fontSize: 16,
    fontWeight: '600',
    color: AppColors.text,
  },
  itemDescription: {
    fontSize: 13,
    color: AppColors.textSecondary,
  },
  itemNotes: {
    fontSize: 12,
    color: AppColors.textSecondary,
    fontStyle: 'italic',
  },
  itemRight: {
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    gap: Spacing.xs,
  },
  quantity: {
    fontSize: 14,
    color: AppColors.textSecondary,
    fontWeight: '600',
  },
  price: {
    fontSize: 16,
    fontWeight: '700',
    color: AppColors.primary,
  },
  chefFooter: {
    gap: Spacing.md,
    paddingTop: Spacing.sm,
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  totalLabel: {
    fontSize: 18,
    fontWeight: '700',
    color: AppColors.text,
  },
  totalPrice: {
    fontSize: 22,
    fontWeight: '700',
    color: AppColors.primary,
  },
});

