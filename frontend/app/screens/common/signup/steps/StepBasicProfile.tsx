import React, { useState } from "react";
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  ActivityIndicator,
} from "react-native";
import { TextInput } from "react-native-paper";
import { SignupStepContainer } from "../components/SignupStepContainer";
import { AppColors, Spacing, Shadows } from "../../../../../constants/theme";
import { IUser } from "../../../../types/index";
import { ShowErrorToast, ShowSuccessToast } from "../../../../utils/toast";
import StyledTextInput from "../../../../components/styledTextInput";
import StyledButton from "../../../../components/styledButton";
import OTPInput from "../../../../components/OTPInput";
import { VerifyPhoneAPI, ConfirmPhoneCodeAPI } from "../../../../services/api";

interface StepBasicProfileProps {
  userInfo: IUser;
  onUpdateUserInfo: (info: Partial<IUser>) => void;
  onNext: () => void;
  onBack: () => void;
}

export const StepBasicProfile: React.FC<StepBasicProfileProps> = ({
  userInfo,
  onUpdateUserInfo,
  onNext,
  onBack,
}) => {
  const [visibleVerifyCode, setVisibleVerifyCode] = useState(false);
  const [verificationCode, setVerificationCode] = useState("");
  const [isVerifying, setIsVerifying] = useState(false);
  const [isSendingCode, setIsSendingCode] = useState(false);

  const validateAndProceed = async () => {
    if (!userInfo.phone || userInfo.phone.trim().length === 0) {
      ShowErrorToast("Please enter your phone number");
      return;
    }

    // Basic phone validation - must be at least 10 digits
    const phoneDigits = userInfo.phone.replace(/\D/g, "");
    if (phoneDigits.length < 10) {
      ShowErrorToast("Please enter a valid 10-digit phone number");
      return;
    }

    // Send verification code via SMS
    await handleVerifyPhone();
  };

  const handleVerifyPhone = async () => {
    setIsSendingCode(true);
    try {
      const response = await VerifyPhoneAPI(userInfo.phone!);

      if (response.success === 1) {
        setVisibleVerifyCode(true);
        ShowSuccessToast("Verification code sent to your phone!");
      } else {
        ShowErrorToast(response.error || "Failed to send verification code");
      }
    } catch (error) {
      console.error("Error sending verification code:", error);
      ShowErrorToast("Failed to send verification code. Please try again.");
    } finally {
      setIsSendingCode(false);
    }
  };

  const handleVerify = async () => {
    setIsVerifying(true);
    try {
      const response = await ConfirmPhoneCodeAPI(
        userInfo.phone!,
        verificationCode.trim(),
      );

      if (response.success !== 1) {
        ShowErrorToast(response.error || "Incorrect verification code");
        return;
      }
      setVisibleVerifyCode(false);
      ShowSuccessToast("Phone verified successfully!");
      onNext();
    } catch (error) {
      console.error("Error verifying code:", error);
      ShowErrorToast("Failed to verify code. Please try again.");
    } finally {
      setIsVerifying(false);
    }
  };

  return (
    <View style={styles.root}>
    <SignupStepContainer
      title="What's your phone number?"
      subtitle="We'll use this to keep you updated on your orders"
    >
      <StyledTextInput
        testID="signup.profile.phoneInput"
        label="Phone Number"
        placeholder="(555) 123-4567"
        value={userInfo.phone ?? ""}
        onChangeText={(val) => onUpdateUserInfo({ phone: val })}
        keyboardType="phone-pad"
        autoComplete="tel"
      />

      <View style={styles.buttonContainer}>
        <StyledButton
          testID="signup.profile.continueButton"
          title={isSendingCode ? "Sending code..." : "Continue"}
          onPress={validateAndProceed}
          disabled={isSendingCode}
        />
        <Pressable
          testID="signup.profile.backButton"
          onPress={onBack}
          style={styles.backButton}
          disabled={isSendingCode}
        >
          <Text style={styles.backButtonText}>Back</Text>
        </Pressable>
      </View>
    </SignupStepContainer>

      {/*
        Phone verification overlay — NOT an RN <Modal> (which renders in a
        separate iOS window and blocks one-time-code AutoFill). In-window
        overlay keeps the OTP field in the key window so AutoFill works.
      */}
      {visibleVerifyCode && (
        <Pressable
          onPress={() => !isVerifying && setVisibleVerifyCode(false)}
          style={styles.modalBG}
        >
          <Pressable onPress={(e) => e.stopPropagation()} style={styles.modal}>
            <Text style={styles.modalTitle}>Verify Your Phone</Text>
            <Text style={styles.modalSubtext}>
              Enter the 6-digit code sent to {userInfo.phone}
            </Text>

            <OTPInput
              testID="signup.profile.verifyCodeInput"
              value={verificationCode}
              onChangeText={setVerificationCode}
              autoFocus
            />

            <View style={styles.modalButtons}>
              <StyledButton
                testID="signup.profile.verifyButton"
                title={isVerifying ? "Verifying..." : "Verify"}
                onPress={handleVerify}
                disabled={isVerifying || verificationCode.length !== 6}
              />

              <Pressable
                testID="signup.profile.resendButton"
                onPress={handleVerifyPhone}
                style={styles.resendButton}
                disabled={isSendingCode}
              >
                <Text style={styles.resendButtonText}>
                  {isSendingCode ? "Sending..." : "Resend Code"}
                </Text>
              </Pressable>
            </View>
          </Pressable>
        </Pressable>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  buttonContainer: {
    gap: Spacing.md,
    marginTop: Spacing.lg,
  },
  backButton: {
    alignItems: "center",
    paddingVertical: Spacing.md,
  },
  backButtonText: {
    color: AppColors.textSecondary,
    fontSize: 16,
    fontWeight: "600",
  },
  root: {
    flex: 1,
  },
  modalBG: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "center",
    alignItems: "center",
    padding: Spacing.xl,
  },
  modal: {
    backgroundColor: AppColors.surface,
    borderRadius: 16,
    padding: Spacing.xl,
    width: "100%",
    maxWidth: 400,
    gap: Spacing.lg,
    ...Shadows.lg,
  },
  modalTitle: {
    fontSize: 24,
    fontWeight: "700",
    color: AppColors.text,
    textAlign: "center",
  },
  modalSubtext: {
    fontSize: 14,
    color: AppColors.textSecondary,
    textAlign: "center",
    marginTop: -Spacing.sm,
  },
  modalButtons: {
    gap: Spacing.md,
  },
  resendButton: {
    alignItems: "center",
    paddingVertical: Spacing.md,
  },
  resendButtonText: {
    color: AppColors.primary,
    fontSize: 16,
    fontWeight: "600",
  },
});
