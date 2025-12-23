import {StyleSheet, Dimensions} from 'react-native';
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
    padding: 10,
    // paddingTop:30,
    alignItems: 'center',
    gap: 20,
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
    width: screenWidth - 20,
    height: (screenWidth - 20) * 0.8513,
  },
  absoluteContainter: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: 0,
    right: 0,
  },
  headTitle: {
    fontWeight: '500',
    fontSize: 20,
    color: AppColors.text,
    textAlign: 'center',
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: 0,
    right: 0,
  },
  title: {
    fontWeight: '700',
    fontSize: 20,
    color: AppColors.text,
    marginTop: 20,
  },
  titleBlack: {
    fontWeight: '700',
    fontSize: 20,
    color: AppColors.text,
    margin: 5,
    marginTop: 10,
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
    borderRadius: 10,
    padding: 20,
    paddingVertical: 20,
    rowGap: 20,
    shadowColor: '#000000',
    shadowOffset: {width: 2.5, height: 2.5},
    shadowOpacity: 0.2,
    shadowRadius: 5,
    elevation: 5,
  },
  cardMain: {
    flexDirection: 'row',
    width: '100%',
    gap: 20,
    alignItems: 'flex-start',
  },
  line: {
    backgroundColor: 'grey',
    width: '100%',
    height: 1,
  },
  statusBox: {
    borderRadius: 20,
    backgroundColor: AppColors.surface,
    shadowColor: '#000000',
    shadowOffset: {width: 2.5, height: 2.5},
    shadowOpacity: 0.2,
    shadowRadius: 5,
    elevation: 5,
    width: '100%',
    padding: 12,
  },
  statusText: {
    color: AppColors.primary,
    fontSize: 18,
    fontWeight: '700',
    textAlign: 'center',
    includeFontPadding: false,
    textAlignVertical: 'center',
  },
  btnContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  btn: {
    width: 50,
    height: 50,
    alignItems: 'center',
    justifyContent: 'center',
  },
  btnText: {
    color: AppColors.textOnPrimary,
    fontSize: 14,
    fontWeight: '500',
    includeFontPadding: false,
    textAlignVertical: 'center',
  },
});
