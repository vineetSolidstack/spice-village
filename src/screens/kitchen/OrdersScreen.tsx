/**
 * Kitchen orders — the full pipeline, with pending bulk-quote requests pinned
 * above it in a turmeric-bordered card.
 *
 * Bulk requests are visually separated because they behave differently: they
 * are priced by hand and consume no pickup-slot capacity.
 */
import React, { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { ScanLine } from 'lucide-react-native';

import { Badge, Button, IconButton, PortalHeader, Screen, useToast } from '../../components';
import { colors, displayFont, layout, palette, radius, shadow } from '../../theme';
import { useType } from '../../theme/useType';
import { useStore } from '../../data/store';
import { DEMO_PROFILE } from '../../data/demo';
import { OrderRow } from './OrderRow';
import { VerifyQrSheet } from './VerifyQrSheet';
import { QrScannerScreen } from './QrScannerScreen';
import type { BulkRequest, BulkStatus, Order } from '../../data/types';
import type { BadgeTone } from '../../components/Badge';

const BULK_TONE: Record<BulkStatus, BadgeTone> = {
  'Pending quote': 'warn',
  Quoted: 'info',
  Declined: 'neutral',
};

export function KitchenOrdersScreen() {
  const { kitchenOrders, bulkRequests, advanceOrder, answerBulkRequest, verifySlotCode } = useStore();
  const [verifying, setVerifying] = useState<Order | null>(null);
  const [scanning, setScanning] = useState(false);

  const mine = bulkRequests.filter((b) => b.kitchenSlug === DEMO_PROFILE.kitchen.slug);

  return (
    <Screen bottomInset={16}>
      <PortalHeader
        title="Orders"
        right={
          <IconButton label="Scan pickup" variant="solid" onPress={() => setScanning(true)}>
            <ScanLine size={20} color="#FFFFFF" strokeWidth={2} />
          </IconButton>
        }
      />

      <View style={styles.body}>
        {mine.map((request) => (
          <BulkRequestCard key={request.id} request={request} onAnswer={answerBulkRequest} />
        ))}

        {kitchenOrders.map((order) => (
          <OrderRow key={order.ref} order={order} onAdvance={advanceOrder} onVerify={setVerifying} />
        ))}
      </View>

      <VerifyQrSheet
        order={verifying}
        onClose={() => setVerifying(null)}
        onVerified={advanceOrder}
        resolve={verifySlotCode}
      />

      <QrScannerScreen
        open={scanning}
        onClose={() => setScanning(false)}
        resolve={verifySlotCode}
        onAdvance={advanceOrder}
      />
    </Screen>
  );
}

function BulkRequestCard({
  request,
  onAnswer,
}: {
  request: BulkRequest;
  onAnswer: (id: string, status: BulkStatus) => void;
}) {
  const type = useType();
  const { showToast } = useToast();

  return (
    <View style={[styles.bulkCard, shadow.card]}>
      <View style={styles.bulkHead}>
        <Text style={styles.bulkTitle}>Bulk request · {request.id}</Text>
        <Badge tone={BULK_TONE[request.status]}>{request.status}</Badge>
      </View>

      <Text style={type.body(14, 700)}>{request.what}</Text>
      <Text style={[type.body(13, 600), { color: colors.textMuted }]}>
        {request.when} · {request.customerName} · {request.contact}
      </Text>
      <Text style={[type.body(12, 600), { color: colors.textMuted }]}>
        Priced manually — bulk orders skip pickup-slot capacity.
      </Text>

      {request.status === 'Pending quote' ? (
        <View style={styles.bulkActions}>
          <Button
            size="sm"
            onPress={() => {
              onAnswer(request.id, 'Quoted');
              showToast('Quote sent to customer', 'info');
            }}
          >
            Send quote
          </Button>
          <Button
            size="sm"
            variant="ghost"
            onPress={() => {
              onAnswer(request.id, 'Declined');
              showToast('Request declined', 'info');
            }}
          >
            Decline
          </Button>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  body: { paddingHorizontal: layout.gutter, gap: 10 },
  bulkCard: {
    backgroundColor: colors.surfaceCard,
    borderWidth: 2,
    borderColor: palette.turmeric500,
    borderRadius: radius.lg,
    padding: layout.cardPadding,
    gap: 8,
  },
  bulkHead: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  bulkTitle: { flex: 1, fontFamily: displayFont(800), fontSize: 14, color: colors.textBody },
  bulkActions: { flexDirection: 'row', gap: 10 },
});
