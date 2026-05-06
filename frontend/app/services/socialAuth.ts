import Constants from "expo-constants";
import * as AppleAuthentication from "expo-apple-authentication";
import { Platform } from "react-native";
import {
  GoogleSignin,
  statusCodes,
} from "@react-native-google-signin/google-signin";
/**
 * Provider sign-in helpers.
 *
 * Each helper wraps the native sign-in flow and returns a `SocialAuthPayload`
 * shaped for `SocialLoginAPI`. The backend re-verifies the token, so the
 * client only needs to surface what the provider gives us.
 */

export type SocialProvider = "google" | "apple";

export interface SocialAuthPayload {
  provider: SocialProvider;
  token: string;
  email?: string | null;
  first_name?: string | null;
  last_name?: string | null;
}

export class SocialAuthCancelled extends Error {
  constructor() {
    super("User cancelled sign-in");
    this.name = "SocialAuthCancelled";
  }
}

const extra = (Constants.expoConfig?.extra ?? {}) as Record<string, any>;

let googleConfigured = false;
function configureGoogleSignin() {
  if (googleConfigured) return;
  const iosClientId = extra.GOOGLE_IOS_CLIENT_ID as string | undefined;
  const webClientId = extra.GOOGLE_WEB_CLIENT_ID as string | undefined;
  // `webClientId` is required to receive an `idToken` we can verify on the
  // backend — even on iOS, Google issues the idToken against the web client.
  GoogleSignin.configure({
    iosClientId,
    webClientId,
    offlineAccess: false,
  });
  googleConfigured = true;
}

export async function signInWithGoogle(): Promise<SocialAuthPayload> {
  configureGoogleSignin();
  try {
    await GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true });
    const result: any = await GoogleSignin.signIn();
    // v13+ wraps the response under `.data`; fall back to flat shape for v12.
    const userInfo = result?.data ?? result;
    const idToken: string | null =
      userInfo?.idToken ?? (await GoogleSignin.getTokens()).idToken ?? null;
    if (!idToken) {
      throw new Error("Google did not return an ID token");
    }
    return {
      provider: "google",
      token: idToken,
      email: userInfo?.user?.email ?? null,
      first_name: userInfo?.user?.givenName ?? null,
      last_name: userInfo?.user?.familyName ?? null,
    };
  } catch (e: any) {
    if (
      e?.code === statusCodes.SIGN_IN_CANCELLED ||
      e?.code === statusCodes.IN_PROGRESS
    ) {
      throw new SocialAuthCancelled();
    }
    throw e;
  }
}

export async function signInWithApple(): Promise<SocialAuthPayload> {
  if (Platform.OS !== "ios") {
    throw new Error("Apple sign-in is only available on iOS");
  }
  const available = await AppleAuthentication.isAvailableAsync();
  if (!available) {
    throw new Error("Apple sign-in is not available on this device");
  }
  try {
    const credential = await AppleAuthentication.signInAsync({
      requestedScopes: [
        AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
        AppleAuthentication.AppleAuthenticationScope.EMAIL,
      ],
    });
    if (!credential.identityToken) {
      throw new Error("Apple did not return an identity token");
    }
    return {
      provider: "apple",
      token: credential.identityToken,
      email: credential.email ?? null,
      first_name: credential.fullName?.givenName ?? null,
      last_name: credential.fullName?.familyName ?? null,
    };
  } catch (e: any) {
    if (e?.code === "ERR_REQUEST_CANCELED") {
      throw new SocialAuthCancelled();
    }
    throw e;
  }
}

