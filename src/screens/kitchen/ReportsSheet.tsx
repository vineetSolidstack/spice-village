/**
 * Monthly sales report sheet — pick a month, download a PDF.
 *
 * The PDF is built on the device from that month's orders, archived to Supabase
 * (the private `reports` bucket), and opened in the share sheet so the owner can
 * save it or send it on.
 */
import React, { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { ChevronLeft, ChevronRight, Download } from 'lucide-react-native';

import { Button, Dialog, useToast } from '../../components';
import { colors, radius } from '../../theme';
import { useType } from '../../theme/useType';
import { generateMonthlyReport, MONTHS } from '../../lib/report';

export function ReportsSheet({
  open,
  onClose,
  kitchenSlug,
  kitchenName,
}: {
  open: boolean;
  onClose: () => void;
  kitchenSlug: string;
  kitchenName: string;
}) {
  const type = useType();
  const { showToast } = useToast();
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth());
  const [busy, setBusy] = useState(false);

  // Don't let them page into the future.
  const isCurrentOrLater = year > now.getFullYear() || (year === now.getFullYear() && month >= now.getMonth());

  const shift = (delta: number) => {
    const d = new Date(year, month + delta, 1);
    setYear(d.getFullYear());
    setMonth(d.getMonth());
  };

  const onDownload = async () => {
    if (busy) return;
    setBusy(true);
    const res = await generateMonthlyReport(kitchenSlug, kitchenName, year, month);
    setBusy(false);
    if (res.ok) {
      showToast(`${MONTHS[month]}: ${res.count} orders · ₹${res.revenue.toLocaleString('en-IN')}`, 'info');
    } else {
      showToast('Could not build the report — try again.', 'danger');
    }
  };

  return (
    <Dialog open={open} onClose={onClose} title="Sales report">
      <Text style={[type.body(13, 600), { color: colors.textMuted, marginBottom: 14 }]}>
        Pick a month and download a PDF of every order, totals, and a per-dish
        breakdown. It’s saved to your kitchen and opens to share or store.
      </Text>

      <View style={styles.picker}>
        <Pressable onPress={() => shift(-1)} style={styles.arrow} accessibilityLabel="Previous month">
          <ChevronLeft size={22} color={colors.textBrand} strokeWidth={2.4} />
        </Pressable>
        <Text style={[type.display(20, 800), styles.month]}>
          {MONTHS[month]} {year}
        </Text>
        <Pressable
          onPress={() => shift(1)}
          disabled={isCurrentOrLater}
          style={[styles.arrow, isCurrentOrLater ? styles.arrowOff : null]}
          accessibilityLabel="Next month"
        >
          <ChevronRight size={22} color={isCurrentOrLater ? colors.textFaint : colors.textBrand} strokeWidth={2.4} />
        </Pressable>
      </View>

      <Button
        block
        disabled={busy}
        icon={<Download size={16} color="#FFFFFF" strokeWidth={2.2} />}
        onPress={() => void onDownload()}
      >
        {busy ? 'Building PDF…' : 'Download PDF'}
      </Button>
    </Dialog>
  );
}

const styles = StyleSheet.create({
  picker: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.surfaceSunken,
    borderRadius: radius.md,
    padding: 8,
    marginBottom: 16,
  },
  arrow: {
    width: 40,
    height: 40,
    borderRadius: radius.sm,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surfaceCard,
  },
  arrowOff: { opacity: 0.5 },
  month: { flex: 1, textAlign: 'center' },
});
