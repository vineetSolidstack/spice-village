/**
 * Workshops list — cards with a seats-left warn badge when ≤3.
 */
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { Badge, Card, PortalHeader, Screen } from '../../components';
import { colors, layout } from '../../theme';
import { useType } from '../../theme/useType';
import { useLanguage } from '../../i18n';
import { useStore } from '../../data/store';
import { money, plural } from '../../lib/format';
import type { WorkshopStackScreen } from '../../navigation/types';

/** Below this, the remaining-seats badge turns turmeric. */
const LOW_SEATS = 3;

export function WorkshopsScreen({ navigation }: WorkshopStackScreen<'Workshops'>) {
  const { t } = useLanguage();
  const type = useType();
  const { workshops } = useStore();

  // Customers only ever see published workshops.
  const live = workshops.filter((w) => w.status === 'Live');

  return (
    <Screen bottomInset={16}>
      <PortalHeader title={t.workshops} />

      <View style={styles.list}>
        {live.map((w) => (
          <Card
            key={w.id}
            image={w.image}
            imageHeight={110}
            onPress={() => navigation.navigate('WorkshopDetail', { id: w.id })}
          >
            <View style={styles.head}>
              <Text style={[type.display(17, 700), styles.title]} numberOfLines={1}>
                {w.title}
              </Text>
              {w.seatsLeft <= LOW_SEATS ? (
                <Badge tone="warn">{plural(w.seatsLeft, 'seat')} left</Badge>
              ) : null}
            </View>
            <View style={styles.meta}>
              <Text style={[type.body(13, 600), { color: colors.textMuted }]}>
                {w.host} · {w.duration} ·{' '}
              </Text>
              <Text style={[type.body(13, 800), { color: colors.textBrand }]}>{money(w.price)}</Text>
            </View>
          </Card>
        ))}
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  list: { paddingHorizontal: layout.gutter, paddingTop: 4, gap: 14 },
  head: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  title: { flex: 1 },
  meta: { flexDirection: 'row', alignItems: 'center', marginTop: 4 },
});
