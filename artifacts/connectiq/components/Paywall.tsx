import { Feather, Ionicons } from "@expo/vector-icons";
import { useAuth } from "@clerk/expo";
import * as WebBrowser from "expo-web-browser";
import * as Linking from "expo-linking";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  Text,
  View,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useColors } from "@/hooks/useColors";
import { useSubscription } from "@/context/SubscriptionContext";
import { createCheckout, fetchPlans, type Plan, type PlanPrice } from "@/lib/billingApi";

const FEATURES = [
  "Unlimited business-card scanning",
  "AI-generated introduction emails",
  "Smart follow-up reminders",
  "ROI & relationship analytics",
];

function formatPrice(price: PlanPrice): string {
  const amount =
    price.unitAmount != null ? (price.unitAmount / 100).toFixed(2).replace(/\.00$/, "") : "—";
  const symbol = price.currency === "usd" ? "$" : `${price.currency.toUpperCase()} `;
  const period = price.interval === "year" ? "yr" : price.interval === "month" ? "mo" : "";
  return `${symbol}${amount}${period ? `/${period}` : ""}`;
}

export function Paywall({
  visible,
  onClose,
}: {
  visible: boolean;
  onClose: () => void;
}) {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { getToken } = useAuth();
  const { refresh } = useSubscription();

  const [plans, setPlans] = useState<Plan[]>([]);
  const [selectedPriceId, setSelectedPriceId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [checkingOut, setCheckingOut] = useState(false);

  // Load plans only when the paywall opens. We intentionally key this effect on
  // `visible` alone — `getToken` is not referentially stable across renders, so
  // depending on a callback that closes over it would re-run every render and
  // flood the products endpoint.
  useEffect(() => {
    if (!visible) return;
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const token = (await getToken()) ?? undefined;
        const result = await fetchPlans(token);
        if (cancelled) return;
        setPlans(result);
        const firstPrice = result[0]?.prices[0]?.id ?? null;
        setSelectedPriceId((prev) => prev ?? firstPrice);
      } catch {
        // Surface nothing destructive; the empty state covers it.
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible]);

  const allPrices: PlanPrice[] = plans.flatMap((p) => p.prices);

  function notify(title: string, message: string) {
    if (Platform.OS === "web") window.alert(`${title}\n\n${message}`);
    else Alert.alert(title, message);
  }

  async function handleSubscribe() {
    if (!selectedPriceId || checkingOut) return;
    setCheckingOut(true);
    try {
      const token = (await getToken()) ?? undefined;
      const returnUrl = Linking.createURL("/profile");
      const checkoutUrl = await createCheckout(selectedPriceId, returnUrl, token);

      if (Platform.OS === "web") {
        window.location.href = checkoutUrl;
        return;
      }

      const result = await WebBrowser.openAuthSessionAsync(checkoutUrl, returnUrl);
      if (result.type === "success") {
        // Give Stripe's webhook a moment, then refresh status.
        await new Promise((r) => setTimeout(r, 1500));
        await refresh();
        onClose();
      }
    } catch (err) {
      notify(
        "Checkout failed",
        err instanceof Error ? err.message : "Please try again.",
      );
    } finally {
      setCheckingOut(false);
    }
  }

  const proPlan = plans[0];

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet">
      <View style={{ flex: 1, backgroundColor: colors.background }}>
        <View
          style={{
            flexDirection: "row",
            justifyContent: "flex-end",
            paddingHorizontal: 20,
            paddingTop: insets.top + 12,
          }}
        >
          <Pressable onPress={onClose} hitSlop={12}>
            <Ionicons name="close" size={26} color={colors.mutedForeground} />
          </Pressable>
        </View>

        <ScrollView
          contentContainerStyle={{ padding: 24, paddingBottom: insets.bottom + 32 }}
          showsVerticalScrollIndicator={false}
        >
          <LinearGradient
            colors={["#7B5EFF", "#4F8EFF"]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={{
              width: 64,
              height: 64,
              borderRadius: 18,
              alignItems: "center",
              justifyContent: "center",
              marginBottom: 20,
            }}
          >
            <Ionicons name="sparkles" size={30} color="#fff" />
          </LinearGradient>

          <Text
            style={{
              color: colors.foreground,
              fontSize: 28,
              fontWeight: "700" as const,
              letterSpacing: -0.5,
            }}
          >
            Upgrade to {proPlan?.name ?? "RelateIQ+ Pro"}
          </Text>
          <Text
            style={{
              color: colors.mutedForeground,
              fontSize: 15,
              marginTop: 8,
              lineHeight: 21,
            }}
          >
            {proPlan?.description ??
              "Unlock scanning and AI-assisted introductions to grow your network faster."}
          </Text>

          <View style={{ marginTop: 28, gap: 14 }}>
            {FEATURES.map((feature) => (
              <View
                key={feature}
                style={{ flexDirection: "row", alignItems: "center", gap: 12 }}
              >
                <View
                  style={{
                    width: 24,
                    height: 24,
                    borderRadius: 12,
                    backgroundColor: colors.primary + "22",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <Feather name="check" size={14} color={colors.primary} />
                </View>
                <Text style={{ color: colors.foreground, fontSize: 15, flex: 1 }}>
                  {feature}
                </Text>
              </View>
            ))}
          </View>

          <View style={{ marginTop: 32, gap: 12 }}>
            {loading ? (
              <ActivityIndicator color={colors.primary} style={{ marginVertical: 24 }} />
            ) : allPrices.length === 0 ? (
              <Text
                style={{
                  color: colors.mutedForeground,
                  fontSize: 14,
                  textAlign: "center",
                  marginVertical: 24,
                }}
              >
                Plans are unavailable right now. Please try again later.
              </Text>
            ) : (
              allPrices.map((price) => {
                const active = selectedPriceId === price.id;
                const isYear = price.interval === "year";
                return (
                  <Pressable
                    key={price.id}
                    onPress={() => setSelectedPriceId(price.id)}
                    style={{
                      flexDirection: "row",
                      alignItems: "center",
                      justifyContent: "space-between",
                      borderWidth: 1.5,
                      borderColor: active ? colors.primary : colors.border,
                      backgroundColor: active ? colors.primary + "14" : colors.card,
                      borderRadius: 16,
                      padding: 18,
                    }}
                  >
                    <View>
                      <Text
                        style={{
                          color: colors.foreground,
                          fontSize: 16,
                          fontWeight: "600" as const,
                        }}
                      >
                        {isYear ? "Annual" : "Monthly"}
                      </Text>
                      {isYear ? (
                        <Text style={{ color: colors.accent, fontSize: 12, marginTop: 2 }}>
                          Best value
                        </Text>
                      ) : null}
                    </View>
                    <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
                      <Text
                        style={{
                          color: colors.foreground,
                          fontSize: 18,
                          fontWeight: "700" as const,
                        }}
                      >
                        {formatPrice(price)}
                      </Text>
                      <View
                        style={{
                          width: 22,
                          height: 22,
                          borderRadius: 11,
                          borderWidth: 2,
                          borderColor: active ? colors.primary : colors.border,
                          backgroundColor: active ? colors.primary : "transparent",
                          alignItems: "center",
                          justifyContent: "center",
                        }}
                      >
                        {active ? <Feather name="check" size={12} color="#fff" /> : null}
                      </View>
                    </View>
                  </Pressable>
                );
              })
            )}
          </View>

          <Pressable
            onPress={handleSubscribe}
            disabled={!selectedPriceId || checkingOut}
            style={{ marginTop: 28, opacity: !selectedPriceId || checkingOut ? 0.6 : 1 }}
          >
            <LinearGradient
              colors={["#7B5EFF", "#4F8EFF"]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={{
                paddingVertical: 17,
                borderRadius: 16,
                alignItems: "center",
              }}
            >
              {checkingOut ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={{ color: "#fff", fontSize: 16, fontWeight: "700" as const }}>
                  Continue
                </Text>
              )}
            </LinearGradient>
          </Pressable>

          <Text
            style={{
              color: colors.mutedForeground,
              fontSize: 12,
              textAlign: "center",
              marginTop: 16,
              lineHeight: 18,
            }}
          >
            Secure checkout via Stripe. Cancel anytime from your profile.
          </Text>
        </ScrollView>
      </View>
    </Modal>
  );
}
