/**
 * Classes — large photo cards, seats-left warning when a session is nearly full.
 */
import React from 'react';
import { Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Clock, Users } from 'lucide-react-native';

import { Badge, Media } from '../../components';
import { colors, layout, radius, shadow } from '../../theme';
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
  const insets = useSafeAreaInsets();
  const { workshops, loading, refresh } = useStore();

  // Customers only ever see published classes.
  const live = workshops.filter((w) => w.status === 'Live');

  return (
    <View style={styles.root}>
      <View style={[styles.header, { paddingTop: insets.top + 10 }]}>
        <Text style={type.display(28, 800)}>{t.workshops}</Text>
        <Text style={[type.body(14, 600), { color: colors.textMuted }]}>
          Cook alongside the chef, then eat what you made
        </Text>
      </View>

      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={loading} onRefresh={() => void refresh()} />}
      >
        {live.length === 0 ? (
          <View style={styles.empty}>
            <Text style={styles.emptyEmoji}>👩‍🍳</Text>
            <Text style={[type.body(15, 600), styles.emptyText]}>
              No classes scheduled just now — check back soon.
            </Text>
          </View>
        ) : null}

        {live.map((w) => {
          const nextSession = w.sessions[0];
          return (
            <Pressable
              key={w.id}
              onPress={() => navigation.navigate('WorkshopDetail', { id: w.id })}
              style={[styles.card, shadow.card]}
            >
              <Media fill={w.image} style={styles.cover}>
                {w.seatsLeft <= LOW_SEATS ? (
                  <View style={styles.seatBadge}>
                    <Badge tone="warn">{plural(w.seatsLeft, 'seat')} left</Badge>
                  </View>
                ) : null}
              </Media>

              <View style={styles.cardBody}>
                <Text style={type.display(20, 700)} numberOfLines={2}>
                  {w.title}
                </Text>
                <Text style={[type.body(13, 600), { color: colors.textMuted }]} numberOfLines={1}>
                  with {w.host}
                </Text>

                <View style={styles.metaRow}>
                  <Clock size={14} color={colors.textMuted} strokeWidth={2} />
                  <Text style={[type.body(13, 600), { color: colors.textMuted }]}>
                    {' '}{w.duration}
                  </Text>
                  {nextSession ? (
                    <>
                      <Users size={14} color={colors.textMuted} strokeWidth={2} style={styles.metaGap} />
                      <Text style={[type.body(13, 600), { color: colors.textMuted }]}>
                        {' '}{nextSession.when}
                      </Text>
                    </>
                  ) : null}
                </View>

                <View style={styles.priceRow}>
                  <Text style={type.body(17, 800)}>{money(w.price)}</Text>
                  <Text style={[type.body(13, 600), { color: colors.textMuted }]}> per person</Text>
                </View>
              </View>
            </Pressable>
          );
        })}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.surfacePage },
  header: {
    paddingHorizontal: layout.gutter,
    paddingBottom: 14,
    gap: 2,
    backgroundColor: colors.surfaceCard,
  },
  scroll: { padding: layout.gutter, paddingBottom: 32, gap: 16 },
  card: {
    backgroundColor: colors.surfaceCard,
    borderRadius: radius.lg,
    overflow: 'hidden',
  },
  cover: { height: 168, width: '100%', justifyContent: 'flex-start', alignItems: 'flex-end' },
  seatBadge: { margin: 12 },
  cardBody: { padding: layout.cardPadding, gap: 3 },
  metaRow: { flexDirection: 'row', alignItems: 'center', marginTop: 4 },
  metaGap: { marginLeft: 12 },
  priceRow: { flexDirection: 'row', alignItems: 'baseline', marginTop: 8 },
  empty: { alignItems: 'center', paddingVertical: 64, gap: 12 },
  emptyEmoji: { fontSize: 48 },
  emptyText: { color: colors.textMuted, textAlign: 'center' },
});
