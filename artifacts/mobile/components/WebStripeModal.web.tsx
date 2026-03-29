import React, { useCallback, useEffect, useState } from "react";
import { Modal, View, Text, Pressable, ActivityIndicator, StyleSheet, Platform } from "react-native";
import { loadStripe, Stripe } from "@stripe/stripe-js";
import { Elements, PaymentElement, useStripe, useElements } from "@stripe/react-stripe-js";

interface Props {
  visible: boolean;
  clientSecret: string;
  publishableKey: string;
  onSuccess: () => void;
  onClose: () => void;
}

function CheckoutForm({ onSuccess, onClose }: { onSuccess: () => void; onClose: () => void }) {
  const stripe = useStripe();
  const elements = useElements();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = useCallback(async () => {
    if (!stripe || !elements) return;
    setSubmitting(true);
    setError(null);
    const { error: submitError } = await elements.submit();
    if (submitError) {
      setError(submitError.message ?? "Please check your card details.");
      setSubmitting(false);
      return;
    }
    const result = await stripe.confirmPayment({
      elements,
      confirmParams: { return_url: window.location.href },
      redirect: "if_required",
    });
    if (result.error) {
      setError(result.error.message ?? "Payment failed. Please try again.");
      setSubmitting(false);
    } else {
      onSuccess();
    }
  }, [stripe, elements, onSuccess]);

  return (
    <View style={styles.formContainer}>
      <View style={styles.header}>
        <Text style={styles.title}>Complete Payment</Text>
        <Pressable onPress={onClose} style={styles.closeBtn} disabled={submitting}>
          <Text style={styles.closeTxt}>✕</Text>
        </Pressable>
      </View>

      <View style={styles.elementWrapper}>
        <PaymentElement
          options={{
            layout: "tabs",
            fields: { billingDetails: { address: "never" } },
          }}
        />
      </View>

      {error ? <Text style={styles.error}>{error}</Text> : null}

      <Pressable
        style={[styles.payBtn, submitting && styles.payBtnDisabled]}
        onPress={handleSubmit}
        disabled={submitting || !stripe}
      >
        {submitting ? (
          <ActivityIndicator color="#fff" size="small" />
        ) : (
          <Text style={styles.payBtnTxt}>Pay Now</Text>
        )}
      </Pressable>

      <View style={styles.secureRow}>
        <Text style={styles.secureTxt}>🔒 Secured by Stripe</Text>
      </View>
    </View>
  );
}

export default function WebStripeModal({ visible, clientSecret, publishableKey, onSuccess, onClose }: Props) {
  const [stripePromise, setStripePromise] = useState<Promise<Stripe | null> | null>(null);

  useEffect(() => {
    if (publishableKey) {
      setStripePromise(loadStripe(publishableKey));
    }
  }, [publishableKey]);

  if (!stripePromise || !clientSecret) return null;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <View style={styles.sheet}>
          <Elements
            stripe={stripePromise}
            options={{
              clientSecret,
              appearance: {
                theme: "stripe",
                variables: {
                  colorPrimary: "#0B5E2F",
                  colorBackground: "#ffffff",
                  colorText: "#1a1a1a",
                  borderRadius: "10px",
                  fontFamily: "system-ui, sans-serif",
                },
              },
            }}
          >
            <CheckoutForm onSuccess={onSuccess} onClose={onClose} />
          </Elements>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.55)",
    justifyContent: "flex-end",
  },
  sheet: {
    backgroundColor: "#fff",
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingBottom: 32,
    maxHeight: "90%",
  },
  formContainer: {
    padding: 24,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 20,
  },
  title: {
    fontSize: 18,
    fontWeight: "700",
    color: "#0B5E2F",
  },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "#f0f0f0",
    alignItems: "center",
    justifyContent: "center",
  },
  closeTxt: {
    fontSize: 14,
    color: "#666",
  },
  elementWrapper: {
    marginBottom: 16,
    minHeight: 200,
  },
  error: {
    color: "#e53e3e",
    fontSize: 13,
    marginBottom: 12,
    textAlign: "center",
  },
  payBtn: {
    backgroundColor: "#0B5E2F",
    borderRadius: 12,
    height: 52,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 4,
  },
  payBtnDisabled: {
    opacity: 0.6,
  },
  payBtnTxt: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "700",
  },
  secureRow: {
    alignItems: "center",
    marginTop: 12,
  },
  secureTxt: {
    fontSize: 12,
    color: "#999",
  },
});
