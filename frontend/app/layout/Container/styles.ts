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
  logoContainer: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    right: 0,
    left: 0,
    justifyContent: 'center',
    alignItems: 'center',
  },
  logo: {
    width: 80,
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
  },
});
