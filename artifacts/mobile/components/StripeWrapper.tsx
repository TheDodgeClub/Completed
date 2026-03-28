import React, { ReactNode, useState, useEffect } from "react";
import { StripeProvider } from "@stripe/stripe-react-native";
import { getStripePublishableKey } from "@/lib/api";

export function StripeWrapper({ children }: { children: ReactNode }) {
  const [publishableKey, setPublishableKey] = useState<string>("");

  useEffect(() => {
    getStripePublishableKey().then(setPublishableKey).catch(() => {});
  }, []);

  return (
    <StripeProvider publishableKey={publishableKey} urlScheme="mobile" merchantIdentifier="merchant.co.uk.thedodgeclub">
      {children}
    </StripeProvider>
  );
}
