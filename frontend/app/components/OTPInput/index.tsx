import React, { useState } from "react";
import { View, TextInput, StyleSheet, Platform, Keyboard } from "react-native";
import { AppColors } from "../../../constants/theme";

interface OTPInputProps {
  value: string;
  onChangeText: (text: string) => void;
  length?: number;
  autoFocus?: boolean;
  testID?: string;
}

/**
 * Single, genuinely-visible numeric field for the SMS one-time code.
 *
 * iOS Security Code AutoFill (the "From Messages: 123456" suggestion above the
 * keyboard) is finicky about the field it offers to fill: it must be a real,
 * on-screen, *visible* TextInput. Earlier versions used a transparent /
 * caret-hidden overlay behind custom boxes — that suppressed the suggestion.
 * Keeping a plain visible input (no transparent text, no overlay, no Modal
 * wrapper) is the configuration Apple's autofill reliably targets.
 */
const OTPInput: React.FC<OTPInputProps> = ({
  value,
  onChangeText,
  length = 6,
  autoFocus = false,
  testID,
}) => {
  const [isFocused, setIsFocused] = useState(false);

  return (
    <View style={styles.wrapper}>
      <TextInput
        testID={testID}
        value={value}
        onChangeText={(text) => {
          const digits = text.replace(/[^0-9]/g, "").slice(0, length);
          onChangeText(digits);
          // Once the full code is in (typed or autofilled), drop the keyboard so
          // the UI settles instead of flickering/shifting after autofill.
          if (digits.length === length) Keyboard.dismiss();
        }}
        keyboardType="number-pad"
        textContentType="oneTimeCode"
        autoComplete={Platform.OS === "android" ? "sms-otp" : "one-time-code"}
        importantForAutofill="yes"
        maxLength={length}
        autoFocus={autoFocus}
        placeholder={"–".repeat(length)}
        placeholderTextColor={AppColors.textTertiary}
        onFocus={() => setIsFocused(true)}
        onBlur={() => setIsFocused(false)}
        style={[styles.input, isFocused && styles.inputFocused]}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  wrapper: {
    width: "100%",
  },
  input: {
    width: "100%",
    height: 56,
    borderWidth: 1.5,
    borderColor: AppColors.border,
    borderRadius: 12,
    backgroundColor: AppColors.background,
    textAlign: "center",
    fontSize: 28,
    fontWeight: "700",
    letterSpacing: 10,
    color: AppColors.text,
    paddingHorizontal: 12,
  },
  inputFocused: {
    borderColor: AppColors.primary,
    borderWidth: 2,
  },
});

export default OTPInput;
