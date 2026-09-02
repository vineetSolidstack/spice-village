/**
 * Sign in / create account.
 *
 * The account decides the app: signing in as the super admin opens the
 * super-admin portal, a kitchen owner lands in their kitchen, everyone else
 * gets the customer app. Nothing here lets a person pick a portal.
 */
import React, { useEffect, useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';

import { BrandLogo, Button, Input, Screen } from '../../components';
import { colors, layout, radius, shadow } from '../../theme';
import { useType } from '../../theme/useType';
import { useAuth } from '../../state/auth';

type Mode = 'signin' | 'signup';

/** Keep the last 10 digits — canonical for Indian mobile numbers, so "+91 …",
 * "0…", and spaces all resolve to the same account. */
function normalizePhone(raw: string): string {
  const d = raw.replace(/\D/g, '');
  return d.length > 10 ? d.slice(-10) : d;
}

/** Phone sign-in with no OTP: the number becomes a hidden email for Supabase's
 * password auth. Customers only ever see "phone number". */
function phoneToEmail(phone: string): string {
  return `${normalizePhone(phone)}@phone.nandhandelight.in`;
}

export function SignInScreen() {
  const type = useType();
  const { signIn, signUp, signInWithGoogle, googleEnabled, user } = useAuth();
  const navigation = useNavigation();
  // Presented as a modal over the guest app: once signed in (and still a
  // customer, so the navigator didn't swap out from under us), close it and
  // return the person to whatever they were doing — e.g. their cart.
  const canDismiss = navigation.canGoBack();

  useEffect(() => {
    if (user && canDismiss) navigation.goBack();
  }, [user, canDismiss, navigation]);

  const [mode, setMode] = useState<Mode>('signin');
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const signingUp = mode === 'signup';
  // Customers type a phone number; owners/admins can still type their email in
  // the same box (so nobody who signed up by email is locked out).
  const typedEmail = phone.includes('@');
  const idValid = typedEmail
    ? phone.includes('@') && phone.includes('.')
    : normalizePhone(phone).length === 10;
  const valid = idValid && password.length >= 6 && (!signingUp || name.trim().length > 0);

  const onSubmit = async () => {
    if (!valid || busy) return;
    setBusy(true);
    setError(null);
    setNotice(null);

    const authEmail = typedEmail ? phone.trim().toLowerCase() : phoneToEmail(phone);
    const result = signingUp
      ? await signUp(authEmail, password, name)
      : await signIn(authEmail, password);

    setBusy(false);

    if (result.error) {
      setError(result.error);
      return;
    }
    if (signingUp) {
      // With auto-confirm on, sign-up returns a session and the auth listener
      // signs them straight in; this only shows if that hasn't happened yet.
      setNotice('Account created. Sign in with your phone number and password.');
      setMode('signin');
    }
    // On success the auth listener swaps the navigator; nothing to do here.
  };

  return (
    <Screen scroll={false}>
      <KeyboardAvoidingView
        style={styles.fill}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          <View style={styles.logoWrap}>
            <BrandLogo size={96} />
          </View>
          <Text style={[type.body(14, 600), styles.tagline]}>
            Hot, homemade meals — pre-ordered. And classes worth showing up for.
          </Text>

          <View style={[styles.card, shadow.card]}>
            <Text style={[type.display(18, 700), styles.cardTitle]}>
              {signingUp ? 'Create your account' : 'Sign in'}
            </Text>

            {signingUp ? (
              <Input
                label="Your name"
                placeholder="Priya S."
                value={name}
                onChangeText={setName}
                autoCapitalize="words"
              />
            ) : null}

            <Input
              label="Phone number"
              placeholder="98765 43210"
              value={phone}
              onChangeText={setPhone}
              autoCapitalize="none"
              autoCorrect={false}
              keyboardType="default"
            />

            <Input
              label="Password"
              placeholder="At least 6 characters"
              value={password}
              onChangeText={setPassword}
              secureTextEntry
              autoCapitalize="none"
              error={error ?? undefined}
            />

            {notice ? (
              <Text style={[type.body(12, 600), { color: colors.statusSuccess }]}>{notice}</Text>
            ) : null}

            <Button block disabled={!valid || busy} onPress={onSubmit}>
              {busy ? 'Please wait…' : signingUp ? 'Create account' : 'Sign in'}
            </Button>

            {googleEnabled ? (
              <>
                <View style={styles.divider}>
                  <View style={styles.line} />
                  <Text style={[type.body(12, 600), { color: colors.textMuted }]}>or</Text>
                  <View style={styles.line} />
                </View>
                <Button
                  variant="outline"
                  block
                  disabled={busy}
                  onPress={async () => {
                    setBusy(true);
                    setError(null);
                    const result = await signInWithGoogle();
                    setBusy(false);
                    if (result.error) setError(result.error);
                  }}
                >
                  Continue with Google
                </Button>
              </>
            ) : null}

            <Button
              variant="ghost"
              block
              onPress={() => {
                setMode(signingUp ? 'signin' : 'signup');
                setError(null);
                setNotice(null);
              }}
            >
              {signingUp ? 'I already have an account' : 'New here? Create an account'}
            </Button>
          </View>

          {canDismiss ? (
            <Button variant="ghost" block onPress={() => navigation.goBack()}>
              Maybe later — keep browsing
            </Button>
          ) : null}

          <Text style={[type.body(12, 600), styles.footnote]}>
            Kitchen owners: create an account, then enter the invite code from your
            Nandhan Delight admin in Profile.
          </Text>
        </ScrollView>
      </KeyboardAvoidingView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  content: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: layout.gutter,
    gap: 12,
  },
  logoWrap: { alignItems: 'center', marginBottom: 4 },
  tagline: { color: colors.textMuted, textAlign: 'center', marginBottom: 8 },
  card: {
    backgroundColor: colors.surfaceCard,
    borderRadius: radius.lg,
    padding: layout.cardPadding,
    gap: 12,
  },
  cardTitle: { marginBottom: 2 },
  divider: { flexDirection: 'row', alignItems: 'center', gap: 10, marginVertical: 2 },
  line: { flex: 1, height: 1, backgroundColor: colors.borderSubtle },
  footnote: { color: colors.textMuted, textAlign: 'center', marginTop: 8 },
});
