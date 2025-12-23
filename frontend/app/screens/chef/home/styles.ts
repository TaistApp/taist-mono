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
  userContainer: {
    backgroundColor: AppColors.surface,
    borderRadius: 12,
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.lg,
    paddingVertical: Spacing.lg,
    paddingHorizontal: Spacing.lg,
    ...Shadows.sm,
  },
  userName: {
    fontSize: 24,
    fontWeight: '700',
    color: AppColors.text,
  },
  onboardingHeader: {
    width: '100%',
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.xl,
    paddingBottom: Spacing.sm,
  },
  onboardingTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: AppColors.text,
    marginBottom: Spacing.xs,
  },
  onboardingSubtitle: {
    fontSize: 14,
    fontWeight: '400',
    color: AppColors.textSecondary,
    lineHeight: 20,
  },
  text: {
    fontSize: 16,
    fontWeight: '600',
    color: AppColors.text,
  },
  itemContainer: {
    width: '100%',
    gap: Spacing.md,
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.xl,
  },
  item: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.lg,
  },
  settingItemCard: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    backgroundColor: AppColors.surface,
    borderRadius: 12,
    padding: Spacing.lg,
    borderWidth: 2,
    borderColor: 'transparent',
    ...Shadows.sm,
  },
  settingItemCompleted: {
    backgroundColor: '#F1F8F4', // Light green background for completed
    borderColor: '#4CAF50', // Green border
  },
  settingItemNext: {
    backgroundColor: '#FFF5F2', // Light orange background for next step
    borderColor: '#fa4616', // Orange border
    borderWidth: 2,
  },
  settingItemIcon: {
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  settingItemText: {
    flex: 1,
    fontSize: 16,
    fontWeight: '600',
    color: AppColors.text,
    lineHeight: 22,
  },
  settingItemTextCompleted: {
    color: '#2E7D32', // Darker green for completed text
    fontWeight: '500',
  },
  settingItemTextNext: {
    color: '#fa4616', // Orange for next step
    fontWeight: '700',
  },
  tabContainer: {
    flex: 1,
    width: '100%',
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginTop: Spacing.lg,
    gap: Spacing.sm,
  },
  tab: {
    backgroundColor: AppColors.primary,
    borderRadius: 12,
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.lg,
    justifyContent: 'center',
    alignItems: 'center',
    flex: 1,
    ...Shadows.sm,
  },
  tab_disabled: {
    backgroundColor: AppColors.surface,
    borderRadius: 12,
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.lg,
    justifyContent: 'center',
    alignItems: 'center',
    flex: 1,
  },
  tabText: {
    fontSize: 13,
    fontWeight: '700',
    color: AppColors.textOnPrimary,
    includeFontPadding: false,
    textAlignVertical: 'center',
  },
  tabText_disabled: {
    fontSize: 13,
    fontWeight: '600',
    color: AppColors.textSecondary,
    includeFontPadding: false,
    textAlignVertical: 'center',
  },
  orderCardContainer: {
    marginTop: Spacing.lg,
    width: '100%',
    gap: Spacing.md,
  },
  orderCard: {
    width: '100%',
    backgroundColor: AppColors.surface,
    borderRadius: 12,
    padding: Spacing.md,
    ...Shadows.sm,
  },
  orderCardMain: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.lg,
  },
  orderCardImg: {
    width: 90,
    height: 80,
    borderRadius: 8,
    backgroundColor: AppColors.background,
  },
  orderCardInfo: {
    gap: Spacing.xs,
    flex: 1,
  },
  orderCardTitle: {
    color: AppColors.text,
    fontWeight: '700',
    fontSize: 16,
  },
  orderCardDescription: {
    color: AppColors.textSecondary,
    fontSize: 14,
    lineHeight: 20,
  },
});
