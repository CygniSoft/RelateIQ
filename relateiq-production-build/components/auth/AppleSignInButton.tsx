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

const appleRedirectUrl = AuthSession.makeRedirectUri({
  scheme: "relateiq",
  path: "sso-callback",
});

/**
 * Apple provides an equivalent privacy-preserving sign-in option for iOS
 * users. Clerk manages the OAuth flow and keeps Apple private-relay emails
 * intact when a user chooses to hide their address.
 */
export function AppleSignInButton() {
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
      const { createdSessionId, setActive } = await startSSOFlow({
        strategy: "oauth_apple",
        redirectUrl: appleRedirectUrl,
      });

      if (createdSessionId && setActive) {
        // The auth guard in the root layout redirects once the session is active.
        await setActive({
          session: createdSessionId,
          navigate: async ({ session }) => {
            if (session?.currentTask) return;
          },
        });
      } else {
        setError("Apple sign-in did not complete. Please try again.");
      }
    } catch (err) {
      console.error(JSON.stringify(err, null, 2));
      setError(
        Platform.OS === "web"
          ? "Apple sign-in is not enabled for this preview. It will be available in the TestFlight build."
          : "Apple sign-in could not start. Please try again.",
      );
    } finally {
      setLoading(false);
    }
  }, [startSSOFlow]);

  return (
    <View>
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
      {error && <Text style={authStyles.error}>{error}</Text>}
    </View>
  );
}