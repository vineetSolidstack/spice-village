/**
 * Super-admin portal — approvals, kitchen states, users, and curation.
 */
import React, { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Plus } from 'lucide-react-native';

import {
  Badge,
  Button,
  Dialog,
  Input,
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
import { SHOWCASE_KITCHEN_NAME } from '../../data/demo';
import { plural } from '../../lib/format';
import { useAuth } from '../../state/auth';
import { CreateKitchenSheet } from './CreateKitchenSheet';
import type { KitchenState, PlatformUser } from '../../data/types';

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
  const [adding, setAdding] = useState(false);

  const visible = managedKitchens.filter((k) => k.state === tab);

  return (
    <Screen bottomInset={16}>
      <PortalHeader
        title="Kitchens"
        right={
          <Button size="sm" icon={<Plus size={16} color="#FFFFFF" strokeWidth={2} />} onPress={() => setAdding(true)}>
            Add
          </Button>
        }
      />

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

      <CreateKitchenSheet open={adding} onClose={() => setAdding(false)} />
    </Screen>
  );
}

/* ---------------------------------------------------------------- users -- */

export function SuperUsersScreen() {
  const type = useType();
  const { users } = useStore();
  const { showToast } = useToast();
  const [selected, setSelected] = useState<PlatformUser | null>(null);

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
            <Button size="sm" variant="ghost" onPress={() => setSelected(user)}>
              Manage
            </Button>
          </View>
        ))}
      </View>

      <Dialog
        open={selected !== null}
        onClose={() => setSelected(null)}
        title={selected?.name}
        footer={
          <>
            <Button
              variant="outline"
              onPress={() => {
                showToast(`Reset link sent to ${selected?.name}`, 'info');
                setSelected(null);
              }}
            >
              Send reset link
            </Button>
            <Button
              variant="danger"
              onPress={() => {
                showToast(`${selected?.name} suspended`, 'info');
                setSelected(null);
              }}
            >
              Suspend
            </Button>
          </>
        }
      >
        {selected ? (
          <View style={styles.detailList}>
            <DetailRow label="Role" value={selected.role} />
            <DetailRow
              label="Lifetime orders"
              value={selected.orders !== null ? String(selected.orders) : '—'}
            />
            <DetailRow label="Status" value="Active" />
          </View>
        ) : null}
      </Dialog>
    </Screen>
  );
}

function DetailRow({ label, value }: { label: string; value: string }) {
  const type = useType();
  return (
    <View style={styles.detailRow}>
      <Text style={[type.body(13, 600), { color: colors.textMuted }]}>{label}</Text>
      <Text style={type.body(13, 700)}>{value}</Text>
    </View>
  );
}

/* ------------------------------------------------------------- curation -- */

export function SuperCurationScreen() {
  const type = useType();
  const { managedKitchens, setFeatured, categories, addCategory, appMode, setAppMode } = useStore();
  const { setRole } = useAuth();
  const { showToast } = useToast();
  const [adding, setAdding] = useState(false);
  const [name, setName] = useState('');

  const approved = managedKitchens.filter((k) => k.state === 'Approved');
  const marketplaceOn = appMode === 'marketplace';

  const onAdd = () => {
    const trimmed = name.trim();
    if (!trimmed) return;
    addCategory(trimmed);
    setName('');
    setAdding(false);
    showToast(`${trimmed} added`, 'info');
  };

  return (
    <Screen bottomInset={16}>
      <PortalHeader title="Storefront & curation" />

      <View style={styles.body}>
        {/* The launch switch: run as one cloud kitchen now, open the marketplace later. */}
        <View>
          <SectionLabel style={styles.groupLabel}>Storefront mode</SectionLabel>
          <View style={[styles.modeCard, shadow.card]}>
            <View style={styles.modeHead}>
              <View style={styles.modeText}>
                <Text style={type.body(15, 700)}>Marketplace mode</Text>
                <Text style={[type.body(12, 600), { color: colors.textMuted }]}>
                  {marketplaceOn
                    ? 'Customers browse every approved kitchen.'
                    : `Customers see only ${SHOWCASE_KITCHEN_NAME} and classes.`}
                </Text>
              </View>
              <Switch
                checked={marketplaceOn}
                onChange={(value) => {
                  setAppMode(value ? 'marketplace' : 'single');
                  showToast(
                    value ? 'Marketplace opened to all kitchens' : `Showing ${SHOWCASE_KITCHEN_NAME} only`,
                    'info',
                  );
                }}
              />
            </View>

            <View style={styles.modeStatus}>
              <Badge tone={marketplaceOn ? 'success' : 'brand'}>
                {marketplaceOn ? 'Marketplace' : 'Single kitchen'}
              </Badge>
              <Text style={[type.body(12, 600), styles.modeNote]}>
                Takes effect immediately on the customer Home tab — no new app release needed.
              </Text>
            </View>
          </View>
        </View>

        <View>
          <SectionLabel style={styles.groupLabel}>Cuisine categories</SectionLabel>
          <View style={styles.categoryRow}>
            {categories.map((category) => (
              <View key={category} style={styles.categoryChip}>
                <Text style={type.body(13, 700)}>{category}</Text>
              </View>
            ))}
            <Button size="sm" variant="secondary" onPress={() => setAdding(true)}>
              + Add
            </Button>
          </View>
        </View>

        <Dialog
          open={adding}
          onClose={() => setAdding(false)}
          title="Add cuisine category"
          footer={
            <>
              <Button variant="ghost" onPress={() => setAdding(false)}>
                Cancel
              </Button>
              <Button disabled={!name.trim()} onPress={onAdd}>
                Add
              </Button>
            </>
          }
        >
          <Input
            label="Category name"
            placeholder="Chettinad"
            value={name}
            onChangeText={setName}
            onSubmitEditing={onAdd}
          />
        </Dialog>

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
  modeCard: {
    backgroundColor: colors.surfaceCard,
    borderRadius: radius.lg,
    padding: layout.cardPadding,
    gap: 12,
  },
  modeHead: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  modeText: { flex: 1 },
  modeStatus: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  modeNote: { flex: 1, color: colors.textMuted },
  detailList: { gap: 2 },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderSubtle,
  },
});
