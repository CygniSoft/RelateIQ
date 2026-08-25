import { LinearGradient } from "expo-linear-gradient";
import React, { useEffect } from "react";
import { Platform, StyleSheet, Text, ViewStyle } from "react-native";
import Animated, {
  interpolate,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withSpring,
} from "react-native-reanimated";

import { GlassIcon } from "@/components/GlassIcon";
import { useColors } from "@/hooks/useColors";
import { theme } from "@/constants/theme";

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
            borderRadius: theme.radius.lg,
            ...theme.getShadow(gradColors[0], "md"),
          },
        ]}
      >
        <GlassIcon tint={gradColors[0]} size={36} style={styles.iconWrap}>
          {icon}
        </GlassIcon>
        <Text style={styles.value}>{value}</Text>
        <Text style={styles.label}>{label}</Text>
        {subtitle && <Text style={styles.subtitle}>{subtitle}</Text>}
      </LinearGradient>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  card: {
    padding: theme.spacing[16],
    minWidth: 120,
    flex: 1,
  },
  iconWrap: {
    marginBottom: theme.spacing[10],
  },
  value: {
    color: "#fff",
    ...theme.typography.h2,
  },
  label: {
    color: "rgba(255,255,255,0.85)",
    ...theme.typography.captionSemi,
    marginTop: 2,
  },
  subtitle: {
    color: "rgba(255,255,255,0.65)",
    ...theme.typography.caption,
    marginTop: 2,
  },
});
