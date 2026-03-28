import { useStripe } from "@stripe/stripe-react-native";

export function useNativeStripe() {
  return useStripe();
}
