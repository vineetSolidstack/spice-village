/**
 * Mini month grid used by the bulk-order flow.
 * Past days are disabled; the selected day is paprika-filled.
 */
import React, { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { ChevronLeft, ChevronRight } from 'lucide-react-native';

import { colors, radius, shadow } from '../theme';
import { useType } from '../theme/useType';
import { IconButton } from './IconButton';

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];
const WEEKDAYS = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

export type MiniCalendarProps = {
  value: Date | null;
  onChange: (date: Date) => void;
};

function startOfToday(): Date {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}

export function MiniCalendar({ value, onChange }: MiniCalendarProps) {
  const type = useType();
  const today = startOfToday();
  const [view, setView] = useState(() => new Date(today.getFullYear(), today.getMonth(), 1));

  const year = view.getFullYear();
  const month = view.getMonth();
  const leadingBlanks = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  const cells: (number | null)[] = [
    ...Array<null>(leadingBlanks).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ];

  const isSelected = (day: number) =>
    !!value && value.getDate() === day && value.getMonth() === month && value.getFullYear() === year;
  const isPast = (day: number) => new Date(year, month, day) < today;

  return (
    <View style={[styles.card, shadow.card]}>
      <View style={styles.header}>
        <IconButton
          label="Previous month"
          size={30}
          onPress={() => setView(new Date(year, month - 1, 1))}
        >
          <ChevronLeft size={16} color={colors.textBrand} strokeWidth={1.75} />
        </IconButton>
        <Text style={[type.display(15, 700), styles.monthLabel]}>
          {MONTHS[month]} {year}
        </Text>
        <IconButton label="Next month" size={30} onPress={() => setView(new Date(year, month + 1, 1))}>
          <ChevronRight size={16} color={colors.textBrand} strokeWidth={1.75} />
        </IconButton>
      </View>

      <View style={styles.grid}>
        {WEEKDAYS.map((d, i) => (
          <View key={`w${i}`} style={styles.cell}>
            <Text style={[type.body(11, 700), { color: colors.textFaint }]}>{d}</Text>
          </View>
        ))}

        {cells.map((day, i) =>
          day === null ? (
            <View key={`b${i}`} style={styles.cell} />
          ) : (
            <Pressable
              key={day}
              accessibilityRole="button"
              accessibilityState={{ disabled: isPast(day), selected: isSelected(day) }}
              disabled={isPast(day)}
              onPress={() => onChange(new Date(year, month, day))}
              style={[styles.cell, styles.day, isSelected(day) ? styles.daySelected : null]}
            >
              <Text
                style={[
                  type.body(13, isSelected(day) ? 800 : 600),
                  {
                    color: isPast(day)
                      ? colors.textFaint
                      : isSelected(day)
                        ? '#FFFFFF'
                        : colors.textBody,
                  },
                ]}
              >
                {day}
              </Text>
            </Pressable>
          ),
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surfaceCard,
    borderRadius: radius.lg,
    padding: 14,
  },
  header: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
  monthLabel: { flex: 1, textAlign: 'center' },
  grid: { flexDirection: 'row', flexWrap: 'wrap' },
  cell: {
    // Seven columns.
    width: `${100 / 7}%`,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 6,
  },
  day: { borderRadius: 10 },
  daySelected: { backgroundColor: colors.actionPrimary },
});
