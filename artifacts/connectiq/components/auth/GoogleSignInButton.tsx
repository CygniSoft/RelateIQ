import { Ionicons } from "@expo/vector-icons";
import { useSSO } from "@clerk/expo";
import * as AuthSession from "expo-auth-session";
import * as WebBrowser from "expo-web-browser";
import React, { useCallback, useEffect } from "react";
import {
  ActivityIndicator,
  Platform,
  Pressable,
  Text,
  View,
} from "react-native";

import { authColors, authStyles } from "./authStyles";

WebBrowser.maybeCompleteAuthSession();

function getClerkErrorMessage(error: unknown): string {
  if (!error || typeof error !== "object") {
    return "Google sign-in could not complete. Please try again.";
  }

  const clerkErrors = (error as {
    errors?: Array<{ code?: string; longMessage?: string; message?: string }>;
  }).errors;
  const firstError = clerkErrors?.[0];
  const message = firstError?.longMessage || firstError?.message;

  return message
    ? `${message}${firstError?.code ? ` (${firstError.code})` : ""}`
    : "Google sign-in could not complete. Please try again.";
}

export function GoogleSignInButton() {
  const { startSSOFlow } = useSSO();
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  useEffect(() => {
    if (Platform.OS !== "android") return;
    void WebBrowser.warmUpAsync();
    return () => {
      void WebBrowser.coolDownAsync();
    };
  }, []);

  const onPress = useCallback(async () => {
    try {
      setError(null);
      setLoading(true);
      const {
        createdSessionId,
        setActive,
        signIn,
        signUp,
        authSessionResult,
      } =
        await startSSOFlow({
          strategy: "oauth_google",
          redirectUrl: AuthSession.makeRedirectUri({
            scheme: "relateiq",
            path: "oauth-redirect",
          }),
        });

      if (createdSessionId && setActive) {
        await setActive({
          session: createdSessionId,
          navigate: async ({ session }) => {
            if (session?.currentTask) {
              setError("Google sign-in needs another verification step.");
            }
          },
        });
      } else {
        const flowStatus = signIn?.status ?? signUp?.status;
        console.warn("Google SSO did not create a session", {
          signInStatus: signIn?.status,
          signUpStatus: signUp?.status,
          authSessionType: authSessionResult?.type,
        });
        setError(
          flowStatus
            ? `Google sign-in did not complete (${flowStatus}). Please try again.`
            : authSessionResult?.type === "cancel" ||
                authSessionResult?.type === "dismiss"
              ? "Google sign-in was cancelled."
            : "Google sign-in did not complete. Please try again.",
        );
      }
    } catch (err) {
      const message = getClerkErrorMessage(err);
      console.error("Google SSO failed", { message });
      setError(message);
    } finally {
      setLoading(false);
    }
  }, [startSSOFlow]);

  return (
    <View>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Continue with Google"
        style={({ pressed }) => [
          authStyles.socialButton,
          pressed && authStyles.buttonPressed,
        ]}
        onPress={onPress}
        disabled={loading}
      >
        {loading ? (
          <ActivityIndicator color={authColors.text} />
        ) : (
          <>
            <Ionicons name="logo-google" size={18} color={authColors.text} />
            <Text style={authStyles.socialButtonText}>Continue with Google</Text>
          </>
        )}
      </Pressable>
      {error && <Text style={authStyles.error}>{error}</Text>}
    </View>
  );
}
