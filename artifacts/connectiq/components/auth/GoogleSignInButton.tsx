import { Ionicons } from "@expo/vector-icons";
import { useSSO } from "@clerk/expo";
import * as AuthSession from "expo-auth-session";
import * as WebBrowser from "expo-web-browser";
import React, { useCallback, useEffect } from "react";
import { ActivityIndicator, Platform, Pressable, Text } from "react-native";

import { authColors, authStyles } from "./authStyles";

WebBrowser.maybeCompleteAuthSession();

export function GoogleSignInButton() {
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
        strategy: "oauth_google",
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
      console.error(JSON.stringify(err, null, 2));
    } finally {
      setLoading(false);
    }
  }, [startSSOFlow]);

  return (
    <Pressable
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
  );
}
