/**
 * Message campaigns — write once, push to customers.
 *
 * Offers, new menu items, festival specials. Send now or schedule for later;
 * scheduled sends are dispatched server-side, so the phone doesn't need to be
 * awake or even installed.
 *
 * Audience is resolved on the server, and customers who turned off offers are
 * filtered out there rather than here — an opt-out a client could bypass isn't
 * an opt-out. Order updates ignore this setting and always send.
 */
import React, { useCallback, useEffect, useState } from 'react';
import { RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Megaphone, Send, Trash2 } from 'lucide-react-native';

import {
  Badge,
  Button,
  Dialog,
  IconButton,
  InfoBanner,
  Input,
  PortalHeader,
  Screen,
  SectionLabel,
  Select,
  Tabs,
  useToast,
} from '../../components';
import { colors, layout, radius, shadow } from '../../theme';
import { useType } from '../../theme/useType';
import { useStore } from '../../data/store';
import { plural } from '../../lib/format';
import {
  createCampaign,
  deleteCampaign,
  fetchCampaigns,
  fetchCampaignReach,
  sendCampaign,
  type Campaign,
  type CampaignAudience,
} from '../../data/fetch';
import type { BadgeTone } from '../../components/Badge';

const AUDIENCES: { value: CampaignAudience; label: string; hint: string }[] = [
  { value: 'my_customers', label: 'My customers', hint: 'Anyone who has ordered from you' },
  { value: 'lapsed', label: 'Lapsed customers', hint: 'Ordered before, but not in the last 30 days' },
  { value: 'all', label: 'Everyone', hint: 'Every app user who accepts offers' },
];

/** Starting points so a message is never a blank page. */
const TEMPLATES: { label: string; title: string; body: string }[] = [
  {
    label: 'New on the menu',
    title: 'Something new is cooking',
    body: 'We have added a new dish today. Pre-order before the slots fill up.',
  },
  {
    label: 'Offer',
    title: 'Today only — save on pre-orders',
    body: 'Order ahead today and save on every dish. Slots are limited.',
  },
  {
    label: 'Festival special',
    title: 'Festival menu is live',
    body: 'A special menu for the festival, cooked fresh. Pre-order your slot now.',
  },
  {
    label: 'Almost sold out',
    title: 'Last few slots left',
    body: 'Only a handful of pickup slots remain for this evening.',
  },
];

const STATUS_TONE: Record<Campaign['status'], BadgeTone> = {
  draft: 'neutral',
  scheduled: 'info',
  sending: 'warn',
  sent: 'success',
  failed: 'danger',
};

export function KitchenCampaignsScreen() {
  const type = useType();
  const { showcaseSlug, backend } = useStore();
  const { showToast } = useToast();

  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState(false);
  const [composing, setComposing] = useState(false);

  const load = useCallback(async () => {
    if (backend !== 'supabase') return;
    setLoading(true);
    try {
      setCampaigns(await fetchCampaigns());
    } catch (error) {
      console.warn('[spice-route] fetchCampaigns failed', error);
    }
    setLoading(false);
  }, [backend]);

  useEffect(() => {
    void load();
  }, [load]);

  const onSend = async (campaign: Campaign) => {
    const count = await sendCampaign(campaign.id);
    if (count === null) {
      showToast('Could not send that message', 'danger');
      return;
    }
    showToast(`Sent to ${plural(count, 'customer')}`, 'info');
    void load();
  };

  const onDelete = async (campaign: Campaign) => {
    await deleteCampaign(campaign.id);
    void load();
  };

  if (backend !== 'supabase') {
    return (
      <Screen bottomInset={16}>
        <PortalHeader title="Messages" />
        <View style={styles.body}>
          <InfoBanner weight={600}>
            Sending messages to customers needs the Supabase backend configured. The app is running
            on bundled demo data.
          </InfoBanner>
        </View>
      </Screen>
    );
  }

  return (
    <Screen scroll={false} bottomInset={0}>
      <PortalHeader
        title="Messages"
        right={
          <Button
            size="sm"
            icon={<Megaphone size={16} color="#FFFFFF" strokeWidth={2} />}
            onPress={() => setComposing(true)}
          >
            New
          </Button>
        }
      />

      <ScrollView
        contentContainerStyle={styles.body}
        refreshControl={<RefreshControl refreshing={loading} onRefresh={() => void load()} />}
      >
        <InfoBanner weight={600}>
          Write once and push to your customers — a new dish, an offer, a festival menu. Order
          updates are separate and always reach people.
        </InfoBanner>

        {campaigns.length === 0 ? (
          <Text style={[type.body(14, 600), styles.empty]}>
            No messages yet. Tap New to write your first one.
          </Text>
        ) : null}

        {campaigns.map((campaign) => (
          <View key={campaign.id} style={[styles.card, shadow.card]}>
            <View style={styles.cardHead}>
              <Text style={[type.body(15, 700), styles.cardTitle]} numberOfLines={1}>
                {campaign.title}
              </Text>
              <Badge tone={STATUS_TONE[campaign.status]}>{campaign.status}</Badge>
            </View>

            <Text style={[type.body(13, 600), { color: colors.textMuted }]}>{campaign.body}</Text>

            <Text style={[type.body(12, 600), { color: colors.textFaint }]}>
              {AUDIENCES.find((a) => a.value === campaign.audience)?.label ?? campaign.audience}
              {campaign.status === 'sent'
                ? ` · reached ${plural(campaign.sentCount, 'customer')}`
                : campaign.scheduledAt
                  ? ` · scheduled ${new Date(campaign.scheduledAt).toLocaleString('en-IN')}`
                  : ''}
            </Text>

            <View style={styles.cardActions}>
              {campaign.status !== 'sent' ? (
                <Button
                  size="sm"
                  icon={<Send size={15} color="#FFFFFF" strokeWidth={2} />}
                  onPress={() => void onSend(campaign)}
                >
                  Send now
                </Button>
              ) : null}
              <IconButton label="Delete message" size={34} onPress={() => void onDelete(campaign)}>
                <Trash2 size={16} color={colors.statusDanger} strokeWidth={2} />
              </IconButton>
            </View>
          </View>
        ))}
      </ScrollView>

      <ComposeSheet
        open={composing}
        kitchenSlug={showcaseSlug}
        onClose={() => setComposing(false)}
        onCreated={() => {
          setComposing(false);
          void load();
        }}
      />
    </Screen>
  );
}

