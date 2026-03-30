export function useNativeStripe() {
  const { useStripe } = require("@stripe/stripe-react-native");
  return useStripe() as {
    initPaymentSheet: (params: any) => Promise<{ error?: any }>;
    presentPaymentSheet: () => Promise<{ error?: any }>;
  };
}
