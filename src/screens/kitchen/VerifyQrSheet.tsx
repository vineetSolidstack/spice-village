/**
 * QR verification — the kitchen scans the customer's code at pickup.
 *
 * The scanned payload is the bare slot code ("500-07"). We resolve it against
 * the kitchen's own orders and only allow completion when the scan matches the
 * order being handed over, so a mis-scan can't complete the wrong cover.
 *
 * A manual entry fallback exists because barcode scanning fails often enough in
 * a working kitchen (steam, glare, cracked screens) that staff need a way
 * through without it.
 */
import React, { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';

import { Button, Dialog, Input, SlotCodeChip } from '../../components';
import { colors, layout, palette, radius } from '../../theme';
import { useType } from '../../theme/useType';
import { parseSlotCode } from '../../lib/slotCode';
import type { Order } from '../../data/types';

export type VerifyQrSheetProps = {
  /** The order staff are handing over, or null when the sheet is closed. */
  order: Order | null;
  onClose: () => void;
  onVerified: (ref: string) => void;
  /** Resolves a scanned code to an order. */
  resolve: (code: string) => Order | undefined;
};

type Outcome = { kind: 'idle' } | { kind: 'mismatch'; code: string } | { kind: 'unknown'; code: string };

export function VerifyQrSheet({ order, onClose, onVerified, resolve }: VerifyQrSheetProps) {
  const type = useType();
  const [permission, requestPermission] = useCameraPermissions();
  const [manual, setManual] = useState('');
  const [outcome, setOutcome] = useState<Outcome>({ kind: 'idle' });
  const [scanned, setScanned] = useState(false);

  const close = () => {
    setManual('');
    setOutcome({ kind: 'idle' });
    setScanned(false);
    onClose();
  };

  const check = (raw: string) => {
    const code = raw.trim();
    if (!code) return;

    if (!parseSlotCode(code)) {
      setOutcome({ kind: 'unknown', code });
      return;
    }

    const match = resolve(code);
    if (!match) {
      setOutcome({ kind: 'unknown', code });
      return;
    }
    if (order && match.ref !== order.ref) {
      // Scanned a real code, but not this order's.
      setOutcome({ kind: 'mismatch', code });
      return;
    }

    onVerified(match.ref);
    close();
  };

  const onBarcode = (code: string) => {
    if (scanned) return;
    setScanned(true);
    check(code);
    // Re-arm after a beat so a failed scan can be retried.
    setTimeout(() => setScanned(false), 1200);
  };

  return (
    <Dialog open={order !== null} onClose={close} title="Verify pickup">
      {order ? (
        <View style={styles.body}>
          <View style={styles.expected}>
            <Text style={[type.body(13, 600), { color: colors.textMuted }]}>Expecting</Text>
            <SlotCodeChip code={order.slotCode} size="md" />
            {order.sequence ? (
              <Text style={[type.body(13, 800), { color: colors.textBrand }]}>
                Order #{order.sequence} today
              </Text>
            ) : null}
            <Text style={[type.body(13, 600), { color: colors.textMuted }]}>{order.customerName}</Text>
          </View>

          {permission?.granted ? (
            <View style={styles.cameraFrame}>
              <CameraView
                style={StyleSheet.absoluteFill}
                barcodeScannerSettings={{ barcodeTypes: ['qr'] }}
                onBarcodeScanned={({ data }) => onBarcode(data)}
              />
            </View>
          ) : (
            <View style={styles.permission}>
              <Text style={[type.body(13, 600), styles.permissionText]}>
                Camera access is needed to scan pickup codes.
              </Text>
              <Button size="sm" variant="secondary" onPress={requestPermission}>
                Allow camera
              </Button>
            </View>
          )}

          {outcome.kind === 'mismatch' ? (
            <Text style={[type.body(13, 700), styles.error]}>
              That code is {outcome.code} — this order is {order.slotCode}.
            </Text>
          ) : null}
          {outcome.kind === 'unknown' ? (
            <Text style={[type.body(13, 700), styles.error]}>
              No order matches {outcome.code} today.
            </Text>
          ) : null}

          <Input
            label="Or enter the slot code"
            placeholder="500-07"
            autoCapitalize="none"
            value={manual}
            onChangeText={setManual}
            onSubmitEditing={() => check(manual)}
          />

          <Button block disabled={!manual.trim()} onPress={() => check(manual)}>
            Verify &amp; complete
          </Button>
        </View>
      ) : null}
    </Dialog>
  );
}

const styles = StyleSheet.create({
  body: { gap: 14 },
  expected: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  cameraFrame: {
    height: 220,
    borderRadius: radius.lg,
    overflow: 'hidden',
    backgroundColor: palette.cocoa900,
  },
  permission: {
    height: 120,
    borderRadius: radius.lg,
    backgroundColor: colors.surfaceSunken,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    padding: layout.cardPadding,
  },
  permissionText: { color: colors.textMuted, textAlign: 'center' },
  error: { color: colors.statusDanger },
});
