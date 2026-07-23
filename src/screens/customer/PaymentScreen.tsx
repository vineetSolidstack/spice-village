/**
 * In-app Razorpay checkout.
 *
 * Opens over the cart once the order is reserved. It loads Razorpay Checkout in
 * a WebView (UPI, cards, netbanking), waits for the result, and hands it to the
 * server to verify. Success and failure both come back to the cart via the
 * callbacks — the cart owns what happens next.
 */
import React, { useState } from 'react';
import { ActivityIndicator, Modal, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { WebView, type WebViewMessageEvent } from 'react-native-webview';
import { X } from 'lucide-react-native';

import { IconButton } from '../../components';
import { colors, layout, palette } from '../../theme';
import { useType } from '../../theme/useType';
import { razorpayCheckoutHtml, verifyPayment, type RazorpayOrder } from '../../lib/pay';

export type PaymentScreenProps = {
  open: boolean;
  /** Our order id being paid for. */
  orderId: string;
  /** The Razorpay order created server-side. */
  razorpay: RazorpayOrder;
  kitchenName: string;
  reference: string;
  customerName?: string;
  customerEmail?: string;
  customerPhone?: string;
  /** Payment verified server-side. */
  onPaid: () => void;
  /** Customer dismissed or payment failed — the slot should be released. */
  onCancelled: (reason: string) => void;
};

type Phase = 'checkout' | 'verifying';

export function PaymentScreen({
  open,
  orderId,
  razorpay,
  kitchenName,
  reference,
  customerName,
  customerEmail,
  customerPhone,
  onPaid,
  onCancelled,
}: PaymentScreenProps) {
  const type = useType();
  const insets = useSafeAreaInsets();
  const [phase, setPhase] = useState<Phase>('checkout');

  const html = razorpayCheckoutHtml({
    keyId: razorpay.keyId,
    razorpayOrderId: razorpay.razorpayOrderId,
    amount: razorpay.amount,
    currency: razorpay.currency,
    name: kitchenName,
    description: reference,
    prefillName: customerName,
    prefillEmail: customerEmail,
    prefillContact: customerPhone,
  });

  const onMessage = async (event: WebViewMessageEvent) => {
    let msg: { status?: string; message?: string;
      razorpay_payment_id?: string; razorpay_order_id?: string; razorpay_signature?: string };
    try {
      msg = JSON.parse(event.nativeEvent.data);
    } catch {
      return;
    }

    if (msg.status === 'dismiss') {
      onCancelled('Payment cancelled');
      return;
    }
    if (msg.status === 'error') {
      onCancelled(msg.message ?? 'Payment failed');
      return;
    }
    if (msg.status === 'success' && msg.razorpay_payment_id && msg.razorpay_signature) {
      // The app does NOT trust this — the server re-checks the signature.
      setPhase('verifying');
      const ok = await verifyPayment({
        orderId,
        razorpayOrderId: msg.razorpay_order_id ?? razorpay.razorpayOrderId,
        razorpayPaymentId: msg.razorpay_payment_id,
        razorpaySignature: msg.razorpay_signature,
      });
      if (ok) onPaid();
      else onCancelled('We could not confirm that payment. If money was deducted, it will be refunded.');
    }
  };

  return (
    <Modal visible={open} animationType="slide" onRequestClose={() => onCancelled('Payment cancelled')}>
      <View style={[styles.root, { paddingTop: insets.top }]}>
        <View style={styles.bar}>
          <Text style={[type.display(18, 700), styles.barTitle]}>Pay securely</Text>
          <IconButton label="Cancel payment" onPress={() => onCancelled('Payment cancelled')}>
            <X size={22} color={colors.textBody} strokeWidth={2} />
          </IconButton>
        </View>

        {phase === 'verifying' ? (
          <View style={styles.center}>
            <ActivityIndicator color={colors.actionPrimary} />
            <Text style={[type.body(14, 600), styles.centerText]}>Confirming your payment…</Text>
            <Text style={[type.body(12, 600), { color: colors.textMuted, textAlign: 'center' }]}>
              Don&apos;t close the app.
            </Text>
          </View>
        ) : (
          <WebView
            originWhitelist={['*']}
            source={{ html, baseUrl: 'https://checkout.razorpay.com' }}
            onMessage={onMessage}
            javaScriptEnabled
            domStorageEnabled
            startInLoadingState
            renderLoading={() => (
              <View style={styles.center}>
                <ActivityIndicator color={colors.actionPrimary} />
              </View>
            )}
            style={styles.web}
          />
        )}
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: palette.cream100 },
  bar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: layout.gutter,
    paddingVertical: 10,
  },
  barTitle: {},
  web: { flex: 1, backgroundColor: palette.cream100 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 10, padding: 32 },
  centerText: { color: colors.textBody },
});
