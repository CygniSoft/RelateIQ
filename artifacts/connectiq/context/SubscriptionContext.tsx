import { useAuth, useClerk } from "@clerk/expo";
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import { AppState, Platform } from "react-native";

import { fetchSubscription, type SubscriptionSummary } from "@/lib/billingApi";
import { sendHeartbeat } from "@/lib/sessionApi";

const HEARTBEAT_INTERVAL_MS = 45_000;

interface SubscriptionContextValue {
  subscription: SubscriptionSummary | null;
  isPro: boolean;
  loading: boolean;
  refresh: () => Promise<void>;
}

const SubscriptionContext = createContext<SubscriptionContextValue | undefined>(
  undefined,
);

function deviceLabel(): string {
  const os =
    Platform.OS === "ios" ? "iOS" : Platform.OS === "android" ? "Android" : "Web";
  return `${os} device`;
}

export function SubscriptionProvider({ children }: { children: React.ReactNode }) {
  const { isSignedIn, getToken } = useAuth();
  const { signOut } = useClerk();
  const [subscription, setSubscription] = useState<SubscriptionSummary | null>(null);
  const [loading, setLoading] = useState(false);
  const revokedRef = useRef(false);

  const refresh = useCallback(async () => {
    if (!isSignedIn) {
      setSubscription(null);
      return;
    }
    setLoading(true);
    try {
      const token = (await getToken()) ?? undefined;
      const summary = await fetchSubscription(token);
      setSubscription(summary);
    } catch {
      // Leave previous state in place on transient errors.
    } finally {
      setLoading(false);
    }
  }, [isSignedIn, getToken]);

  // Concurrent-session enforcement: heartbeat on an interval and on foreground.
  // When the server reports this device as revoked, sign the user out.
  const beat = useCallback(async () => {
    if (!isSignedIn || revokedRef.current) return;
    try {
      const token = (await getToken()) ?? undefined;
      const result = await sendHeartbeat(deviceLabel(), token);
      if (result.revoked && !revokedRef.current) {
        revokedRef.current = true;
        await signOut();
      }
    } catch {
      // Network hiccups shouldn't sign the user out; try again next tick.
    }
  }, [isSignedIn, getToken, signOut]);

  useEffect(() => {
    revokedRef.current = false;
    if (!isSignedIn) {
      setSubscription(null);
      return;
    }

    void refresh();
    void beat();

    const interval = setInterval(() => {
      void beat();
    }, HEARTBEAT_INTERVAL_MS);

    const sub = AppState.addEventListener("change", (state) => {
      if (state === "active") {
        void beat();
        void refresh();
      }
    });

    return () => {
      clearInterval(interval);
      sub.remove();
    };
  }, [isSignedIn, beat, refresh]);

  const value: SubscriptionContextValue = {
    subscription,
    isPro: subscription?.active ?? false,
    loading,
    refresh,
  };

  return (
    <SubscriptionContext.Provider value={value}>
      {children}
    </SubscriptionContext.Provider>
  );
}

export function useSubscription(): SubscriptionContextValue {
  const ctx = useContext(SubscriptionContext);
  if (!ctx) {
    throw new Error("useSubscription must be used within a SubscriptionProvider");
  }
  return ctx;
}
