import { IconButton, Text, TextInput } from "@react-native-material/core";
import React, { useRef, useState } from "react";
import { Image, Pressable, View } from "react-native";

import { goBack } from "@/app/utils/navigation";
import KeyboardAwareScrollView from "../../../components/KeyboardAwareScrollView";
import { useAppDispatch } from "../../../hooks/useRedux";
import { hideLoading, showLoading } from "../../../reducers/loadingSlice";
import { ForgotAPI, ResetPasswordAPI } from "../../../services/api";
import { ShowErrorToast, ShowSuccessToast } from "../../../utils/toast";
import {
  emailValidation,
  passwordValidation,
} from "../../../utils/validations";
import { styles } from "./styles";

/**
 * Eye toggle for the password fields. Mirrors the one on the login screen
 * (same icon assets + IconButton) so the two screens look identical.
 */
const makeVisibilityToggle = ({
  testID,
  visible,
  onToggle,
}: {
  testID: string;
  visible: boolean;
  onToggle: () => void;
}) => {
  const Toggle = (props: any) => (
    <IconButton
      testID={testID}
      accessibilityRole="button"
      accessibilityLabel={visible ? "Hide password" : "Show password"}
      icon={() => (
        <Image
          style={{
            width: 20,
            height: 20,
            resizeMode: "contain",
            tintColor: "#666666",
          }}
          source={
            visible
              ? require("../../../assets/icons/icon_invisible.png")
              : require("../../../assets/icons/icon_visible.png")
          }
        />
      )}
      onPress={onToggle}
      {...props}
    />
  );
  Toggle.displayName = "PasswordVisibilityToggle";
  return Toggle;
};

