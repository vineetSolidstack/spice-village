/**
 * About & policies.
 *
 * Displays the legally-required FSSAI licence and registered address, plus the
 * privacy, refund/cancellation, and terms text that Play Store review and
 * Razorpay activation expect to be visible in the app.
 *
 * The policies are written for this business's model — pickup pre-orders, prepaid
 * via UPI, plus cooking classes — and can be edited here as the business changes.
 */
import React from 'react';
import { Linking, StyleSheet, Text, View } from 'react-native';
import { BadgeCheck, Mail, MapPin } from 'lucide-react-native';

import { AppBar, Screen } from '../../components';
import { colors, layout, radius, shadow } from '../../theme';
import { useType } from '../../theme/useType';
import { useStore } from '../../data/store';
import type { ProfileStackScreen } from '../../navigation/types';

export function AboutScreen({ navigation }: ProfileStackScreen<'About'>) {
  const type = useType();
  const { business } = useStore();

  return (
    <Screen bottomInset={16}>
      <AppBar title="About & policies" onBack={() => navigation.goBack()} />

      <View style={styles.body}>
        {/* --------------------------------------------------- licence */}
        <View style={[styles.card, shadow.card]}>
          <View style={styles.licenceHead}>
            <BadgeCheck size={20} color={colors.statusSuccess} strokeWidth={2} />
            <Text style={type.body(15, 700)}>FSSAI registered</Text>
          </View>
          <Text style={[type.body(13, 600), { color: colors.textMuted }]}>
            Licence no. <Text style={type.body(13, 800)}>{business.fssai}</Text>
            {business.fssaiValidUntil ? `  ·  valid to ${business.fssaiValidUntil}` : ''}
          </Text>

          <View style={styles.infoRow}>
            <MapPin size={15} color={colors.textMuted} strokeWidth={2} />
            <Text style={[type.body(13, 600), styles.infoText]}>{business.legalAddress}</Text>
          </View>
          {business.mapUrl ? (
            <View style={styles.infoRow}>
              <MapPin size={15} color={colors.textBrand} strokeWidth={2} />
              <Text
                style={[type.body(13, 700), styles.infoText, styles.link, { color: colors.textBrand }]}
                onPress={() => Linking.openURL(business.mapUrl)}
              >
                View on map
              </Text>
            </View>
          ) : null}
          {business.supportEmail ? (
            <View style={styles.infoRow}>
              <Mail size={15} color={colors.textMuted} strokeWidth={2} />
              <Text
                style={[type.body(13, 600), styles.infoText, styles.link]}
                onPress={() => Linking.openURL(`mailto:${business.supportEmail}`)}
              >
                {business.supportEmail}
              </Text>
            </View>
          ) : null}
        </View>

        {/* --------------------------------------------------- policies */}
        <Policy
          title="Refunds & cancellations"
          body={`Orders are prepaid to reserve your pickup slot. You can cancel before the kitchen marks your order "Preparing" for a full refund to your original payment method, usually within 5–7 working days. Once preparation has started, the order can't be cancelled as the food is being cooked fresh for you. If a slot is missed, contact us and we'll do our best to help.`}
        />
        <Policy
          title="Privacy"
          body={`We collect only what we need to take your order: your name, contact details, and order history. Payment is handled securely by Razorpay — we never see or store your card or UPI details. We don't sell your data. You can ask us to delete your account and data any time by emailing ${business.supportEmail || 'us'}.`}
        />
        <Policy
          title="Terms of use"
          body={`Prices and availability are set by the kitchen and can change. Pickup times shown are estimates. Food is prepared fresh in a home kitchen; if you have allergies, please check with us before ordering. By placing an order you agree to collect it within the pickup window shown.`}
        />
        <Policy
          title="Cooking classes"
          body={`Class bookings can be paid at the venue or online. If you can't attend, let us know at least 24 hours before and we'll move you to another session where possible. Seats are limited and confirmed on a first-come basis.`}
        />

        <Text style={[type.body(12, 600), styles.footer]}>
          {business.kitchenName} · FSSAI {business.fssai}
        </Text>
      </View>
    </Screen>
  );
}

function Policy({ title, body }: { title: string; body: string }) {
  const type = useType();
  return (
    <View style={[styles.card, shadow.card]}>
      <Text style={[type.display(16, 700), styles.policyTitle]}>{title}</Text>
      <Text style={[type.body(13, 600), styles.policyBody]}>{body}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  body: { paddingHorizontal: layout.gutter, paddingTop: 4, gap: 12 },
  card: {
    backgroundColor: colors.surfaceCard,
    borderRadius: radius.lg,
    padding: layout.cardPadding,
    gap: 8,
  },
  licenceHead: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  infoRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 8, marginTop: 2 },
  infoText: { flex: 1, color: colors.textMuted, lineHeight: 19 },
  link: { color: colors.textBrand },
  policyTitle: {},
  policyBody: { color: colors.textMuted, lineHeight: 20 },
  footer: { color: colors.textFaint, textAlign: 'center', paddingVertical: 8 },
});
