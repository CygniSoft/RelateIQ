import { BlurView } from "expo-blur";
import { LinearGradient } from "expo-linear-gradient";
import React from "react";
import { Platform, StyleSheet, View, ViewStyle } from "react-native";

interface GlassIconProps {
  children: React.ReactNode;
  size?: number;
  radius?: number;
  tint?: string;
  style?: ViewStyle;
  intensity?: number;
}

/**
 * GlassIcon wraps any icon in a 3D "liquid glass" tile: a colored glow,
 * an extruded depth layer for dimensionality, then a frosted translucent
 * face (blur + diagonal color tint + top sheen) with a bright glass edge.
 * Pass the accent color via `tint` and keep the icon light (e.g. white)
 * for the best premium contrast.
 */
export function GlassIcon({
  children,
  size = 44,
  radius,
  tint = "#4F8EFF",
  style,
  intensity = 22,
}: GlassIconProps) {
  const br = radius ?? Math.round(size * 0.3);
  const depth = Math.max(2, Math.round(size * 0.07));

  return (
    <View style={[{ width: size, height: size }, style]}>
      {/* Colored ambient glow */}
      <View
        style={[
          StyleSheet.absoluteFill,
          {
            borderRadius: br + 4,
            backgroundColor: tint + "30",
            transform: [{ scale: 1.18 }],
          },
        ]}
      />
      {/* Extruded depth layer for 3D dimensionality */}
      <View
        style={{
          position: "absolute",
          left: depth,
          top: depth,
          width: size,
          height: size,
          borderRadius: br,
          backgroundColor: tint + "99",
          opacity: 0.55,
        }}
      />
      {/* Frosted glass face */}
      <View
        style={{
          width: size,
          height: size,
          borderRadius: br,
          overflow: "hidden",
          borderWidth: StyleSheet.hairlineWidth,
          borderColor: "rgba(255,255,255,0.3)",
          ...(Platform.OS !== "web"
            ? {
                shadowColor: tint,
                shadowOffset: { width: 0, height: 5 },
                shadowOpacity: 0.4,
                shadowRadius: 10,
              }
            : {}),
        }}
      >
        <BlurView
          intensity={intensity}
          tint="light"
          experimentalBlurMethod={Platform.OS === "android" ? "dimezisBlurView" : undefined}
          style={StyleSheet.absoluteFill}
        />
        <LinearGradient
          colors={[tint + "66", tint + "1F", "rgba(255,255,255,0.05)"]}
          start={{ x: 0.1, y: 0 }}
          end={{ x: 0.9, y: 1 }}
          style={StyleSheet.absoluteFill}
        />
        <LinearGradient
          colors={["rgba(255,255,255,0.55)", "rgba(255,255,255,0.06)", "transparent"]}
          start={{ x: 0, y: 0 }}
          end={{ x: 0, y: 0.7 }}
          style={StyleSheet.absoluteFill}
          pointerEvents="none"
        />
        <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
          {children}
        </View>
      </View>
    </View>
  );
}
