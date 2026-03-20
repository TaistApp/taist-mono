import React, { useRef, useState } from "react";
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
  const inputRef = useRef<TextInput>(null);
  const [isFocused, setIsFocused] = useState(false);

  const handlePress = () => {
    inputRef.current?.focus();
  };

  const digits = value.split("").slice(0, length);

  return (
    <View style={styles.wrapper}>
      {/* Hidden TextInput that receives keyboard/autofill input */}
      <TextInput
        ref={inputRef}
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
        style={styles.hiddenInput}
        caretHidden
      />

      {/* Visible digit boxes */}
      <View style={styles.boxRow} onTouchEnd={handlePress}>
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
    </View>
  );
};

const styles = StyleSheet.create({
  wrapper: {
    width: "100%",
    position: "relative",
  },
  hiddenInput: {
    position: "absolute",
    opacity: 0,
    height: 1,
    width: 1,
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
