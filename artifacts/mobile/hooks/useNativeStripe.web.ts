type PaymentSheetError = { code: string; message: string };
type InitResult = { error?: PaymentSheetError };
type PresentResult = { error?: PaymentSheetError };
type InitParams = Record<string, unknown>;

export function useNativeStripe(): {
  initPaymentSheet: (params: InitParams) => Promise<InitResult>;
  presentPaymentSheet: () => Promise<PresentResult>;
} {
  return {
    initPaymentSheet: async (_params: InitParams): Promise<InitResult> => ({
      error: { code: "Unsupported", message: "PaymentSheet is not supported on web." },
    }),
    presentPaymentSheet: async (): Promise<PresentResult> => ({
      error: { code: "Unsupported", message: "PaymentSheet is not supported on web." },
    }),
  };
}
