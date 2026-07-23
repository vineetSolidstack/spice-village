/**
 * Create a kitchen and issue its owner an invite code.
 *
 * Deliberately code-based rather than creating the user directly: making
 * accounts from the client would mean shipping the service_role key, which
 * bypasses every row-level security policy. Instead the owner signs up
 * themselves and claims the kitchen with a one-time code.
 */
import React, { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import * as Clipboard from 'expo-clipboard';

import { Button, Dialog, Input, Select, useToast } from '../../components';
import { colors, displayFont, radius } from '../../theme';
import { useType } from '../../theme/useType';
import { useStore } from '../../data/store';
import { createKitchenInvite } from '../../data/fetch';

export type CreateKitchenSheetProps = {
  open: boolean;
  onClose: () => void;
};

export function CreateKitchenSheet({ open, onClose }: CreateKitchenSheetProps) {
  const type = useType();
  const { categories, backend, refresh } = useStore();
  const { showToast } = useToast();

  const [name, setName] = useState('');
  const [cuisine, setCuisine] = useState(categories[0] ?? 'South Indian');
  const [area, setArea] = useState('');
  const [busy, setBusy] = useState(false);
  const [code, setCode] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const close = () => {
    setName('');
    setArea('');
    setCode(null);
    setError(null);
    onClose();
  };

  const onCreate = async () => {
    if (!name.trim() || busy) return;
    setBusy(true);
    setError(null);

    const result = await createKitchenInvite(name.trim(), cuisine, area.trim());
    setBusy(false);

    if (!result) {
      setError('Could not create the kitchen. Check you are signed in as a super admin.');
      return;
    }
    setCode(result.code);
    void refresh();
  };

  // Provisioning writes to the database; there is nothing to provision without one.
  if (backend !== 'supabase') {
    return (
      <Dialog open={open} onClose={close} title="Add a kitchen">
        <Text style={[type.body(13, 600), { color: colors.textMuted }]}>
          Creating kitchens and owner accounts needs the Supabase backend configured. The app is
          currently running on bundled demo data.
        </Text>
      </Dialog>
    );
  }

  return (
    <Dialog
      open={open}
      onClose={close}
      title={code ? 'Kitchen created' : 'Add a kitchen'}
      footer={
        code ? (
          <Button block onPress={close}>
            Done
          </Button>
        ) : (
          <>
            <Button variant="ghost" onPress={close}>
              Cancel
            </Button>
            <Button disabled={!name.trim() || busy} onPress={() => void onCreate()}>
              {busy ? 'Creating…' : 'Create'}
            </Button>
          </>
        )
      }
    >
      {code ? (
        <View style={styles.result}>
          <Text style={[type.body(13, 600), { color: colors.textMuted }]}>
            Send this code to the owner of {name.trim()}. They create an account in the app, then
            enter it under Profile → Claim a kitchen.
          </Text>
          <View style={styles.codeBox}>
            <Text style={styles.code}>{code}</Text>
          </View>
          <Button
            variant="secondary"
            block
            onPress={() => {
              void Clipboard.setStringAsync(code);
              showToast('Invite code copied', 'info');
            }}
          >
            Copy code
          </Button>
          <Text style={[type.body(12, 600), { color: colors.textMuted }]}>
            The code works once. Until it is claimed, the kitchen belongs to you.
          </Text>
        </View>
      ) : (
        <View style={styles.form}>
          <Input
            label="Kitchen name"
            placeholder="Lakshmi's Tiffins"
            value={name}
            onChangeText={setName}
            error={error ?? undefined}
          />
          <Select label="Cuisine" options={categories} value={cuisine} onChange={setCuisine} />
          <Input
            label="Area"
            placeholder="Mylapore, Chennai"
            value={area}
            onChangeText={setArea}
          />
        </View>
      )}
    </Dialog>
  );
}

const styles = StyleSheet.create({
  form: { gap: 12 },
  result: { gap: 12 },
  codeBox: {
    backgroundColor: colors.surfaceSunken,
    borderRadius: radius.md,
    paddingVertical: 14,
    alignItems: 'center',
  },
  code: {
    fontFamily: displayFont(800),
    fontSize: 28,
    letterSpacing: 6,
    color: colors.textBrand,
  },
});
