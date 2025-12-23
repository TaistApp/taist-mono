import {Dimensions, StyleSheet} from 'react-native';
import { AppColors, Shadows, Spacing } from '../../../../constants/theme';


const screenWidth = Dimensions.get('window').width;
export const styles = StyleSheet.create({
  main: {
    flex: 1,
    justifyContent: 'space-around',
    alignItems: 'center',
    backgroundColor: AppColors.background,
  },
  pageView: {
    width: screenWidth,
    paddingBottom: 200,
    alignItems: 'center',
  },
  imgContainer: {
    width: screenWidth,
    height: 300,
    marginBottom: 30,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pageImg: {
    width: '100%',
    height: '100%',
    resizeMode: 'contain',
  },
  logo: {
    width: '100%',
    height: '50%',
    resizeMode: 'contain',
  },
  pageTitle: {
    fontSize: 20,
    fontWeight: '700',
    textAlign: 'center',
    color: AppColors.text,
  },
  pageText: {
    fontSize: 16,
    fontWeight: '500',
    color: AppColors.text,
  },
  subPageView: {
    width: '100%',
    padding: 15,
    rowGap: 10,
  },
  bottomContainer: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    left: 0,
  },
  paginationContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 10,
    padding: 20,
  },
  paginationIndicator: {
    width: 10,
    height: 10,
    backgroundColor: 'rgba(0,0,0,0.5)',
    borderRadius: 10,
  },
  button: {
    borderRadius: 20,
    backgroundColor: AppColors.primary,
    width: 200,
    padding: 10,
    alignSelf: 'center',
    marginBottom: 5,
  },
  buttonText: {
    color: AppColors.textOnPrimary,
    fontSize: 18,
    textAlign: 'center',
    includeFontPadding: false,
    textAlignVertical: 'center',
  },
});
