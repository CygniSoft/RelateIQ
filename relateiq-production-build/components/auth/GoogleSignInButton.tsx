import { Ionicons } from "@expo/vector-icons";
import { useSSO } from "@clerk/expo";
import * as AuthSession from "expo-auth-session";
import * as WebBrowser from "expo-web-browser";
import { type Href, useRouter } from "expo-router";
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

export function GoogleSignInButton() {
  const { startSSOFlow } = useSSO();
  const router = useRouter();
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
      const { createdSessionId, setActive, signIn, signUp } =
        await startSSOFlow({
        strategy: "oauth_google",
        // Keep the production Android callback tied to the scheme registered
        // in app.json instead of relying on runtime scheme inference.
        redirectUrl: AuthSession.makeRedirectUri({ scheme: "relateiq" }),
      });

      if (createdSessionId && setActive) {
        await setActive({
          session: createdSessionId,
          navigate: async ({ session, decorateUrl }) => {
            if (session?.currentTask) {
              setError("Google sign-in needs another verification step.");
              return;
            }
            router.replace(decorateUrl("/") as Href);
          },
        });
      } else {
        console.warn("Google SSO did not create a session", {
          signInStatus: signIn?.status,
          signUpStatus: signUp?.status,
        });
        setError("Google sign-in did not complete. Please try again.");
      }
    } catch (err) {
      console.error(JSON.stringify(err, null, 2));
      setError("Google sign-in could not complete. Please try again.");
    } finally {
      setLoading(false);
    }
  }, [router, startSSOFlow]);

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
