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
import { authColors, authStyles } from "@/components/auth/authStyles";

export default function SignInScreen() {
  const { signIn, errors, fetchStatus } = useSignIn();

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
        <TextInput
          style={[
            authStyles.input,
            errors.fields.password && authStyles.inputError,
          ]}
          value={password}
          placeholder="Enter your password"
          placeholderTextColor={authColors.muted}
          secureTextEntry
          onChangeText={setPassword}
          textContentType="password"
        />
        {errors.fields.password && (
          <Text style={authStyles.error}>{errors.fields.password.message}</Text>
        )}

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
