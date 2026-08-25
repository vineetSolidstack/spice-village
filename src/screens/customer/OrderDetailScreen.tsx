/**
 * Order detail — the pickup screen the customer holds up at the counter.
 *
 * The dark plate shows the slot code at 34pt display, and the QR below encodes
 * that same code: business rule #2 says the QR payload IS the slot code, so
 * scanning yields "500-07" and the kitchen resolves it server-side.
 */
import React from 'react';
import { Linking, Share, StyleSheet, Text, View } from 'react-native';
import { MapPin, Share2 } from 'lucide-react-native';
import QRCode from 'react-native-qrcode-svg';

import { AppBar, Badge, Button, Screen } from '../../components';
import { colors, displayFont, layout, palette, radius, shadow } from '../../theme';
import { useType } from '../../theme/useType';
import { useLanguage } from '../../i18n';
import { useStore } from '../../data/store';
import { plural } from '../../lib/format';
import type { OrderStackScreen } from '../../navigation/types';

const QR_SIZE = 180;

export function OrderDetailScreen({ navigation, route }: OrderStackScreen<'OrderDetail'>) {
  const { t } = useLanguage();
  const type = useType();
  const { customerOrders, getKitchen } = useStore();

  const order = customerOrders.find((o) => o.ref === route.params.ref);
  if (!order) return null;

  const mapUrl = getKitchen(order.kitchenSlug)?.mapUrl;

  const items = order.lines.reduce((sum, l) => sum + l.quantity, 0);

  const onShare = () => {
    void Share.share({
      message:
        `My ${order.kitchenName} order is in! 🍛\n` +
        `Pickup code: ${order.slotCode} · ${order.slotTime}\n` +
        `Ref ${order.ref}. Pre-order yours on Nandhan Delight.`,
    });
  };

  return (
    <Screen bottomInset={16}>
      <AppBar title={`Order ${order.ref}`} onBack={() => navigation.goBack()} />

      <View style={styles.body}>
        <Badge tone={order.status === 'Completed' ? 'neutral' : 'success'}>{order.status}</Badge>

        <View style={styles.plate}>
          <Text style={[type.body(11, 700), styles.plateLabel]}>SLOT CODE</Text>
          <Text style={styles.plateCode}>{order.slotCode}</Text>
          <Text style={[type.body(12, 600), styles.plateTime]}>pickup {order.slotTime}</Text>
        </View>

        <View style={[styles.qrCard, shadow.card]}>
          {/* Payload is the bare slot code — nothing else is encoded. */}
          <QRCode
            value={order.slotCode}
            size={QR_SIZE}
            color={palette.cocoa900}
            backgroundColor="#FFFFFF"
          />
          <Text style={type.body(14, 700)}>{t.showQr}</Text>
          <Text style={styles.qrCode}>{order.slotCode}</Text>
          <Text style={[type.body(12, 600), { color: colors.textMuted }]}>
            Scans to your slot code · ref {order.ref}
          </Text>
        </View>

        <Text style={[type.body(13, 600), styles.footer]}>
          {order.kitchenName} · {plural(items, 'item')} · {order.when}
        </Text>

        {mapUrl ? (
          <Button
            block
            icon={<MapPin size={16} color={palette.cream100} strokeWidth={2.2} />}
            onPress={() => { void Linking.openURL(mapUrl); }}
          >
            Get directions to pickup
          </Button>
        ) : null}

        <Button
          variant="secondary"
          block
          icon={<Share2 size={16} color={colors.textBrand} strokeWidth={2} />}
          onPress={onShare}
        >
          Share on WhatsApp
        </Button>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  body: {
    padding: layout.gutter,
    gap: 14,
    alignItems: 'center',
  },
  plate: {
    backgroundColor: palette.cocoa900,
    borderRadius: radius.lg,
    paddingVertical: 12,
    paddingHorizontal: 26,
    alignItems: 'center',
  },
  plateLabel: { color: palette.cocoa300, letterSpacing: 0.88 },
  plateCode: {
    fontFamily: displayFont(800),
    fontSize: 34,
    lineHeight: 40,
    color: '#FFFFFF',
    letterSpacing: 2.04,
  },
  plateTime: { color: palette.cocoa300 },
  qrCard: {
    backgroundColor: colors.surfaceCard,
    borderRadius: radius.xl,
    padding: 20,
    alignItems: 'center',
    gap: 12,
    alignSelf: 'stretch',
  },
  qrCode: {
    fontFamily: displayFont(800),
    fontSize: 22,
    letterSpacing: 1.76,
    color: colors.textBrand,
  },
  footer: { color: colors.textMuted, textAlign: 'center' },
});
