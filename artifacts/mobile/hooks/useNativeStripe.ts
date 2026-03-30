export function useNativeStripe() {
  try {
    const stripeModule = require("@stripe/stripe-react-native");
    const { useStripe } = stripeModule;
    if (!useStripe) throw new Error("useStripe not found");
    return useStripe() as {
      initPaymentSheet: (params: any) => Promise<{ error?: any }>;
      presentPaymentSheet: () => Promise<{ error?: any }>;
    };
  } catch {
    return {
      initPaymentSheet: async (_params: any): Promise<{ error?: any }> => ({
        error: { message: "Native payments are not available in Expo Go. Please use a development build." },
      }),
      presentPaymentSheet: async (): Promise<{ error?: any }> => ({
        error: { message: "Native payments are not available in Expo Go. Please use a development build." },
      }),
    };
  }
}
