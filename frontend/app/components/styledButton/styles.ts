import { StyleSheet } from 'react-native';
import { AppColors, Shadows } from '../../../constants/theme';

const styles = StyleSheet.create({
  btn: {
    borderRadius: 20,
    backgroundColor: AppColors.primary, // Changed from white to orange
    ...Shadows.lg,
    width: '100%',
    padding: 12,
    marginBottom: 5,
    justifyContent: 'center',
    alignItems: 'center',
  },
  btnTxt: {
    color: AppColors.textOnPrimary, // Changed from orange to white
    fontSize: 18,
    letterSpacing: 0.5,
    fontWeight: '700',
    textAlign: 'center',
    includeFontPadding: false,
    textAlignVertical: 'center',
  },
  btnDisabled: {
    borderRadius: 20,
    backgroundColor: AppColors.disabled, // Changed from black to light gray
    ...Shadows.lg,
    width: '100%',
    padding: 12,
    marginBottom: 5,
    justifyContent: 'center',
    alignItems: 'center',
  },
  btnDisabledTxt: {
    color: AppColors.disabledText, // Changed from white to gray
    fontSize: 18,
    letterSpacing: 0.5,
    fontWeight: '700',
    textAlign: 'center',
    includeFontPadding: false,
    textAlignVertical: 'center',
  },
});

export default styles;
