import { Feather } from "@expo/vector-icons";
import { useSignUp } from "@clerk/expo";
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

export default function SignUpScreen() {
  const { signUp, errors, fetchStatus } = useSignUp();

  const [emailAddress, setEmailAddress] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [code, setCode] = React.useState("");

  const busy = fetchStatus === "fetching";

  // The auth guard in the root layout redirects once the session is active.
  const finalizeNavigate = async ({
    session,
  }: {
    session?: { currentTask?: unknown } | null;
  }) => {
    if (session?.currentTask) return;
  };

  const handleSubmit = async () => {
    const { error } = await signUp.password({ emailAddress, password });
    if (error) {
      return;
    }
    await signUp.verifications.sendEmailCode();
  };

  const handleVerify = async () => {
    await signUp.verifications.verifyEmailCode({ code });
    if (signUp.status === "complete") {
      await signUp.finalize({ navigate: finalizeNavigate });
    }
  };

  const pendingVerification =
    signUp.status === "missing_requirements" &&
    signUp.unverifiedFields.includes("email_address") &&
    signUp.missingFields.length === 0;

  if (pendingVerification) {
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
              <Feather name="mail" size={26} color="#fff" />
            </View>
            <Text style={authStyles.brandName}>Verify</Text>
          </View>

          <Text style={authStyles.title}>Check your inbox</Text>
          <Text style={authStyles.subtitle}>
            We sent a verification code to {emailAddress}
          </Text>

          <Text style={authStyles.label}>Verification code</Text>
          <TextInput
            style={[authStyles.input, errors.fields.code && authStyles.inputError]}
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

          <Pressable
            style={authStyles.footerRow}
            onPress={() => signUp.verifications.sendEmailCode()}
          >
            <Text style={authStyles.footerText}>Didn&apos;t get it? </Text>
            <Text style={authStyles.footerLink}>Resend code</Text>
          </Pressable>
        </ScrollView>
      </KeyboardAvoidingView>
    );
  }

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

        <Text style={authStyles.title}>Create your account</Text>
        <Text style={authStyles.subtitle}>
          Start building smarter relationships
        </Text>

        <Text style={authStyles.label}>Email address</Text>
        <TextInput
          style={[
            authStyles.input,
            errors.fields.emailAddress && authStyles.inputError,
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
        {errors.fields.emailAddress && (
          <Text style={authStyles.error}>
            {errors.fields.emailAddress.message}
          </Text>
        )}

        <Text style={authStyles.label}>Password</Text>
        <PasswordInput
          value={password}
          placeholder="At least 8 characters"
          onChangeText={setPassword}
          textContentType="newPassword"
          hasError={!!errors.fields.password}
        />
        {errors.fields.password && (
          <Text style={authStyles.error}>{errors.fields.password.message}</Text>
        )}

        <Pressable
          style={({ pressed }) => [
            authStyles.button,
            (!emailAddress || !password || busy) && authStyles.buttonDisabled,
            pressed &&
              emailAddress &&
              password &&
              !busy &&
              authStyles.buttonPressed,
          ]}
          onPress={handleSubmit}
          disabled={!emailAddress || !password || busy}
        >
          <Text style={authStyles.buttonText}>
            {busy ? "Creating…" : "Create account"}
          </Text>
        </Pressable>

        <View style={authStyles.dividerRow}>
          <View style={authStyles.dividerLine} />
          <Text style={authStyles.dividerText}>or</Text>
          <View style={authStyles.dividerLine} />
        </View>

        <GoogleSignInButton />

        {/* Required for sign-up flows. Clerk's bot sign-up protection is enabled by default */}
        <View nativeID="clerk-captcha" />

        <View style={authStyles.footerRow}>
          <Text style={authStyles.footerText}>Already have an account? </Text>
          <Link href="/(auth)/sign-in" replace>
            <Text style={authStyles.footerLink}>Sign in</Text>
          </Link>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
