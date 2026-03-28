import Constants from "expo-constants";

const isExpoGo = Constants.executionEnvironment === "storeClient";

function useNativeStripeImpl() {
  // Dynamic require so Metro only evaluates this when the function is called
  // (never in Expo Go, so the native module crash never fires)
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const { useStripe } = require("@stripe/stripe-react-native");
  // eslint-disable-next-line react-hooks/rules-of-hooks
  return useStripe() as {
    initPaymentSheet: (params: any) => Promise<{ error?: any }>;
    presentPaymentSheet: () => Promise<{ error?: any }>;
  };
}

function useNativeStripeStub() {
  return {
    initPaymentSheet: async (_params: any): Promise<{ error?: any }> => ({
      error: { code: "not_supported", message: "Stripe is not available in this environment" },
    }),
    presentPaymentSheet: async (): Promise<{ error?: any }> => ({
      error: { code: "not_supported", message: "Stripe is not available in this environment" },
    }),
  };
}

export const useNativeStripe = isExpoGo ? useNativeStripeStub : useNativeStripeImpl;
