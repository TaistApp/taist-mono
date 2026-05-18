import { router } from "expo-router";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
  Linking,
  LogBox,
  Platform,
  Pressable,
  SafeAreaView,
  Text,
  View,
} from "react-native";
import Constants from "expo-constants";
import * as SplashScreen from "expo-splash-screen";
import * as AppleAuthentication from "expo-apple-authentication";
import Svg, { Path } from "react-native-svg";

// Official Google "G" logo, multi-color, per Google branding guidelines
// (https://developers.google.com/identity/branding-guidelines).
const GoogleIcon = () => (
  <Svg width={20} height={20} viewBox="0 0 20 20">
    <Path
      fill="#4285F4"
      d="M19.6 10.23c0-.71-.06-1.39-.18-2.05H10v3.88h5.38a4.6 4.6 0 0 1-2 3.02v2.51h3.24c1.9-1.74 3-4.31 3-7.36z"
    />
    <Path
      fill="#34A853"
      d="M10 20c2.7 0 4.97-.9 6.62-2.43l-3.24-2.51a6.13 6.13 0 0 1-9.07-3.13H1v2.6A10 10 0 0 0 10 20z"
    />
    <Path
      fill="#FBBC05"
      d="M4.31 11.93a5.93 5.93 0 0 1 0-3.86V5.47H1a10 10 0 0 0 0 9.06l3.31-2.6z"
    />
    <Path
      fill="#EA4335"
      d="M10 3.96c1.49 0 2.82.51 3.87 1.51L16.74 2.6A9.95 9.95 0 0 0 10 0 10 10 0 0 0 1 5.47l3.31 2.6A6.04 6.04 0 0 1 10 3.96z"
    />
  </Svg>
);

// Types & Services
// Note: NavigationStackType is not needed with Expo Router

// Hooks
import { useAppDispatch } from "../../../hooks/useRedux";
import { setUser } from "../../../reducers/userSlice";
import { updateMenus } from "../../../reducers/tableSlice";

import { navigate } from "@/app/utils/navigation";
import {
  GETVERSIONAPICALL,
  LoginAPI,
  ResumeSessionAPI,
  SocialLoginAPI,
} from "../../../services/api";
import { ClearStorage, ReadLoginData } from "../../../utils/storage";
import {
  SocialAuthCancelled,
  SocialAuthPayload,
  SocialProvider,
  signInWithApple,
  signInWithGoogle,
} from "../../../services/socialAuth";
import { styles } from "./styles";

/**
 * Compare two semver strings (e.g. "31.0.0" < "32.1.0").
 * Returns true if version a is less than version b.
 */
const isVersionLessThan = (a: string, b: string): boolean => {
  const partsA = a.split(".").map(Number);
  const partsB = b.split(".").map(Number);
  for (let i = 0; i < Math.max(partsA.length, partsB.length); i++) {
    const numA = partsA[i] || 0;
    const numB = partsB[i] || 0;
    if (numA < numB) return true;
    if (numA > numB) return false;
  }
  return false;
};
LogBox.ignoreLogs([
  "RCTBridge required dispatch_sync to load RCTAccessibilityManager",
]);

// Dev screen preview config - only works in __DEV__ mode
// Ensure DEV_SCREEN is a valid non-empty string, not an empty object or falsy value
const rawDevScreen = __DEV__ ? Constants.expoConfig?.extra?.devScreen : null;
const DEV_SCREEN =
  typeof rawDevScreen === "string" && rawDevScreen.length > 0
    ? rawDevScreen
    : null;
const rawDevUserType = __DEV__
  ? Constants.expoConfig?.extra?.devUserType
  : null;
const DEV_USER_TYPE =
  typeof rawDevUserType === "string" && rawDevUserType.length > 0
    ? rawDevUserType
    : null;

// Test accounts for dev screen preview (only used in __DEV__ mode)
// Update these with real test account credentials on staging
const DEV_TEST_ACCOUNTS = __DEV__
  ? {
      chef: { email: "testchef@taist.com", password: "Test123!" },
      customer: { email: "testcustomer@taist.com", password: "Test123!" },
    }
  : null;

