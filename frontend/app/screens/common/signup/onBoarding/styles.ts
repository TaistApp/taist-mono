import {Dimensions, StyleSheet} from 'react-native';
import { AppColors, Shadows, Spacing } from '../../../../../constants/theme';


const screenWidth = Dimensions.get('window').width;
const viewHeight = Dimensions.get('window').height - 130;
export const styles = StyleSheet.create({
  main: {
    width: screenWidth,
    flex: 1,
    alignItems: 'center',
  },
  scrollView: {
    flex: 1,
  },
  scrollViewContent: {
    flexGrow: 1,
  },
  pageView: {
    width: screenWidth,
    alignItems: 'center',
    justifyContent: 'center',
    flex: 1,
  },
  pageImg: {
    width: screenWidth * 0.87,
    height: screenWidth * 0.87,
    marginBottom: 20,
    borderRadius: 12,
  },
  pageTitle: {
    fontSize: 20,
    fontWeight: '700',
    textAlign: 'center',
    color: AppColors.text,
  },
  pageDesc: {
    textAlign: 'center',
    color: AppColors.text,
  },
  subPageView: {
    width: screenWidth * 0.87,
    padding: 10,
    rowGap: 10,
  },
  controllerContainer: {
    width: screenWidth,
    paddingBottom: 30,
  },
  paginationContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 10,
    padding: 15,
  },
  paginationIndicator: {
    width: 10,
    height: 10,
    backgroundColor: 'rgba(0,0,0,0.5)',
    borderRadius: 10,
  },
  paginationIndicatorActive: {
    backgroundColor: AppColors.primary,
  },
  button: {
    borderRadius: 12,
    backgroundColor: AppColors.primary,
    width: 200,
    paddingVertical: 14,
    alignSelf: 'center',
    ...Shadows.md,
  },
  buttonText: {
    color: AppColors.textOnPrimary,
    fontSize: 16,
    fontWeight: '700',
    textAlign: 'center',
  },
});
