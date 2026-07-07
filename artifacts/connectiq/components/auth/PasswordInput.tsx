import { Feather } from "@expo/vector-icons";
import React from "react";
import { Pressable, TextInput, View, type TextInputProps } from "react-native";

import { authColors, authStyles } from "@/components/auth/authStyles";

type Props = Omit<TextInputProps, "secureTextEntry" | "style"> & {
  hasError?: boolean;
};

export function PasswordInput({ hasError, ...inputProps }: Props) {
  const [visible, setVisible] = React.useState(false);

  return (
    <View style={{ position: "relative" }}>
      <TextInput
        style={[
          authStyles.input,
          { paddingRight: 48 },
          hasError && authStyles.inputError,
        ]}
        placeholderTextColor={authColors.muted}
        secureTextEntry={!visible}
        autoCapitalize="none"
        autoCorrect={false}
        {...inputProps}
      />
      <Pressable
        onPress={() => setVisible((v) => !v)}
        hitSlop={10}
        accessibilityRole="button"
        accessibilityLabel={visible ? "Hide password" : "Show password"}
        style={{
          position: "absolute",
          right: 14,
          top: 0,
          bottom: 0,
          justifyContent: "center",
        }}
      >
        <Feather
          name={visible ? "eye-off" : "eye"}
          size={20}
          color={authColors.muted}
        />
      </Pressable>
    </View>
  );
}
