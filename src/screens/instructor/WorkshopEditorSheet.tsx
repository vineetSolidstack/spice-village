/**
 * Create / edit a workshop and its sessions.
 *
 * A workshop with a blank id is new; an existing one is edited in place.
 * Sessions carry a display label, a capacity, and a running booked count — the
 * booked count is preserved on edit and defaults to zero for new sessions.
 */
import React, { useEffect, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { Camera, ImagePlus, Plus, X } from 'lucide-react-native';

import { Button, Dialog, IconButton, Input, Media, Stepper, Tabs } from '../../components';
import { gradient, photo as photoFill } from '../../components/Media';
import { colors, radius } from '../../theme';
import { useType } from '../../theme/useType';
import { useStore } from '../../data/store';
import { useAuth } from '../../state/auth';
import { captureDishPhoto, pickDishPhoto } from '../../data/upload';
import { uploadWorkshopPhoto } from '../../data/upload';
import type { Workshop, WorkshopSession } from '../../data/types';

export type WorkshopEditorSheetProps = {
  /** The workshop being edited, a blank draft for "new", or null when closed. */
  draft: Workshop | null;
  onClose: () => void;
  onSave: (workshop: Workshop) => void;
};

export function blankWorkshop(host: string): Workshop {
  return {
    id: '',
    title: '',
    host,
    price: 0,
    duration: '2 hrs',
    seatsLeft: 0,
    image: gradient('#E8A33D', '#D9531A'),
    status: 'Draft',
    sessions: [],
  };
}

let sessionSeq = 0;

export function WorkshopEditorSheet({ draft, onClose, onSave }: WorkshopEditorSheetProps) {
  const type = useType();
  const { backend } = useStore();
  const { user } = useAuth();

  const [title, setTitle] = useState('');
  const [price, setPrice] = useState('');
  const [duration, setDuration] = useState('2 hrs');
  const [status, setStatus] = useState<'Live' | 'Draft'>('Draft');
  // Uploaded cover URL (http once hosted). Null = no cover yet.
  const [coverUrl, setCoverUrl] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [photoError, setPhotoError] = useState<string | null>(null);
  const [sessions, setSessions] = useState<WorkshopSession[]>([]);
  const [newWhen, setNewWhen] = useState('');

  useEffect(() => {
    if (!draft) return;
    setTitle(draft.title);
    setPrice(draft.price ? String(draft.price) : '');
    setDuration(draft.duration);
    setStatus(draft.status);
    setSessions(draft.sessions);
    setCoverUrl(draft.image.kind === 'photo' ? draft.image.uri : null);
    setPhotoError(null);
  }, [draft]);

  const uploadCover = async (take: boolean) => {
    const picked = take ? await captureDishPhoto() : await pickDishPhoto();
    if (!picked) return;
    setCoverUrl(picked.uri);
    if (backend !== 'supabase' || !user) return;
    setUploading(true);
    const url = await uploadWorkshopPhoto(user.id, picked);
    setUploading(false);
    if (url) {
      setCoverUrl(url);
      setPhotoError(null);
    } else {
      setPhotoError('That photo could not be uploaded. Try again.');
    }
  };

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
    // Block save while a cover is still a local file:// URL, so customers never
    // get a photo only this device can load.
    if (backend === 'supabase' && coverUrl && !/^https?:\/\//.test(coverUrl)) {
      setPhotoError('The cover is still uploading — wait a moment and try again.');
      return;
    }
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
      image: coverUrl ? photoFill(coverUrl) : gradient('#E8A33D', '#D9531A'),
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
          <Button disabled={!valid || uploading} onPress={onSubmit}>
            {uploading ? 'Uploading…' : editing ? 'Save' : 'Create'}
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
        {coverUrl ? (
          <Media fill={photoFill(coverUrl)} style={styles.cover} />
        ) : (
          <View style={styles.coverEmpty}>
            <Text style={[type.body(12, 600), { color: colors.textMuted }]}>
              Upload a photo for this class.
            </Text>
          </View>
        )}
        <View style={styles.uploadRow}>
          <Button
            size="sm"
            variant="secondary"
            icon={<ImagePlus size={16} color={colors.textBrand} strokeWidth={2} />}
            onPress={() => void uploadCover(false)}
          >
            {uploading ? 'Uploading…' : coverUrl ? 'Replace' : 'Upload'}
          </Button>
          <Button
            size="sm"
            variant="ghost"
            icon={<Camera size={16} color={colors.textBrand} strokeWidth={2} />}
            onPress={() => void uploadCover(true)}
          >
            Camera
          </Button>
        </View>
        {photoError ? (
          <Text style={[type.body(12, 700), { color: colors.statusDanger }]}>{photoError}</Text>
        ) : null}

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
  cover: { height: 150, borderRadius: radius.md, marginBottom: 8 },
  coverEmpty: {
    height: 90,
    borderRadius: radius.md,
    backgroundColor: colors.surfaceSunken,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  uploadRow: { flexDirection: 'row', gap: 8, marginBottom: 6 },
  row: { flexDirection: 'row', gap: 12, marginTop: 12 },
  rowField: { flex: 1 },
  label: { marginTop: 14, marginBottom: 8 },
  sessionRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 10 },
  sessionInfo: { flex: 1, minWidth: 0 },
  addSession: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 4 },
  addField: { flex: 1 },
});