const Forgot = () => {
  const dispatch = useAppDispatch();

  const [email, onChangeEmail] = useState("");
  const [codeRequested, onChangeCodeRequested] = useState(false);
  const [code, onChangeCode] = useState("");
  const [password, onChangePassword] = useState("");
  const [confirmPassword, onChangeConfirmPassword] = useState("");
  const [visiblePassword, onChangeVisiblePassword] = useState(false);
  const [visibleConfirmPassword, onChangeVisibleConfirmPassword] =
    useState(false);

  // Refs for input fields to enable keyboard navigation
  const codeInputRef = useRef<any>(null);
  const passwordInputRef = useRef<any>(null);
  const confirmPasswordInputRef = useRef<any>(null);

  const handleBackToLogin = () => {
    goBack();
  };

  const requestCode = async (isResend: boolean) => {
    let errorMsg = emailValidation(email);
    if (errorMsg !== "") {
      ShowErrorToast(errorMsg);
      return;
    }

    dispatch(showLoading());
    const resp = await ForgotAPI(email);
    dispatch(hideLoading());

    if (resp.success == 0) {
      ShowErrorToast(resp.message ?? resp.error);
      return;
    }

    // A resend invalidates the previous code, so clear whatever is typed —
    // otherwise the stale value silently fails against the new code.
    if (isResend) {
      onChangeCode("");
    }
    onChangeCodeRequested(true);
    ShowSuccessToast(`We sent a code to ${email}.`);
  };

  const handleRequest = () => requestCode(false);
  const handleResend = () => requestCode(true);

  const handleReset = async () => {
    let errorMsg = emailValidation(email);
    if (errorMsg !== "") {
      ShowErrorToast(errorMsg);
      return;
    }
    // Validate in the order the fields appear so the toast points at the first
    // problem the user can see on screen.
    if (code.trim() === "") {
      ShowErrorToast("Please enter the code from your email");
      return;
    }
    errorMsg = passwordValidation(password);
    if (errorMsg !== "") {
      ShowErrorToast(errorMsg);
      return;
    }
    if (password != confirmPassword) {
      ShowErrorToast("Passwords do not match");
      return;
    }

    dispatch(showLoading());
    const resp = await ResetPasswordAPI({ email, code: code.trim(), password });
    dispatch(hideLoading());

    if (resp.success == 0) {
      ShowErrorToast(resp.message ?? resp.error);
      return;
    }

    // Confirm before leaving. Without this a successful reset looked exactly
    // like nothing happening — the screen just popped back to login.
    ShowSuccessToast("Password updated. Log in with your new password.");
    goBack();
  };

  return (
    <KeyboardAwareScrollView style={styles.container}>
      <View style={styles.center}>
        <Image
          style={styles.logo}
          source={require("../../../assets/images/logo-2.png")}
        />
      </View>
      <View style={styles.vcenter}>
        <View>
          <Text style={styles.heading}>Forgot Password</Text>
        </View>
        {!codeRequested ? (
          <View>
            <Text style={styles.helperText}>
              Enter your email and we&apos;ll send you a code to reset your
              password.
            </Text>
            {/* @ts-ignore - TextInput from @react-native-material/core has different props */}
            <TextInput
              testID="forgotPassword.emailInput"
              style={styles.formFields}
              inputStyle={styles.formInputFields}
              placeholder="Email "
              placeholderTextColor={"#999999"}
              variant="standard"
              onChangeText={(txt) => onChangeEmail(txt.toLowerCase())}
              value={email}
              keyboardType="email-address"
              color="#1a1a1a"
              autoCapitalize={"none"}
              returnKeyType="done"
              onSubmitEditing={handleRequest}
              blurOnSubmit={true}
            />
          </View>
        ) : (
          <View>
            <Text testID="forgotPassword.codeSentNotice" style={styles.helperText}>
              We sent a 6-digit code to {email}. It expires in 10 minutes.
            </Text>
            {/* TextInput from @react-native-material/core has different props than RN TextInput */}
            <TextInput
              testID="forgotPassword.codeInput"
              // @ts-expect-error - ref prop not in types but works at runtime
              ref={codeInputRef as any}
              style={styles.formFields}
              inputStyle={styles.formInputFields}
              placeholder="Code "
              placeholderTextColor={"#999999"}
              variant="standard"
              // The server code is always 6 digits, so drop anything else —
              // pasted codes often arrive with stray spaces around them.
              onChangeText={(txt) => onChangeCode(txt.replace(/\D/g, ""))}
              value={code}
              keyboardType="number-pad"
              maxLength={6}
              color="#1a1a1a"
              autoCapitalize={"none"}
              returnKeyType="next"
              onSubmitEditing={() => {
                passwordInputRef.current?.focus();
              }}
              blurOnSubmit={false}
            />
            <TextInput
              testID="forgotPassword.passwordInput"
              // @ts-expect-error - ref prop not in types but works at runtime
              ref={passwordInputRef as any}
              style={styles.formFields}
              inputStyle={styles.formInputFields}
              placeholder="Password "
              placeholderTextColor={"#999999"}
              variant="standard"
              onChangeText={onChangePassword}
              value={password}
              textContentType="oneTimeCode"
              secureTextEntry={!visiblePassword}
              color="#1a1a1a"
              returnKeyType="next"
              onSubmitEditing={() => {
                confirmPasswordInputRef.current?.focus();
              }}
              blurOnSubmit={false}
              trailing={makeVisibilityToggle({
                testID: "forgotPassword.togglePassword",
                visible: visiblePassword,
                onToggle: () => onChangeVisiblePassword(!visiblePassword),
              })}
            />
            <TextInput
              testID="forgotPassword.confirmPasswordInput"
              // @ts-expect-error - ref prop not in types but works at runtime
              ref={confirmPasswordInputRef as any}
              style={styles.formFields}
              inputStyle={styles.formInputFields}
              placeholder="Confirmation Password "
              placeholderTextColor={"#999999"}
              variant="standard"
              onChangeText={onChangeConfirmPassword}
              value={confirmPassword}
              textContentType="oneTimeCode"
              secureTextEntry={!visibleConfirmPassword}
              color="#1a1a1a"
              returnKeyType="done"
              onSubmitEditing={handleReset}
              blurOnSubmit={true}
              trailing={makeVisibilityToggle({
                testID: "forgotPassword.toggleConfirmPassword",
                visible: visibleConfirmPassword,
                onToggle: () =>
                  onChangeVisibleConfirmPassword(!visibleConfirmPassword),
              })}
            />
          </View>
        )}
      </View>
      <View style={styles.vcenter}>
        <Pressable
          testID="forgotPassword.submitButton"
          style={styles.button}
          onPress={!codeRequested ? handleRequest : handleReset}
        >
          <Text style={styles.buttonText}>
            {!codeRequested ? "Request " : "Reset "}
          </Text>
        </Pressable>
        {/* Codes expire after 10 minutes — which is easy to hit while switching
            to a mail app. Without this the screen was a dead end: the Request
            button is gone once a code has been sent. */}
        {codeRequested && (
          <Pressable
            testID="forgotPassword.resendButton"
            style={styles.button2}
            onPress={handleResend}
          >
            <Text style={styles.buttonText2}>Resend code</Text>
          </Pressable>
        )}
        <Pressable
          testID="forgotPassword.backButton"
          style={styles.button2}
          onPress={handleBackToLogin}
        >
          <Text style={styles.buttonText2}>Back to Login</Text>
        </Pressable>
      </View>
    </KeyboardAwareScrollView>
  );
};

export default Forgot;
