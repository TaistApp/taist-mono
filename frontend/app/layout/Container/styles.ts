import { Dimensions, StyleSheet } from 'react-native';
const screenWidth = Dimensions.get('window').width;
const screenHeight = Dimensions.get('window').height;
export const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#ffffff', // White background for all screens
 
    // position: "relative",
    // marginBottom: 60, // Removed default margin, will be applied conditionally
    // height:screenHeight-50
    // padding: 10,
  },
  topHeader: {
    width: screenWidth,
    height: 50,
    marginTop: 10,
    backgroundColor: '#ffffff',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    // gap: 20,
    padding: 10

  },
  topHeaderLeft: {
    // flexDirection: 'row',
    // alignItems: 'center',
    // justifyContent: 'space-between',
    // gap: 20,
    // borderWidth: 1,
  },
  rightActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    zIndex: 1,
  },
  unreadDot: {
    position: 'absolute',
    top: -3,
    right: -3,
    width: 10,
    height: 10,
    backgroundColor: '#FA4616',
    borderRadius: 5,
    borderWidth: 1.5,
    borderColor: '#FFFFFF',
  },
  logoContainer: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    right: 0,
    left: 0,
    justifyContent: 'center',
    alignItems: 'center',
    // paddingHorizontal is supplied by Container from the measured width of
    // the action row, so the logo/title can never slide under the buttons.
    // The overlay spans the whole header, so it must not intercept taps meant
    // for the buttons underneath (the Android toggle/logo overlap this
    // replaces was previously worked around with zIndex: -1, which also
    // pushed the title out of view).
    zIndex: 0,
  },
  logo: {
    width: '100%',
    maxWidth: 80,
    height: 40,
  },
  drawerWrapper: {
    flexDirection: 'column',
    backgroundColor: 'white',
    flex: 1,
    padding: 10,
  },
  drawerClose: {
    marginTop: 5,
  },
  drawerNavigationWrapper: {
    marginTop: 40,
    padding: 5,
  },
  drawerLink: {
    paddingVertical: 15,
  },
  drawerLinkText: {
    fontWeight: '700',
    color: '#000000',
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: '#000000',
    letterSpacing: 0.5,
  },
  button: {
    padding: 10,
    // Ensure buttons render above the logo container
    zIndex: 1,
  },
});
