/**
 * Profile — avatar card, action rows, the language picker, and the switch into
 * the partner portals.
 */
import React, { useCallback, useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Bell, ChefHat, ChevronRight, Globe, Info, KeyRound, Receipt } from 'lucide-react-native';

import {
  Avatar,
  Button,
  Dialog,
  Input,
  Switch,
  useToast,
  LanguagePicker,
  PortalHeader,
  Screen,
} from '../../components';
import { colors, layout, radius, shadow } from '../../theme';
import { useType } from '../../theme/useType';
import { useLanguage } from '../../i18n';
import { useStore } from '../../data/store';
import { plural } from '../../lib/format';
import { ROLE_LABELS, useAuth, type Role } from '../../state/auth';
import {
  claimKitchenInvite,
  fetchMarketingOptIn,
  setMarketingOptIn,
  submitKitchenApplication,
  fetchMyApplication,
  type MyApplication,
} from '../../data/fetch';

const PARTNER_ROLES: Role[] = ['kitchen', 'instructor', 'super'];

/** Demo notification feed — mirrors what push would deliver in production. */
const NOTIFICATIONS = [
  { id: 'n1', title: 'Order ready for pickup', body: 'Anita’s Kitchen · slot 500-07 is ready. Show your QR at the counter.', when: '2m ago' },
  { id: 'n2', title: 'Your quote is in', body: 'Anita’s Kitchen priced your bulk request BQ-102. Tap to review.', when: '1h ago' },
  { id: 'n3', title: 'Workshop reminder', body: 'Master the dosa flip starts tomorrow at 10 am.', when: 'Yesterday' },
];

