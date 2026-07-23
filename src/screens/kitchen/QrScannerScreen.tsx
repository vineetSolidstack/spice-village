/**
 * Full-screen pickup scanner for the kitchen portal.
 *
 * Unlike VerifyQrSheet (which verifies one pre-selected order), this scans any
 * customer code cold: point the camera at a QR, it resolves the slot code
 * against today's orders and shows what to hand over, with a one-tap advance.
 *
 * The scanned payload is the bare slot code ("500-07"); a manual-entry fallback
 * covers steam, glare, and cracked screens — common enough in a working kitchen
 * that staff need a way through without the camera.
 */
import React, { useState } from 'react';
import { Modal, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { Check, X } from 'lucide-react-native';

import { Badge, Button, IconButton, Input, SlotCodeChip } from '../../components';
import { colors, displayFont, layout, palette, radius, shadow } from '../../theme';
import { useType } from '../../theme/useType';
import { parseSlotCode } from '../../lib/slotCode';
import { money } from '../../lib/format';
import { NEXT_STATUS, type Order } from '../../data/types';
import type { BadgeTone } from '../../components/Badge';

const TONE: Record<string, BadgeTone> = {
  New: 'info',
  Preparing: 'warn',
  Ready: 'success',
  Completed: 'neutral',
};

export type QrScannerScreenProps = {
  open: boolean;
  onClose: () => void;
  /** Resolve a scanned code to one of this kitchen's orders. */
  resolve: (code: string) => Order | undefined;
  /** Advance the matched order along the pipeline. */
  onAdvance: (ref: string) => void;
};

type Result =
  | { kind: 'idle' }
  | { kind: 'found'; order: Order }
  | { kind: 'unknown'; code: string };

export function QrScannerScreen({ open, onClose, resolve, onAdvance }: QrScannerScreenProps) {
  const type = useType();
  const insets = useSafeAreaInsets();
  const [permission, requestPermission] = useCameraPermissions();
  const [result, setResult] = useState<Result>({ kind: 'idle' });
  const [manual, setManual] = useState('');
  const [armed, setArmed] = useState(true);

  const close = () => {
    setResult({ kind: 'idle' });
    setManual('');
    setArmed(true);
    onClose();
  };

  const check = (raw: string) => {
    const code = raw.trim();
    if (!code) return;
    const order = parseSlotCode(code) ? resolve(code) : undefined;
    setResult(order ? { kind: 'found', order } : { kind: 'unknown', code });
    setManual('');
  };

  const onBarcode = (data: string) => {
    if (!armed) return;
    setArmed(false); // freeze until the result card is dismissed
    check(data);
  };

  const rescan = () => {
    setResult({ kind: 'idle' });
    setArmed(true);
  };

  return (
    <Modal visible={open} animationType="slide" onRequestClose={close} statusBarTranslucent>
      <View style={styles.root}>
        {/* Camera fills the screen; controls float above it. */}
        {permission?.granted ? (
          <CameraView
            style={StyleSheet.absoluteFill}
            barcodeScannerSettings={{ barcodeTypes: ['qr'] }}
            onBarcodeScanned={armed ? ({ data }) => onBarcode(data) : undefined}
          />
        ) : (
          <View style={styles.permission}>
            <Text style={[type.body(15, 700), styles.permissionText]}>
              Camera access is needed to scan pickup codes.
            </Text>
            <Button variant="secondary" onPress={requestPermission}>
              Allow camera
            </Button>
          </View>
        )}

        {/* Top bar */}
        <View style={[styles.topBar, { paddingTop: insets.top + 8 }]}>
          <Text style={[type.display(18, 700), styles.topTitle]}>Scan pickup</Text>
          <IconButton label="Close scanner" variant="solid" onPress={close}>
            <X size={20} color="#FFFFFF" strokeWidth={2} />
          </IconButton>
        </View>

        {/* Reticle */}
        {result.kind === 'idle' && permission?.granted ? (
          <View pointerEvents="none" style={styles.reticleWrap}>
            <View style={styles.reticle} />
            <Text style={[type.body(13, 700), styles.reticleHint]}>
              Point at the customer&apos;s QR
            </Text>
          </View>
        ) : null}

        {/* Result / manual entry sheet */}
        <View style={[styles.sheet, { paddingBottom: insets.bottom + 16 }]}>
          {result.kind === 'found' ? (
            <FoundCard
              order={result.order}
              onAdvance={() => {
                onAdvance(result.order.ref);
                close();
              }}
              onRescan={rescan}
            />
          ) : result.kind === 'unknown' ? (
            <View style={styles.card}>
              <Text style={[type.body(14, 700), { color: colors.statusDanger }]}>
                No order matches {result.code} today.
              </Text>
              <Button variant="secondary" block onPress={rescan}>
                Scan again
              </Button>
            </View>
          ) : (
            <View style={styles.card}>
              <Input
                label="Or enter the slot code"
                placeholder="500-07"
                autoCapitalize="none"
                value={manual}
                onChangeText={setManual}
                onSubmitEditing={() => check(manual)}
              />
              <Button block disabled={!manual.trim()} onPress={() => check(manual)}>
                Look up
              </Button>
            </View>
          )}
        </View>
      </View>
    </Modal>
  );
}

function FoundCard({
  order,
  onAdvance,
  onRescan,
}: {
  order: Order;
  onAdvance: () => void;
  onRescan: () => void;
}) {
  const type = useType();
  const next = NEXT_STATUS[order.status];
  const summary = order.lines.map((l) => `${l.name} ×${l.quantity}`).join(', ');

  return (
    <View style={styles.card}>
      <View style={styles.foundHead}>
        <View style={styles.foundCheck}>
          <Check size={18} color="#FFFFFF" strokeWidth={3} />
        </View>
        <SlotCodeChip code={order.slotCode} size="md" />
        <Text style={[type.body(13, 700), styles.foundRef]}>{order.ref}</Text>
        <Badge tone={TONE[order.status]}>{order.status}</Badge>
      </View>

      <Text style={type.body(14, 700)}>{order.customerName}</Text>
      <Text style={[type.body(13, 600), { color: colors.textMuted }]}>{summary}</Text>
      <Text style={[type.body(14, 800), { marginTop: 2 }]}>{money(order.total)}</Text>

      <View style={styles.foundActions}>
        <Button variant="ghost" onPress={onRescan}>
          Scan another
        </Button>
        {next ? (
          <Button onPress={onAdvance}>
            {order.status === 'Ready' ? 'Complete pickup' : `Mark ${next.toLowerCase()}`}
          </Button>
        ) : null}
      </View>
    </View>
  );
}

const RETICLE = 240;

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: palette.cocoa900 },
  permission: {
    ...StyleSheet.absoluteFill,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 14,
    padding: 32,
    backgroundColor: palette.cocoa900,
  },
  permissionText: { color: '#FFFFFF', textAlign: 'center' },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: layout.gutter,
    paddingBottom: 12,
  },
  topTitle: { color: '#FFFFFF' },
  reticleWrap: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: 0,
    right: 0,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 16,
  },
  reticle: {
    width: RETICLE,
    height: RETICLE,
    borderRadius: radius.xl,
    borderWidth: 3,
    borderColor: 'rgba(255,255,255,0.9)',
  },
  reticleHint: { color: '#FFFFFF' },
  sheet: {
    marginTop: 'auto',
    paddingHorizontal: layout.gutter,
  },
  card: {
    backgroundColor: colors.surfaceCard,
    borderRadius: radius.xl,
    padding: layout.cardPadding,
    gap: 10,
    ...shadow.overlay,
  },
  foundHead: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  foundCheck: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: colors.statusSuccess,
    alignItems: 'center',
    justifyContent: 'center',
  },
  foundRef: { flex: 1, fontFamily: displayFont(800), color: colors.textBody },
  foundActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
    gap: 10,
    marginTop: 4,
  },
});
