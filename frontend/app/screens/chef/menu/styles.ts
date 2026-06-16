import {StyleSheet} from 'react-native';
import { AppColors, Shadows, Spacing } from '../../../../constants/theme';


export const styles = StyleSheet.create({
  main: {
    flex: 1,
    justifyContent: 'space-around',
    alignItems: 'center',
    backgroundColor: AppColors.background,
  },
  pageView: {
    padding: 10,
    alignItems: 'center',
    gap: 20,
    width: '100%',
    flex: 1,
  },
  missingHeading: {
    fontSize: 25,
    color: AppColors.text,
    textAlign: 'center',
    marginTop: 20,
  },
  missingImgLeft: {
    width: '55%',
    aspectRatio: 0.55,
    borderRadius: 10,
    resizeMode: 'cover',
  },
  missingImgRight: {
    width: '55%',
    aspectRatio: 0.85,
    borderRadius: 10,
    resizeMode: 'cover',
  },
  missingSubheading: {
    fontSize: 18,
    color: AppColors.text,
    textAlign: 'center',
  },
  cardContainer: {
    width: '100%',
    gap: 20,
  },
  card: {
    backgroundColor: AppColors.surface,
    borderRadius: 10,
    width: '100%',
    paddingHorizontal: 20,
    paddingVertical: 15,
    gap: 5,
    elevation: 5,
    shadowRadius: 5,
    shadowOffset: {width: 2.5, height: 2.5},
    shadowOpacity: 0.3,
    shadowColor: '#000000',
  },
  mealPrepBadge: {
    alignSelf: 'flex-start',
    backgroundColor: AppColors.primary,
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 3,
    marginBottom: 2,
  },
  mealPrepBadgeText: {
    color: AppColors.textOnPrimary,
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '500',
    color: AppColors.text,
  },
  cardText: {
    color: AppColors.text,
  },
  tabContainer: {
    flexDirection: 'row',
    columnGap: 20,
  },
  tab: {
    borderRadius: 20,
    paddingVertical: 10,
    paddingHorizontal: 15,
    justifyContent: 'center',
    alignItems: 'center',
    flex: 1,
  },
  tabText: {
    fontSize: 12,
    includeFontPadding: false,
    textAlignVertical: 'center',
  },
});
