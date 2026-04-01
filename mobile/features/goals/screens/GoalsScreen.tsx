import { useState, useMemo, useCallback, useRef } from 'react';
import * as Haptics from 'expo-haptics';
import { useLocalSearchParams, useFocusEffect } from 'expo-router';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  TouchableWithoutFeedback, Modal, TextInput, Alert, ActivityIndicator, RefreshControl,
} from 'react-native';
import { FlashList } from '@shopify/flash-list';
import { FS, FW, LH } from '../../../theme/typography';
import { useQueryClient, useMutation } from '@tanstack/react-query';
import { MaterialCommunityIcons, Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { apiFetch } from '../../../lib/api';
import { GOAL_CATEGORIES } from '../../../lib/constants';
import { ActivityBadge } from '../../../shared/components/ActivityBadge';
import { useThemeStore } from '../../../store/themeStore';
import { ColorPalette } from '../../../lib/constants';
import { Goal, Milestone, PublicGoal, MsFilter } from '../types';
import {
  useGoals,
  useGoalMilestones,
  useGoalStats,
  usePatchGoalPublic,
  usePatchGoalCoopOpen,
  useToggleMilestone,
  useCreateMilestone,
  useToggleMyMilestone,
  useMyMilestones,
  useCoopJoin,
  useRequestBuddy,
  useGoalTemplate,
  usePublicGoals,
  useCreateGoal,
  useDeleteGoal,
} from '../hooks';
import { createMilestone as createMilestoneApi } from '../api';
import { GoalCard } from '../components/GoalCard';
import { FrequencyPickerModal } from '../components/FrequencyPickerModal';
import { CardSkeleton } from '../../../components/ui/Skeleton';
import { ScreenState } from '../../../components/ui/ScreenState';
import { canGoalBeMadePublic, PUBLIC_GOAL_REQUIRES_MILESTONE_MESSAGE } from '../validation';

type MCIName = React.ComponentProps<typeof MaterialCommunityIcons>['name'];

const DAY_NAMES: Record<number, string> = { 1: 'M', 2: 'T', 3: 'W', 4: 'T', 5: 'F', 6: 'S', 7: 'S' };
const DAY_FULL_NAMES: Record<number, string> = { 1: 'Mon', 2: 'Tue', 3: 'Wed', 4: 'Thu', 5: 'Fri', 6: 'Sat', 7: 'Sun' };

function freqLabel(ms: Milestone): string {
  switch (ms.frequency) {
    case 'daily':   return 'Daily';
    case 'weekly':  return 'Weekly';
    case 'monthly': return 'Monthly';
    case 'once':    return 'Once';
    case 'x_weekly': {
      const n = ms.days_per_week ?? 3;
      return `${n}\u00d7/week`;
    }
    case 'custom_days': {
      if (!ms.custom_days) return 'Custom';
      const days = ms.custom_days.split(',').map(Number).filter(Boolean).sort((a, b) => a - b);
      return days.map((d) => DAY_FULL_NAMES[d]).join(', ');
    }
    default: return 'Once';
  }
}

const FREQUENCIES: { key: Milestone['frequency']; label: string }[] = [
  { key: 'daily', label: 'Daily' },
  { key: 'x_weekly', label: 'X days/week' },
  { key: 'weekly', label: 'Weekly' },
  { key: 'monthly', label: 'Monthly' },
  { key: 'custom_days', label: 'Custom days' },
  { key: 'once', label: 'Once' },
];

const FREQ_LABELS: Record<Milestone['frequency'], string> = {
  daily: 'Daily', weekly: 'Weekly', monthly: 'Monthly',
  once: 'Once', x_weekly: 'Day per week', custom_days: 'Custom',
};

function getTodayString(): string {
  const date = new Date();
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function formatScheduleSummary(
  scheduleMode: 'open_ended' | 'time_bound',
  startDate: string,
  endDate: string,
): string {
  if (scheduleMode !== 'time_bound' || !startDate) return 'Open-ended';
  const start = new Date(`${startDate}T00:00:00`);
  const startStr = start.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  if (!endDate) return `Starts ${startStr}`;
  const end = new Date(`${endDate}T00:00:00`);
  const endStr = end.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  return `${startStr} - ${endStr}`;
}

function msMatchesFilter(ms: Milestone, filter: MsFilter): boolean {
  if (filter === 'all') return true;
  if (filter === 'today') return ms.frequency === 'daily' || ms.frequency === 'x_weekly' || ms.frequency === 'custom_days' || ms.frequency === 'once';
  if (filter === 'week') return ms.frequency === 'weekly' || ms.frequency === 'once';
  if (filter === 'month') return ms.frequency === 'monthly' || ms.frequency === 'once';
  return true;
}

// ─── GoalConfig (full-screen detail) ─────────────────────────────────────────

function GoalConfig({ goal, onBack }: { goal: Goal; onBack: () => void }) {
  const colors = useThemeStore((s) => s.colors);
  const s = useMemo(() => makeStyles(colors), [colors]);

  const [showAddForm, setShowAddForm] = useState(false);
  const [newMsTitle, setNewMsTitle] = useState('');
  const [newMsFreq, setNewMsFreq] = useState<Milestone['frequency']>('daily');
  const [newDaysPerWeek, setNewDaysPerWeek] = useState(3);
  const [newCustomDays, setNewCustomDays] = useState<number[]>([1, 2, 3, 4, 5]);

  const cat = GOAL_CATEGORIES.find((c) => c.key === goal.category);

  const { data: milestones = [], isLoading } = useGoalMilestones(goal.id);
  const { data: stats = [] } = useGoalStats(goal.id);
  const togglePublicMutation = usePatchGoalPublic(goal.id);
  const toggleCoopMutation = usePatchGoalCoopOpen(goal.id);
  const toggleMsMutation = useToggleMilestone(goal.id);
  const addMsMutation = useCreateMilestone(goal.id);
  const deleteMutation = useDeleteGoal();

  const handleDeleteGoal = () => {
    Alert.alert(
      'Delete Goal',
      `Delete "${goal.title}"? This will also remove all its milestones.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => deleteMutation.mutate(goal.id, { onSuccess: onBack }),
        },
      ]
    );
  };

  const handleAddMilestone = () => {
    addMsMutation.mutate(
      {
        title: newMsTitle,
        frequency: newMsFreq,
        daysPerWeek: newMsFreq === 'x_weekly' ? newDaysPerWeek : undefined,
        customDays: newMsFreq === 'custom_days' ? newCustomDays.sort((a, b) => a - b).join(',') : undefined,
      },
      {
        onSuccess: () => {
          setNewMsTitle('');
          setNewMsFreq('daily');
          setNewDaysPerWeek(3);
          setNewCustomDays([1, 2, 3, 4, 5]);
          setShowAddForm(false);
        },
      }
    );
  };

  return (
    <SafeAreaView style={s.container}>
      <View style={s.configHeader}>
        <TouchableOpacity onPress={onBack} style={s.configBack}>
          <MaterialCommunityIcons name="arrow-left" size={22} color={colors.primary} />
        </TouchableOpacity>
        <View style={s.configTitleWrap}>
          <View style={[s.catBadge, { backgroundColor: colors.primaryLight }]}>
            <MaterialCommunityIcons name={cat?.icon as MCIName} size={13} color={colors.primary} />
            <Text style={[s.catLabel, { color: colors.primary }]}>{cat?.label}</Text>
          </View>
        </View>
      </View>

      <ScrollView contentContainerStyle={s.configContent}>
        <Text style={s.configTitle}>{goal.title}</Text>
        {goal.description ? <Text style={s.configDesc}>{goal.description}</Text> : null}

        <TouchableOpacity
          style={[s.publicRow, { backgroundColor: colors.card, borderColor: colors.border }]}
          onPress={() => { Haptics.selectionAsync(); togglePublicMutation.mutate(!goal.is_public); }}
          disabled={goal.coop_open}
          activeOpacity={goal.coop_open ? 1 : 0.8}
        >
          <MaterialCommunityIcons
            name={goal.is_public || goal.coop_open ? 'eye-outline' : 'eye-off-outline'}
            size={20}
            color={goal.is_public || goal.coop_open ? colors.primary : colors.textSecondary}
          />
          <View style={{ flex: 1 }}>
            <Text style={[s.publicLabel, { color: colors.text }]}>{goal.is_public || goal.coop_open ? 'Public' : 'Private'}</Text>
            <Text style={[s.publicSub, { color: colors.textSecondary }]}>
              {goal.is_public || goal.coop_open ? 'Visible in Discover & Finder' : 'Only visible to you'}
            </Text>
          </View>
          <View style={[s.toggle, { backgroundColor: goal.is_public || goal.coop_open ? colors.primary : colors.border }]}>
            <View style={[s.toggleThumb, (goal.is_public || goal.coop_open) && s.toggleThumbOn]} />
          </View>
        </TouchableOpacity>

        <TouchableOpacity
          style={[s.publicRow, { backgroundColor: colors.card, borderColor: goal.coop_open ? colors.primary : colors.border }]}
          onPress={() => toggleCoopMutation.mutate(!goal.coop_open)}
          activeOpacity={0.8}
        >
          <MaterialCommunityIcons
            name="account-multiple-outline"
            size={20}
            color={goal.coop_open ? colors.primary : colors.textSecondary}
          />
          <View style={{ flex: 1 }}>
            <Text style={[s.publicLabel, { color: colors.text }]}>Co-op Goal</Text>
            <Text style={[s.publicSub, { color: colors.textSecondary }]}>
              {goal.coop_open ? 'Others can join and share this goal' : 'Enable to let someone work on this with you'}
            </Text>
          </View>
          <View style={[s.toggle, { backgroundColor: goal.coop_open ? colors.primary : colors.border }]}>
            <View style={[s.toggleThumb, goal.coop_open && s.toggleThumbOn]} />
          </View>
        </TouchableOpacity>

        {/* Achievement banners */}
        {(() => {
          const bestStreak = stats.length > 0 ? Math.max(...stats.map(st => st.streak)) : 0;
          const highCompletion = stats.find(st => st.completion_rate >= 0.8 && st.total_expected >= 3);
          if (!bestStreak && !highCompletion) return null;
          return (
            <View style={s.achieveRow}>
              {bestStreak >= 3 && (
                <View style={[s.achievePill, { backgroundColor: colors.primaryLight, borderColor: colors.primary }]}>
                  <Text style={[s.achieveText, { color: colors.primary }]}>🔥 {bestStreak}-day streak</Text>
                </View>
              )}
              {highCompletion && (
                <View style={[s.achievePill, { backgroundColor: colors.primaryLight, borderColor: colors.primary }]}>
                  <Text style={[s.achieveText, { color: colors.primary }]}>
                    🎯 {Math.round(highCompletion.completion_rate * 100)}% completion
                  </Text>
                </View>
              )}
            </View>
          );
        })()}

        <View style={s.configSection}>
          <Text style={s.configSectionTitle}>Milestones</Text>

          {isLoading && <ActivityIndicator color={colors.primary} style={{ marginVertical: 12 }} />}

          {!isLoading && milestones.length === 0 && (
            <View style={[s.configEmpty, { backgroundColor: colors.card }]}>
              <MaterialCommunityIcons name="flag-outline" size={28} color={colors.border} />
              <Text style={[s.configEmptyText, { color: colors.textSecondary }]}>No milestones yet</Text>
            </View>
          )}

          {milestones.map((ms) => {
            const done = ms.is_done_this_period;
            const statsItem = stats.find(st => st.id === ms.id);
            return (
              <TouchableOpacity
                key={ms.id}
                style={[s.msCard, { backgroundColor: colors.card, borderColor: done ? colors.primary : colors.border }]}
                onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); toggleMsMutation.mutate(ms); }}
                activeOpacity={0.75}
              >
                <MaterialCommunityIcons
                  name={done ? 'checkbox-marked-circle' : 'checkbox-blank-circle-outline'}
                  size={22}
                  color={done ? colors.primary : colors.border}
                />
                <View style={{ flex: 1 }}>
                  <Text style={[s.msCardTitle, done && { textDecorationLine: 'line-through', opacity: 0.5 }, { color: colors.text }]}>
                    {ms.title}
                  </Text>
                  {ms.frequency !== 'once' && (
                    <View style={s.msMetaRow}>
                      <Text style={[s.msCardFreq, { color: colors.primary }]}>{freqLabel(ms)}</Text>
                      {statsItem && statsItem.streak > 0 && (
                        <Text style={[s.msStatChip, { color: colors.primary }]}>🔥 {statsItem.streak}</Text>
                      )}
                      {statsItem && statsItem.total_expected > 0 && (
                        <Text style={[s.msStatChip, { color: statsItem.completion_rate >= 0.8 ? colors.primary : colors.textSecondary }]}>
                          {Math.round(statsItem.completion_rate * 100)}%
                        </Text>
                      )}
                    </View>
                  )}
                </View>
              </TouchableOpacity>
            );
          })}

          {!showAddForm ? (
            <TouchableOpacity
              style={[s.addMsBtn, { borderColor: colors.primary }]}
              onPress={() => setShowAddForm(true)}
              activeOpacity={0.7}
            >
              <MaterialCommunityIcons name="plus-circle-outline" size={20} color={colors.primary} />
              <Text style={[s.addMsBtnText, { color: colors.primary }]}>Add Milestone</Text>
            </TouchableOpacity>
          ) : (
            <View style={[s.addMsForm, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <View style={s.addMsFormRow}>
                <Text style={[s.addMsFormTitle, { color: colors.text }]}>New Milestone</Text>
                <TouchableOpacity onPress={() => { setShowAddForm(false); setNewMsTitle(''); setNewMsFreq('daily'); setNewDaysPerWeek(3); setNewCustomDays([1, 2, 3, 4, 5]); }}>
                  <MaterialCommunityIcons name="close" size={18} color={colors.textSecondary} />
                </TouchableOpacity>
              </View>
              <TextInput
                style={[s.addMsInput, { backgroundColor: colors.background, borderColor: colors.border, color: colors.text }]}
                value={newMsTitle}
                onChangeText={setNewMsTitle}
                placeholder="Milestone title..."
                placeholderTextColor={colors.textSecondary}
                autoFocus
              />
              <View style={s.freqRow}>
                {FREQUENCIES.map((f) => (
                  <TouchableOpacity
                    key={f.key}
                    style={[
                      s.freqChip,
                      { borderColor: colors.border, backgroundColor: colors.background },
                      newMsFreq === f.key && { backgroundColor: colors.primary, borderColor: colors.primary },
                    ]}
                    onPress={() => setNewMsFreq(f.key)}
                  >
                    <Text style={[s.freqChipText, { color: newMsFreq === f.key ? '#fff' : colors.textSecondary }]}>
                      {f.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
              {newMsFreq === 'x_weekly' && (
                <View style={s.subPickerRow}>
                  {[1, 2, 3, 4, 5, 6].map((n) => (
                    <TouchableOpacity
                      key={n}
                      style={[
                        s.subPickerChip,
                        { borderColor: colors.border, backgroundColor: colors.background },
                        newDaysPerWeek === n && { backgroundColor: colors.primary, borderColor: colors.primary },
                      ]}
                      onPress={() => setNewDaysPerWeek(n)}
                    >
                      <Text style={[s.subPickerChipText, { color: newDaysPerWeek === n ? '#fff' : colors.textSecondary }]}>
                        {n}
                      </Text>
                    </TouchableOpacity>
                  ))}
                  <Text style={[s.subPickerLabel, { color: colors.textSecondary }]}>days/wk</Text>
                </View>
              )}
              {newMsFreq === 'custom_days' && (
                <View style={s.subPickerRow}>
                  {([1, 2, 3, 4, 5, 6, 7] as number[]).map((d) => {
                    const active = newCustomDays.includes(d);
                    return (
                      <TouchableOpacity
                        key={d}
                        style={[
                          s.subPickerChip,
                          { borderColor: colors.border, backgroundColor: colors.background },
                          active && { backgroundColor: colors.primary, borderColor: colors.primary },
                        ]}
                        onPress={() => {
                          setNewCustomDays((prev) => {
                            if (prev.includes(d)) {
                              if (prev.length === 1) return prev;
                              return prev.filter((x) => x !== d);
                            }
                            return [...prev, d];
                          });
                        }}
                      >
                        <Text style={[s.subPickerChipText, { color: active ? '#fff' : colors.textSecondary }]}>
                          {DAY_NAMES[d]}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              )}
              <TouchableOpacity
                style={[s.saveBtn, { backgroundColor: colors.primary }, (!newMsTitle || addMsMutation.isPending) && { opacity: 0.5 }]}
                onPress={handleAddMilestone}
                disabled={!newMsTitle || addMsMutation.isPending}
              >
                {addMsMutation.isPending
                  ? <ActivityIndicator color="#fff" size="small" />
                  : <Text style={s.saveBtnText}>Save Milestone</Text>}
              </TouchableOpacity>
            </View>
          )}
        </View>

        <TouchableOpacity
          style={[s.deleteGoalBtn, { borderColor: '#EF4444' }]}
          onPress={handleDeleteGoal}
          disabled={deleteMutation.isPending}
        >
          <MaterialCommunityIcons name="trash-can-outline" size={18} color={'#EF4444'} />
          <Text style={[s.deleteGoalText, { color: '#EF4444' }]}>Delete Goal</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

// ─── Due-date helper ─────────────────────────────────────────────────────────

function getMsDueText(ms: Milestone): string | null {
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const fmt = (d: Date) => d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });

  if (ms.frequency === 'once') {
    if (!ms.due_date) return null;
    const due = new Date(ms.due_date); due.setHours(0, 0, 0, 0);
    if (ms.is_done_this_period) return 'Completed';
    const diff = Math.round((due.getTime() - today.getTime()) / 86400000);
    if (diff < 0) return `Overdue since ${fmt(due)}`;
    if (diff === 0) return 'Due today';
    if (diff === 1) return 'Due tomorrow';
    return `Due ${fmt(due)}`;
  }
  if (ms.frequency === 'daily' || ms.frequency === 'x_weekly' || ms.frequency === 'custom_days') {
    if (ms.is_done_this_period) {
      const next = new Date(today); next.setDate(next.getDate() + 1);
      return `Done · next due ${fmt(next)}`;
    }
    return `Due today · ${fmt(today)}`;
  }
  if (ms.frequency === 'weekly') {
    const eow = new Date(today); eow.setDate(today.getDate() + (7 - today.getDay()));
    if (ms.is_done_this_period) {
      const next = new Date(eow); next.setDate(next.getDate() + 1);
      return `Done · next due ${fmt(next)}`;
    }
    return `Due this week · by ${fmt(eow)}`;
  }
  if (ms.frequency === 'monthly') {
    const eom = new Date(today.getFullYear(), today.getMonth() + 1, 0);
    if (ms.is_done_this_period) {
      const next = new Date(today.getFullYear(), today.getMonth() + 2, 1);
      return `Done · next due ${fmt(next)}`;
    }
    return `Due this month · by ${fmt(eom)}`;
  }
  return null;
}

// ─── MsRow ───────────────────────────────────────────────────────────────────

function MsRow({ ms, onToggle, colors }: { ms: Milestone; onToggle: () => void; colors: any }) {
  const s = useMemo(() => makeStyles(colors), [colors]);
  const cat = GOAL_CATEGORIES.find((c) => c.key === ms.goal_category);
  const done = ms.is_done_this_period;
  const dueText = getMsDueText(ms);
  return (
    <TouchableOpacity style={[s.msRow, { backgroundColor: colors.card }]} onPress={onToggle} activeOpacity={0.75}>
      <MaterialCommunityIcons
        name={done ? 'checkbox-marked-circle' : 'checkbox-blank-circle-outline'}
        size={24}
        color={done ? colors.primary : colors.border}
      />
      <View style={{ flex: 1 }}>
        <Text style={[s.msRowTitle, done && { textDecorationLine: 'line-through', opacity: 0.5 }, { color: colors.text }]}>
          {ms.title}
        </Text>
        <View style={s.msRowMeta}>
          {cat && <MaterialCommunityIcons name={cat.icon as MCIName} size={12} color={colors.textSecondary} />}
          <Text style={[s.msRowGoal, { color: colors.textSecondary }]} numberOfLines={1}>{ms.goal_title}</Text>
          {ms.frequency !== 'once' && (
            <View style={[s.freqPill, { backgroundColor: colors.primaryLight }]}>
              <Text style={[s.freqPillText, { color: colors.primary }]}>{freqLabel(ms)}</Text>
            </View>
          )}
        </View>
        {dueText && (
          <Text style={[s.msDueText, { color: done ? colors.primary : colors.textSecondary }]}>{dueText}</Text>
        )}
      </View>
    </TouchableOpacity>
  );
}

// ─── MilestonesView ───────────────────────────────────────────────────────────

function MilestonesView({ goals }: { goals: Goal[] }) {
  const colors = useThemeStore((s) => s.colors);
  const s = useMemo(() => makeStyles(colors), [colors]);
  const [filter, setFilter] = useState<MsFilter>('all');
  const [selectedGoals, setSelectedGoals] = useState<Set<string>>(new Set());
  const [openDropdown, setOpenDropdown] = useState<'date' | 'goal' | null>(null);

  const { data: milestones = [], isLoading, isError: isMsError, refetch } = useMyMilestones();
  const [manualRefreshing, setManualRefreshing] = useState(false);
  const handleRefresh = useCallback(async () => {
    setManualRefreshing(true);
    try { await refetch(); } finally { setManualRefreshing(false); }
  }, [refetch]);
  const toggleMsMutation = useToggleMyMilestone();

  const toggleGoal = (id: string) => {
    setSelectedGoals((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const filtered = milestones.filter((ms) => {
    if (!msMatchesFilter(ms, filter)) return false;
    if (selectedGoals.size > 0 && !selectedGoals.has(ms.goal_id)) return false;
    return true;
  });

  const groupedData = useMemo(() => {
    const pending = filtered.filter((ms) => !ms.is_done_this_period);
    const done = filtered.filter((ms) => ms.is_done_this_period);
    const data: any[] = [];
    if (pending.length > 0) {
      data.push({ type: 'header', label: `Pending · ${pending.length}` });
      pending.forEach(ms => data.push({ type: 'item', data: ms }));
    }
    if (done.length > 0) {
      data.push({ type: 'header', label: `Completed · ${done.length}` });
      done.forEach(ms => data.push({ type: 'item', data: ms }));
    }
    return data;
  }, [filtered]);

  const DATE_OPTIONS: { key: MsFilter; label: string }[] = [
    { key: 'all', label: 'All' },
    { key: 'today', label: 'Today' },
    { key: 'week', label: 'This Week' },
    { key: 'month', label: 'This Month' },
  ];

  const dateLabel = DATE_OPTIONS.find((o) => o.key === filter)?.label ?? 'All';
  const goalLabel = selectedGoals.size === 0 ? 'All Goals' : `${selectedGoals.size} Selected`;
  const goalActive = selectedGoals.size > 0;

  if (isLoading && !manualRefreshing) {
    return (
      <View style={{ flex: 1, padding: 16 }}>
        {[1, 2, 3, 4, 5].map((i) => <CardSkeleton key={i} height={80} />)}
      </View>
    );
  }

  if (isMsError && milestones.length === 0) {
    return (
      <ScreenState
        type="error"
        title="Couldn't load milestones"
        message="Check your connection and try again."
        onRetry={refetch}
      />
    );
  }

  return (
    <View style={{ flex: 1 }}>
      {openDropdown !== null && (
        <TouchableWithoutFeedback onPress={() => setOpenDropdown(null)}>
          <View style={[StyleSheet.absoluteFillObject, { zIndex: 5 }]} />
        </TouchableWithoutFeedback>
      )}

      <View style={[s.filterBar, { zIndex: 10 }]}>
        <TouchableOpacity
          style={[s.filterPill, { borderColor: filter !== 'all' ? colors.primary : colors.border, backgroundColor: filter !== 'all' ? colors.primaryLight : colors.card }]}
          onPress={() => setOpenDropdown(openDropdown === 'date' ? null : 'date')}
          activeOpacity={0.8}
        >
          <MaterialCommunityIcons name="calendar-range" size={14} color={filter !== 'all' ? colors.primary : colors.textSecondary} />
          <Text style={[s.filterPillText, { color: filter !== 'all' ? colors.primary : colors.textSecondary }]}>{dateLabel}</Text>
          <MaterialCommunityIcons name={openDropdown === 'date' ? 'chevron-up' : 'chevron-down'} size={14} color={filter !== 'all' ? colors.primary : colors.textSecondary} />
        </TouchableOpacity>
        <TouchableOpacity
          style={[s.filterPill, { borderColor: goalActive ? colors.primary : colors.border, backgroundColor: goalActive ? colors.primaryLight : colors.card }]}
          onPress={() => setOpenDropdown(openDropdown === 'goal' ? null : 'goal')}
          activeOpacity={0.8}
        >
          <MaterialCommunityIcons name="flag-outline" size={14} color={goalActive ? colors.primary : colors.textSecondary} />
          <Text style={[s.filterPillText, { color: goalActive ? colors.primary : colors.textSecondary }]}>{goalLabel}</Text>
          <MaterialCommunityIcons name={openDropdown === 'goal' ? 'chevron-up' : 'chevron-down'} size={14} color={goalActive ? colors.primary : colors.textSecondary} />
        </TouchableOpacity>
      </View>

      {openDropdown === 'date' && (
        <View style={[s.dropdownPanel, { zIndex: 10, backgroundColor: colors.card, borderColor: colors.border }]}>
          {DATE_OPTIONS.map((opt) => {
            const active = filter === opt.key;
            return (
              <TouchableOpacity
                key={opt.key}
                style={[s.dropdownItem, active && { backgroundColor: colors.primaryLight }]}
                onPress={() => { setFilter(opt.key); setOpenDropdown(null); }}
              >
                <Text style={[s.dropdownItemText, { color: active ? colors.primary : colors.text }]}>{opt.label}</Text>
                {active && <MaterialCommunityIcons name="check" size={16} color={colors.primary} />}
              </TouchableOpacity>
            );
          })}
        </View>
      )}
      {openDropdown === 'goal' && goals.length > 0 && (
        <View style={[s.dropdownPanel, { zIndex: 10, backgroundColor: colors.card, borderColor: colors.border }]}>
          {selectedGoals.size > 0 && (
            <TouchableOpacity style={s.dropdownItem} onPress={() => setSelectedGoals(new Set())}>
              <Text style={[s.dropdownItemText, { color: colors.textSecondary }]}>Clear selection</Text>
            </TouchableOpacity>
          )}
          {goals.map((g) => {
            const cat = GOAL_CATEGORIES.find((c) => c.key === g.category);
            const active = selectedGoals.has(g.id);
            return (
              <TouchableOpacity
                key={g.id}
                style={[s.dropdownItem, active && { backgroundColor: colors.primaryLight }]}
                onPress={() => toggleGoal(g.id)}
              >
                {cat && <MaterialCommunityIcons name={cat.icon as MCIName} size={15} color={active ? colors.primary : colors.textSecondary} />}
                <Text style={[s.dropdownItemText, { color: active ? colors.primary : colors.text, flex: 1 }]} numberOfLines={1}>{g.title}</Text>
                {active && <MaterialCommunityIcons name="check" size={16} color={colors.primary} />}
              </TouchableOpacity>
            );
          })}
        </View>
      )}

      <FlashList
        data={groupedData}
        renderItem={({ item }) => {
          if (item.type === 'header') return <Text style={s.msGroupLabel}>{item.label}</Text>;
          return <MsRow ms={item.data} onToggle={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); toggleMsMutation.mutate(item.data); }} colors={colors} />;
        }}
        contentContainerStyle={{ padding: 16 }}
        refreshControl={<RefreshControl refreshing={manualRefreshing} onRefresh={handleRefresh} tintColor={colors.primary} />}
        ListEmptyComponent={() => (
          <ScreenState
            type="empty"
            title="No milestones"
            message="Add milestones in My Goals"
            icon="check-circle-outline"
          />
        )}
      />
    </View>
  );
}

// ─── GoalsView ────────────────────────────────────────────────────────────────

function GoalsView({
  goals, isLoading, isError, refetch,
  onSelectGoal,
}: {
  goals: Goal[];
  isLoading: boolean;
  isError: boolean;
  refetch: () => void;
  onSelectGoal: (g: Goal) => void;
}) {
  const colors = useThemeStore((s) => s.colors);
  const qc = useQueryClient();
  const [manualRefreshing, setManualRefreshing] = useState(false);
  const handleRefresh = useCallback(async () => {
    setManualRefreshing(true);
    try { await refetch(); } finally { setManualRefreshing(false); }
  }, [refetch]);

  const togglePublicMutation = useMutation({
    mutationFn: ({ id, isPublic }: { id: string; isPublic: boolean }) =>
      apiFetch(`/goals/${id}`, { method: 'PATCH', body: JSON.stringify({ isPublic }) }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['goals'] }),
  });

  if (isLoading && !manualRefreshing) {
    return (
      <View style={{ flex: 1, padding: 16 }}>
        {[1, 2, 3, 4].map((i) => <CardSkeleton key={i} />)}
      </View>
    );
  }

  if (isError && goals.length === 0) {
    return (
      <ScreenState
        type="error"
        title="Couldn't load goals"
        message="Check your connection and try again."
        onRetry={refetch}
      />
    );
  }

  return (
    <FlashList
      data={goals}
      renderItem={({ item }) => (
        <GoalCard
          goal={item}
          onPress={() => onSelectGoal(item)}
          onTogglePublic={() => togglePublicMutation.mutate({ id: item.id, isPublic: !item.is_public })}
          colors={colors}
        />
      )}
      contentContainerStyle={{ padding: 16 }}
      refreshControl={<RefreshControl refreshing={manualRefreshing} onRefresh={handleRefresh} tintColor={colors.primary} />}
      ListEmptyComponent={() => (
        <ScreenState
          type="empty"
          title="No goals yet"
          message="Tap + to add your first goal"
          icon="flag-checkered"
        />
      )}
      ItemSeparatorComponent={() => <View style={{ height: 12 }} />}
      ListFooterComponent={() => <View style={{ height: 100 }} />}
    />
  );
}

// ─── GoalDetailSheet ──────────────────────────────────────────────────────────

function GoalDetailSheet({
  goal, onClose, onCoopJoin, onBuddyRequest, onUseTemplate, coopPending, buddyPending, templatePending,
}: {
  goal: PublicGoal;
  onClose: () => void;
  onCoopJoin: () => void;
  onBuddyRequest: () => void;
  onUseTemplate: () => void;
  coopPending: boolean;
  buddyPending: boolean;
  templatePending: boolean;
}) {
  const colors = useThemeStore((s) => s.colors);
  const s = useMemo(() => makeStyles(colors), [colors]);
  const cat = GOAL_CATEGORIES.find((c) => c.key === goal.category);

  const { data: milestones = [], isLoading } = useGoalMilestones(goal.id);

  const isCoop = goal.coop_open;
  const actionDisabled = goal.has_buddy || goal.my_request_status != null;
  const actionLabel = () => {
    if (goal.has_buddy) return isCoop ? 'Spot taken' : 'Already buddied';
    if (goal.my_request_status === 'pending') return 'Request sent';
    if (goal.my_request_status === 'accepted') return isCoop ? 'Joined!' : 'Buddied!';
    return isCoop ? 'Join Co-op' : 'Buddy Up';
  };
  const actionPending = isCoop ? coopPending : buddyPending;
  const onAction = isCoop ? onCoopJoin : onBuddyRequest;

  return (
    <SafeAreaView style={[s.discoverScreen, { backgroundColor: colors.background }]}>
      <View style={s.discoverHeader}>
        <TouchableOpacity onPress={onClose} style={[s.discoverClose, { backgroundColor: colors.card }]}>
          <MaterialCommunityIcons name="arrow-left" size={20} color={colors.textSecondary} />
        </TouchableOpacity>
        <View style={{ flex: 1, marginLeft: 12 }}>
          <View style={[s.catBadge, { backgroundColor: colors.primaryLight, alignSelf: 'flex-start' }]}>
            <MaterialCommunityIcons name={cat?.icon as MCIName} size={12} color={colors.primary} />
            <Text style={[s.catLabel, { color: colors.primary }]}>{cat?.label}</Text>
          </View>
        </View>
      </View>

      <ScrollView contentContainerStyle={{ padding: 20, gap: 16, paddingBottom: 40 }}>
        <Text style={[s.discoverTitle, { color: colors.text }]}>{goal.title}</Text>
        {goal.description ? <Text style={[s.goalCardDesc, { color: colors.textSecondary, lineHeight: 20 }]}>{goal.description}</Text> : null}

        {/* Author */}
        <View style={[s.discoverUser, { backgroundColor: colors.card, borderRadius: 12, padding: 12 }]}>
          <View style={[s.discoverAvatar, { backgroundColor: colors.primaryLight }]}>
            <Text style={[s.discoverAvatarText, { color: colors.primary }]}>{goal.display_name[0]}</Text>
          </View>
          <Text style={[s.discoverUserName, { color: colors.text, fontWeight: FW.semibold }]}>{goal.display_name}</Text>
          <ActivityBadge level={goal.activity_level} small />
        </View>

        {/* Actions */}
        <View style={{ flexDirection: 'row', gap: 10 }}>
          <TouchableOpacity
            style={[s.saveBtn, { flex: 1, backgroundColor: actionDisabled ? colors.card : colors.primary, borderWidth: actionDisabled ? 1 : 0, borderColor: colors.border }]}
            onPress={onAction}
            disabled={actionDisabled || actionPending}
          >
            {actionPending
              ? <ActivityIndicator color="#fff" size="small" />
              : (
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                  {!actionDisabled && <MaterialCommunityIcons name={isCoop ? 'account-multiple-outline' : 'handshake-outline'} size={16} color="#fff" />}
                  <Text style={[s.saveBtnText, { color: actionDisabled ? colors.textSecondary : '#fff' }]}>{actionLabel()}</Text>
                </View>
              )}
          </TouchableOpacity>
          <TouchableOpacity
            style={[s.saveBtn, { flex: 1, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border }]}
            onPress={onUseTemplate}
            disabled={templatePending}
          >
            {templatePending
              ? <ActivityIndicator color={colors.primary} size="small" />
              : <Text style={[s.saveBtnText, { color: colors.primary }]}>Copy Only</Text>}
          </TouchableOpacity>
        </View>

        {/* Milestones */}
        <Text style={[s.configSectionTitle, { color: colors.textSecondary }]}>Milestones</Text>
        {isLoading && <ActivityIndicator color={colors.primary} />}
        {!isLoading && milestones.length === 0 && (
          <Text style={[s.goalCardDesc, { color: colors.textSecondary }]}>No milestones yet</Text>
        )}
        {milestones.map((ms) => (
          <View key={ms.id} style={[s.msCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <MaterialCommunityIcons name="flag-outline" size={18} color={colors.primary} />
            <View style={{ flex: 1 }}>
              <Text style={[s.msCardTitle, { color: colors.text }]}>{ms.title}</Text>
              {ms.frequency !== 'once' && (
                <Text style={[s.msCardFreq, { color: colors.primary }]}>{freqLabel(ms)}</Text>
              )}
            </View>
          </View>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}

// ─── DiscoverModal ────────────────────────────────────────────────────────────

function DiscoverModal({ onClose, myGoals }: { onClose: () => void; myGoals: Goal[] }) {
  const colors = useThemeStore((s) => s.colors);
  const s = useMemo(() => makeStyles(colors), [colors]);
  const [search, setSearch] = useState('');
  const [filterCat, setFilterCat] = useState('');
  const [buddyFilter, setBuddyFilter] = useState<'all' | 'open' | 'taken'>('open');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [selectedGoal, setSelectedGoal] = useState<PublicGoal | null>(null);
  const [pendingJoins, setPendingJoins] = useState<Set<string>>(new Set());
  const [openDropdown, setOpenDropdown] = useState<'category' | 'buddy' | null>(null);

  const { data: results = [], isLoading } = usePublicGoals(debouncedSearch, filterCat, buddyFilter);
  const coopJoinMutation = useCoopJoin();
  const buddyRequestMutation = useRequestBuddy();
  const useTemplateMutation = useGoalTemplate();

  const handleSearch = (text: string) => {
    setSearch(text);
    clearTimeout((handleSearch as any)._t);
    (handleSearch as any)._t = setTimeout(() => setDebouncedSearch(text), 400);
  };

  const BUDDY_FILTERS: { key: 'all' | 'open' | 'taken'; label: string }[] = [
    { key: 'all', label: 'All' },
    { key: 'open', label: 'Open' },
    { key: 'taken', label: 'Taken' },
  ];

  const catLabel = filterCat ? (GOAL_CATEGORIES.find((c) => c.key === filterCat)?.label ?? 'Category') : 'All Categories';
  const buddyLabel = BUDDY_FILTERS.find((f) => f.key === buddyFilter)?.label ?? 'All';

  if (selectedGoal) {
    return (
      <Modal visible animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setSelectedGoal(null)}>
        <GoalDetailSheet
          goal={selectedGoal}
          onClose={() => setSelectedGoal(null)}
          onCoopJoin={() => {
            coopJoinMutation.mutate(selectedGoal.id, {
              onSuccess: () => {
                setPendingJoins((prev) => new Set([...prev, selectedGoal.id]));
                setSelectedGoal((prev) => prev ? { ...prev, my_request_status: 'pending' } : null);
              },
            });
          }}
          onBuddyRequest={() => {
            buddyRequestMutation.mutate(selectedGoal.id, {
              onSuccess: () => {
                setPendingJoins((prev) => new Set([...prev, selectedGoal.id]));
                setSelectedGoal((prev) => prev ? { ...prev, my_request_status: 'pending' } : null);
              },
            });
          }}
          onUseTemplate={() => useTemplateMutation.mutate(selectedGoal.id)}
          coopPending={coopJoinMutation.isPending}
          buddyPending={buddyRequestMutation.isPending}
          templatePending={useTemplateMutation.isPending}
        />
      </Modal>
    );
  }

  return (
    <Modal visible animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <SafeAreaView style={[s.discoverScreen, { backgroundColor: colors.background }]}>
        <View style={s.discoverHeader}>
          <View>
            <Text style={[s.discoverTitle, { color: colors.text }]}>Discover Goals</Text>
            <Text style={[s.discoverSub, { color: colors.textSecondary }]}>Explore and team up on community goals!</Text>
          </View>
          <TouchableOpacity onPress={onClose} style={[s.discoverClose, { backgroundColor: colors.card }]}>
            <MaterialCommunityIcons name="close" size={20} color={colors.textSecondary} />
          </TouchableOpacity>
        </View>

        <View style={[s.searchBar, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <MaterialCommunityIcons name="magnify" size={18} color={colors.textSecondary} />
          <TextInput
            style={[s.searchInput, { color: colors.text }]}
            value={search}
            onChangeText={handleSearch}
            placeholder="Search goals..."
            placeholderTextColor={colors.textSecondary}
            autoFocus
          />
          {search.length > 0 && (
            <TouchableOpacity onPress={() => { setSearch(''); setDebouncedSearch(''); }}>
              <MaterialCommunityIcons name="close-circle" size={16} color={colors.textSecondary} />
            </TouchableOpacity>
          )}
        </View>

        {/* Filter dropdowns */}
        {openDropdown !== null && (
          <TouchableWithoutFeedback onPress={() => setOpenDropdown(null)}>
            <View style={[StyleSheet.absoluteFillObject, { zIndex: 5 }]} />
          </TouchableWithoutFeedback>
        )}
        <View style={[s.filterBar, { zIndex: 10 }]}>
          <TouchableOpacity
            style={[s.filterPill, { borderColor: filterCat ? colors.primary : colors.border, backgroundColor: filterCat ? colors.primaryLight : colors.card }]}
            onPress={() => setOpenDropdown(openDropdown === 'category' ? null : 'category')}
            activeOpacity={0.8}
          >
            <MaterialCommunityIcons name="tag-outline" size={14} color={filterCat ? colors.primary : colors.textSecondary} />
            <Text style={[s.filterPillText, { color: filterCat ? colors.primary : colors.textSecondary }]}>{catLabel}</Text>
            <MaterialCommunityIcons name={openDropdown === 'category' ? 'chevron-up' : 'chevron-down'} size={14} color={filterCat ? colors.primary : colors.textSecondary} />
          </TouchableOpacity>
          <TouchableOpacity
            style={[s.filterPill, { borderColor: buddyFilter !== 'all' ? colors.primary : colors.border, backgroundColor: buddyFilter !== 'all' ? colors.primaryLight : colors.card }]}
            onPress={() => setOpenDropdown(openDropdown === 'buddy' ? null : 'buddy')}
            activeOpacity={0.8}
          >
            <MaterialCommunityIcons name="account-filter-outline" size={14} color={buddyFilter !== 'all' ? colors.primary : colors.textSecondary} />
            <Text style={[s.filterPillText, { color: buddyFilter !== 'all' ? colors.primary : colors.textSecondary }]}>{buddyLabel}</Text>
            <MaterialCommunityIcons name={openDropdown === 'buddy' ? 'chevron-up' : 'chevron-down'} size={14} color={buddyFilter !== 'all' ? colors.primary : colors.textSecondary} />
          </TouchableOpacity>
        </View>
        {openDropdown === 'category' && (
          <View style={[s.dropdownPanel, { zIndex: 10, backgroundColor: colors.card, borderColor: colors.border }]}>
            {[{ key: '', label: 'All Categories', icon: null }, ...GOAL_CATEGORIES.map((c) => ({ key: c.key, label: c.label, icon: c.icon }))].map((opt) => {
              const active = filterCat === opt.key;
              return (
                <TouchableOpacity
                  key={opt.key}
                  style={[s.dropdownItem, active && { backgroundColor: colors.primaryLight }]}
                  onPress={() => { setFilterCat(opt.key); setOpenDropdown(null); }}
                >
                  {opt.icon && <MaterialCommunityIcons name={opt.icon as MCIName} size={15} color={active ? colors.primary : colors.textSecondary} />}
                  <Text style={[s.dropdownItemText, { color: active ? colors.primary : colors.text }]}>{opt.label}</Text>
                  {active && <MaterialCommunityIcons name="check" size={16} color={colors.primary} />}
                </TouchableOpacity>
              );
            })}
          </View>
        )}
        {openDropdown === 'buddy' && (
          <View style={[s.dropdownPanel, { zIndex: 10, backgroundColor: colors.card, borderColor: colors.border }]}>
            {BUDDY_FILTERS.map((f) => {
              const active = buddyFilter === f.key;
              return (
                <TouchableOpacity
                  key={f.key}
                  style={[s.dropdownItem, active && { backgroundColor: colors.primaryLight }]}
                  onPress={() => { setBuddyFilter(f.key); setOpenDropdown(null); }}
                >
                  <Text style={[s.dropdownItemText, { color: active ? colors.primary : colors.text }]}>{f.label}</Text>
                  {active && <MaterialCommunityIcons name="check" size={16} color={colors.primary} />}
                </TouchableOpacity>
              );
            })}
          </View>
        )}

        <ScrollView contentContainerStyle={{ padding: 16, gap: 12, paddingBottom: 40 }}>
          {isLoading && (
            <View style={{ gap: 12 }}>
              {[1, 2, 3].map((i) => <CardSkeleton key={i} />)}
            </View>
          )}
          {!isLoading && results.length === 0 && (
            <ScreenState
              type="empty"
              title="No goals found"
              message="Try searching for something else"
              icon="magnify"
            />
          )}
          {results.map((g: PublicGoal) => {
            const cat = GOAL_CATEGORIES.find((c) => c.key === g.category);
            const effectiveGoal: PublicGoal = pendingJoins.has(g.id) ? { ...g, my_request_status: 'pending' } : g;
            const isPaired = effectiveGoal.has_buddy || !!effectiveGoal.my_request_status;
            return (
              <TouchableOpacity key={g.id} style={[s.discoverCard, { backgroundColor: isPaired ? colors.background : colors.card, borderWidth: 1, borderColor: isPaired ? colors.border : 'transparent' }]} onPress={() => setSelectedGoal(effectiveGoal)} activeOpacity={0.8}>
                <View style={s.discoverCardTop}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                    <View style={[s.catBadge, { backgroundColor: colors.primaryLight }]}>
                      <MaterialCommunityIcons name={cat?.icon as MCIName} size={12} color={colors.primary} />
                      <Text style={[s.catLabel, { color: colors.primary }]}>{cat?.label}</Text>
                    </View>
                    {!isPaired && (
                      <View style={[s.catBadge, { backgroundColor: g.coop_open ? colors.primaryLight : colors.card, borderWidth: 1, borderColor: g.coop_open ? colors.primary : colors.border }]}>
                        <MaterialCommunityIcons name={g.coop_open ? 'account-multiple-outline' : 'handshake-outline'} size={12} color={g.coop_open ? colors.primary : colors.textSecondary} />
                        <Text style={[s.catLabel, { color: g.coop_open ? colors.primary : colors.textSecondary }]}>{g.coop_open ? 'Co-op' : 'Buddy Up'}</Text>
                      </View>
                    )}
                    {isPaired && (
                      <View style={[s.catBadge, { backgroundColor: colors.border }]}>
                        <MaterialCommunityIcons name="account-check" size={12} color={colors.textSecondary} />
                        <Text style={[s.catLabel, { color: colors.textSecondary }]}>Paired</Text>
                      </View>
                    )}
                  </View>
                  {g.milestone_count > 0 && (
                    <Text style={[s.discoverMs, { color: colors.textSecondary }]}>{g.milestone_count} milestones</Text>
                  )}
                </View>
                <Text style={[s.goalCardTitle, { color: colors.text }]}>{g.title}</Text>
                {g.description ? <Text style={[s.goalCardDesc, { color: colors.textSecondary }]} numberOfLines={2}>{g.description}</Text> : null}
                <View style={s.discoverUser}>
                  <View style={[s.discoverAvatar, { backgroundColor: colors.primaryLight }]}>
                    <Text style={[s.discoverAvatarText, { color: colors.primary }]}>{g.display_name[0]}</Text>
                  </View>
                  <Text style={[s.discoverUserName, { color: colors.textSecondary }]}>{g.display_name}</Text>
                  <ActivityBadge level={g.activity_level} small />
                </View>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </SafeAreaView>
    </Modal>
  );
}

// ─── Main Screen ──────────────────────────────────────────────────────────────

export default function GoalsScreen() {
  const colors = useThemeStore((s) => s.colors);
  const s = useMemo(() => makeStyles(colors), [colors]);
  const qc = useQueryClient();
  const { tab: tabParam } = useLocalSearchParams<{ tab?: string }>();
  const [activeTab, setActiveTab] = useState<'milestones' | 'goals'>('milestones');
  const tabParamRef = useRef(tabParam);
  tabParamRef.current = tabParam;
  useFocusEffect(useCallback(() => {
    if (tabParamRef.current === 'goals') setActiveTab('goals');
  }, []));
  const [selectedGoal, setSelectedGoal] = useState<Goal | null>(null);
  const [showAdd, setShowAdd] = useState(false);
  const [showDiscover, setShowDiscover] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newCategory, setNewCategory] = useState('');
  const [newDescription, setNewDescription] = useState('');
  const [newIsPublic, setNewIsPublic] = useState(true);
  const [newCoopOpen, setNewCoopOpen] = useState(false);
  const [draftMilestones, setDraftMilestones] = useState<Array<{
    id: string;
    title: string;
    frequency: Milestone['frequency'];
    daysPerWeek?: number;
    customDays?: string;
    scheduleMode: 'open_ended' | 'time_bound';
    startDate: string;
    endDate: string;
    noEndDate: boolean;
  }>>([]);
  const [msTitle, setMsTitle] = useState('');
  const [msFreq, setMsFreq] = useState<Milestone['frequency']>('daily');
  const [msDaysPerWeek, setMsDaysPerWeek] = useState(3);
  const [msCustomDays, setMsCustomDays] = useState<number[]>([1, 2, 3, 4, 5]);
  const [msEditingId, setMsEditingId] = useState<string | null>(null);
  const [showFreqPicker, setShowFreqPicker] = useState(false);
  const [msScheduleMode, setMsScheduleMode] = useState<'open_ended' | 'time_bound'>('time_bound');
  const [msStartDate, setMsStartDate] = useState(getTodayString());
  const [msEndDate, setMsEndDate] = useState('');
  const [msNoEndDate, setMsNoEndDate] = useState(true);
  const milestoneDraftInvalid =
    msScheduleMode === 'time_bound' &&
    (!msStartDate || (!msNoEndDate && (!msEndDate || msEndDate < msStartDate)));

  const { data: goals = [], isLoading, isError, refetch } = useGoals();
  const addMutation = useCreateGoal();

  const handleCloseAdd = useCallback(() => {
    setShowAdd(false);
    setNewTitle(''); setNewCategory(''); setNewDescription(''); setNewIsPublic(true); setNewCoopOpen(false);
    setDraftMilestones([]); setMsTitle(''); setMsFreq('daily');
    setMsDaysPerWeek(3); setMsCustomDays([1, 2, 3, 4, 5]);
    setMsEditingId(null); setShowFreqPicker(false);
    setMsScheduleMode('time_bound'); setMsStartDate(getTodayString()); setMsEndDate(''); setMsNoEndDate(true);
  }, []);

  const handleAddGoal = async () => {
    if (!newTitle || !newCategory) return;
    if ((newIsPublic || newCoopOpen) && !canGoalBeMadePublic(draftMilestones)) {
      Alert.alert('Add a Milestone', PUBLIC_GOAL_REQUIRES_MILESTONE_MESSAGE);
      return;
    }
    try {
      const newGoal = await addMutation.mutateAsync({
        title: newTitle, category: newCategory, description: newDescription,
        isPublic: newCoopOpen ? true : newIsPublic,
        coopOpen: newIsPublic && newCoopOpen,
      });
      if (draftMilestones.length > 0) {
        await Promise.all(draftMilestones.map((ms) =>
          createMilestoneApi(
            newGoal.id,
            ms.title,
            ms.frequency,
            ms.daysPerWeek,
            ms.customDays,
            ms.scheduleMode,
            ms.startDate || undefined,
            ms.noEndDate ? undefined : (ms.endDate || undefined),
          )
        ));
        qc.invalidateQueries({ queryKey: ['milestones', 'me'] });
      }
      handleCloseAdd();
    } catch {
      // error already surfaced by useCreateGoal's onError alert
    }
  };

  // Full-screen goal config
  if (selectedGoal) {
    const fresh = goals.find((g) => g.id === selectedGoal.id) ?? selectedGoal;
    return <GoalConfig goal={fresh} onBack={() => setSelectedGoal(null)} />;
  }

  return (
    <SafeAreaView style={s.container}>
      {/* Top bar */}
      <View style={s.topBar}>
        <Text style={s.title}>Goals</Text>
      </View>

      {/* Sub-tabs */}
      <View style={s.tabBar}>
        {(['milestones', 'goals'] as const).map((t) => (
          <TouchableOpacity key={t} style={s.tabItem} onPress={() => setActiveTab(t)}>
            <Text style={[s.tabText, { color: activeTab === t ? colors.primary : colors.textSecondary }]}>
              {t === 'milestones' ? 'Milestones' : 'My Goals'}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {activeTab === 'milestones'
        ? <MilestonesView goals={goals} />
        : <GoalsView
            goals={goals}
            isLoading={isLoading}
            isError={isError}
            refetch={refetch}
            onSelectGoal={setSelectedGoal}
          />
      }

      {/* FABs — always visible */}
      <View style={s.fabRow}>
        <TouchableOpacity style={[s.fab, { backgroundColor: colors.primary }]} onPress={() => setShowDiscover(true)} activeOpacity={0.85}>
          <MaterialCommunityIcons name="earth" size={30} color="#fff" />
        </TouchableOpacity>
        <TouchableOpacity style={[s.fab, { backgroundColor: colors.primary }]} onPress={() => setShowAdd(true)} activeOpacity={0.85}>
          <Ionicons name="add" size={28} color="#fff" />
        </TouchableOpacity>
      </View>

      {showDiscover && <DiscoverModal onClose={() => setShowDiscover(false)} myGoals={goals} />}

      {/* Add Goal Modal */}
      <Modal visible={showAdd} animationType="slide" presentationStyle="pageSheet" onRequestClose={handleCloseAdd}>
        <SafeAreaView style={[s.addGoalScreen, { backgroundColor: colors.background }]}>
          <View style={s.addGoalHeader}>
            <Text style={[s.addGoalTitle, { color: colors.text }]}>New Goal</Text>
            <TouchableOpacity onPress={handleCloseAdd} style={[s.discoverClose, { backgroundColor: colors.card }]}>
              <MaterialCommunityIcons name="close" size={20} color={colors.textSecondary} />
            </TouchableOpacity>
          </View>
          <ScrollView contentContainerStyle={s.addGoalContent}>
            <Text style={[s.inputLabel, { color: colors.text }]}>Title</Text>
            <TextInput
              style={[s.input, { backgroundColor: colors.card, borderColor: colors.border, color: colors.text }]}
              value={newTitle}
              onChangeText={setNewTitle}
              placeholder="e.g. Run 5K three times a week"
              placeholderTextColor={colors.textSecondary}
            />

            <Text style={[s.inputLabel, { color: colors.text }]}>Category</Text>
            <View style={s.catGrid}>
              {GOAL_CATEGORIES.map((cat) => (
                <TouchableOpacity
                  key={cat.key}
                  style={[
                    s.catChip,
                    { backgroundColor: colors.card, borderColor: colors.border },
                    newCategory === cat.key && { backgroundColor: colors.primary, borderColor: colors.primary },
                  ]}
                  onPress={() => setNewCategory(cat.key)}
                >
                  <MaterialCommunityIcons name={cat.icon as MCIName} size={16} color={newCategory === cat.key ? '#fff' : colors.text} />
                  <Text style={[s.catChipText, { color: newCategory === cat.key ? '#fff' : colors.text }]}>{cat.label}</Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={[s.inputLabel, { color: colors.text }]}>Description (optional)</Text>
            <TextInput
              style={[s.input, { height: 80, textAlignVertical: 'top', backgroundColor: colors.card, borderColor: colors.border, color: colors.text }]}
              value={newDescription}
              onChangeText={setNewDescription}
              placeholder="Add some details..."
              placeholderTextColor={colors.textSecondary}
              multiline
            />

            <TouchableOpacity
              style={[s.publicRow, { backgroundColor: colors.card, borderColor: colors.border }]}
              onPress={() => setNewIsPublic((v) => !v)}
              activeOpacity={0.8}
            >
              <MaterialCommunityIcons
                name={newIsPublic ? 'eye-outline' : 'eye-off-outline'}
                size={20}
                color={newIsPublic ? colors.primary : colors.textSecondary}
              />
              <View style={{ flex: 1 }}>
                <Text style={[s.publicLabel, { color: colors.text }]}>{newIsPublic ? 'Public' : 'Private'}</Text>
                <Text style={[s.publicSub, { color: colors.textSecondary }]}>
                  {newIsPublic ? 'Others can discover and buddy up' : 'Only visible to you'}
                </Text>
              </View>
              <View style={[s.toggle, { backgroundColor: newIsPublic ? colors.primary : colors.border }]}>
                <View style={[s.toggleThumb, newIsPublic && s.toggleThumbOn]} />
              </View>
            </TouchableOpacity>

            {newIsPublic && (
              <TouchableOpacity
                style={[s.publicRow, { backgroundColor: colors.card, borderColor: newCoopOpen ? colors.primary : colors.border }]}
                onPress={() => setNewCoopOpen((v) => !v)}
                activeOpacity={0.8}
              >
                <MaterialCommunityIcons
                  name="account-multiple-outline"
                  size={20}
                  color={newCoopOpen ? colors.primary : colors.textSecondary}
                />
                <View style={{ flex: 1 }}>
                  <Text style={[s.publicLabel, { color: colors.text }]}>Co-op Goal</Text>
                  <Text style={[s.publicSub, { color: colors.textSecondary }]}>
                    {newCoopOpen ? 'You and a buddy work on this goal together' : 'Share ownership of this goal with a buddy'}
                  </Text>
                </View>
                <View style={[s.toggle, { backgroundColor: newCoopOpen ? colors.primary : colors.border }]}>
                  <View style={[s.toggleThumb, newCoopOpen && s.toggleThumbOn]} />
                </View>
              </TouchableOpacity>
            )}

            {/* Milestones section */}
            <View style={s.msSectionHeader}>
              <View>
                <Text style={[s.inputLabel, { color: colors.text, marginTop: 0 }]}>Milestones</Text>
                <Text style={s.msRequired}>* at least 1 required</Text>
              </View>
            </View>

            {draftMilestones.map((ms) => (
              <View key={ms.id} style={[s.msDraftRow, { backgroundColor: colors.primaryLight, borderColor: colors.border }]}>
                <View style={[s.msDraftFreqBadge, { backgroundColor: colors.primary }]}>
                  <Text style={[s.msDraftFreqText, { color: '#fff' }]}>{FREQ_LABELS[ms.frequency]}</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[s.msDraftTitle, { color: colors.text }]} numberOfLines={1}>{ms.title}</Text>
                  <Text style={[s.msDraftSchedule, { color: colors.textSecondary }]}>
                    {formatScheduleSummary(ms.scheduleMode, ms.startDate, ms.endDate)}
                  </Text>
                </View>
                <View style={s.msDraftActions}>
                  <TouchableOpacity
                    style={[s.msDraftActionBtn, { borderColor: colors.border }]}
                    onPress={() => {
                      setMsTitle(ms.title);
                      setMsFreq(ms.frequency);
                      setMsDaysPerWeek(ms.daysPerWeek ?? 3);
                      setMsCustomDays(ms.customDays ? ms.customDays.split(',').map(Number) : [1, 2, 3, 4, 5]);
                      setMsScheduleMode(ms.scheduleMode);
                      setMsStartDate(ms.startDate);
                      setMsEndDate(ms.endDate);
                      setMsNoEndDate(ms.noEndDate);
                      setMsEditingId(ms.id);
                    }}
                  >
                    <MaterialCommunityIcons name="pencil-outline" size={14} color={colors.textSecondary} />
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[s.msDraftActionBtn, { borderColor: '#EF4444' }]}
                    onPress={() => setDraftMilestones((prev) => prev.filter((m) => m.id !== ms.id))}
                  >
                    <MaterialCommunityIcons name="close" size={14} color="#EF4444" />
                  </TouchableOpacity>
                </View>
              </View>
            ))}

            <View style={[s.msDraftAddForm, { backgroundColor: colors.background, borderColor: colors.border, borderStyle: 'dashed' }]}>
              <TextInput
                style={[s.msDraftInput, { color: colors.text, borderColor: colors.border, backgroundColor: colors.card }]}
                value={msTitle}
                onChangeText={setMsTitle}
                placeholder="e.g. Go for a 30-min run"
                placeholderTextColor={colors.textSecondary}
              />
              <TouchableOpacity
                style={[s.msFreqRow, { backgroundColor: colors.card, borderColor: colors.border }]}
                onPress={() => setShowFreqPicker(true)}
                activeOpacity={0.8}
              >
                <View style={s.msFreqRowLeft}>
                  <MaterialCommunityIcons name="repeat" size={16} color={colors.textSecondary} />
                  <Text style={[s.msFreqRowLabel, { color: colors.text }]}>Frequency</Text>
                </View>
                <View style={s.msFreqRowRight}>
                  <Text style={[s.msFreqRowValue, { color: colors.primary }]}>{FREQ_LABELS[msFreq]}</Text>
                  <MaterialCommunityIcons name="chevron-right" size={16} color={colors.textSecondary} />
                </View>
              </TouchableOpacity>

              <TouchableOpacity
                style={[s.msDraftAddBtn, { backgroundColor: msTitle.trim() ? colors.primary : colors.border }]}
                onPress={() => {
                  if (!msTitle.trim()) return;
                  const customDaysStr = msFreq === 'custom_days'
                    ? [...msCustomDays].sort((a, b) => a - b).join(',')
                    : undefined;
                  const effectiveEndDate = msNoEndDate ? '' : msEndDate;

                  if (msEditingId) {
                    setDraftMilestones((prev) =>
                      prev.map((m) =>
                        m.id === msEditingId
                          ? {
                              ...m,
                              title: msTitle.trim(),
                              frequency: msFreq,
                              daysPerWeek: msFreq === 'x_weekly' ? msDaysPerWeek : undefined,
                              customDays: customDaysStr,
                              scheduleMode: msScheduleMode,
                              startDate: msStartDate,
                              endDate: effectiveEndDate,
                              noEndDate: msNoEndDate,
                            }
                          : m
                      )
                    );
                    setMsEditingId(null);
                  } else {
                    setDraftMilestones((prev) => [
                      ...prev,
                      {
                        id: Date.now().toString(),
                        title: msTitle.trim(),
                        frequency: msFreq,
                        daysPerWeek: msFreq === 'x_weekly' ? msDaysPerWeek : undefined,
                        customDays: customDaysStr,
                        scheduleMode: msScheduleMode,
                        startDate: msStartDate,
                        endDate: effectiveEndDate,
                        noEndDate: msNoEndDate,
                      },
                    ]);
                  }

                  setMsTitle('');
                  setMsFreq('daily');
                  setMsDaysPerWeek(3);
                  setMsCustomDays([1, 2, 3, 4, 5]);
                  setMsScheduleMode('time_bound');
                  setMsStartDate(getTodayString());
                  setMsEndDate('');
                  setMsNoEndDate(true);
                }}
                disabled={!msTitle.trim() || milestoneDraftInvalid}
              >
                <MaterialCommunityIcons name={msEditingId ? 'check' : 'plus'} size={16} color="#fff" />
                <Text style={s.msDraftAddBtnText}>{msEditingId ? 'Update Milestone' : '+ Add Milestone'}</Text>
              </TouchableOpacity>
            </View>

            <FrequencyPickerModal
              visible={showFreqPicker}
              frequency={msFreq}
              daysPerWeek={msDaysPerWeek}
              customDays={msCustomDays}
              scheduleMode={msScheduleMode}
              startDate={msStartDate}
              endDate={msEndDate}
              noEndDate={msNoEndDate}
              onSelect={(freq, dpw, cd) => {
                setMsFreq(freq);
                setMsDaysPerWeek(dpw);
                setMsCustomDays(cd);
              }}
              onScheduleChange={(mode, sd, ed, nEd) => {
                setMsScheduleMode(mode);
                setMsStartDate(sd);
                setMsEndDate(ed);
                setMsNoEndDate(nEd);
              }}
              onClose={() => setShowFreqPicker(false)}
            />

            <TouchableOpacity
              style={[s.saveBtn, { backgroundColor: colors.primary, marginTop: 16 }, (!newTitle || !newCategory || draftMilestones.length === 0) && { opacity: 0.5 }]}
              onPress={handleAddGoal}
              disabled={!newTitle || !newCategory || draftMilestones.length === 0 || addMutation.isPending}
            >
              {addMutation.isPending
                ? <ActivityIndicator color="#fff" size="small" />
                : <Text style={s.saveBtnText}>
                    Save Goal + {draftMilestones.length} milestone{draftMilestones.length !== 1 ? 's' : ''}
                  </Text>}
            </TouchableOpacity>
          </ScrollView>
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
}

const makeStyles = (colors: ColorPalette) => StyleSheet.create({
  container:        { flex: 1, backgroundColor: colors.background },

  topBar:           { paddingHorizontal: 20, paddingTop: 16, paddingBottom: 8 },
  title:            { fontSize: FS.title, lineHeight: LH.title, fontWeight: FW.bold, color: colors.text, letterSpacing: -0.5 },

  tabBar:           { flexDirection: 'row', paddingHorizontal: 20 },
  tabItem:          { flex: 1, alignItems: 'center', paddingVertical: 10 },
  tabText:          { fontSize: FS.secondary, lineHeight: LH.secondary, fontWeight: FW.semibold },
  tabUnderline:     { position: 'absolute', bottom: 0, left: 16, right: 16, height: 2, borderRadius: 1 },

  filterRow:        { maxHeight: 44 },
  filterContent:    { paddingHorizontal: 16, gap: 8, flexDirection: 'row', alignItems: 'center' },
  chip: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    paddingHorizontal: 12, paddingVertical: 7,
    borderRadius: 20, backgroundColor: colors.card,
    borderWidth: 1, borderColor: colors.border,
  },
  chipText:         { fontSize: FS.secondary, lineHeight: LH.secondary, color: colors.textSecondary, fontWeight: FW.medium },
  filterBar:        { flexDirection: 'row', gap: 8, paddingHorizontal: 16, paddingVertical: 10 },
  filterPill:       { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 12, paddingVertical: 7, borderRadius: 20, borderWidth: 1 },
  filterPillText:   { fontSize: FS.secondary, lineHeight: LH.secondary, fontWeight: FW.semibold },
  dropdownPanel:    { marginHorizontal: 16, borderRadius: 14, borderWidth: 1, marginBottom: 4, overflow: 'hidden' },
  dropdownItem:     { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 14, paddingVertical: 12 },
  dropdownItemText: { fontSize: FS.secondary, lineHeight: LH.secondary, fontWeight: FW.medium },

  // Milestones view
  msViewContent:    { padding: 16, gap: 0, paddingBottom: 40 },
  msGroup:          { marginTop: 20, gap: 8 },
  msGroupLabel:     { fontSize: FS.caption, lineHeight: LH.caption, fontWeight: FW.bold, color: colors.textSecondary, textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 4 },
  msRow:            { flexDirection: 'row', alignItems: 'center', gap: 12, borderRadius: 14, padding: 14 },
  msRowTitle:       { fontSize: FS.body, lineHeight: LH.body, fontWeight: FW.medium },
  msRowMeta:        { flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 3 },
  msRowGoal:        { fontSize: FS.caption, lineHeight: LH.caption, flex: 1 },
  freqPill:         { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6 },
  freqPillText:     { fontSize: FS.caption, lineHeight: LH.caption, fontWeight: FW.bold },
  msDueText:        { fontSize: FS.caption, lineHeight: LH.caption, marginTop: 3 },

  // Goals view
  goalsViewContent: { padding: 16, gap: 12 },
  goalCard:         { borderRadius: 16, padding: 16, gap: 6 },
  goalCardTop:      { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  goalCardRight:    { flexDirection: 'row', alignItems: 'center', gap: 10 },
  goalCardTitle:    { fontSize: FS.body, lineHeight: LH.body, fontWeight: FW.bold },
  goalCardDesc:     { fontSize: FS.secondary, lineHeight: LH.secondary },
  buddyRow:         { flexDirection: 'row', alignItems: 'center', marginTop: 4 },
  buddyStatusPill:  { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20 },
  buddyStatusText:  { fontSize: FS.caption, lineHeight: LH.caption, fontWeight: FW.semibold },

  catBadge:         { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
  catLabel:         { fontSize: FS.caption, lineHeight: LH.caption, fontWeight: FW.semibold },

  empty:            { alignItems: 'center', paddingTop: 60, gap: 10 },
  emptyTitle:       { fontSize: FS.section, lineHeight: LH.section, fontWeight: FW.bold, color: colors.text },
  emptyText:        { fontSize: FS.secondary, lineHeight: LH.secondary, color: colors.textSecondary },
  errorState:       { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12, padding: 32 },
  errorStateText:   { fontSize: FS.body, lineHeight: LH.body, color: colors.textSecondary, textAlign: 'center' },
  retryBtn:         { backgroundColor: colors.primary, paddingHorizontal: 24, paddingVertical: 10, borderRadius: 10 },
  retryBtnText:     { color: '#fff', fontWeight: FW.bold, fontSize: FS.secondary, lineHeight: LH.secondary },

  fabRow: {
    position: 'absolute', bottom: 24, right: 24,
    flexDirection: 'row', alignItems: 'center', gap: 12,
  },
  fab: {
    width: 56, height: 56, borderRadius: 28,
    justifyContent: 'center', alignItems: 'center',
    shadowColor: '#000', shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2, shadowRadius: 8, elevation: 6,
  },

  // Goal config (full screen)
  configHeader:     { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12, gap: 10 },
  configBack:       { width: 40, height: 40, borderRadius: 20, backgroundColor: colors.card, justifyContent: 'center', alignItems: 'center' },
  configTitleWrap:  { flex: 1 },
  configContent:    { padding: 20, gap: 16, paddingBottom: 60 },
  configTitle:      { fontSize: FS.title, lineHeight: LH.title, fontWeight: FW.bold, color: colors.text, letterSpacing: -0.3 },
  configDesc:       { fontSize: FS.secondary, lineHeight: LH.secondary, color: colors.textSecondary },
  configSection:    { gap: 10 },
  configSectionTitle: { fontSize: FS.caption, lineHeight: LH.caption, fontWeight: FW.bold, color: colors.textSecondary, textTransform: 'uppercase', letterSpacing: 0.8 },
  configEmpty:      { borderRadius: 14, padding: 24, alignItems: 'center', gap: 8 },
  configEmptyText:  { fontSize: FS.secondary, lineHeight: LH.secondary },
  msCard:           { flexDirection: 'row', alignItems: 'center', gap: 12, borderRadius: 14, padding: 14, borderWidth: 1 },
  msCardTitle:      { fontSize: FS.body, lineHeight: LH.body, fontWeight: FW.medium },
  msCardFreq:       { fontSize: FS.caption, lineHeight: LH.caption, fontWeight: FW.bold, textTransform: 'capitalize', marginTop: 2 },
  msMetaRow:        { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 2 },
  msStatChip:       { fontSize: FS.caption, lineHeight: LH.caption, fontWeight: FW.bold },
  achieveRow:       { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 4 },
  achievePill:      { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 10, paddingVertical: 5, borderRadius: 20, borderWidth: 1, alignSelf: 'flex-start' },
  achieveText:      { fontSize: FS.caption, lineHeight: LH.caption, fontWeight: FW.bold },
  addMsBtn:         { flexDirection: 'row', alignItems: 'center', gap: 8, borderRadius: 14, borderWidth: 1.5, borderStyle: 'dashed', padding: 14, justifyContent: 'center' },
  addMsBtnText:     { fontSize: FS.secondary, lineHeight: LH.secondary, fontWeight: FW.semibold },
  deleteGoalBtn:    { flexDirection: 'row', alignItems: 'center', gap: 8, borderRadius: 14, borderWidth: 1.5, padding: 14, justifyContent: 'center', marginTop: 8, marginBottom: 32 },
  deleteGoalText:   { fontSize: FS.secondary, lineHeight: LH.secondary, fontWeight: FW.semibold },
  addMsForm:        { borderRadius: 14, padding: 14, gap: 12, borderWidth: 1 },
  addMsFormRow:     { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  addMsFormTitle:   { fontSize: FS.secondary, lineHeight: LH.secondary, fontWeight: FW.bold },
  addMsInput:       { borderWidth: 1, borderRadius: 10, padding: 11, fontSize: FS.body, lineHeight: LH.body },
  freqRow:          { flexDirection: 'row', gap: 8 },
  freqChip:         { flex: 1, paddingVertical: 8, borderRadius: 10, borderWidth: 1, alignItems: 'center' },
  freqChipText:     { fontSize: FS.caption, lineHeight: LH.caption, fontWeight: FW.semibold },
  subPickerRow:     { flexDirection: 'row' as const, gap: 6, alignItems: 'center' as const, flexWrap: 'wrap' as const },
  subPickerChip:    { paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8, borderWidth: 1, alignItems: 'center' as const },
  subPickerChipText: { fontSize: FS.caption, lineHeight: LH.caption, fontWeight: FW.semibold },
  subPickerLabel:   { fontSize: FS.caption, lineHeight: LH.caption },

  publicRow:        { flexDirection: 'row', alignItems: 'center', gap: 12, borderRadius: 14, padding: 14, borderWidth: 1 },
  publicLabel:      { fontSize: FS.body, lineHeight: LH.body, fontWeight: FW.semibold },
  publicSub:        { fontSize: FS.caption, lineHeight: LH.caption, marginTop: 1 },
  toggle:           { width: 44, height: 26, borderRadius: 13, justifyContent: 'center', paddingHorizontal: 3 },
  toggleThumb:      { width: 20, height: 20, borderRadius: 10, backgroundColor: '#fff' },
  toggleThumbOn:    { alignSelf: 'flex-end' },

  saveBtn:          { padding: 14, borderRadius: 12, alignItems: 'center' },
  saveBtnText:      { color: '#fff', fontWeight: FW.bold, fontSize: FS.body, lineHeight: LH.body },

  // Draft milestones in "New Goal" modal
  msSectionHeader:  { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 16 },
  msRequired:       { fontSize: FS.caption, lineHeight: LH.caption, color: '#EF4444', fontWeight: FW.semibold },
  msDraftRow:       { flexDirection: 'row', alignItems: 'center', gap: 8, borderRadius: 10, padding: 10, borderWidth: 1, marginBottom: 2 },
  msDraftFreqBadge: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6 },
  msDraftFreqText:  { fontSize: FS.caption, lineHeight: LH.caption, fontWeight: FW.bold },
  msDraftTitle:     { flex: 1, fontSize: FS.secondary, lineHeight: LH.secondary, fontWeight: FW.medium },
  msDraftSchedule:  { fontSize: FS.caption, lineHeight: LH.caption, marginTop: 2 },
  msDraftActions:   { flexDirection: 'row', gap: 6 },
  msDraftActionBtn: { width: 26, height: 26, borderWidth: 1, borderRadius: 6, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.card },
  msDraftAddForm:   { borderRadius: 12, padding: 10, gap: 8, borderWidth: 1 },
  msDraftInput:     { borderWidth: 1, borderRadius: 8, padding: 10, fontSize: FS.secondary, lineHeight: LH.secondary },
  msFreqRow:        { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 10, paddingHorizontal: 12, borderWidth: 1, borderRadius: 8 },
  msFreqRowLeft:    { flexDirection: 'row', alignItems: 'center', gap: 8 },
  msFreqRowLabel:   { fontSize: FS.secondary, lineHeight: LH.secondary },
  msFreqRowRight:   { flexDirection: 'row', alignItems: 'center', gap: 4 },
  msFreqRowValue:   { fontSize: FS.secondary, lineHeight: LH.secondary, fontWeight: FW.semibold },
  msDraftAddBtn:    { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 10, borderRadius: 8 },
  msDraftAddBtnText: { color: '#fff', fontSize: FS.secondary, fontWeight: FW.semibold },

  // Add goal screen
  addGoalScreen:    { flex: 1 },
  addGoalHeader:    { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingTop: 8, paddingBottom: 4 },
  addGoalTitle:     { fontSize: FS.title, lineHeight: LH.title, fontWeight: FW.bold },
  addGoalContent:   { padding: 20, gap: 4, paddingBottom: 40 },
  inputLabel:       { fontSize: FS.secondary, lineHeight: LH.secondary, fontWeight: FW.semibold, marginBottom: 6, marginTop: 8 },
  input:            { borderWidth: 1, borderRadius: 12, padding: 12, fontSize: FS.body, lineHeight: LH.body, marginBottom: 4 },
  catGrid:          { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 4 },
  catChip:          { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 20, borderWidth: 1 },
  catChipText:      { fontSize: FS.secondary, lineHeight: LH.secondary },

  // Discover modal
  discoverScreen:   { flex: 1 },
  discoverHeader:   { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingTop: 8, paddingBottom: 4 },
  discoverClose:    { width: 36, height: 36, borderRadius: 18, justifyContent: 'center', alignItems: 'center' },
  discoverTitle:    { fontSize: FS.title, lineHeight: LH.title, fontWeight: FW.bold },
  discoverSub:      { fontSize: FS.secondary, lineHeight: LH.secondary, marginTop: 2 },
  searchBar:        { flexDirection: 'row', alignItems: 'center', gap: 8, borderWidth: 1, borderRadius: 12, paddingHorizontal: 12, paddingVertical: 10, marginHorizontal: 16, marginTop: 12, marginBottom: 4 },
  searchInput:      { flex: 1, fontSize: FS.body, lineHeight: LH.body },
  discoverCard:     { borderRadius: 14, padding: 14, gap: 6 },
  discoverCardTop:  { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  discoverMs:       { fontSize: FS.caption, lineHeight: LH.caption, fontWeight: FW.semibold },
  discoverUser:     { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 4 },
  discoverAvatar:   { width: 24, height: 24, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
  discoverAvatarText: { fontSize: FS.caption, lineHeight: LH.caption, fontWeight: FW.bold },
  discoverUserName: { fontSize: FS.caption, lineHeight: LH.caption, fontWeight: FW.medium, flex: 1 },
});
