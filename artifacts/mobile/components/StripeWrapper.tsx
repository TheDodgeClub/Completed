import React, { ReactNode, useState, useEffect } from "react";
import { View, ActivityIndicator, Text } from "react-native";
import Constants from "expo-constants";
import { getStripePublishableKey } from "@/lib/api";

const isExpoGo = Constants.executionEnvironment === "storeClient";

// Only load the Stripe native module outside of Expo Go.
// Static top-level import crashes Expo Go because the OnrampSdk native
// binary isn't registered there — lazy require avoids that entirely.
let StripeProvider: React.ComponentType<any> | null = null;
if (!isExpoGo) {
  try {
    StripeProvider = require("@stripe/stripe-react-native").StripeProvider;
  } catch {
    StripeProvider = null;
  }
}

type KeyState =
  | { status: "loading" }
  | { status: "ready"; key: string }
  | { status: "error" };

export function StripeWrapper({ children }: { children: ReactNode }) {
  const [keyState, setKeyState] = useState<KeyState>(
    isExpoGo ? { status: "error" } : { status: "loading" }
  );

  useEffect(() => {
    if (isExpoGo) return;
    let cancelled = false;
    getStripePublishableKey()
      .then((key) => {
        if (!cancelled && key) setKeyState({ status: "ready", key });
        else if (!cancelled) setKeyState({ status: "error" });
      })
      .catch(() => {
        if (!cancelled) setKeyState({ status: "error" });
      });
    return () => {
      cancelled = true;
    };
  }, []);

  if (keyState.status === "loading") {
    return (
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: "#0B5E2F" }}>
        <ActivityIndicator color="#FFD700" />
      </View>
    );
  }

  if (keyState.status === "error" || !StripeProvider) {
    return (
      <>
        {children}
        <View style={{ display: "none" }}>
          <Text>stripe_unavailable</Text>
        </View>
      </>
    );
  }

  return (
    <StripeProvider
      publishableKey={(keyState as { status: "ready"; key: string }).key}
      urlScheme="mobile"
      merchantIdentifier="merchant.co.uk.thedodgeclub"
    >
      {children}
    </StripeProvider>
  );
}
