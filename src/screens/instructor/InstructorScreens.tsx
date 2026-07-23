/**
 * Workshop instructor portal — dashboard, workshops, bookings.
 * Plain functional copy throughout; puns are customer-facing only.
 */
import React, { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Calendar, Pencil, Plus } from 'lucide-react-native';

import {
  Avatar,
  Badge,
  Button,
  IconButton,
  InfoBanner,
  PortalHeader,
  Screen,
  SectionLabel,
  StatCard,
  useToast,
} from '../../components';
import { colors, layout, palette, radius, shadow } from '../../theme';
import { useType } from '../../theme/useType';
import { useStore } from '../../data/store';
import { INSTRUCTOR_MONTH_EARNINGS, INSTRUCTOR_WORKSHOP_IDS } from '../../data/demo';
import { money, plural } from '../../lib/format';
import { useAuth } from '../../state/auth';
import { blankWorkshop, WorkshopEditorSheet } from './WorkshopEditorSheet';
import type { Workshop, WorkshopBooking } from '../../data/types';

/**
 * Workshops belonging to the signed-in instructor: the seeded ones, plus any
 * they create in this session (which carry their name as host).
 */
function useMyWorkshops() {
  const { workshops, business } = useStore();
  return workshops.filter(
    (w) => INSTRUCTOR_WORKSHOP_IDS.includes(w.id) || w.host === business.instructorName,
  );
}

/* ------------------------------------------------------------ dashboard -- */

export function InstructorDashboardScreen() {
  const mine = useMyWorkshops();
  const { bookings, business } = useStore();

  const sessions = mine.flatMap((w) => w.sessions);
  const seatsBooked = sessions.reduce((sum, s) => sum + s.booked, 0);
  const liveCount = mine.filter((w) => w.status === 'Live').length;
  const next = sessions[0];

  return (
    <Screen bottomInset={16}>
      <PortalHeader
        title={business.instructorName}
        right={<Badge tone="success">Verified</Badge>}
      />

      <View style={styles.body}>
        <View style={styles.stats}>
          <StatCard label="Live workshops" value={liveCount} />
          <StatCard label="Seats booked" value={seatsBooked} />
          <StatCard label="This month" value={money(INSTRUCTOR_MONTH_EARNINGS)} />
        </View>

        {next ? (
          <InfoBanner icon={<Calendar size={16} color={palette.turmeric600} strokeWidth={1.75} />}>
            {`Next session: ${next.when} · ${next.booked}/${next.capacity} booked`}
          </InfoBanner>
        ) : null}

        <SectionLabel>Recent bookings</SectionLabel>
        {bookings.slice(0, 2).map((booking) => (
          <BookingRow key={booking.id} booking={booking} />
        ))}
      </View>
    </Screen>
  );
}

/* ------------------------------------------------------------ workshops -- */

export function InstructorWorkshopsScreen() {
  const type = useType();
  const mine = useMyWorkshops();
  const { saveWorkshop, business } = useStore();
  const { showToast } = useToast();
  const [editing, setEditing] = useState<Workshop | null>(null);

  return (
    <Screen bottomInset={16}>
      <PortalHeader
        title="Workshops"
        right={
          <Button
            size="sm"
            icon={<Plus size={16} color="#FFFFFF" strokeWidth={2} />}
            onPress={() => setEditing(blankWorkshop(business.instructorName))}
          >
            New
          </Button>
        }
      />

      <View style={styles.body}>
        {mine.map((workshop) => (
          <View key={workshop.id} style={[styles.card, shadow.card]}>
            <View style={styles.cardHead}>
              <Text style={[type.display(17, 700), styles.cardTitle]} numberOfLines={1}>
                {workshop.title}
              </Text>
              <Badge tone={workshop.status === 'Live' ? 'success' : 'neutral'}>
                {workshop.status}
              </Badge>
              <IconButton label={`Edit ${workshop.title}`} size={32} onPress={() => setEditing(workshop)}>
                <Pencil size={15} color={colors.textBrand} strokeWidth={2} />
              </IconButton>
            </View>

            <Text style={[type.body(13, 600), { color: colors.textMuted }]}>
              {money(workshop.price)}/person · {workshop.duration}
            </Text>

            <View style={styles.sessions}>
              {workshop.sessions.map((session) => {
                const full = session.booked >= session.capacity;
                return (
                  <View key={session.id} style={styles.sessionRow}>
                    <Text style={type.body(13, 600)}>{session.when}</Text>
                    <Text
                      style={[
                        type.body(12, 700),
                        { color: full ? colors.statusDanger : colors.textBrand },
                      ]}
                    >
                      {full ? 'Full' : `${session.booked}/${session.capacity} booked`}
                    </Text>
                  </View>
                );
              })}
            </View>
          </View>
        ))}
      </View>

      <WorkshopEditorSheet
        draft={editing}
        onClose={() => setEditing(null)}
        onSave={(workshop) => {
          const creating = !workshop.id;
          saveWorkshop(workshop);
          showToast(creating ? `${workshop.title} created` : `${workshop.title} saved`, 'info');
        }}
      />
    </Screen>
  );
}

/* ------------------------------------------------------------- bookings -- */

export function InstructorBookingsScreen() {
  const { bookings } = useStore();
  const { setRole } = useAuth();

  return (
    <Screen bottomInset={16}>
      <PortalHeader title="Bookings" />
      <View style={styles.body}>
        {bookings.map((booking) => (
          <BookingRow key={booking.id} booking={booking} />
        ))}

        <View style={styles.divider} />
        <Button variant="secondary" block onPress={() => setRole('customer')}>
          Back to customer app
        </Button>
      </View>
    </Screen>
  );
}

function BookingRow({ booking }: { booking: WorkshopBooking }) {
  const type = useType();
  const paidOnline = booking.payment === 'online';

  return (
    <View style={[styles.row, shadow.card]}>
      <Avatar name={booking.attendee} />
      <View style={styles.rowBody}>
        <Text style={type.body(14, 700)} numberOfLines={1}>
          {booking.attendee} · {plural(booking.people, 'person', 'people')}
        </Text>
        <Text style={[type.body(12, 600), { color: colors.textMuted }]} numberOfLines={1}>
          {booking.session}
        </Text>
      </View>
      <Badge tone={paidOnline ? 'success' : 'warn'}>
        {paidOnline ? 'Paid online' : 'Pay at venue'}
      </Badge>
    </View>
  );
}

const styles = StyleSheet.create({
  body: { paddingHorizontal: layout.gutter, gap: 12 },
  stats: { flexDirection: 'row', gap: 10 },
  card: {
    backgroundColor: colors.surfaceCard,
    borderRadius: radius.lg,
    padding: layout.cardPadding,
    gap: 10,
  },
  cardHead: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  cardTitle: { flex: 1 },
  sessions: { gap: 6 },
  sessionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.surfaceSunken,
    borderRadius: 10,
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  row: {
    backgroundColor: colors.surfaceCard,
    borderRadius: radius.lg,
    padding: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  rowBody: { flex: 1, minWidth: 0 },
  divider: { height: 1, backgroundColor: colors.borderSubtle, marginTop: 6 },
});
