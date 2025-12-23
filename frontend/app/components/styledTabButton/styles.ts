import { StyleSheet } from 'react-native';

const styles = StyleSheet.create({
  // Active/Selected state - White background with orange text
  btn: {
    borderRadius: 20,
    backgroundColor: '#ffffff',
    shadowColor: '#000000',
    shadowOffset: {width: 0, height: 2},
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 4,
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  btnTxt: {
    color: '#fa4616',
    fontSize: 15,
    fontWeight: '600',
    textAlign: 'center',
    letterSpacing: 0.5,
    includeFontPadding: false,
    textAlignVertical: 'center',
  },
  // Inactive state - Orange background with white text
  btnDisabled: {
    borderRadius: 20,
    backgroundColor: '#fa4616',
    shadowColor: '#000000',
    shadowOffset: {width: 0, height: 2},
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 4,
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  btnDisabledTxt: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '600',
    textAlign: 'center',
    letterSpacing: 0.5,
    includeFontPadding: false,
    textAlignVertical: 'center',
  },
});

export default styles;
