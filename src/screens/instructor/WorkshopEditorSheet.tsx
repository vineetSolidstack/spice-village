/**
 * Create / edit a workshop and its sessions.
 *
 * A workshop with a blank id is new; an existing one is edited in place.
 * Sessions carry a display label, a capacity, and a running booked count — the
 * booked count is preserved on edit and defaults to zero for new sessions.
 */
import React, { useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Check, Plus, X } from 'lucide-react-native';

import { Button, Dialog, IconButton, Input, Media, Stepper, Tabs } from '../../components';
import { asset } from '../../components/Media';
import { colors, palette, radius } from '../../theme';
import { useType } from '../../theme/useType';
import { FOOD_IMAGES, FOOD_IMAGE_KEYS } from '../../data/images';
import { DEMO_PROFILE } from '../../data/demo';
import type { Workshop, WorkshopSession } from '../../data/types';

export type WorkshopEditorSheetProps = {
  /** The workshop being edited, a blank draft for "new", or null when closed. */
  draft: Workshop | null;
  onClose: () => void;
  onSave: (workshop: Workshop) => void;
};

export function blankWorkshop(): Workshop {
  return {
    id: '',
    title: '',
    host: DEMO_PROFILE.instructor.name,
    price: 0,
    duration: '2 hrs',
    seatsLeft: 0,
    image: asset(FOOD_IMAGES[FOOD_IMAGE_KEYS[0]]),
    status: 'Draft',
    sessions: [],
  };
}

let sessionSeq = 0;

