import { StyleSheet } from 'react-native';
import { AppColors, Shadows, Spacing } from '../../../../constants/theme';


export const styles = StyleSheet.create({
  main: {
    flex: 1,
    justifyContent: 'space-around',
    alignItems: 'center',
    backgroundColor: '#ff3100',
  },
  pageView: {
    width: '100%',
    padding: 10,
    alignItems: 'center',
  },
  container: {
    width: '100%',
    borderBottomWidth: 1,
    borderBottomColor: 'grey',
    flexDirection: 'row',
    padding: 20,
    paddingVertical: 10,
    gap: 20,
    alignItems: 'center',
  },
  rowBetween: {
    flexDirection: 'row',
    flex: 1,
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  photo: {
    width: 70,
    height: 70,
    borderRadius: 50,
  },
  taistAvatar: {
    width: 70,
    height: 70,
    borderRadius: 35,
    overflow: 'hidden',
    backgroundColor: AppColors.surfaceVariant,
    alignItems: 'center',
    justifyContent: 'center',
  },
  taistAvatarImage: {
    width: 70,
    height: 70,
  },
  middleContainer: {
    flex: 1,
    justifyContent: 'center',
    gap: 5,
  },
  rightContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
  },
  unreadBage: {
    // position: 'absolute',
    // right: 5,
    // bottom: 5,
    width: 10,
    height: 10,
    backgroundColor: '#4ca64c',
    borderRadius: 20,
  },
  nameText: {
    fontSize: 16,
    fontWeight: '600',
    color: AppColors.text,
    letterSpacing: 0.5,
  },
  orderText: {
    fontSize: 12,
    fontWeight: '500',
    color: AppColors.text,
    letterSpacing: 0.5,
  },
  msgText: {
    fontSize: 14,
    fontWeight: '400',
    color: AppColors.text,
    letterSpacing: 0.5,
  },
  timeText: {
    fontSize: 12,
    fontWeight: '500',
    color: AppColors.text,
    letterSpacing: 0.5,
  },
  bageText: {
    fontSize: 12,
    fontWeight: '500',
    color: AppColors.text,
    letterSpacing: 0.5,
  },
});
