import { Feather } from "@expo/vector-icons";
import { useSignIn } from "@clerk/expo";
import { Link } from "expo-router";
import React from "react";
import {
  Image,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from "react-native";

import { GoogleSignInButton } from "@/components/auth/GoogleSignInButton";
import { PasswordInput } from "@/components/auth/PasswordInput";
import { authColors, authStyles } from "@/components/auth/authStyles";

export default function SignInScreen() {
  const { signIn, errors, fetchStatus } = useSignIn();

  const [emailAddress, setEmailAddress] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [code, setCode] = React.useState("");

  // Forgot-password flow state
  const [resetStage, setResetStage] = React.useState<"none" | "code">("none");
  const [resetCode, setResetCode] = React.useState("");
  const [newPassword, setNewPassword] = React.useState("");
  // Error shown only on the main sign-in screen (e.g. "enter your email first")
  const [signInHint, setSignInHint] = React.useState<string | null>(null);
  // Error shown only on the reset-flow screens
  const [resetError, setResetError] = React.useState<string | null>(null);

  const busy = fetchStatus === "fetching";

  // Keep local reset UI state in sync with Clerk's sign-in state: if the
  // sign-in attempt was reset/abandoned (status back to needs_identifier),
  // drop any stale reset-flow state so the user isn't trapped on the wrong screen.
  React.useEffect(() => {
    if (resetStage === "code" && signIn.status === "needs_identifier") {
      setResetStage("none");
      setResetCode("");
      setNewPassword("");
      setResetError(null);
    }
  }, [signIn.status, resetStage]);

  // The auth guard in the root layout redirects once the session is active.
  const finalizeNavigate = async ({
    session,
  }: {
    session?: { currentTask?: unknown } | null;
  }) => {
    if (session?.currentTask) return;
  };

  const handleSubmit = async () => {
    const { error } = await signIn.password({ emailAddress, password });
    if (error) {
      return;
    }

    if (signIn.status === "complete") {
      await signIn.finalize({ navigate: finalizeNavigate });
    } else if (signIn.status === "needs_client_trust") {
      const emailCodeFactor = signIn.supportedSecondFactors?.find(
        (factor) => factor.strategy === "email_code",
      );
      if (emailCodeFactor) {
        await signIn.mfa.sendEmailCode();
      }
    }
  };

  const handleVerify = async () => {
    await signIn.mfa.verifyEmailCode({ code });
    if (signIn.status === "complete") {
      await signIn.finalize({ navigate: finalizeNavigate });
    }
  };

  const handleForgotPassword = async () => {
    setResetError(null);
    setSignInHint(null);
    if (!emailAddress.trim()) {
      setSignInHint("Enter your email address first, then tap Forgot password.");
      return;
    }
    const { error: createError } = await signIn.create({
      identifier: emailAddress.trim(),
    });
    if (createError) {
      setResetError(createError.message);
      return;
    }
    const { error } = await signIn.resetPasswordEmailCode.sendCode();
    if (error) {
      setResetError(error.message);
      return;
    }
    setResetCode("");
    setResetStage("code");
  };

  const handleVerifyResetCode = async () => {
    setResetError(null);
    const { error } = await signIn.resetPasswordEmailCode.verifyCode({
      code: resetCode,
    });
    if (error) {
      setResetError(error.message);
    }
    // On success signIn.status becomes "needs_new_password".
  };

  const handleSubmitNewPassword = async () => {
    setResetError(null);
    const { error } = await signIn.resetPasswordEmailCode.submitPassword({
      password: newPassword,
      signOutOfOtherSessions: true,
    });
    if (error) {
      setResetError(error.message);
      return;
    }
    if (signIn.status === "complete") {
      await signIn.finalize({ navigate: finalizeNavigate });
    }
  };

  const cancelReset = () => {
    signIn.reset();
    setResetStage("none");
    setResetCode("");
    setNewPassword("");
    setResetError(null);
  };

  const resetHeader = (
    <View style={authStyles.brandRow}>
      <View style={[authStyles.brandBadge, { backgroundColor: authColors.accent }]}>
        <Feather name="key" size={26} color="#fff" />
      </View>
      <Text style={authStyles.brandName}>Reset password</Text>
    </View>
  );

  if (signIn.status === "needs_new_password") {
    return (
      <KeyboardAvoidingView
        style={authStyles.screen}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <ScrollView
          contentContainerStyle={authStyles.scroll}
          keyboardShouldPersistTaps="handled"
        >
          {resetHeader}

          <Text style={authStyles.title}>Choose a new password</Text>
          <Text style={authStyles.subtitle}>
            Your code was verified. Set a new password for your account.
          </Text>

          <Text style={authStyles.label}>New password</Text>
          <PasswordInput
            value={newPassword}
            placeholder="Enter a new password"
            onChangeText={setNewPassword}
            textContentType="newPassword"
            hasError={!!errors.fields.password}
          />
          {errors.fields.password && (
            <Text style={authStyles.error}>
              {errors.fields.password.message}
            </Text>
          )}
          {resetError && <Text style={authStyles.error}>{resetError}</Text>}

          <Pressable
            style={({ pressed }) => [
              authStyles.button,
              (!newPassword || busy) && authStyles.buttonDisabled,
              pressed && newPassword && !busy && authStyles.buttonPressed,
            ]}
            onPress={handleSubmitNewPassword}
            disabled={!newPassword || busy}
          >
            <Text style={authStyles.buttonText}>
              {busy ? "Updating…" : "Update password & sign in"}
            </Text>
          </Pressable>

          <View style={authStyles.footerRow}>
            <Pressable onPress={cancelReset}>
              <Text style={authStyles.footerLink}>Back to sign in</Text>
            </Pressable>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    );
  }

  if (resetStage === "code") {
    return (
      <KeyboardAvoidingView
        style={authStyles.screen}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <ScrollView
          contentContainerStyle={authStyles.scroll}
          keyboardShouldPersistTaps="handled"
        >
          {resetHeader}

          <Text style={authStyles.title}>Check your email</Text>
          <Text style={authStyles.subtitle}>
            We sent a password reset code to {emailAddress.trim()}
          </Text>

          <Text style={authStyles.label}>Reset code</Text>
          <TextInput
            style={[
              authStyles.input,
              errors.fields.code && authStyles.inputError,
            ]}
            value={resetCode}
            placeholder="Enter the 6-digit code"
            placeholderTextColor={authColors.muted}
            onChangeText={setResetCode}
            keyboardType="number-pad"
            textContentType="oneTimeCode"
          />
          {errors.fields.code && (
            <Text style={authStyles.error}>{errors.fields.code.message}</Text>
          )}
          {resetError && <Text style={authStyles.error}>{resetError}</Text>}

          <Pressable
            style={({ pressed }) => [
              authStyles.button,
              (!resetCode || busy) && authStyles.buttonDisabled,
              pressed && resetCode && !busy && authStyles.buttonPressed,
            ]}
            onPress={handleVerifyResetCode}
            disabled={!resetCode || busy}
          >
            <Text style={authStyles.buttonText}>
              {busy ? "Verifying…" : "Verify code"}
            </Text>
          </Pressable>

          <View style={authStyles.footerRow}>
            <Pressable onPress={handleForgotPassword} disabled={busy}>
              <Text style={authStyles.footerLink}>Resend code</Text>
            </Pressable>
            <Text style={authStyles.footerText}>   ·   </Text>
            <Pressable onPress={cancelReset}>
              <Text style={authStyles.footerLink}>Back to sign in</Text>
            </Pressable>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    );
  }

  if (signIn.status === "needs_client_trust") {
    return (
      <KeyboardAvoidingView
        style={authStyles.screen}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <ScrollView
          contentContainerStyle={authStyles.scroll}
          keyboardShouldPersistTaps="handled"
        >
          <View style={authStyles.brandRow}>
            <View
              style={[
                authStyles.brandBadge,
                { backgroundColor: authColors.accent },
              ]}
            >
              <Feather name="shield" size={26} color="#fff" />
            </View>
            <Text style={authStyles.brandName}>Verify</Text>
          </View>

          <Text style={authStyles.title}>Verify your account</Text>
          <Text style={authStyles.subtitle}>
            Enter the verification code we just sent you
          </Text>

          <Text style={authStyles.label}>Verification code</Text>
          <TextInput
            style={[
              authStyles.input,
              errors.fields.code && authStyles.inputError,
            ]}
            value={code}
            placeholder="Enter the 6-digit code"
            placeholderTextColor={authColors.muted}
            onChangeText={setCode}
            keyboardType="number-pad"
            textContentType="oneTimeCode"
          />
          {errors.fields.code && (
            <Text style={authStyles.error}>{errors.fields.code.message}</Text>
          )}

          <Pressable
            style={({ pressed }) => [
              authStyles.button,
              (!code || busy) && authStyles.buttonDisabled,
              pressed && code && !busy && authStyles.buttonPressed,
            ]}
            onPress={handleVerify}
            disabled={!code || busy}
          >
            <Text style={authStyles.buttonText}>
              {busy ? "Verifying…" : "Verify & continue"}
            </Text>
          </Pressable>
        </ScrollView>
      </KeyboardAvoidingView>
    );
  }

  const disabled = !emailAddress || !password || busy;

  return (
    <KeyboardAvoidingView
      style={authStyles.screen}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <ScrollView
        contentContainerStyle={authStyles.scroll}
        keyboardShouldPersistTaps="handled"
      >
        <View style={authStyles.brandRow}>
          <View style={[authStyles.brandBadge, { backgroundColor: "#fff" }]}>
            <Image
              source={require("@/assets/images/logo-mark.png")}
              style={{ width: 40, height: 40 }}
              resizeMode="contain"
            />
          </View>
          <Text style={authStyles.brandName}>RelateIQ+</Text>
        </View>

        <Text style={authStyles.title}>Welcome back</Text>
        <Text style={authStyles.subtitle}>Sign in to access your network</Text>

        <Text style={authStyles.label}>Email address</Text>
        <TextInput
          style={[
            authStyles.input,
            errors.fields.identifier && authStyles.inputError,
          ]}
          autoCapitalize="none"
          autoCorrect={false}
          value={emailAddress}
          placeholder="you@example.com"
          placeholderTextColor={authColors.muted}
          onChangeText={setEmailAddress}
          keyboardType="email-address"
          textContentType="emailAddress"
        />
        {errors.fields.identifier && (
          <Text style={authStyles.error}>
            {errors.fields.identifier.message}
          </Text>
        )}

        <Text style={authStyles.label}>Password</Text>
        <PasswordInput
          value={password}
          placeholder="Enter your password"
          onChangeText={setPassword}
          textContentType="password"
          hasError={!!errors.fields.password}
        />
        {errors.fields.password && (
          <Text style={authStyles.error}>{errors.fields.password.message}</Text>
        )}
        {signInHint && <Text style={authStyles.error}>{signInHint}</Text>}

        <View style={{ alignItems: "flex-end", marginTop: 10 }}>
          <Pressable onPress={handleForgotPassword} disabled={busy} hitSlop={8}>
            <Text style={authStyles.footerLink}>Forgot password?</Text>
          </Pressable>
        </View>

        <Pressable
          style={({ pressed }) => [
            authStyles.button,
            disabled && authStyles.buttonDisabled,
            pressed && !disabled && authStyles.buttonPressed,
          ]}
          onPress={handleSubmit}
          disabled={disabled}
        >
          <Text style={authStyles.buttonText}>
            {busy ? "Signing in…" : "Sign in"}
          </Text>
        </Pressable>

        <View style={authStyles.dividerRow}>
          <View style={authStyles.dividerLine} />
          <Text style={authStyles.dividerText}>or</Text>
          <View style={authStyles.dividerLine} />
        </View>

        <GoogleSignInButton />

        <View style={authStyles.footerRow}>
          <Text style={authStyles.footerText}>Don&apos;t have an account? </Text>
          <Link href="/(auth)/sign-up" replace>
            <Text style={authStyles.footerLink}>Sign up</Text>
          </Link>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
