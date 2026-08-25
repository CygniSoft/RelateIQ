import { Platform } from "react-native";
import colors from "./colors";

export const spacing = {
  2: 2,
  4: 4,
  6: 6,
  8: 8,
  10: 10,
  12: 12,
  14: 14,
  16: 16,
  20: 20,
  24: 24,
  28: 28,
  32: 32,
  40: 40,
  48: 48,
  56: 56,
  64: 64,
};

export const radius = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  full: 9999,
};

export const typography = {
  h1: { fontSize: 28, fontWeight: "700" as const, letterSpacing: -0.5, fontFamily: "Inter_700Bold" },
  h2: { fontSize: 24, fontWeight: "700" as const, letterSpacing: -0.4, fontFamily: "Inter_700Bold" },
  h3: { fontSize: 20, fontWeight: "700" as const, letterSpacing: -0.3, fontFamily: "Inter_700Bold" },
  h4: { fontSize: 18, fontWeight: "600" as const, letterSpacing: -0.2, fontFamily: "Inter_600SemiBold" },
  bodyLarge: { fontSize: 16, fontWeight: "400" as const, fontFamily: "Inter_400Regular" },
  bodyLargeSemi: { fontSize: 16, fontWeight: "600" as const, fontFamily: "Inter_600SemiBold" },
  body: { fontSize: 14, fontWeight: "400" as const, fontFamily: "Inter_400Regular" },
  bodySemi: { fontSize: 14, fontWeight: "600" as const, fontFamily: "Inter_600SemiBold" },
  bodySmall: { fontSize: 13, fontWeight: "400" as const, fontFamily: "Inter_400Regular" },
  bodySmallSemi: { fontSize: 13, fontWeight: "600" as const, fontFamily: "Inter_600SemiBold" },
  caption: { fontSize: 12, fontWeight: "400" as const, fontFamily: "Inter_400Regular" },
  captionSemi: { fontSize: 12, fontWeight: "600" as const, fontFamily: "Inter_600SemiBold" },
  label: { fontSize: 11, fontWeight: "600" as const, textTransform: "uppercase" as const, letterSpacing: 0.5, fontFamily: "Inter_600SemiBold" },
};

export const shadows = {
  none: {},
  sm: Platform.OS !== "web" ? {
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 2,
  } : {},
  md: Platform.OS !== "web" ? {
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  } : {},
  lg: Platform.OS !== "web" ? {
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.4,
    shadowRadius: 16,
    elevation: 8,
  } : {},
};

export const getShadow = (color: string, size: "sm" | "md" | "lg" = "md") => {
  if (Platform.OS === "web") return {};
  const base = shadows[size] as any;
  return {
    ...base,
    shadowColor: color,
  };
};

export const theme = {
  spacing,
  radius,
  typography,
  shadows,
  getShadow,
};
