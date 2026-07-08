import {StyleSheet} from 'react-native';
import { AppColors, Shadows, Spacing } from '../../../../constants/theme';


export const styles = StyleSheet.create({
  main: {
    flex: 1,
    backgroundColor: AppColors.background, // White background
  },
  pageView: {
    padding: Spacing.lg,
    alignItems: 'center',
    width: '100%',
  },
  tabContainer: {
    width: '100%',
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-around',
    gap: Spacing.sm,
    marginTop: Spacing.lg,
  },
  tab: {
    // backgroundColor:AppColors.surface,
    borderRadius: 20,
    paddingVertical: 6,
    paddingHorizontal: 8,
  },
  tab_disabled: {
    backgroundColor: AppColors.disabled,
    borderRadius: 20,
    paddingVertical: 6,
    paddingHorizontal: 8,
  },
  tabText: {
    fontSize: 10,
    // color: AppColors.primary,
  },
  tabText_disabled: {
    fontSize: 10,
    color: AppColors.text,
  },
  orderCardContainer: {
    marginTop: Spacing.lg,
    width: '100%',
  },
  orderCard: {
    width: '100%',
    backgroundColor: AppColors.surface,
    borderRadius: 12,
    padding: Spacing.md,
    marginBottom: Spacing.md,
    ...Shadows.sm,
  },
  orderCardMain: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 25,
  },
  orderCardImg: {
    width: 90,
    height: 80,
  },
  orderCardInfo: {
    rowGap: 5,
  },
  orderCardTitle: {
    color: AppColors.text,
    fontWeight: '700',
  },
  orderCardDescription: {
    color: AppColors.text,
  },
});
