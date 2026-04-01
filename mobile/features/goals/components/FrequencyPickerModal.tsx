import { useEffect, useMemo, useState } from 'react';
import {
  Modal,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { FS, FW, LH } from '../../../theme/typography';
import { useThemeStore } from '../../../store/themeStore';
import type { ColorPalette } from '../../../lib/constants';
import type { MilestoneFrequency } from '../types';

const DAY_LABELS = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];
const DAY_NUMBERS = [1, 2, 3, 4, 5, 6, 7];

const FREQUENCIES: { key: MilestoneFrequency; label: string; hint?: string }[] = [
  { key: 'daily', label: 'Daily' },
  { key: 'x_weekly', label: 'Day per week', hint: 'Select how many days' },
  { key: 'weekly', label: 'Weekly' },
  { key: 'monthly', label: 'Monthly' },
  { key: 'custom_days', label: 'Custom days', hint: 'Select weekdays' },
  { key: 'once', label: 'Once' },
];

type CalendarTarget = 'start' | 'end' | null;

interface Props {
  visible: boolean;
  frequency: MilestoneFrequency;
  daysPerWeek: number;
  customDays: number[];
  scheduleMode: 'open_ended' | 'time_bound';
  startDate: string;
  endDate: string;
  noEndDate: boolean;
  onSelect: (freq: MilestoneFrequency, daysPerWeek: number, customDays: number[]) => void;
  onScheduleChange: (
    mode: 'open_ended' | 'time_bound',
    startDate: string,
    endDate: string,
    noEndDate: boolean,
  ) => void;
  onClose: () => void;
}

