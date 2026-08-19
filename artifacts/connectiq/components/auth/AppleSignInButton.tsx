import { Ionicons } from "@expo/vector-icons";
import { useSSO } from "@clerk/expo";
import * as AuthSession from "expo-auth-session";
import * as WebBrowser from "expo-web-browser";
import React, { useCallback, useEffect } from "react";
import { ActivityIndicator, Platform, Pressable, Text } from "react-native";

import { authColors, authStyles } from "./authStyles";

WebBrowser.maybeCompleteAuthSession();

/**
 * Apple provides an equivalent privacy-preserving sign-in option for iOS
 * users. Clerk manages the OAuth flow and keeps Apple private-relay emails
 * intact when a user chooses to hide their address.
 */
export function AppleSignInButton() {
  const { startSSOFlow } = useSSO();
  const [loading, setLoading] = React.useState(false);

  useEffect(() => {
    if (Platform.OS !== "android") return;
    void WebBrowser.warmUpAsync();
    return () => {
      void WebBrowser.coolDownAsync();
    };
  }, []);

  const onPress = useCallback(async () => {
    try {
      setLoading(true);
      const { createdSessionId, setActive } = await startSSOFlow({
        strategy: "oauth_apple",
        redirectUrl: AuthSession.makeRedirectUri(),
      });

      if (createdSessionId && setActive) {
        // The auth guard in the root layout redirects once the session is active.
        await setActive({
          session: createdSessionId,
          navigate: async ({ session }) => {
            if (session?.currentTask) return;
          },
        });
      }
    } catch (err) {
      // Cancellation is expected when the user dismisses Apple's sheet.
      console.error(JSON.stringify(err, null, 2));
    } finally {
      setLoading(false);
    }
  }, [startSSOFlow]);

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel="Continue with Apple"
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
          <Ionicons name="logo-apple" size={20} color={authColors.text} />
          <Text style={authStyles.socialButtonText}>Continue with Apple</Text>
        </>
      )}
    </Pressable>
  );
}