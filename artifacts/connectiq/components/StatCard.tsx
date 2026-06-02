import { LinearGradient } from "expo-linear-gradient";
import React, { useEffect } from "react";
import { Platform, StyleSheet, Text, View, ViewStyle } from "react-native";
import Animated, {
  interpolate,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withSpring,
} from "react-native-reanimated";

import { useColors } from "@/hooks/useColors";

interface StatCardProps {
  label: string;
  value: string | number;
  subtitle?: string;
  colors: [string, string, ...string[]];
  icon: React.ReactNode;
  index?: number;
  style?: ViewStyle;
}

export function StatCard({
  label,
  value,
  subtitle,
  colors: gradColors,
  icon,
  index = 0,
  style,
}: StatCardProps) {
  const appColors = useColors();
  const progress = useSharedValue(0);

  useEffect(() => {
    progress.value = withDelay(
      100 + index * 80,
      withSpring(1, { damping: 15, stiffness: 100 })
    );
  }, [index, progress]);

  const animStyle = useAnimatedStyle(() => ({
    opacity: interpolate(progress.value, [0, 1], [0, 1]),
    transform: [
      { translateY: interpolate(progress.value, [0, 1], [16, 0]) },
      { scale: interpolate(progress.value, [0, 1], [0.95, 1]) },
    ],
  }));

  return (
    <Animated.View style={[{ flex: 1 }, animStyle, style]}>
      <LinearGradient
        colors={gradColors}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[
          styles.card,
          {
            borderRadius: appColors.radius,
            ...(Platform.OS !== "web"
              ? {
                  shadowColor: gradColors[0],
                  shadowOffset: { width: 0, height: 6 },
                  shadowOpacity: 0.3,
                  shadowRadius: 12,
                  elevation: 6,
                }
              : {}),
          },
        ]}
      >
        <View style={styles.iconWrap}>{icon}</View>
        <Text style={styles.value}>{value}</Text>
        <Text style={styles.label}>{label}</Text>
        {subtitle && <Text style={styles.subtitle}>{subtitle}</Text>}
      </LinearGradient>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  card: {
    padding: 16,
    minWidth: 120,
    flex: 1,
  },
  iconWrap: {
    marginBottom: 10,
  },
  value: {
    color: "#fff",
    fontSize: 24,
    fontWeight: "700" as const,
    letterSpacing: -0.5,
  },
  label: {
    color: "rgba(255,255,255,0.85)",
    fontSize: 12,
    marginTop: 2,
    fontWeight: "500" as const,
  },
  subtitle: {
    color: "rgba(255,255,255,0.65)",
    fontSize: 11,
    marginTop: 2,
  },
});
