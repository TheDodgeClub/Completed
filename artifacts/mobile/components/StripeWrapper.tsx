import React, { ReactNode, useState, useEffect } from "react";
import { View, ActivityIndicator, Text } from "react-native";
import { StripeProvider } from "@stripe/stripe-react-native";
import { getStripePublishableKey } from "@/lib/api";

type KeyState =
  | { status: "loading" }
  | { status: "ready"; key: string }
  | { status: "error" };

/**
 * Fetches the Stripe publishable key from the API before rendering
 * the StripeProvider. Blocks child render until the key is ready so
 * that no PaymentSheet call is attempted with an unconfigured SDK.
 * On error the app still renders but paid-ticket checkout routes will
 * surface a clear "payment unavailable" error rather than a cryptic
 * SDK failure.
 */
export function StripeWrapper({ children }: { children: ReactNode }) {
  const [keyState, setKeyState] = useState<KeyState>({ status: "loading" });

  useEffect(() => {
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

  if (keyState.status === "error") {
    // Render without StripeProvider — app works but doBuyTicket will show
    // "payment unavailable" rather than crashing the PaymentSheet SDK
    return (
      <>
        {children}
        {/* Stripe config unavailable — payment flows will surface this via doBuyTicket error handling */}
        <View style={{ display: "none" }}>
          <Text>stripe_unavailable</Text>
        </View>
      </>
    );
  }

  return (
    <StripeProvider
      publishableKey={keyState.key}
      urlScheme="mobile"
      merchantIdentifier="merchant.co.uk.thedodgeclub"
    >
      {children}
    </StripeProvider>
  );
}
