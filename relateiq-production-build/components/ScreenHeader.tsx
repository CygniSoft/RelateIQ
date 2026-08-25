import React from "react";
import { View, Text, Platform } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { theme } from "@/constants/theme";
import { useColors } from "@/hooks/useColors";

interface ScreenHeaderProps {
  title: string;
  subtitle?: string;
  rightElement?: React.ReactNode;
}

export function ScreenHeader({ title, subtitle, rightElement }: ScreenHeaderProps) {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const topPad = Platform.OS === "web" ? 67 : insets.top;

  return (
    <View
      style={{
        paddingTop: topPad + theme.spacing[16],
        paddingHorizontal: theme.spacing[20],
        paddingBottom: theme.spacing[16],
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
      }}
    >
      <View style={{ flex: 1 }}>
        {subtitle && (
          <Text style={{ color: colors.mutedForeground, ...theme.typography.bodySmallSemi, marginBottom: theme.spacing[2] }}>
            {subtitle}
          </Text>
        )}
        <Text
          style={{
            color: colors.foreground,
            ...theme.typography.h1,
          }}
        >
          {title}
        </Text>
      </View>
      {rightElement && <View style={{ marginLeft: theme.spacing[16] }}>{rightElement}</View>}
    </View>
  );
}
