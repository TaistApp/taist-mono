import { StyleSheet } from 'react-native';
import { AppColors } from '../../../constants/theme';

const styles = StyleSheet.create({
  container: {
    flex: 1,
    width: '100%',
    minHeight: 200,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  image: {
    width: 120,
    height: 120,
    marginBottom: 20,
  },
  title: {
    color: AppColors.text,
    fontSize: 18,
    fontWeight: '600',
    textAlign: 'center',
    marginBottom: 8,
  },
  subTitle: {
    color: AppColors.textSecondary,
    fontSize: 14,
    textAlign: 'center',
    width: '100%',
  },
  txt: {
    color: AppColors.textSecondary,
    fontSize: 16,
    fontWeight: '500',
    textAlign: 'center',
    letterSpacing: 0.5,
  },
});
export default styles;