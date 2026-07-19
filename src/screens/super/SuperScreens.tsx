/**
 * Super-admin portal — approvals, kitchen states, users, and curation.
 */
import React, { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import {
  Badge,
  Button,
  Media,
  PortalHeader,
  Screen,
  SectionLabel,
  Switch,
  Tabs,
  Avatar,
  useToast,
} from '../../components';
import { gradient } from '../../components/Media';
import { colors, layout, radius, shadow } from '../../theme';
import { useType } from '../../theme/useType';
import { useStore } from '../../data/store';
import { CATEGORIES } from '../../data/demo';
import { plural } from '../../lib/format';
import { useRole } from '../../state/role';
import type { KitchenState } from '../../data/types';

/** Kitchens have no photography yet; the list uses the brand placeholder fill. */
const PLACEHOLDER = gradient('#E8A33D', '#C1440E');

/* ------------------------------------------------------------ approvals -- */

export function SuperApprovalsScreen() {
  const type = useType();
  const { approvals, decideApproval } = useStore();
  const { showToast } = useToast();

  return (
    <Screen bottomInset={16}>
      <PortalHeader
        title="Approvals"
        right={
          <Badge tone={approvals.length ? 'warn' : 'success'}>
            {`${approvals.length} pending`}
          </Badge>
        }
      />

      <View style={styles.body}>
        {approvals.length === 0 ? (
          <Text style={[type.body(14, 600), styles.empty]}>All caught up. Queue is empty.</Text>
        ) : null}

        {approvals.map((item) => (
          <View key={item.id} style={[styles.card, shadow.card]}>
            <View style={styles.cardHead}>
              <Text style={[type.display(16, 700), styles.cardTitle]} numberOfLines={1}>
                {item.name}
              </Text>
              <Badge tone={item.kind === 'Kitchen' ? 'brand' : 'info'}>{item.kind}</Badge>
            </View>

            <Text style={[type.body(13, 600), { color: colors.textMuted }]}>
              {item.area} · applied {item.applied}
            </Text>

            <View style={styles.actions}>
              <Button
                size="sm"
                onPress={() => {
                  decideApproval(item.id, true);
                  showToast(`${item.name} approved`, 'info');
                }}
              >
                Approve
              </Button>
              <Button
                size="sm"
                variant="outline"
                onPress={() => showToast('Review requested', 'info')}
              >
                Review
              </Button>
              <Button
                size="sm"
                variant="danger"
                onPress={() => {
                  decideApproval(item.id, false);
                  showToast(`${item.name} rejected`, 'info');
                }}
              >
                Reject
              </Button>
            </View>
          </View>
        ))}
      </View>
    </Screen>
  );
}

/* ------------------------------------------------------------- kitchens -- */

const KITCHEN_TABS: KitchenState[] = ['Pending', 'Approved', 'Suspended'];

export function SuperKitchensScreen() {
  const type = useType();
  const { managedKitchens, setKitchenState } = useStore();
  const { showToast } = useToast();
  const [tab, setTab] = useState<KitchenState>('Approved');

  const visible = managedKitchens.filter((k) => k.state === tab);

  return (
    <Screen bottomInset={16}>
      <PortalHeader title="Kitchens" />

      <View style={styles.body}>
        <Tabs tabs={KITCHEN_TABS} active={tab} onChange={(t) => setTab(t as KitchenState)} />

        {visible.length === 0 ? (
          <Text style={[type.body(14, 600), styles.empty]}>Nothing here.</Text>
        ) : null}

        {visible.map((kitchen) => (
          <View key={kitchen.name} style={[styles.row, shadow.card]}>
            <Media fill={PLACEHOLDER} style={styles.thumb} />

            <View style={styles.rowBody}>
              <Text style={type.body(14, 700)} numberOfLines={1}>
                {kitchen.name}
              </Text>
              <Text style={[type.body(12, 600), { color: colors.textMuted }]} numberOfLines={1}>
                {kitchen.area}
                {kitchen.rating ? ` · ★ ${kitchen.rating}` : ''}
                {kitchen.reason ? ` · ${kitchen.reason}` : ''}
              </Text>
            </View>

            {tab === 'Approved' ? (
              <Button
                size="sm"
                variant="danger"
                onPress={() => {
                  setKitchenState(kitchen.name, 'Suspended');
                  showToast(`${kitchen.name} suspended`, 'info');
                }}
              >
                Suspend
              </Button>
            ) : null}

            {tab === 'Suspended' ? (
              <Button
                size="sm"
                variant="secondary"
                onPress={() => {
                  setKitchenState(kitchen.name, 'Approved');
                  showToast(`${kitchen.name} reinstated`, 'info');
                }}
              >
                Reinstate
              </Button>
            ) : null}
          </View>
        ))}
      </View>
    </Screen>
  );
}

/* ---------------------------------------------------------------- users -- */

export function SuperUsersScreen() {
  const type = useType();
  const { users } = useStore();
  const { showToast } = useToast();

  return (
    <Screen bottomInset={16}>
      <PortalHeader title="Users" />

      <View style={styles.body}>
        {users.map((user) => (
          <View key={user.name} style={[styles.row, shadow.card]}>
            <Avatar name={user.name} />
            <View style={styles.rowBody}>
              <Text style={type.body(14, 700)} numberOfLines={1}>
                {user.name}
              </Text>
              <Text style={[type.body(12, 600), { color: colors.textMuted }]} numberOfLines={1}>
                {user.role}
                {user.orders !== null ? ` · ${plural(user.orders, 'order')}` : ''}
              </Text>
            </View>
            <Button
              size="sm"
              variant="ghost"
              onPress={() => showToast('User detail is not built yet', 'info')}
            >
              Manage
            </Button>
          </View>
        ))}
      </View>
    </Screen>
  );
}

/* ------------------------------------------------------------- curation -- */

export function SuperCurationScreen() {
  const type = useType();
  const { managedKitchens, setFeatured } = useStore();
  const { setRole } = useRole();
  const { showToast } = useToast();

  const approved = managedKitchens.filter((k) => k.state === 'Approved');

  return (
    <Screen bottomInset={16}>
      <PortalHeader title="Categories & featured" />

      <View style={styles.body}>
        <View>
          <SectionLabel style={styles.groupLabel}>Cuisine categories</SectionLabel>
          <View style={styles.categoryRow}>
            {CATEGORIES.map((category) => (
              <View key={category} style={styles.categoryChip}>
                <Text style={type.body(13, 700)}>{category}</Text>
              </View>
            ))}
            <Button
              size="sm"
              variant="secondary"
              onPress={() => showToast('Category editor is not built yet', 'info')}
            >
              + Add
            </Button>
          </View>
        </View>

        <View>
          <SectionLabel style={styles.groupLabel}>Featured on home</SectionLabel>
          <View style={[styles.featuredCard, shadow.card]}>
            {approved.map((kitchen, i) => (
              <View
                key={kitchen.name}
                style={[styles.featuredRow, i > 0 ? styles.featuredDivider : null]}
              >
                <Text style={[type.body(14, 700), styles.featuredName]} numberOfLines={1}>
                  {kitchen.name}
                </Text>
                <Switch
                  checked={kitchen.featured}
                  onChange={(value) => setFeatured(kitchen.name, value)}
                />
              </View>
            ))}
          </View>
        </View>

        <View style={styles.divider} />
        <Button variant="secondary" block onPress={() => setRole('customer')}>
          Back to customer app
        </Button>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  body: { paddingHorizontal: layout.gutter, gap: 12 },
  empty: { color: colors.textMuted, textAlign: 'center', padding: 28 },
  card: {
    backgroundColor: colors.surfaceCard,
    borderRadius: radius.lg,
    padding: layout.cardPadding,
    gap: 10,
  },
  cardHead: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  cardTitle: { flex: 1 },
  actions: { flexDirection: 'row', gap: 10 },
  row: {
    backgroundColor: colors.surfaceCard,
    borderRadius: radius.lg,
    padding: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  rowBody: { flex: 1, minWidth: 0 },
  thumb: { width: 42, height: 42, borderRadius: 12 },
  groupLabel: { marginBottom: 8 },
  categoryRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, alignItems: 'center' },
  categoryChip: {
    backgroundColor: colors.surfaceCard,
    borderWidth: 1.5,
    borderColor: colors.borderSubtle,
    borderRadius: radius.pill,
    paddingVertical: 8,
    paddingHorizontal: 16,
  },
  featuredCard: {
    backgroundColor: colors.surfaceCard,
    borderRadius: radius.lg,
    overflow: 'hidden',
  },
  featuredRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 13,
    paddingHorizontal: layout.cardPadding,
  },
  featuredDivider: { borderTopWidth: 1, borderTopColor: colors.borderSubtle },
  featuredName: { flex: 1 },
  divider: { height: 1, backgroundColor: colors.borderSubtle, marginTop: 6 },
});