/* ---------------------------------------------------------------- compose -- */

function ComposeSheet({
  open,
  kitchenSlug,
  onClose,
  onCreated,
}: {
  open: boolean;
  kitchenSlug: string;
  onClose: () => void;
  onCreated: () => void;
}) {
  const type = useType();
  const { showToast } = useToast();

  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [audience, setAudience] = useState<CampaignAudience>('my_customers');
  const [when, setWhen] = useState<'now' | 'later'>('now');
  const [delayHours, setDelayHours] = useState('24');
  const [reach, setReach] = useState<number | null>(null);
  const [busy, setBusy] = useState(false);

  // Refresh the reach estimate whenever the audience changes.
  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    void fetchCampaignReach(kitchenSlug, audience).then((n) => {
      if (!cancelled) setReach(n);
    });
    return () => {
      cancelled = true;
    };
  }, [open, audience, kitchenSlug]);

  const valid = title.trim().length > 0 && body.trim().length > 0;

  const applyTemplate = (t: (typeof TEMPLATES)[number]) => {
    setTitle(t.title);
    setBody(t.body);
  };

  const onSubmit = async (sendNow: boolean) => {
    if (!valid || busy) return;
    setBusy(true);

    const scheduledAt =
      !sendNow && when === 'later'
        ? new Date(Date.now() + (parseInt(delayHours, 10) || 24) * 3600_000).toISOString()
        : null;

    const id = await createCampaign({
      kitchenSlug,
      title: title.trim(),
      body: body.trim(),
      audience,
      scheduledAt,
    });

    if (!id) {
      setBusy(false);
      showToast('Could not save that message', 'danger');
      return;
    }

    if (sendNow) {
      const count = await sendCampaign(id);
      showToast(
        count === null ? 'Saved, but sending failed' : `Sent to ${plural(count, 'customer')}`,
        count === null ? 'danger' : 'info',
      );
    } else {
      showToast(scheduledAt ? 'Scheduled' : 'Saved as a draft', 'info');
    }

    setBusy(false);
    setTitle('');
    setBody('');
    onCreated();
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title="New message"
      footer={
        <>
          <Button variant="ghost" disabled={!valid || busy} onPress={() => void onSubmit(false)}>
            {when === 'later' ? 'Schedule' : 'Save draft'}
          </Button>
          <Button disabled={!valid || busy} onPress={() => void onSubmit(true)}>
            {busy ? 'Working…' : 'Send now'}
          </Button>
        </>
      }
    >
      <ScrollView style={styles.composeScroll} keyboardShouldPersistTaps="handled">
        <SectionLabel style={styles.composeLabel}>Start from</SectionLabel>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.templateRow}>
          {TEMPLATES.map((t) => (
            <Button key={t.label} size="sm" variant="secondary" onPress={() => applyTemplate(t)}>
              {t.label}
            </Button>
          ))}
        </ScrollView>

        <Input
          label="Title"
          placeholder="Today only — save on pre-orders"
          value={title}
          onChangeText={setTitle}
          style={styles.composeField}
        />

        <Input
          label="Message"
          placeholder="Order ahead today and save on every dish."
          value={body}
          onChangeText={setBody}
          multiline
          style={styles.composeField}
        />

        <Select
          label="Send to"
          options={AUDIENCES.map((a) => ({ value: a.value, label: a.label }))}
          value={audience}
          onChange={(v) => setAudience(v as CampaignAudience)}
          style={styles.composeField}
        />
        <Text style={[type.body(12, 600), styles.hint]}>
          {AUDIENCES.find((a) => a.value === audience)?.hint}
          {reach !== null ? ` · about ${plural(reach, 'device')} right now` : ''}
        </Text>

        <Text style={[type.body(13, 700), styles.composeLabel]}>When</Text>
        <Tabs
          tabs={['now', 'later']}
          active={when}
          onChange={(v) => setWhen(v as 'now' | 'later')}
        />

        {when === 'later' ? (
          <Input
            label="Send in (hours)"
            placeholder="24"
            keyboardType="number-pad"
            value={delayHours}
            onChangeText={(v) => setDelayHours(v.replace(/\D/g, ''))}
            hint="Sent from the server, so your phone doesn't need to be open"
            style={styles.composeField}
          />
        ) : null}
      </ScrollView>
    </Dialog>
  );
}

const styles = StyleSheet.create({
  body: { paddingHorizontal: layout.gutter, paddingBottom: 24, gap: 12 },
  empty: { color: colors.textMuted, textAlign: 'center', paddingVertical: 32 },
  card: {
    backgroundColor: colors.surfaceCard,
    borderRadius: radius.lg,
    padding: layout.cardPadding,
    gap: 6,
  },
  cardHead: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  cardTitle: { flex: 1 },
  cardActions: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 6 },
  composeScroll: { maxHeight: 460 },
  composeLabel: { marginTop: 12, marginBottom: 8 },
  composeField: { marginTop: 12 },
  templateRow: { gap: 8, paddingBottom: 4 },
  hint: { color: colors.textMuted, marginTop: 6 },
});