// No need for PropsType with Expo Router
const Splash = () => {
  const [splash, setSplash] = useState(true);
  const [isOutdated, setIsOutdated] = useState(false);
  const [socialBusy, setSocialBusy] = useState<SocialProvider | null>(null);
  const [appleAvailable, setAppleAvailable] = useState(false);
  const dispatch = useAppDispatch();

  // nativeAppVersion is always available in production EAS builds;
  // expoConfig?.version can be null in production (discovered in prior fix 96db9fd).
  const CURRENT_VERSION =
    Constants.nativeAppVersion || Constants.expoConfig?.version || null;
  const APP_ENV = Constants.expoConfig?.extra?.APP_ENV || "production";

  const handleLogin = () => {
    navigate.toCommon.login();
  };

  const handleSignup = () => {
    navigate.toCommon.signup();
  };

  useEffect(() => {
    if (Platform.OS === "ios") {
      AppleAuthentication.isAvailableAsync()
        .then(setAppleAvailable)
        .catch(() => setAppleAvailable(false));
    }
  }, []);

  const runSocialFlow = async (
    provider: SocialProvider,
    fn: () => Promise<SocialAuthPayload>,
  ) => {
    if (socialBusy) return;
    setSocialBusy(provider);
    try {
      const payload = await fn();
      const response = await SocialLoginAPI(payload, dispatch);
      if (response.success === 1) {
        const userType = response.data?.user?.user_type;
        if (userType === 2) {
          navigate.toAuthorizedStacks.chefAuthorized();
        } else {
          navigate.toAuthorizedStacks.customerAuthorized();
        }
        return;
      }
      Alert.alert(
        "Sign-in failed",
        response.error || response.message || "Please try again.",
      );
    } catch (e: any) {
      if (e instanceof SocialAuthCancelled) {
        return;
      }
      console.error(`[social-login:${provider}]`, e);
      Alert.alert(
        "Sign-in failed",
        typeof e?.message === "string"
          ? e.message
          : "Something went wrong signing you in.",
      );
    } finally {
      setSocialBusy(null);
    }
  };

  const handleGoogle = () => runSocialFlow("google", signInWithGoogle);
  const handleApple = () => runSocialFlow("apple", signInWithApple);

  useEffect(() => {
    // Hide native splash screen once React component is mounted
    // This ensures seamless transition - native and React splash look identical
    SplashScreen.hideAsync().catch(() => {
      // Ignore errors if splash screen is already hidden
    });

    // DEV SCREEN PREVIEW: Skip normal flow and go directly to specified screen
    if (DEV_SCREEN) {
      console.log(
        `[DEV] Navigating directly to: ${DEV_SCREEN} as ${DEV_USER_TYPE || "guest"}`,
      );

      const performDevLogin = async () => {
        const testAccount =
          DEV_USER_TYPE === "chef"
            ? DEV_TEST_ACCOUNTS?.chef
            : DEV_TEST_ACCOUNTS?.customer;

        if (testAccount) {
          try {
            console.log(
              `[DEV] Attempting login with test account: ${testAccount.email}`,
            );
            const response = await LoginAPI(
              {
                email: testAccount.email,
                password: testAccount.password,
                remember: false,
              },
              dispatch,
            );

            if (response.success === 1) {
              console.log("[DEV] Login successful, navigating to screen");
              router.replace(DEV_SCREEN);
              return;
            } else {
              console.warn(
                "[DEV] Login failed, falling back to mock user:",
                response,
              );
            }
          } catch (error) {
            console.warn(
              "[DEV] Login error, falling back to mock user:",
              error,
            );
          }
        }

        // Fallback to mock user if login fails or no test account
        console.log("[DEV] Using mock user (no API access)");
        if (DEV_USER_TYPE === "chef") {
          dispatch(
            setUser({
              id: 999,
              first_name: "Dev",
              last_name: "Chef",
              email: "dev@chef.test",
              user_type: 2, // Chef
              is_pending: 0,
              quiz_completed: 1,
              verified: 1,
            }),
          );
          dispatch(updateMenus([]));
        } else if (DEV_USER_TYPE === "customer") {
          dispatch(
            setUser({
              id: 999,
              first_name: "Dev",
              last_name: "Customer",
              email: "dev@customer.test",
              user_type: 1, // Customer
              verified: 1,
            }),
          );
        }

        setTimeout(() => {
          router.replace(DEV_SCREEN);
        }, 100);
      };

      performDevLogin();
      return;
    }

    // Fallback: if auto-login takes too long, show login buttons
    const fallbackTimer = setTimeout(() => {
      console.warn("Auto-login timeout - showing login screen");
      setSplash(false);
    }, 35000); // 35 second max wait

    setTimeout(() => {
      autoLogin().finally(() => {
        clearTimeout(fallbackTimer);
      });
    }, 2000);

    return () => clearTimeout(fallbackTimer);
  }, []);

  const performAutoLogin = async (loginData: any): Promise<boolean> => {
    try {
      let response: any;

      if (loginData.social) {
        response = await ResumeSessionAPI(loginData.user_id, dispatch);
      } else {
        response = await LoginAPI(
          {
            email: loginData.email,
            password: loginData.password,
            remember: true,
          },
          dispatch,
        );
      }

      if (response.success === 1) {
        const userType = response.data?.user?.user_type;
        if (userType === 1) {
          navigate.toCustomer.home();
        } else {
          navigate.toChef.home();
        }
        return true;
      } else {
        console.log(
          "Auto-login failed: Account no longer valid, clearing stored data",
        );
        dispatch({ type: "USER_LOGOUT" });
        await ClearStorage();
        setSplash(false);
        return false;
      }
    } catch (error) {
      console.error("Auto-login error (network issue):", error);
      setSplash(false);
      return false;
    }
  };

  const autoLogin = async () => {
    try {
      // Skip version check in local development and staging
      // Staging testers get builds directly (TestFlight/APK), not from the store,
      // so the "Update Required" flow can't help them — it just blocks them.
      if (APP_ENV === "local" || APP_ENV === "staging") {
        console.log(`${APP_ENV} mode: Skipping version check`);
        const loginData = await ReadLoginData();
        if (loginData == null) {
          setSplash(false);
          return;
        }
        if (!loginData.social && (!loginData.email || !loginData.password)) {
          setSplash(false);
          return;
        }
        await performAutoLogin(loginData);
        return;
      }

      const versionResponse = await GETVERSIONAPICALL();
      console.log("Version API Response:", versionResponse);

      if (!versionResponse?.data?.[0]?.version) {
        console.error("Version information is missing from the API response.");
        setSplash(false);
        return;
      }

      const requiredVersion = versionResponse?.data?.[0]?.version;
      // Only block if the installed app is OLDER than the minimum required version.
      // A newer app version (e.g. after a bump before the DB is updated) should not be blocked.
      if (
        versionResponse?.success === 1 &&
        isVersionLessThan(CURRENT_VERSION, requiredVersion)
      ) {
        console.log(
          `App version ${CURRENT_VERSION} is below minimum ${requiredVersion}. APP_ENV=${APP_ENV}`,
        );
        return;
      }

      const loginData = await ReadLoginData();
      if (loginData == null) {
        setSplash(false);
        return;
      }
      if (!loginData.social && (!loginData.email || !loginData.password)) {
        setSplash(false);
        return;
      }
      await performAutoLogin(loginData);
    } catch (error) {
      console.error("Error during version check or auto-login:", error);
      Alert.alert(
        "Error",
        "Unable to check the app version. Please try again later.",
        [{ text: "OK" }],
      );
      setSplash(false); // Handle gracefully by stopping the splash screen
    }
  };

  const openStore = () => {
    if (Platform.OS === "ios") {
      Linking.openURL("https://apps.apple.com/app/1598624809");
    } else {
      Linking.openURL(
        "https://play.google.com/store/apps/details?id=com.taist.app",
      );
    }
  };

  const retryVersionCheck = () => {
    setIsOutdated(false);
    setSplash(true);
    setTimeout(() => {
      autoLogin();
    }, 500);
  };

  if (isOutdated) {
    return (
      <View style={[styles.splash]}>
        <Image
          style={styles.splashLogo}
          source={require("../../../assets/images/splashLogo.png")}
        />
        <View style={{ width: "100%", paddingHorizontal: 20, gap: 12 }}>
          <Text style={styles.outdatedText}>
            Update required — please install the latest version to continue.
          </Text>
          <Pressable
            style={styles.updateButton}
            onPress={openStore}
          >
            <Text style={styles.updateButtonText}>Update Now</Text>
          </Pressable>
          <Pressable
            style={styles.retryButton}
            onPress={retryVersionCheck}
          >
            <Text style={styles.retryButtonText}>I Already Updated</Text>
          </Pressable>
        </View>
      </View>
    );
  }

  if (splash) {
    return (
      <View style={[styles.splash]}>
        <Image
          style={styles.splashLogo}
          source={require("../../../assets/images/splashLogo.png")}
        />
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.main}>
      <Image
        style={styles.logo}
        source={require("../../../assets/images/logo-2.png")}
      />
      <View style={styles.buttonsWrapper}>
        {Platform.OS === "ios" && appleAvailable &&
          (socialBusy === "apple" ? (
            <View style={[styles.socialButton, styles.appleButton]}>
              <ActivityIndicator color="#fff" />
            </View>
          ) : (
            <AppleAuthentication.AppleAuthenticationButton
              buttonType={
                AppleAuthentication.AppleAuthenticationButtonType.CONTINUE
              }
              buttonStyle={
                AppleAuthentication.AppleAuthenticationButtonStyle.BLACK
              }
              cornerRadius={12}
              style={styles.appleNativeButton}
              onPress={handleApple}
            />
          ))}
        <Pressable
          style={[styles.socialButton, styles.googleButton]}
          onPress={handleGoogle}
          disabled={socialBusy !== null}
        >
          {socialBusy === "google" ? (
            <ActivityIndicator color="#3c4043" />
          ) : (
            <>
              <View style={styles.socialIcon}>
                <GoogleIcon />
              </View>
              <Text style={[styles.socialButtonText, styles.googleButtonText]}>
                Continue with Google
              </Text>
            </>
          )}
        </Pressable>
        <View style={styles.divider}>
          <View style={styles.dividerLine} />
          <Text style={styles.dividerText}>or</Text>
          <View style={styles.dividerLine} />
        </View>

        <Pressable style={styles.button} onPress={handleLogin}>
          <Text style={styles.buttonText}>Login With Email</Text>
        </Pressable>
        <Pressable style={styles.button} onPress={handleSignup}>
          <Text style={styles.buttonText}>Signup With Email</Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
};

export default Splash;
