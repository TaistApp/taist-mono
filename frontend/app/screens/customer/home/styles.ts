import { StyleSheet } from 'react-native';
import { AppColors, Shadows, Spacing } from '../../../../constants/theme';


export const styles = StyleSheet.create({
  main: {
    flex: 1,
    backgroundColor: AppColors.background,
  },
  pageView: {
    padding: Spacing.lg,
    alignItems: 'center',
    width: '100%',
  },
  missingHeading: {
    fontSize: 26,
    fontWeight: '700',
    color: AppColors.text,
    textAlign: 'center',
    marginTop: Spacing.xl,
    marginBottom: Spacing.lg,
  },
  missingImg: {
    width: 240,
    height: 240,
    marginVertical: Spacing.xl,
  },
  missingSubheading: {
    fontSize: 16,
    color: AppColors.textSecondary,
    textAlign: 'center',
    lineHeight: 24,
    paddingHorizontal: Spacing.lg,
  },
  locationDisplay: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: AppColors.surface,
    borderRadius: 8,
    alignSelf: 'flex-start',
    ...Shadows.xs,
  },
  locationText: {
    color: AppColors.text,
    fontSize: 14,
    fontWeight: '600',
  },
  searchInput: {
    backgroundColor: AppColors.background,
    marginBottom: Spacing.sm,
  },
  calendar: {
    marginTop: Spacing.xs,
    marginBottom: Spacing.sm,
  },
  sectionLabel: {
    fontSize: 16,
    fontWeight: '700',
    color: AppColors.text,
    marginBottom: Spacing.sm,
    marginTop: Spacing.md,
  },
  wrapContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    marginVertical: Spacing.md,
  },
  chefCardContainer: {
    marginTop: Spacing.lg,
    width: '100%',
    gap: Spacing.md,
  },
  chefCard: {
    backgroundColor: AppColors.surface,
    borderRadius: 12,
    padding: Spacing.md,
    ...Shadows.sm,
  },
  chefCardHot: {
    borderWidth: 1.5,
    borderColor: '#FF6B35',
  },
  chefCardMain: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.md,
  },
  chefCardMenu: {},
  chefCardMenuItem: {
    padding: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: AppColors.border,
  },
  chefCardMenuItemHeading: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: Spacing.sm,
  },
  chefCardMenuItemTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: AppColors.text,
  },
  chefCardMenuItemPrice: {
    fontSize: 16,
    fontWeight: '700',
    color: AppColors.primary,
  },
  chefCardMenuItemSize: {
    fontSize: 12,
    color: AppColors.textSecondary,
  },
  chefCardMenuItemDescription: {
    marginVertical: Spacing.xs,
    fontSize: 14,
    color: AppColors.textSecondary,
    lineHeight: 20,
  },
  chefCardImg: {
    width: 80,
    height: 80,
    borderRadius: 12,
    backgroundColor: AppColors.surface,
  },
  chefCardInfo: {
    flex: 1,
    height: '100%',
    gap: Spacing.xs,
  },
  chefCardTitle: {
    fontWeight: '700',
    fontSize: 18,
    color: AppColors.text,
  },
  chefCardDescription: {
    fontSize: 14,
    color: AppColors.textSecondary,
    maxWidth: 240,
    lineHeight: 20,
  },
  chefCardReview: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    marginTop: Spacing.xs,
  },
  hotBadge: {
    position: 'absolute',
    bottom: -6,
    left: -10,
    right: -10,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FF6B35',
    paddingVertical: 3,
    borderRadius: 8,
    zIndex: 1,
  },
  hotBadgeText: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '700',
  },
});
