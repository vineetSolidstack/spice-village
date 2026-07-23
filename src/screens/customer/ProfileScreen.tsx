/**
 * Profile — avatar card, action rows, the language picker, and the switch into
 * the partner portals.
 */
import React, { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Bell, ChefHat, ChevronRight, Globe, Receipt } from 'lucide-react-native';

import {
  Avatar,
  Button,
  Dialog,
  LanguagePicker,
  PortalHeader,
  Screen,
} from '../../components';
import { colors, layout, radius, shadow } from '../../theme';
import { useType } from '../../theme/useType';
import { useLanguage } from '../../i18n';
import { useStore } from '../../data/store';
import { DEMO_PROFILE } from '../../data/demo';
import { plural } from '../../lib/format';
import { ROLE_LABELS, useRole, type Role } from '../../state/role';

const PARTNER_ROLES: Role[] = ['kitchen', 'instructor', 'super'];

/** Demo notification feed — mirrors what push would deliver in production. */
const NOTIFICATIONS = [
  { id: 'n1', title: 'Order ready for pickup', body: 'Anita’s Kitchen · slot 500-07 is ready. Show your QR at the counter.', when: '2m ago' },
  { id: 'n2', title: 'Your quote is in', body: 'Anita’s Kitchen priced your bulk request BQ-102. Tap to review.', when: '1h ago' },
  { id: 'n3', title: 'Workshop reminder', body: 'Master the dosa flip starts tomorrow at 10 am.', when: 'Yesterday' },
];

export function ProfileScreen() {
  const { t, language, setLanguage } = useLanguage();
  const type = useType();
  const { setRole } = useRole();
  const { bookings } = useStore();
  const [switching, setSwitching] = useState(false);
  const [showBookings, setShowBookings] = useState(false);
  const [showNotif, setShowNotif] = useState(false);

  // The signed-in demo customer's workshop bookings.
  const myBookings = bookings.filter((b) => b.attendee === DEMO_PROFILE.customer.name);

  const rows = [
    {
      icon: <Receipt size={20} color={colors.textBrand} strokeWidth={1.75} />,
      label: t.bookings,
      onPress: () => setShowBookings(true),
    },
    {
      icon: <Bell size={20} color={colors.textBrand} strokeWidth={1.75} />,
      label: t.notif,
      onPress: () => setShowNotif(true),
    },
    {
      icon: <ChefHat size={20} color={colors.textBrand} strokeWidth={1.75} />,
      label: t.becomePartner,
      onPress: () => setSwitching(true),
    },
  ];

  return (
    <Screen bottomInset={16}>
      <PortalHeader title={t.profile} />

      <View style={styles.body}>
        <View style={[styles.identity, shadow.card]}>
          <Avatar name={DEMO_PROFILE.customer.name} size={52} />
          <View>
            <Text style={type.display(17, 700)}>{DEMO_PROFILE.customer.name}</Text>
            <Text style={[type.body(13, 600), { color: colors.textMuted }]}>
              {DEMO_PROFILE.customer.email}
            </Text>
          </View>
        </View>

        <View style={[styles.rows, shadow.card]}>
          {rows.map((row, i) => (
            <Pressable
              key={row.label}
              accessibilityRole="button"
              onPress={row.onPress}
              style={[styles.row, i > 0 ? styles.rowDivider : null]}
            >
              {row.icon}
              <Text style={[type.body(14, 700), styles.rowLabel]}>{row.label}</Text>
              <ChevronRight size={18} color={colors.textMuted} strokeWidth={1.75} />
            </Pressable>
          ))}
        </View>

        <View>
          <View style={styles.languageHead}>
            <Globe size={16} color={colors.textBody} strokeWidth={1.75} />
            <Text style={type.body(13, 700)}>{t.language}</Text>
          </View>
          <LanguagePicker value={language} onChange={setLanguage} />
        </View>
      </View>

      <Dialog
        open={switching}
        onClose={() => setSwitching(false)}
        title="Open a partner portal"
      >
        <Text style={[type.body(13, 600), styles.dialogHint]}>
          Partner portals use plain functional copy and their own navigation.
        </Text>
        <View style={styles.roleList}>
          {PARTNER_ROLES.map((role) => (
            <Button
              key={role}
              variant="secondary"
              block
              onPress={() => {
                setSwitching(false);
                setRole(role);
              }}
            >
              {ROLE_LABELS[role]}
            </Button>
          ))}
        </View>
      </Dialog>

      <Dialog open={showBookings} onClose={() => setShowBookings(false)} title={t.bookings}>
        {myBookings.length === 0 ? (
          <Text style={[type.body(13, 600), { color: colors.textMuted }]}>
            No workshop bookings yet — browse the Workshops tab to join one.
          </Text>
        ) : (
          <View style={styles.feed}>
            {myBookings.map((b) => (
              <View key={b.id} style={styles.feedRow}>
                <Text style={type.body(14, 700)}>{b.session}</Text>
                <Text style={[type.body(12, 600), { color: colors.textMuted }]}>
                  {plural(b.people, 'seat')} · {b.payment === 'online' ? 'Paid online' : 'Pay at venue'}
                </Text>
              </View>
            ))}
          </View>
        )}
      </Dialog>

      <Dialog open={showNotif} onClose={() => setShowNotif(false)} title={t.notif}>
        <View style={styles.feed}>
          {NOTIFICATIONS.map((n) => (
            <View key={n.id} style={styles.feedRow}>
              <View style={styles.notifHead}>
                <Text style={[type.body(14, 700), { flex: 1 }]}>{n.title}</Text>
                <Text style={[type.body(11, 600), { color: colors.textFaint }]}>{n.when}</Text>
              </View>
              <Text style={[type.body(12, 600), { color: colors.textMuted }]}>{n.body}</Text>
            </View>
          ))}
        </View>
      </Dialog>
    </Screen>
  );
}

const styles = StyleSheet.create({
  body: { paddingHorizontal: layout.gutter, paddingTop: 4, gap: 14 },
  identity: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    backgroundColor: colors.surfaceCard,
    borderRadius: radius.lg,
    padding: layout.cardPadding,
  },
  rows: {
    backgroundColor: colors.surfaceCard,
    borderRadius: radius.lg,
    overflow: 'hidden',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 14,
    paddingHorizontal: layout.cardPadding,
  },
  rowDivider: { borderTopWidth: 1, borderTopColor: colors.borderSubtle },
  rowLabel: { flex: 1 },
  languageHead: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 8 },
  dialogHint: { color: colors.textMuted, marginBottom: 12 },
  roleList: { gap: 10 },
  feed: { gap: 12 },
  feedRow: {
    gap: 2,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderSubtle,
  },
  notifHead: { flexDirection: 'row', alignItems: 'center', gap: 8 },
});
