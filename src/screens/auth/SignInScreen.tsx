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
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const signingUp = mode === 'signup';
  const valid =
    email.trim().includes('@') && password.length >= 6 && (!signingUp || name.trim().length > 0);

  const onSubmit = async () => {
    if (!valid || busy) return;
    setBusy(true);
    setError(null);
    setNotice(null);

    const result = signingUp
      ? await signUp(email, password, name)
      : await signIn(email, password);

    setBusy(false);

    if (result.error) {
      setError(result.error);
      return;
    }
    if (signingUp) {
      // Projects with email confirmation on won't return a session yet.
      setNotice('Account created. If your project requires email confirmation, confirm it and sign in.');
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
              label="Email"
              placeholder="you@example.com"
              value={email}
              onChangeText={setEmail}
              autoCapitalize="none"
              autoCorrect={false}
              keyboardType="email-address"
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
