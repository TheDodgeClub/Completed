import Constants from "expo-constants";

const isExpoGo = Constants.executionEnvironment === "storeClient";

// Only load @stripe/stripe-react-native outside of Expo Go.
// In Expo Go the OnrampSdk TurboModule is not registered, so requiring the
// package causes a fatal Invariant Violation that bypasses try/catch.
let useStripeImpl: (() => {
  initPaymentSheet: (params: any) => Promise<{ error?: any }>;
  presentPaymentSheet: () => Promise<{ error?: any }>;
}) | null = null;

if (!isExpoGo) {
  try {
    useStripeImpl = require("@stripe/stripe-react-native").useStripe;
  } catch {
    useStripeImpl = null;
  }
}

const expoGoStub = {
  initPaymentSheet: async (_params: any): Promise<{ error?: any }> => ({
    error: { message: "Payments are not available in Expo Go. Please use a development build." },
  }),
  presentPaymentSheet: async (): Promise<{ error?: any }> => ({
    error: { message: "Payments are not available in Expo Go. Please use a development build." },
  }),
};

export function useNativeStripe() {
  if (!useStripeImpl) {
    return expoGoStub;
  }
  // eslint-disable-next-line react-hooks/rules-of-hooks
  return useStripeImpl() as {
    initPaymentSheet: (params: any) => Promise<{ error?: any }>;
    presentPaymentSheet: () => Promise<{ error?: any }>;
  };
}
