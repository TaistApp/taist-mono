import {StyleSheet, Dimensions} from 'react-native';
import { AppColors, Shadows, Spacing } from '../../../../constants/theme';


const screenWidth = Dimensions.get('window').width;

export const styles = StyleSheet.create({
  main: {
    flex: 1,
    backgroundColor: AppColors.background, // White background
  },
  pageView: {
    padding: Spacing.lg,
    alignItems: 'center',
    gap: Spacing.md,
    width: '100%',
  },
  heading: {
    width: '100%',
    marginTop: Spacing.sm,
  },
  backIcon: {
    width: 20,
    height: 20,
  },
  chefName: {
    fontSize: 20,
    fontWeight: '700',
    color: AppColors.text,
  },
  chefCardContainer: {
    marginTop: 20,
  },
  chefImg: {
    width: 160,
    height: 160,
    borderRadius: 80,
  },
  chefReviewContainer: {
    width: '100%',
    gap: 10,
    paddingVertical: 10,
    alignItems: 'center',
  },
  chefCardReview: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    marginTop: 5,
  },
  chefCardDescription: {
    color: AppColors.text,
  },
  chefCardInsured: {
    fontWeight: '700',
    color: AppColors.text,
  },
  chefCardReviewHeading: {
    fontSize: 20,
    fontWeight: '700',
    color: AppColors.text,
  },
  chefCardAllergenHeading: {
    fontSize: 16,
    fontWeight: '700',
    color: AppColors.text,
    marginTop: 10,
  },
  chefCard: {
    backgroundColor: AppColors.surface,
    borderRadius: 12,
    padding: Spacing.md,
    width: '100%',
    ...Shadows.sm,
  },
  chefCardMenuItem: {
    padding: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: AppColors.border,
  },
  chefCardMenuItemHeading: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
    flexWrap: 'wrap',
  },
  chefCardMenuItemTitle: {
    fontSize: 18,
    fontWeight: '700',
    width: '70%',
    color: AppColors.text,
  },
  chefCardMenuItemPrice: {
    fontSize: 18,
    fontWeight: '700',
    color: AppColors.text,
  },
  chefCardMenuItemDescription: {
    marginVertical: 5,
    color: AppColors.text,
  },
  chefCardInnerReview: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
    marginTop: 5,
  },
  chefCardInnerReviewDate: {
    fontWeight: '700',
    color: AppColors.text,
  },
  paginationDots: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
    marginTop: 4,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: AppColors.border,
  },
  dotActive: {
    backgroundColor: AppColors.primary,
    width: 20,
  },
  allegenContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 10,
  },
  checkoutButton: {
    position: 'absolute',
    bottom: 0,
    right: 10,
    width: screenWidth - 20,
    alignItems: 'center',
  },
  checkoutButtonLabel: {
    color: AppColors.textOnPrimary,
    fontSize: 16,
    textAlign: 'center',
  },
});
