import {Dimensions, StyleSheet, Platform} from 'react-native';

  const styles = StyleSheet.create({
  container: {},
  img: {
    width: 80,
    height: 80,
    borderRadius: 100,
  },
  overlay: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
    padding: 5,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 100,
    backgroundColor: 'grey',
  },
  imgPlaceholder: {width: '100%', height: '100%', borderRadius: 100},
  label: {
    color: 'white',
  },
});

export default styles;