function formatDateInput(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function formatDateDisplay(dateValue: string): string {
  if (!dateValue) return 'Select';
  const date = new Date(`${dateValue}T00:00:00`);
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function getTodayString(): string {
  return formatDateInput(new Date());
}

function createMonthDays(cursor: Date) {
  const year = cursor.getFullYear();
  const month = cursor.getMonth();
  const firstDay = new Date(year, month, 1);
  const leading = (firstDay.getDay() + 6) % 7;
  const start = new Date(year, month, 1 - leading);

  return Array.from({ length: 42 }, (_, index) => {
    const date = new Date(start);
    date.setDate(start.getDate() + index);
    return {
      key: formatDateInput(date),
      label: String(date.getDate()),
      value: formatDateInput(date),
      inMonth: date.getMonth() === month,
    };
  });
}

export function FrequencyPickerModal({
  visible,
  frequency,
  daysPerWeek,
  customDays,
  scheduleMode,
  startDate,
  endDate,
  noEndDate,
  onSelect,
  onScheduleChange,
  onClose,
}: Props) {
  const colors = useThemeStore((s) => s.colors);
  const s = useMemo(() => makeStyles(colors), [colors]);
  const [openCalendar, setOpenCalendar] = useState<CalendarTarget>(null);
  const [calendarMonth, setCalendarMonth] = useState(() => {
    const today = new Date();
    return new Date(today.getFullYear(), today.getMonth(), 1);
  });

  useEffect(() => {
    if (!visible) {
      setOpenCalendar(null);
    }
  }, [visible]);

  const endDateError = !!(endDate && startDate && endDate < startDate);
  const monthDays = useMemo(() => createMonthDays(calendarMonth), [calendarMonth]);

  const openCalendarFor = (target: Exclude<CalendarTarget, null>) => {
    const seed = target === 'start' ? (startDate || getTodayString()) : (endDate || startDate || getTodayString());
    const current = new Date(`${seed}T00:00:00`);
    setCalendarMonth(new Date(current.getFullYear(), current.getMonth(), 1));
    setOpenCalendar(target);
  };

  const handleModeChange = (mode: 'open_ended' | 'time_bound') => {
    if (mode === 'time_bound') {
      onScheduleChange(mode, startDate || getTodayString(), endDate, noEndDate);
      return;
    }
    onScheduleChange(mode, startDate, endDate, noEndDate);
  };

  const handlePickDate = (value: string) => {
    if (openCalendar === 'start') {
      const nextEnd = !noEndDate && endDate && endDate < value ? value : endDate;
      onScheduleChange(scheduleMode, value, nextEnd, noEndDate);
    }
    if (openCalendar === 'end') {
      onScheduleChange(scheduleMode, startDate, value, noEndDate);
    }
    setOpenCalendar(null);
  };

  const renderCalendar = (target: Exclude<CalendarTarget, null>) => (
    <View style={[s.calendarCard, { backgroundColor: colors.background, borderColor: colors.border }]}>
      <View style={s.calendarHeader}>
        <TouchableOpacity
          style={s.calendarNav}
          onPress={() => setCalendarMonth((current) => new Date(current.getFullYear(), current.getMonth() - 1, 1))}
        >
          <MaterialCommunityIcons name="chevron-left" size={16} color={colors.textSecondary} />
        </TouchableOpacity>
        <Text style={[s.calendarTitle, { color: colors.text }]}>
          {calendarMonth.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
        </Text>
        <TouchableOpacity
          style={s.calendarNav}
          onPress={() => setCalendarMonth((current) => new Date(current.getFullYear(), current.getMonth() + 1, 1))}
        >
          <MaterialCommunityIcons name="chevron-right" size={16} color={colors.textSecondary} />
        </TouchableOpacity>
      </View>

      <View style={s.calendarWeekdays}>
        {['M', 'T', 'W', 'T', 'F', 'S', 'S'].map((label, index) => (
          <Text key={`${label}-${index}`} style={[s.calendarWeekday, { color: colors.textSecondary }]}>
            {label}
          </Text>
        ))}
      </View>

      <View style={s.calendarGrid}>
        {monthDays.map((day) => {
          const selected = (target === 'start' ? startDate : endDate) === day.value;
          return (
            <TouchableOpacity
              key={day.key}
              style={[s.calendarDay, !day.inMonth && { opacity: 0.35 }]}
              onPress={() => handlePickDate(day.value)}
            >
              <View style={[s.calendarDayDot, selected && { backgroundColor: colors.primary }]}>
                <Text style={[s.calendarDayText, { color: selected ? '#fff' : colors.text }]}>
                  {day.label}
                </Text>
              </View>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );

  return (
    <Modal visible={visible} animationType="fade" transparent onRequestClose={onClose}>
      <View style={s.overlay}>
        <Pressable style={s.backdrop} onPress={onClose} />
        <SafeAreaView style={s.sheetWrap}>
          <View style={[s.sheet, { backgroundColor: colors.background }]}>
            <View style={s.header}>
              <Text style={s.title}>Milestone setup</Text>
              <TouchableOpacity onPress={onClose} style={[s.closeBtn, { backgroundColor: colors.card }]}>
                <MaterialCommunityIcons name="close" size={18} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>

            <ScrollView contentContainerStyle={s.content} showsVerticalScrollIndicator={false}>
              <View style={[s.modeToggle, { backgroundColor: colors.background, borderColor: colors.border }]}>
                {(['time_bound', 'open_ended'] as const).map((mode) => {
                  const active = scheduleMode === mode;
                  return (
                    <TouchableOpacity
                      key={mode}
                      style={[s.modeBtn, active && { backgroundColor: colors.primary }]}
                      onPress={() => handleModeChange(mode)}
                      activeOpacity={0.85}
                    >
                      <Text style={[s.modeBtnText, { color: active ? '#fff' : colors.textSecondary }]}>
                        {mode === 'time_bound' ? 'Time-bound' : 'Open-ended'}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              <View style={s.section}>
                {FREQUENCIES.map((item) => {
                  const selected = frequency === item.key;
                  return (
                    <View
                      key={item.key}
                      style={[
                        s.optionCard,
                        {
                          backgroundColor: colors.card,
                          borderColor: selected ? colors.primary : colors.border,
                        },
                      ]}
                    >
                      <TouchableOpacity
                        style={s.optionRow}
                        onPress={() => onSelect(item.key, daysPerWeek, customDays)}
                        activeOpacity={0.85}
                      >
                        <View style={{ flex: 1 }}>
                          <Text style={[s.optionText, { color: colors.text }]}>{item.label}</Text>
                          {item.hint && (
                            <Text style={[s.optionHint, { color: selected ? colors.primary : colors.textSecondary }]}>
                              {item.hint}
                            </Text>
                          )}
                        </View>
                        <View
                          style={[
                            s.radio,
                            { borderColor: selected ? colors.primary : colors.border },
                            selected && { backgroundColor: colors.primary },
                          ]}
                        >
                          {selected && <View style={s.radioInner} />}
                        </View>
                      </TouchableOpacity>

                      {selected && item.key === 'x_weekly' && (
                        <View style={s.inlinePicker}>
                          <Text style={[s.inlineLabel, { color: colors.textSecondary }]}>Days per week</Text>
                          <View style={s.chipRow}>
                            {[1, 2, 3, 4, 5, 6].map((count) => {
                              const active = daysPerWeek === count;
                              return (
                                <TouchableOpacity
                                  key={count}
                                  style={[
                                    s.chip,
                                    {
                                      backgroundColor: active ? colors.primary : colors.background,
                                      borderColor: active ? colors.primary : colors.border,
                                    },
                                  ]}
                                  onPress={() => onSelect('x_weekly', count, customDays)}
                                >
                                  <Text style={[s.chipText, { color: active ? '#fff' : colors.text }]}>{count}</Text>
                                </TouchableOpacity>
                              );
                            })}
                          </View>
                        </View>
                      )}

                      {selected && item.key === 'custom_days' && (
                        <View style={s.inlinePicker}>
                          <Text style={[s.inlineLabel, { color: colors.textSecondary }]}>Choose days</Text>
                          <View style={s.chipRow}>
                            {DAY_NUMBERS.map((day, index) => {
                              const active = customDays.includes(day);
                              return (
                                <TouchableOpacity
                                  key={day}
                                  style={[
                                    s.dayChip,
                                    {
                                      backgroundColor: active ? colors.primary : colors.background,
                                      borderColor: active ? colors.primary : colors.border,
                                    },
                                  ]}
                                  onPress={() => {
                                    const next = active
                                      ? customDays.filter((value) => value !== day)
                                      : [...customDays, day].sort((a, b) => a - b);
                                    onSelect('custom_days', daysPerWeek, next);
                                  }}
                                >
                                  <Text style={[s.chipText, { color: active ? '#fff' : colors.text }]}>
                                    {DAY_LABELS[index]}
                                  </Text>
                                </TouchableOpacity>
                              );
                            })}
                          </View>
                        </View>
                      )}
                    </View>
                  );
                })}
              </View>

              {scheduleMode === 'time_bound' && (
                <View style={[s.sectionCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
                  <Text style={[s.sectionTitle, { color: colors.text }]}>Duration</Text>
                  <Text style={[s.sectionSub, { color: colors.textSecondary }]}>
                    Set when this milestone starts and optionally ends.
                  </Text>

                  <View style={s.dateBlock}>
                    <TouchableOpacity
                      style={[s.dateRow, { borderBottomColor: colors.border }]}
                      onPress={() => openCalendarFor('start')}
                      activeOpacity={0.85}
                    >
                      <View>
                        <Text style={[s.dateLabel, { color: colors.text }]}>Start date</Text>
                        <Text style={[s.dateSub, { color: colors.textSecondary }]}>Defaults to today</Text>
                      </View>
                      <View style={[s.datePill, { backgroundColor: colors.background, borderColor: colors.border }]}>
                        <Text style={[s.datePillText, { color: colors.text }]}>
                          {formatDateDisplay(startDate || getTodayString())}
                        </Text>
                        <MaterialCommunityIcons name="calendar-month-outline" size={14} color={colors.primary} />
                      </View>
                    </TouchableOpacity>
                    {openCalendar === 'start' && renderCalendar('start')}
                  </View>

                  <TouchableOpacity
                    style={[s.dateRow, { borderBottomColor: colors.border }]}
                    onPress={() => onScheduleChange('time_bound', startDate || getTodayString(), endDate, !noEndDate)}
                    activeOpacity={0.85}
                  >
                    <View>
                      <Text style={[s.dateLabel, { color: colors.text }]}>No end date</Text>
                      <Text style={[s.dateSub, { color: colors.textSecondary }]}>Keep this milestone ongoing</Text>
                    </View>
                    <View style={[s.toggle, { backgroundColor: noEndDate ? colors.primary : colors.border }]}>
                      <View style={[s.toggleThumb, noEndDate && s.toggleThumbOn]} />
                    </View>
                  </TouchableOpacity>

                  {!noEndDate && (
                    <View style={s.dateBlock}>
                      <TouchableOpacity
                        style={s.dateRowLast}
                        onPress={() => openCalendarFor('end')}
                        activeOpacity={0.85}
                      >
                        <View>
                          <Text style={[s.dateLabel, { color: colors.text }]}>End date</Text>
                          <Text style={[s.dateSub, { color: colors.textSecondary }]}>Only for finite milestones</Text>
                        </View>
                        <View
                          style={[
                            s.datePill,
                            {
                              backgroundColor: colors.background,
                              borderColor: endDateError ? '#EF4444' : colors.border,
                            },
                          ]}
                        >
                          <Text style={[s.datePillText, { color: endDate ? colors.text : colors.textSecondary }]}>
                            {formatDateDisplay(endDate)}
                          </Text>
                          <MaterialCommunityIcons name="calendar-month-outline" size={14} color={colors.primary} />
                        </View>
                      </TouchableOpacity>
                      {openCalendar === 'end' && renderCalendar('end')}
                    </View>
                  )}

                  {endDateError && (
                    <Text style={s.dateError}>End date must be on or after start date</Text>
                  )}
                </View>
              )}

              <TouchableOpacity style={[s.doneBtn, { backgroundColor: colors.primary }]} onPress={onClose}>
                <Text style={s.doneBtnText}>Done</Text>
              </TouchableOpacity>
            </ScrollView>
          </View>
        </SafeAreaView>
      </View>
    </Modal>
  );
}

const makeStyles = (colors: ColorPalette) => StyleSheet.create({
  overlay: { flex: 1, justifyContent: 'flex-end' },
  backdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(12, 20, 14, 0.32)' },
  sheetWrap: { justifyContent: 'flex-end' },
  sheet: {
    borderTopLeftRadius: 22,
    borderTopRightRadius: 22,
    maxHeight: '82%',
    minHeight: 420,
    paddingBottom: 14,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  title: { fontSize: FS.section, lineHeight: LH.section, fontWeight: FW.bold, color: colors.text },
  closeBtn: {
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: { padding: 14, gap: 10, paddingBottom: 20 },
  section: { gap: 8 },
  optionCard: {
    borderRadius: 12,
    borderWidth: 1,
    overflow: 'hidden',
  },
  optionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  optionText: { fontSize: FS.secondary, lineHeight: LH.secondary, fontWeight: FW.semibold },
  optionHint: { fontSize: FS.caption, lineHeight: LH.caption, marginTop: 2 },
  radio: {
    width: 18,
    height: 18,
    borderRadius: 9,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioInner: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#fff' },
  inlinePicker: {
    paddingHorizontal: 12,
    paddingBottom: 10,
    gap: 8,
  },
  inlineLabel: { fontSize: FS.caption, lineHeight: LH.caption, fontWeight: FW.medium },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  chip: {
    minWidth: 34,
    height: 32,
    borderRadius: 9,
    borderWidth: 1,
    paddingHorizontal: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dayChip: {
    width: 34,
    height: 32,
    borderRadius: 9,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  chipText: { fontSize: FS.caption, lineHeight: LH.caption, fontWeight: FW.semibold },
  sectionCard: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 12,
    gap: 10,
  },
  sectionTitle: { fontSize: FS.secondary, lineHeight: LH.secondary, fontWeight: FW.semibold },
  sectionSub: { fontSize: FS.caption, lineHeight: LH.caption },
  modeToggle: {
    flexDirection: 'row',
    borderRadius: 10,
    borderWidth: 1,
    overflow: 'hidden',
    marginBottom: 2,
  },
  modeBtn: {
    flex: 1,
    paddingVertical: 9,
    alignItems: 'center',
  },
  modeBtnText: { fontSize: FS.caption, lineHeight: LH.caption, fontWeight: FW.semibold },
  dateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingBottom: 10,
    marginBottom: 2,
    borderBottomWidth: 1,
  },
  dateRowLast: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  dateBlock: { gap: 8 },
  dateLabel: { fontSize: FS.secondary, lineHeight: LH.secondary, fontWeight: FW.semibold },
  dateSub: { fontSize: FS.caption, lineHeight: LH.caption, marginTop: 2 },
  datePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 7,
    minWidth: 128,
    justifyContent: 'space-between',
  },
  datePillText: { fontSize: FS.caption, lineHeight: LH.caption, fontWeight: FW.medium },
  dateError: { fontSize: FS.caption, lineHeight: LH.caption, color: '#EF4444' },
  toggle: { width: 38, height: 22, borderRadius: 11, justifyContent: 'center', paddingHorizontal: 2 },
  toggleThumb: { width: 18, height: 18, borderRadius: 9, backgroundColor: '#fff' },
  toggleThumbOn: { alignSelf: 'flex-end' },
  calendarCard: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 10,
    gap: 8,
  },
  calendarHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  calendarNav: { width: 28, height: 28, alignItems: 'center', justifyContent: 'center' },
  calendarTitle: { fontSize: FS.secondary, lineHeight: LH.secondary, fontWeight: FW.semibold },
  calendarWeekdays: { flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 2 },
  calendarWeekday: {
    width: `${100 / 7}%`,
    textAlign: 'center',
    fontSize: FS.caption,
    lineHeight: LH.caption,
    fontWeight: FW.semibold,
  },
  calendarGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 4 },
  calendarDay: {
    width: '13.2%',
    aspectRatio: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  calendarDayDot: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
  },
  calendarDayText: { fontSize: FS.caption, lineHeight: LH.caption, fontWeight: FW.medium },
  doneBtn: { marginTop: 2, paddingVertical: 12, borderRadius: 12, alignItems: 'center' },
  doneBtnText: { fontSize: FS.secondary, lineHeight: LH.secondary, fontWeight: FW.bold, color: '#fff' },
});