export function ProfileScreen({ navigation }: { navigation: { navigate: (screen: string) => void } }) {
  const { t, language, setLanguage } = useLanguage();
  const type = useType();
  const { setRole, roles, user, signOut, demo, refreshRoles } = useAuth();
  const { bookings, refresh } = useStore();
  const { showToast } = useToast();
  const [switching, setSwitching] = useState(false);
  const [showBookings, setShowBookings] = useState(false);
  const [showNotif, setShowNotif] = useState(false);
  const [claiming, setClaiming] = useState(false);
  const [code, setCode] = useState('');
  const [claimError, setClaimError] = useState<string | null>(null);
  const [claimBusy, setClaimBusy] = useState(false);
  const [offers, setOffers] = useState(true);

  // Kitchen application state machine: none → pending → approved → active.
  const [myApp, setMyApp] = useState<MyApplication | null>(null);
  const [applying, setApplying] = useState(false);
  const [showApproved, setShowApproved] = useState(false);
  const [appBusy, setAppBusy] = useState(false);
  const [appName, setAppName] = useState(user?.name ?? '');
  const [appKitchen, setAppKitchen] = useState('');
  const [appArea, setAppArea] = useState('');
  const [appCuisine, setAppCuisine] = useState('');
  const [appPhone, setAppPhone] = useState('');

  const reloadApplication = useCallback(async () => {
    if (demo) return;
    const app = await fetchMyApplication();
    setMyApp(app);
  }, [demo]);

  useEffect(() => {
    void reloadApplication();
  }, [reloadApplication]);

  const onApply = async () => {
    if (!appKitchen.trim() || !appName.trim() || appBusy) return;
    setAppBusy(true);
    const id = await submitKitchenApplication({
      fullName: appName.trim(),
      kitchenName: appKitchen.trim(),
      area: appArea.trim(),
      cuisine: appCuisine.trim(),
      phone: appPhone.trim(),
    });
    setAppBusy(false);
    if (!id) {
      showToast('Could not submit — you may already have an application in progress.', 'danger');
      return;
    }
    setApplying(false);
    await reloadApplication();
    showToast('Application sent — you’ll see your code here once it’s approved.', 'info');
  };

  const onOpenMyKitchen = async () => {
    if (!myApp?.inviteCode || claimBusy) return;
    setClaimBusy(true);
    const result = await claimKitchenInvite(myApp.inviteCode);
    setClaimBusy(false);
    if (!result) {
      showToast('Could not open the kitchen — try again.', 'danger');
      return;
    }
    setShowApproved(false);
    await refreshRoles();
    await reloadApplication();
    void refresh();
    showToast(`${result.name} is yours — switch to the kitchen portal`, 'info');
  };

  // Marketing preference lives on the profile, so it follows the account.
  useEffect(() => {
    if (demo) return;
    let cancelled = false;
    void fetchMarketingOptIn().then((v) => {
      if (!cancelled) setOffers(v);
    });
    return () => {
      cancelled = true;
    };
  }, [demo]);

  const onClaim = async () => {
    if (!code.trim() || claimBusy) return;
    setClaimBusy(true);
    setClaimError(null);
    const result = await claimKitchenInvite(code.trim());
    setClaimBusy(false);
    if (!result) {
      setClaimError('That code is not valid, or it has already been used.');
      return;
    }
    setClaiming(false);
    setCode('');
    // The account just gained the kitchen_owner role — re-read it so the
    // portal switcher offers the kitchen immediately.
    await refreshRoles();
    void refresh();
    showToast(`${result.name} is yours — switch to the kitchen portal`, 'info');
  };

  const myBookings = bookings.filter((b) => b.attendee === (user?.name ?? ''));
  // Partner portals this account is actually entitled to open.
  const availablePortals = PARTNER_ROLES.filter((r) => roles.includes(r));

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
      icon: <Info size={20} color={colors.textBrand} strokeWidth={1.75} />,
      label: 'About & policies',
      onPress: () => navigation.navigate('About'),
    },
    ...(demo || roles.includes('kitchen')
      ? []
      : myApp?.status === 'approved'
        ? [
            {
              icon: <ChefHat size={20} color={colors.textBrand} strokeWidth={1.75} />,
              label: 'You’re approved — open your kitchen',
              onPress: () => setShowApproved(true),
            },
          ]
        : myApp?.status === 'pending'
          ? [
              {
                icon: <KeyRound size={20} color={colors.textMuted} strokeWidth={1.75} />,
                label: 'Kitchen application under review',
                onPress: () =>
                  showToast('Your application is under review — you’ll get a code here once approved.', 'info'),
              },
            ]
          : [
              {
                icon: <ChefHat size={20} color={colors.textBrand} strokeWidth={1.75} />,
                label: 'Run a kitchen',
                onPress: () => setApplying(true),
              },
              {
                icon: <KeyRound size={20} color={colors.textBrand} strokeWidth={1.75} />,
                label: 'I have an invite code',
                onPress: () => setClaiming(true),
              },
            ]),
    ...(availablePortals.length
      ? [
          {
            icon: <ChefHat size={20} color={colors.textBrand} strokeWidth={1.75} />,
            label: 'Switch portal',
            onPress: () => setSwitching(true),
          },
        ]
      : []),
  ];

  return (
    <Screen bottomInset={16}>
      <PortalHeader title={t.profile} />

      <View style={styles.body}>
        <View style={[styles.identity, shadow.card]}>
          <Avatar name={user?.name ?? 'Guest'} size={52} />
          <View>
            <Text style={type.display(17, 700)}>{user?.name ?? 'Guest'}</Text>
            <Text style={[type.body(13, 600), { color: colors.textMuted }]}>
              {user?.email ?? ''}
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

        {demo ? null : (
          <Button variant="ghost" block onPress={() => void signOut()}>
            Sign out
          </Button>
        )}
      </View>

      <Dialog
        open={switching}
        onClose={() => setSwitching(false)}
        title="Open a partner portal"
      >
        <Text style={[type.body(13, 600), styles.dialogHint]}>
          You hold these roles on this account.
        </Text>
        <View style={styles.roleList}>
          {availablePortals.map((role) => (
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

      <Dialog
        open={claiming}
        onClose={() => setClaiming(false)}
        title="Claim a kitchen"
        footer={
          <>
            <Button variant="ghost" onPress={() => setClaiming(false)}>
              Cancel
            </Button>
            <Button disabled={!code.trim() || claimBusy} onPress={() => void onClaim()}>
              {claimBusy ? 'Checking…' : 'Claim'}
            </Button>
          </>
        }
      >
        <Text style={[type.body(13, 600), styles.dialogHint]}>
          Enter the invite code your Spice Route admin sent you.
        </Text>
        <Input
          label="Invite code"
          placeholder="A1B2C3"
          autoCapitalize="characters"
          autoCorrect={false}
          value={code}
          onChangeText={setCode}
          error={claimError ?? undefined}
          onSubmitEditing={() => void onClaim()}
        />
      </Dialog>

      <Dialog
        open={applying}
        onClose={() => setApplying(false)}
        title="Run a kitchen"
        footer={
          <>
            <Button variant="ghost" onPress={() => setApplying(false)}>
              Cancel
            </Button>
            <Button disabled={!appKitchen.trim() || !appName.trim() || appBusy} onPress={() => void onApply()}>
              {appBusy ? 'Sending…' : 'Send application'}
            </Button>
          </>
        }
      >
        <Text style={[type.body(13, 600), styles.dialogHint]}>
          Tell us about your kitchen. Once it’s approved, your invite code appears
          right here and unlocks the kitchen portal.
        </Text>
        <Input label="Your name" value={appName} onChangeText={setAppName} />
        <Input label="Kitchen name" placeholder="Amma’s Kitchen" value={appKitchen} onChangeText={setAppKitchen} style={styles.stackField} />
        <Input label="Area" placeholder="Tirupur" value={appArea} onChangeText={setAppArea} style={styles.stackField} />
        <Input label="Cuisine" placeholder="South Indian" value={appCuisine} onChangeText={setAppCuisine} style={styles.stackField} />
        <Input label="Phone" placeholder="9xxxxxxxxx" keyboardType="phone-pad" value={appPhone} onChangeText={setAppPhone} style={styles.stackField} />
      </Dialog>

      <Dialog
        open={showApproved}
        onClose={() => setShowApproved(false)}
        title="Your kitchen is approved 🎉"
        footer={
          <>
            <Button variant="ghost" onPress={() => setShowApproved(false)}>
              Later
            </Button>
            <Button disabled={claimBusy} onPress={() => void onOpenMyKitchen()}>
              {claimBusy ? 'Opening…' : 'Open my kitchen'}
            </Button>
          </>
        }
      >
        <Text style={[type.body(13, 600), styles.dialogHint]}>
          {myApp?.kitchenName ? `${myApp.kitchenName} is ready.` : 'Your kitchen is ready.'} Your invite code:
        </Text>
        <View style={styles.codeBox}>
          <Text style={type.display(24, 800)}>{myApp?.inviteCode ?? ''}</Text>
        </View>
        <Text style={[type.body(12, 600), { color: colors.textMuted }]}>
          Tap “Open my kitchen” to claim it and switch to the kitchen portal.
        </Text>
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
        {demo ? null : (
          <View style={styles.prefRow}>
            <View style={styles.prefText}>
              <Text style={type.body(14, 700)}>Offers and news</Text>
              <Text style={[type.body(12, 600), { color: colors.textMuted }]}>
                Order updates always come through, whatever you choose here.
              </Text>
            </View>
            <Switch
              checked={offers}
              onChange={(value) => {
                setOffers(value);
                void setMarketingOptIn(value);
                showToast(value ? 'You’ll hear about offers' : 'Offers turned off', 'info');
              }}
            />
          </View>
        )}

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
  stackField: { marginTop: 10 },
  codeBox: {
    backgroundColor: colors.surfaceSunken,
    borderRadius: radius.md,
    paddingVertical: 14,
    alignItems: 'center',
    marginBottom: 10,
  },
  roleList: { gap: 10 },
  feed: { gap: 12 },
  feedRow: {
    gap: 2,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderSubtle,
  },
  notifHead: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  prefRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingBottom: 14,
    marginBottom: 4,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderSubtle,
  },
  prefText: { flex: 1 },
});
