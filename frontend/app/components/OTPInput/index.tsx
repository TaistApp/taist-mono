import React, { useState } from "react";
import { View, TextInput, Text, StyleSheet, Platform } from "react-native";
import { AppColors } from "../../../constants/theme";

interface OTPInputProps {
  value: string;
  onChangeText: (text: string) => void;
  length?: number;
  autoFocus?: boolean;
  testID?: string;
}

const OTPInput: React.FC<OTPInputProps> = ({
  value,
  onChangeText,
  length = 6,
  autoFocus = false,
  testID,
}) => {
  const [isFocused, setIsFocused] = useState(false);

  const digits = value.split("").slice(0, length);

  return (
    <View style={styles.wrapper}>
      {/* Visible digit boxes (non-interactive — the overlay input handles touches) */}
      <View style={styles.boxRow} pointerEvents="none">
        {Array.from({ length }, (_, i) => {
          const isActive =
            isFocused && i === Math.min(digits.length, length - 1);
          return (
            <View
              key={i}
              style={[
                styles.box,
                isActive && styles.boxActive,
                digits[i] != null && styles.boxFilled,
              ]}
            >
              <Text style={styles.digit}>{digits[i] ?? ""}</Text>
            </View>
          );
        })}
      </View>

      {/*
        Full-size, on-screen TextInput overlaid on top of the boxes with
        transparent text. iOS only surfaces the "From Messages" one-time-code
        suggestion above the keyboard when the focused field is actually
        rendered on screen with real dimensions — a 1x1 / opacity:0 field is
        ignored. Keeping it transparent-but-present is what enables autofill.
      */}
      <TextInput
        testID={testID}
        value={value}
        onChangeText={(text) =>
          onChangeText(text.replace(/[^0-9]/g, "").slice(0, length))
        }
        keyboardType="number-pad"
        textContentType="oneTimeCode"
        autoComplete={Platform.OS === "android" ? "sms-otp" : "one-time-code"}
        maxLength={length}
        autoFocus={autoFocus}
        onFocus={() => setIsFocused(true)}
        onBlur={() => setIsFocused(false)}
        style={styles.overlayInput}
        caretHidden
        selectionColor="transparent"
      />
    </View>
  );
};

const styles = StyleSheet.create({
  wrapper: {
    width: "100%",
    position: "relative",
  },
  overlayInput: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    // Present on screen (so iOS QuickType offers the SMS code), but invisible:
    // transparent text/caret means the digits only show in the boxes below.
    color: "transparent",
    fontSize: 24,
    textAlign: "center",
    backgroundColor: "transparent",
  },
  boxRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 8,
  },
  box: {
    flex: 1,
    aspectRatio: 1,
    maxHeight: 52,
    borderWidth: 1.5,
    borderColor: AppColors.border,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: AppColors.background,
  },
  boxActive: {
    borderColor: AppColors.primary,
    borderWidth: 2,
  },
  boxFilled: {
    borderColor: AppColors.text,
  },
  digit: {
    fontSize: 24,
    fontWeight: "600",
    color: AppColors.text,
  },
});

export default OTPInput;