export function WorkshopEditorSheet({ draft, onClose, onSave }: WorkshopEditorSheetProps) {
  const type = useType();

  const [title, setTitle] = useState('');
  const [price, setPrice] = useState('');
  const [duration, setDuration] = useState('2 hrs');
  const [status, setStatus] = useState<'Live' | 'Draft'>('Draft');
  const [imageKey, setImageKey] = useState(FOOD_IMAGE_KEYS[0]);
  const [sessions, setSessions] = useState<WorkshopSession[]>([]);
  const [newWhen, setNewWhen] = useState('');

  useEffect(() => {
    if (!draft) return;
    setTitle(draft.title);
    setPrice(draft.price ? String(draft.price) : '');
    setDuration(draft.duration);
    setStatus(draft.status);
    setSessions(draft.sessions);
    const match = FOOD_IMAGE_KEYS.find(
      (k) => FOOD_IMAGES[k] === (draft.image as { source?: unknown }).source,
    );
    setImageKey(match ?? FOOD_IMAGE_KEYS[0]);
  }, [draft]);

  if (!draft) return null;

  const priceNum = parseInt(price, 10) || 0;
  const editing = Boolean(draft.id);
  const valid = title.trim().length > 0 && priceNum > 0 && sessions.length > 0;

  const addSession = () => {
    const when = newWhen.trim();
    if (!when) return;
    sessionSeq += 1;
    setSessions((current) => [
      ...current,
      { id: `s-new-${sessionSeq}`, when, capacity: 8, booked: 0 },
    ]);
    setNewWhen('');
  };

  const setCapacity = (id: string, capacity: number) =>
    setSessions((current) => current.map((s) => (s.id === id ? { ...s, capacity } : s)));

  const removeSession = (id: string) =>
    setSessions((current) => current.filter((s) => s.id !== id));

  const onSubmit = () => {
    if (!valid) return;
    // seatsLeft drives the customer-facing "N seats left" badge — take the
    // roomiest upcoming session.
    const seatsLeft = sessions.reduce((max, s) => Math.max(max, s.capacity - s.booked), 0);
    onSave({
      ...draft,
      title: title.trim(),
      price: priceNum,
      duration: duration.trim(),
      status,
      seatsLeft,
      image: asset(FOOD_IMAGES[imageKey]),
      sessions,
    });
    onClose();
  };

  return (
    <Dialog
      open
      onClose={onClose}
      title={editing ? 'Edit workshop' : 'New workshop'}
      footer={
        <>
          <Button variant="ghost" onPress={onClose}>
            Cancel
          </Button>
          <Button disabled={!valid} onPress={onSubmit}>
            {editing ? 'Save' : 'Create'}
          </Button>
        </>
      }
    >
      <ScrollView style={styles.scroll} keyboardShouldPersistTaps="handled">
        <Input label="Title" placeholder="Master the dosa flip" value={title} onChangeText={setTitle} />

        <View style={styles.row}>
          <Input
            label="Price (₹)"
            placeholder="499"
            keyboardType="number-pad"
            value={price}
            onChangeText={(v) => setPrice(v.replace(/\D/g, ''))}
            style={styles.rowField}
          />
          <Input
            label="Duration"
            placeholder="2 hrs"
            value={duration}
            onChangeText={setDuration}
            style={styles.rowField}
          />
        </View>

        <Text style={[type.body(13, 700), styles.label]}>Status</Text>
        <Tabs tabs={['Draft', 'Live']} active={status} onChange={(t) => setStatus(t as 'Live' | 'Draft')} />

        <Text style={[type.body(13, 700), styles.label]}>Cover photo</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.photoRow}>
          {FOOD_IMAGE_KEYS.map((key) => {
            const selected = key === imageKey;
            return (
              <Pressable key={key} onPress={() => setImageKey(key)} accessibilityLabel={`Photo ${key}`}>
                <Media fill={asset(FOOD_IMAGES[key])} style={[styles.thumb, selected ? styles.thumbSel : null]}>
                  {selected ? (
                    <View style={styles.thumbCheck}>
                      <Check size={14} color="#FFFFFF" strokeWidth={3} />
                    </View>
                  ) : null}
                </Media>
              </Pressable>
            );
          })}
        </ScrollView>

        <Text style={[type.body(13, 700), styles.label]}>Sessions</Text>
        {sessions.length === 0 ? (
          <Text style={[type.body(12, 600), { color: colors.textMuted, marginBottom: 8 }]}>
            Add at least one session with a date and seat cap.
          </Text>
        ) : null}
        {sessions.map((session) => (
          <View key={session.id} style={styles.sessionRow}>
            <View style={styles.sessionInfo}>
              <Text style={type.body(13, 700)} numberOfLines={1}>
                {session.when}
              </Text>
              <Text style={[type.body(11, 600), { color: colors.textMuted }]}>
                {session.booked}/{session.capacity} booked
              </Text>
            </View>
            <Stepper
              value={session.capacity}
              onChange={(next) => setCapacity(session.id, next)}
              min={Math.max(1, session.booked)}
              label="seats"
            />
            <IconButton label="Remove session" size={30} onPress={() => removeSession(session.id)}>
              <X size={16} color={colors.statusDanger} strokeWidth={2} />
            </IconButton>
          </View>
        ))}

        <View style={styles.addSession}>
          <Input
            placeholder="Sat 25 Jul · 10 am"
            value={newWhen}
            onChangeText={setNewWhen}
            onSubmitEditing={addSession}
            style={styles.addField}
          />
          <IconButton label="Add session" variant="tonal" onPress={addSession}>
            <Plus size={18} color={colors.textBrand} strokeWidth={2} />
          </IconButton>
        </View>
      </ScrollView>
    </Dialog>
  );
}

const styles = StyleSheet.create({
  scroll: { maxHeight: 460 },
  row: { flexDirection: 'row', gap: 12, marginTop: 12 },
  rowField: { flex: 1 },
  label: { marginTop: 14, marginBottom: 8 },
  photoRow: { gap: 8, paddingBottom: 4 },
  thumb: {
    width: 64,
    height: 64,
    borderRadius: radius.md,
    borderWidth: 2,
    borderColor: 'transparent',
    alignItems: 'flex-end',
  },
  thumbSel: { borderColor: palette.paprika600 },
  thumbCheck: {
    margin: 4,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: colors.actionPrimary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sessionRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 10 },
  sessionInfo: { flex: 1, minWidth: 0 },
  addSession: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 4 },
  addField: { flex: 1 },
});
