import { Redirect } from 'expo-router';

// The customer Home screen lives inside the tab navigator at
// `/screens/customer/(tabs)/(home)` (see ./HomeScreen). This standalone
// `/screens/customer/home` route is kept only as a safety redirect: landing
// here directly would render Home OUTSIDE the tab navigator, hiding the bottom
// tab bar. Always send users into the tabs instead.
export default function CustomerHomeRedirect() {
  return <Redirect href="/screens/customer/(tabs)/(home)" />;
}
