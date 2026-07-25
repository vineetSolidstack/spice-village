/**
 * Discount codes — owner management.
 *
 * Full-screen sheet from Kitchen → Settings. Create percentage or flat-rupee
 * codes with a minimum order, usage cap, and expiry; see how many times each
 * has been used; delete them. Customers enter the code at checkout, where the
 * discount is applied and re-validated server-side.
 */
import React, { useCallback, useEffect, useState } from 'react';
import { Modal, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Plus, Trash2, X } from 'lucide-react-native';

import { Badge, Button, IconButton, Input, Tabs, useToast } from '../../components';
import { colors, layout, radius, shadow } from '../../theme';
import { useType } from '../../theme/useType';
import { useStore } from '../../data/store';
import { createCoupon, deleteCoupon, listCoupons, type Coupon } from '../../data/fetch';

export function CouponsSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const type = useType();
  const insets = useSafeAreaInsets();
  const { showcaseSlug, backend } = useStore();
  const { showToast } = useToast();

  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [creating, setCreating] = useState(false);

  const load = useCallback(async () => {
    if (backend !== 'supabase') return;
    try {
      setCoupons(await listCoupons(showcaseSlug));
    } catch (e) {
      console.warn('[spice-route] listCoupons failed', e);
    }
  }, [backend, showcaseSlug]);

  useEffect(() => {
    if (open) void load();
  }, [open, load]);

  return (
    <Modal visible={open} animationType="slide" onRequestClose={onClose}>
      <View style={[styles.root, { paddingTop: insets.top }]}>
        <View style={styles.bar}>
          <Text style={[type.display(20, 800), styles.barTitle]}>Discount codes</Text>
          <IconButton label="Close" onPress={onClose}>
            <X size={22} color={colors.textBody} strokeWidth={2} />
          </IconButton>
        </View>

        {backend !== 'supabase' ? (
          <View style={styles.body}>
            <Text style={[type.body(13, 600), { color: colors.textMuted }]}>
              Discount codes need the Supabase backend configured.
            </Text>
          </View>
        ) : creating ? (
          <CreateForm
            kitchenSlug={showcaseSlug}
            onDone={() => {
              setCreating(false);
              void load();
            }}
            onCancel={() => setCreating(false)}
          />
        ) : (
          <ScrollView contentContainerStyle={styles.body}>
            <Button
              icon={<Plus size={16} color="#FFFFFF" strokeWidth={2} />}
              onPress={() => setCreating(true)}
            >
              New code
            </Button>

            {coupons.length === 0 ? (
              <Text style={[type.body(13, 600), styles.empty]}>
                No codes yet. Create one, then send it to customers from Messages.
              </Text>
            ) : null}

            {coupons.map((c) => (
              <View key={c.id} style={[styles.card, shadow.card]}>
                <View style={styles.cardHead}>
                  <Text style={[type.display(18, 800), { letterSpacing: 1 }]}>{c.code}</Text>
                  <Badge tone={c.active ? 'success' : 'neutral'}>{c.active ? 'Active' : 'Off'}</Badge>
                </View>
                <Text style={[type.body(13, 600), { color: colors.textMuted }]}>
                  {c.kind === 'percent' ? `${c.value}% off` : `₹${c.value} off`}
                  {c.minOrder ? ` · min ₹${c.minOrder}` : ''}
                  {c.maxUses ? ` · ${c.usedCount}/${c.maxUses} used` : ` · used ${c.usedCount}×`}
                  {c.expiresAt ? ` · till ${c.expiresAt}` : ''}
                </Text>
                <View style={styles.cardActions}>
                  <IconButton
                    label={`Delete ${c.code}`}
                    size={34}
                    onPress={async () => {
                      await deleteCoupon(c.id);
                      showToast('Code deleted', 'info');
                      void load();
                    }}
                  >
                    <Trash2 size={16} color={colors.statusDanger} strokeWidth={2} />
                  </IconButton>
                </View>
              </View>
            ))}
          </ScrollView>
        )}
      </View>
    </Modal>
  );
}

function CreateForm({
  kitchenSlug,
  onDone,
  onCancel,
}: {
  kitchenSlug: string;
  onDone: () => void;
  onCancel: () => void;
}) {
  const type = useType();
  const { showToast } = useToast();

  const [code, setCode] = useState('');
  const [kind, setKind] = useState<'percent' | 'flat'>('percent');
  const [value, setValue] = useState('');
  const [minOrder, setMinOrder] = useState('');
  const [maxUses, setMaxUses] = useState('');
  const [busy, setBusy] = useState(false);

  const valueNum = parseInt(value, 10) || 0;
  const valid = code.trim().length >= 3 && valueNum > 0 && (kind !== 'percent' || valueNum <= 100);

  const onCreate = async () => {
    if (!valid || busy) return;
    setBusy(true);
    const ok = await createCoupon(kitchenSlug, {
      code: code.trim(),
      kind,
      value: valueNum,
      minOrder: parseInt(minOrder, 10) || 0,
      maxUses: maxUses ? parseInt(maxUses, 10) : null,
    });
    setBusy(false);
    if (!ok) {
      showToast('Could not create that code (is it a duplicate?)', 'danger');
      return;
    }
    showToast('Code created', 'info');
    onDone();
  };

  return (
    <ScrollView contentContainerStyle={styles.body} keyboardShouldPersistTaps="handled">
      <Input
        label="Code"
        placeholder="DIWALI20"
        autoCapitalize="characters"
        autoCorrect={false}
        value={code}
        onChangeText={setCode}
      />

      <Text style={[type.body(13, 700), styles.label]}>Discount type</Text>
      <Tabs
        tabs={['percent', 'flat']}
        active={kind}
        onChange={(k) => setKind(k as 'percent' | 'flat')}
      />

      <Input
        label={kind === 'percent' ? 'Percent off (1–100)' : 'Rupees off'}
        placeholder={kind === 'percent' ? '20' : '50'}
        keyboardType="number-pad"
        value={value}
        onChangeText={(v) => setValue(v.replace(/\D/g, ''))}
        error={kind === 'percent' && valueNum > 100 ? 'Max 100%' : undefined}
        style={styles.field}
      />

      <Input
        label="Minimum order (₹, optional)"
        placeholder="0"
        keyboardType="number-pad"
        value={minOrder}
        onChangeText={(v) => setMinOrder(v.replace(/\D/g, ''))}
        style={styles.field}
      />

      <Input
        label="Total uses allowed (optional)"
        placeholder="Unlimited"
        keyboardType="number-pad"
        value={maxUses}
        onChangeText={(v) => setMaxUses(v.replace(/\D/g, ''))}
        hint="Cap how many times the code can be redeemed in total"
        style={styles.field}
      />

      <View style={styles.formActions}>
        <Button variant="ghost" onPress={onCancel}>
          Cancel
        </Button>
        <Button disabled={!valid || busy} onPress={() => void onCreate()}>
          {busy ? 'Creating…' : 'Create code'}
        </Button>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.surfacePage },
  bar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: layout.gutter,
    paddingVertical: 10,
  },
  barTitle: {},
  body: { padding: layout.gutter, gap: 12 },
  empty: { color: colors.textMuted, textAlign: 'center', paddingVertical: 24 },
  card: { backgroundColor: colors.surfaceCard, borderRadius: radius.lg, padding: layout.cardPadding, gap: 6 },
  cardHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  cardActions: { flexDirection: 'row', justifyContent: 'flex-end' },
  label: { marginTop: 4 },
  field: { marginTop: 4 },
  formActions: { flexDirection: 'row', justifyContent: 'flex-end', gap: 10, marginTop: 8 },
});
