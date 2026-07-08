import { Dimensions, StyleSheet } from 'react-native';
import { AppColors, Shadows, Spacing } from '../../../../constants/theme';


const screenWidth = Dimensions.get('window').width;

export const styles = StyleSheet.create({
  main: {
    flex: 1,
    width: '100%',
    backgroundColor: AppColors.background, // White background
  },
  pageView: {
    padding: Spacing.lg,
    alignItems: 'center',
    gap: Spacing.md,
    width: '100%',
  },
  heading: {
    flexDirection: 'row',
    width: '100%',
    height: 25,
    alignItems: 'center',
    marginTop: 10,
  },
  backIcon: {
    width: 20,
    height: 20,
  },
  mainContainer: {
    marginTop: 20,
  },
  img: {
    width: 200,
    height: 200,
    borderRadius: 200,
  },
  chefName: {
    fontSize: 20,
    fontWeight: '700',
    color: AppColors.text,
    letterSpacing: 0.5,
  },
  absoluteContainter: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: 0,
    right: 0,
  },
  headTitle: {
    fontWeight: '700',
    fontSize: 20,
    color: AppColors.text,
    textAlign: 'center',
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: 0,
    right: 0,
    letterSpacing: 0.5,
  },
  title: {
    fontWeight: '700',
    fontSize: 20,
    color: AppColors.text,
    marginTop: 30,
    letterSpacing: 0.5,
  },
  titleBlack: {
    fontWeight: '700',
    fontSize: 20,
    color: AppColors.text,
    margin: 5,
    marginTop: 10,
    letterSpacing: 0.5,
  },
  text: {
    color: AppColors.text,
    fontWeight: '600',
  },
  textRight: {
    color: AppColors.text,
    fontWeight: '600',
    textAlign: 'right',
  },
  card: {
    width: '100%',
    backgroundColor: AppColors.surface,
    borderRadius: 12,
    padding: Spacing.lg,
    paddingVertical: Spacing.xl,
    rowGap: Spacing.lg,
    ...Shadows.sm,
  },
  cardMain: {
    flexDirection: 'row',
    width: '100%',
  },
  line: {
    backgroundColor: 'grey',
    width: '100%',
    height: 1,
  },
  tipContainer: {
    flexDirection: 'row',
    width: '100%',
  },
  tipMain: {
    width: '25%',
    height: 50,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  btnPayment: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 20,
    marginBottom: 20,
  },
  btnSubmit: {
    width: '100%',
    alignItems: 'center',
  },
  btnSubmitButton: {
    width: '100%',
    backgroundColor: '#000000',
    paddingVertical: 16,
    borderRadius: 28,
    alignItems: 'center',
  },
  btnSubmitLabel: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
    letterSpacing: 0.5,
  },
  btnContainer: {
    width: '100%',
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  btn: {
    flex: 1,
    height: 50,
    alignItems: 'center',
    justifyContent: 'center',
  },
  btnText: {
    color: AppColors.textOnPrimary,
    fontSize: 14,
    letterSpacing: 0.5,
  },
});
