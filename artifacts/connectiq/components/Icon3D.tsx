import { LinearGradient } from "expo-linear-gradient";
import React, { useEffect } from "react";
import { Platform, StyleSheet, View, ViewStyle } from "react-native";
import Animated, {
  interpolate,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withSpring,
} from "react-native-reanimated";

import { useColors } from "@/hooks/useColors";

interface IconConfig {
  topColors: [string, string, ...string[]];
  shadowColor: string;
  glowColor: string;
}

const ICON_CONFIGS: Record<string, IconConfig> = {
  home: {
    topColors: ["#3B82F6", "#1D4ED8"],
    shadowColor: "#1E3A8A",
    glowColor: "rgba(59,130,246,0.35)",
  },
  scan: {
    topColors: ["#7B5EFF", "#4F46E5"],
    shadowColor: "#3730A3",
    glowColor: "rgba(123,94,255,0.4)",
  },
  contacts: {
    topColors: ["#10B981", "#059669"],
    shadowColor: "#065F46",
    glowColor: "rgba(16,185,129,0.35)",
  },
  events: {
    topColors: ["#F59E0B", "#D97706"],
    shadowColor: "#92400E",
    glowColor: "rgba(245,158,11,0.35)",
  },
  profile: {
    topColors: ["#EC4899", "#BE185D"],
    shadowColor: "#9D174D",
    glowColor: "rgba(236,72,153,0.35)",
  },
  email: {
    topColors: ["#3B82F6", "#2563EB"],
    shadowColor: "#1E40AF",
    glowColor: "rgba(59,130,246,0.3)",
  },
  ai: {
    topColors: ["#7B5EFF", "#6D28D9"],
    shadowColor: "#4C1D95",
    glowColor: "rgba(123,94,255,0.4)",
  },
  roi: {
    topColors: ["#10B981", "#047857"],
    shadowColor: "#064E3B",
    glowColor: "rgba(16,185,129,0.4)",
  },
  reminder: {
    topColors: ["#F59E0B", "#B45309"],
    shadowColor: "#78350F",
    glowColor: "rgba(245,158,11,0.3)",
  },
  deal: {
    topColors: ["#EF4444", "#DC2626"],
    shadowColor: "#991B1B",
    glowColor: "rgba(239,68,68,0.35)",
  },
};

interface Icon3DProps {
  type: keyof typeof ICON_CONFIGS;
  size?: number;
  children: React.ReactNode;
  style?: ViewStyle;
  delay?: number;
  animated?: boolean;
}

export function Icon3D({
  type,
  size = 56,
  children,
  style,
  delay = 0,
  animated = true,
}: Icon3DProps) {
  const config = ICON_CONFIGS[type] ?? ICON_CONFIGS.home;
  const progress = useSharedValue(0);
  const borderRadius = size * 0.28;

  useEffect(() => {
    if (animated) {
      progress.value = withDelay(
        delay,
        withSpring(1, { damping: 14, stiffness: 100 })
      );
    } else {
      progress.value = 1;
    }
  }, [animated, delay, progress]);

  const animStyle = useAnimatedStyle(() => ({
    opacity: interpolate(progress.value, [0, 1], [0, 1]),
    transform: [
      { scale: interpolate(progress.value, [0, 1], [0.7, 1]) },
    ],
  }));

  const depthOffset = size * 0.08;

  return (
    <Animated.View style={[{ width: size, height: size }, animStyle, style]}>
      {/* Glow */}
      <View
        style={[
          StyleSheet.absoluteFill,
          {
            borderRadius: borderRadius + 4,
            backgroundColor: config.glowColor,
            transform: [{ scale: 1.25 }],
          },
        ]}
      />
      {/* Depth shadow layer */}
      <View
        style={{
          position: "absolute",
          left: depthOffset,
          top: depthOffset,
          width: size,
          height: size,
          borderRadius,
          backgroundColor: config.shadowColor,
          opacity: 0.7,
        }}
      />
      {/* Side face */}
      <View
        style={{
          position: "absolute",
          left: depthOffset * 0.5,
          top: depthOffset * 0.5,
          width: size,
          height: size,
          borderRadius,
          backgroundColor: config.topColors[1],
          opacity: 0.85,
        }}
      />
      {/* Top face */}
      <LinearGradient
        colors={config.topColors}
        start={{ x: 0.1, y: 0 }}
        end={{ x: 0.9, y: 1 }}
        style={{
          position: "absolute",
          left: 0,
          top: 0,
          width: size,
          height: size,
          borderRadius,
          alignItems: "center",
          justifyContent: "center",
          ...(Platform.OS !== "web"
            ? {
                shadowColor: config.shadowColor,
                shadowOffset: { width: 0, height: 4 },
                shadowOpacity: 0.5,
                shadowRadius: 8,
              }
            : {}),
        }}
      >
        {/* Inner highlight */}
        <View
          style={{
            position: "absolute",
            top: 2,
            left: 4,
            right: 4,
            height: size * 0.35,
            borderTopLeftRadius: borderRadius,
            borderTopRightRadius: borderRadius,
            backgroundColor: "rgba(255,255,255,0.15)",
          }}
        />
        {children}
      </LinearGradient>
    </Animated.View>
  );
}

export { ICON_CONFIGS };
