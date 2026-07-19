/**
 * Workshop detail — session chips, participant stepper, payment radios, and a
 * booking confirmation carrying the celebratory pun.
 */
import React, { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ArrowLeft } from 'lucide-react-native';

import { Button, IconButton, Media, Radio, Screen, Stepper, Tag, Toast } from '../../components';
import { colors, layout } from '../../theme';
import { useType } from '../../theme/useType';
import { useLanguage } from '../../i18n';
import { useStore } from '../../data/store';
import { DEMO_PROFILE } from '../../data/demo';
import { money, plural } from '../../lib/format';
import type { PaymentMode } from '../../data/types';
import type { WorkshopStackScreen } from '../../navigation/types';

const HERO_HEIGHT = 150;

export function WorkshopDetailScreen({ navigation, route }: WorkshopStackScreen<'WorkshopDetail'>) {
  const { t } = useLanguage();
  const type = useType();
  const insets = useSafeAreaInsets();
  const { workshops, bookWorkshop } = useStore();

  const [sessionIndex, setSessionIndex] = useState(0);
  const [people, setPeople] = useState(1);
  const [payment, setPayment] = useState<PaymentMode>('venue');
  const [booked, setBooked] = useState(false);

  const workshop = workshops.find((w) => w.id === route.params.id);
  if (!workshop) return null;

  const session = workshop.sessions[sessionIndex];
  const seatsLeft = session ? session.capacity - session.booked : 0;

  const onBook = () => {
    if (!session) return;
    bookWorkshop(session.id, people, payment, DEMO_PROFILE.customer.name);
    setBooked(true);
  };

  return (
    <Screen bottomInset={16} style={styles.screen}>
      <Media fill={workshop.image} style={styles.hero}>
        <View style={[styles.backButton, { top: insets.top + 10 }]}>
          <IconButton label="Back" onPress={() => navigation.goBack()} style={styles.backSurface}>
            <ArrowLeft size={20} color={colors.textBrand} strokeWidth={1.75} />
          </IconButton>
        </View>
      </Media>

      <View style={styles.body}>
        <View>
          <Text style={type.display(22, 800)}>{workshop.title}</Text>
          <Text style={[type.body(13, 600), styles.subtitle]}>
            {workshop.host} · {workshop.duration} · {money(workshop.price)}/person
          </Text>
        </View>

        {booked ? (
          <View style={styles.confirmation}>
            <Toast tone="success">Apron on — you&apos;re in! 👩‍🍳</Toast>
            <Text style={[type.body(13, 600), styles.confirmationDetail]}>
              {session?.when} · {plural(people, 'person', 'people')} ·{' '}
              {payment === 'venue' ? 'Pay at venue' : 'Paid online'}
            </Text>
          </View>
        ) : (
          <>
            <View>
              <Text style={[type.body(13, 700), styles.fieldLabel]}>Session</Text>
              <View style={styles.chips}>
                {workshop.sessions.map((s, i) => {
                  const full = s.booked >= s.capacity;
                  return (
                    <Tag
                      key={s.id}
                      selected={sessionIndex === i}
                      onPress={() => (full ? undefined : setSessionIndex(i))}
                      style={full ? styles.chipFull : undefined}
                    >
                      {full ? `${s.when} · Full` : s.when}
                    </Tag>
                  );
                })}
              </View>
            </View>

            <View>
              <Text style={[type.body(13, 700), styles.fieldLabel]}>Participants</Text>
              <Stepper
                value={people}
                onChange={setPeople}
                min={1}
                max={Math.max(1, seatsLeft)}
                size={32}
                label="participants"
              />
            </View>

            <View style={styles.payment}>
              <Radio
                checked={payment === 'venue'}
                onChange={() => setPayment('venue')}
                label="Pay at venue"
                description="Cash or UPI on arrival"
              />
              <Radio
                checked={payment === 'online'}
                onChange={() => setPayment('online')}
                label="Pay online"
                description="UPI, card or netbanking"
              />
            </View>

            <Button block disabled={!session || seatsLeft <= 0} onPress={onBook}>
              {`${t.book} · ${money(workshop.price * people)}`}
            </Button>
          </>
        )}
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  screen: { paddingTop: 0 },
  hero: { height: HERO_HEIGHT },
  backButton: { position: 'absolute', left: 12 },
  backSurface: { backgroundColor: 'rgba(255,252,248,0.9)' },
  body: { padding: layout.gutter, gap: 14 },
  subtitle: { color: colors.textMuted, marginTop: 2 },
  fieldLabel: { marginBottom: 8 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chipFull: { opacity: 0.45 },
  payment: { gap: 10 },
  confirmation: { alignItems: 'center', paddingVertical: 20 },
  confirmationDetail: { color: colors.textMuted, marginTop: 12, textAlign: 'center' },
});
