import React, { ReactNode, useState, useEffect } from "react";
import { View, ActivityIndicator } from "react-native";
import { StripeProvider } from "@stripe/stripe-react-native";
import { getStripePublishableKey } from "@/lib/api";

type KeyState =
  | { status: "loading" }
  | { status: "ready"; key: string }
  | { status: "error" };

export function StripeWrapper({ children }: { children: ReactNode }) {
  const [keyState, setKeyState] = useState<KeyState>({ status: "loading" });

  useEffect(() => {
    let cancelled = false;
    getStripePublishableKey()
      .then((key) => {
        if (!cancelled) setKeyState({ status: "ready", key });
      })
      .catch(() => {
        if (!cancelled) setKeyState({ status: "error" });
      });
    return () => { cancelled = true; };
  }, []);

  if (keyState.status === "loading") {
    return (
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: "#0B5E2F" }}>
        <ActivityIndicator color="#FFD700" />
      </View>
    );
  }

  if (keyState.status === "error") {
    return <>{children}</>;
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
