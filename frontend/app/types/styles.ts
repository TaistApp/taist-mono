import {StyleSheet} from 'react-native';
import {AppColors, Shadows, Spacing} from '../../constants/theme';

const GlobalStyles = StyleSheet.create({
  main: {
    flex: 1,
    justifyContent: 'space-around',
    alignItems: 'center',
    backgroundColor: AppColors.background, // Changed from orange to white
  },
  pageView: {
    padding: Spacing.sm,
    alignItems: 'center',
    gap: Spacing.sm,
    width: '100%',
  },
  whiteCardContainer: {
    width: '100%',
    borderRadius: 10,
    backgroundColor: AppColors.surface, // Changed to light gray surface
    padding: Spacing.md,
    gap: Spacing.sm,
    ...Shadows.lg,
  },
  rowCenter: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  rowBetween: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  btn: {
    borderRadius: 20,
    backgroundColor: AppColors.primary, // Changed from white to orange
    // width: '100%',
    padding: 12,
    marginBottom: 5,
  },
  btnTxt: {
    color: AppColors.textOnPrimary, // Changed from orange to white (text on orange button)
    fontSize: 18,
    fontWeight: '700',
    textAlign: 'center',
    includeFontPadding: false,
    textAlignVertical: 'center',
  },
  btnDisabled: {
    borderRadius: 20,
    backgroundColor: AppColors.disabled, // Changed from black to light gray
    width: '100%',
    padding: 12,
    marginBottom: 5,
  },
  btnDisabledTxt: {
    color: AppColors.disabledText, // Changed from white to gray
    fontSize: 18,
    fontWeight: '700',
    textAlign: 'center',
    includeFontPadding: false,
    textAlignVertical: 'center',
  },
});

export default GlobalStyles;
