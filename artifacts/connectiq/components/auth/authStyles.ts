import { StyleSheet, Platform } from "react-native";
import { theme } from "@/constants/theme";
import colors from "@/constants/colors";

// Assuming dark mode only as per requirements
const authDark = colors.dark;

export const authColors = {
  background: authDark.background,
  card: authDark.card,
  input: authDark.input,
  border: authDark.border,
  text: authDark.foreground,
  muted: authDark.mutedForeground,
  primary: authDark.primary,
  accent: authDark.accent,
  danger: authDark.destructive,
};

export const authStyles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: authColors.background,
  },
  scroll: {
    flexGrow: 1,
    justifyContent: "center",
    paddingHorizontal: theme.spacing[24],
    paddingVertical: theme.spacing[48],
  },
  brandRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: theme.spacing[28],
  },
  brandBadge: {
    width: 52,
    height: 52,
    borderRadius: theme.radius.lg,
    alignItems: "center",
    justifyContent: "center",
    marginRight: theme.spacing[12],
    ...theme.getShadow(authColors.primary, "sm"),
  },
  brandName: {
    color: authColors.text,
    ...theme.typography.h1,
  },
  title: {
    color: authColors.text,
    ...theme.typography.h2,
    textAlign: "center",
  },
  subtitle: {
    color: authColors.muted,
    ...theme.typography.body,
    textAlign: "center",
    marginTop: theme.spacing[6],
    marginBottom: theme.spacing[24],
  },
  label: {
    color: authColors.text,
    ...theme.typography.bodySmallSemi,
    marginBottom: theme.spacing[8],
    marginTop: theme.spacing[16],
  },
  input: {
    backgroundColor: authColors.input,
    borderWidth: 1,
    borderColor: authColors.border,
    borderRadius: theme.radius.lg,
    paddingHorizontal: theme.spacing[16],
    paddingVertical: theme.spacing[14],
    color: authColors.text,
    ...theme.typography.body,
  },
  inputError: {
    borderColor: authColors.danger,
  },
  error: {
    color: authColors.danger,
    ...theme.typography.caption,
    marginTop: theme.spacing[6],
  },
  button: {
    backgroundColor: authColors.primary,
    borderRadius: theme.radius.lg,
    paddingVertical: theme.spacing[16],
    alignItems: "center",
    justifyContent: "center",
    marginTop: theme.spacing[24],
    flexDirection: "row",
    ...theme.getShadow(authColors.primary, "sm"),
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  buttonPressed: {
    opacity: 0.85,
    transform: [{ scale: 0.98 }],
  },
  buttonText: {
    color: "#FFFFFF",
    ...theme.typography.bodyLargeSemi,
  },
  dividerRow: {
    flexDirection: "row",
    alignItems: "center",
    marginVertical: theme.spacing[24],
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: authColors.border,
  },
  dividerText: {
    color: authColors.muted,
    ...theme.typography.captionSemi,
    marginHorizontal: theme.spacing[12],
  },
  socialButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: authColors.card,
    borderWidth: 1,
    borderColor: authColors.border,
    borderRadius: theme.radius.lg,
    paddingVertical: theme.spacing[14],
  },
  socialButtonText: {
    color: authColors.text,
    ...theme.typography.bodySemi,
    marginLeft: theme.spacing[10],
  },
  footerRow: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    marginTop: theme.spacing[32],
  },
  footerText: {
    color: authColors.muted,
    ...theme.typography.body,
  },
  footerLink: {
    color: authColors.primary,
    ...theme.typography.bodySemi,
  },
});
