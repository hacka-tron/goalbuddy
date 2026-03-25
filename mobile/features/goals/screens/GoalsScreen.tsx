import { useState, useMemo } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  TouchableWithoutFeedback, Modal, TextInput, Alert, ActivityIndicator, RefreshControl,
} from 'react-native';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { apiFetch } from '../../../lib/api';
import { GOAL_CATEGORIES } from '../../../lib/constants';
import { ColorPalette } from '../../../lib/constants';
import { ActivityBadge } from '../../../shared/components/ActivityBadge';
import { useThemeStore } from '../../../store/themeStore';
import { Goal, Milestone, PublicGoal, MsFilter } from '../types';
import {
  useGoals,
  useGoalMilestones,
  usePatchGoalPublic,
  useToggleMilestone,
  useCreateMilestone,
  useToggleMyMilestone,
  useMyMilestones,
  useRequestBuddy,
  useGoalTemplate,
  usePublicGoals,
  useCreateGoal,
} from '../hooks';

type MCIName = React.ComponentProps<typeof MaterialCommunityIcons>['name'];

const FREQ_LABELS: Record<Milestone['frequency'], string> = {
  once: 'Once', daily: 'Daily', weekly: 'Weekly', monthly: 'Monthly',
};

const FREQUENCIES: { key: Milestone['frequency']; label: string }[] = [
  { key: 'once', label: 'Once' },
  { key: 'daily', label: 'Daily' },
  { key: 'weekly', label: 'Weekly' },
  { key: 'monthly', label: 'Monthly' },
];

function msMatchesFilter(ms: Milestone, filter: MsFilter): boolean {
  if (filter === 'all') return true;
  if (filter === 'today') return ms.frequency === 'daily' || ms.frequency === 'once';
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
  const [newMsFreq, setNewMsFreq] = useState<Milestone['frequency']>('once');

  const cat = GOAL_CATEGORIES.find((c) => c.key === goal.category);

  const { data: milestones = [], isLoading } = useGoalMilestones(goal.id);
  const togglePublicMutation = usePatchGoalPublic(goal.id);
  const toggleMsMutation = useToggleMilestone(goal.id);
  const addMsMutation = useCreateMilestone(goal.id);

  const handleAddMilestone = () => {
    addMsMutation.mutate(
      { title: newMsTitle, frequency: newMsFreq },
      {
        onSuccess: () => {
          setNewMsTitle('');
          setNewMsFreq('once');
          setShowAddForm(false);
        },
      }
    );
  };

  return (
    <SafeAreaView style={s.container}>
      {/* Header */}
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

        {/* Public toggle */}
        <TouchableOpacity
          style={[s.publicRow, { backgroundColor: colors.card, borderColor: colors.border }]}
          onPress={() => togglePublicMutation.mutate(!goal.is_public)}
          activeOpacity={0.8}
        >
          <MaterialCommunityIcons
            name={goal.is_public ? 'eye-outline' : 'eye-off-outline'}
            size={20}
            color={goal.is_public ? colors.primary : colors.textSecondary}
          />
          <View style={{ flex: 1 }}>
            <Text style={[s.publicLabel, { color: colors.text }]}>{goal.is_public ? 'Public' : 'Private'}</Text>
            <Text style={[s.publicSub, { color: colors.textSecondary }]}>
              {goal.is_public ? 'Visible in Discover & Finder' : 'Only visible to you'}
            </Text>
          </View>
          <View style={[s.toggle, { backgroundColor: goal.is_public ? colors.primary : colors.border }]}>
            <View style={[s.toggleThumb, goal.is_public && s.toggleThumbOn]} />
          </View>
        </TouchableOpacity>

        {/* Milestones section */}
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
            return (
              <TouchableOpacity
                key={ms.id}
                style={[s.msCard, { backgroundColor: colors.card, borderColor: done ? colors.primary : colors.border }]}
                onPress={() => toggleMsMutation.mutate(ms)}
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
                    <Text style={[s.msCardFreq, { color: colors.primary }]}>{FREQ_LABELS[ms.frequency]}</Text>
                  )}
                </View>
              </TouchableOpacity>
            );
          })}

          {/* Add milestone */}
          {!showAddForm ? (
            <TouchableOpacity
              style={[s.addMsBtn, { borderColor: colors.primary }]}
              onPress={() => setShowAddForm(true)}
            >
              <MaterialCommunityIcons name="plus" size={18} color={colors.primary} />
              <Text style={[s.addMsBtnText, { color: colors.primary }]}>Add Milestone</Text>
            </TouchableOpacity>
          ) : (
            <View style={[s.addMsForm, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <View style={s.addMsFormRow}>
                <Text style={[s.addMsFormTitle, { color: colors.text }]}>New Milestone</Text>
                <TouchableOpacity onPress={() => { setShowAddForm(false); setNewMsTitle(''); setNewMsFreq('once'); }}>
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
  if (ms.frequency === 'daily') {
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
              <Text style={[s.freqPillText, { color: colors.primary }]}>{FREQ_LABELS[ms.frequency]}</Text>
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

  const { data: milestones = [], isLoading, isError: isMsError, refetch, isRefetching } = useMyMilestones();
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

  const pending = filtered.filter((ms) => !ms.is_done_this_period);
  const done = filtered.filter((ms) => ms.is_done_this_period);

  const DATE_OPTIONS: { key: MsFilter; label: string }[] = [
    { key: 'all', label: 'All' },
    { key: 'today', label: 'Today' },
    { key: 'week', label: 'This Week' },
    { key: 'month', label: 'This Month' },
  ];

  const dateLabel = DATE_OPTIONS.find((o) => o.key === filter)?.label ?? 'All';
  const goalLabel = selectedGoals.size === 0 ? 'All Goals' : `${selectedGoals.size} Selected`;
  const goalActive = selectedGoals.size > 0;

  return (
    <View style={{ flex: 1 }}>
      {/* Backdrop — closes dropdown when tapping outside */}
      {openDropdown !== null && (
        <TouchableWithoutFeedback onPress={() => setOpenDropdown(null)}>
          <View style={[StyleSheet.absoluteFillObject, { zIndex: 5 }]} />
        </TouchableWithoutFeedback>
      )}

      {/* Filter bar (above backdrop) */}
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

      {/* Dropdowns (above backdrop) */}
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

      {/* Scrollable milestone list */}
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={s.msViewContent}
        refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={colors.primary} />}
      >
        {isLoading && <ActivityIndicator color={colors.primary} style={{ marginTop: 40 }} />}

        {!isLoading && isMsError && milestones.length === 0 && (
          <View style={s.errorState}>
            <MaterialCommunityIcons name="wifi-off" size={40} color={colors.border} />
            <Text style={s.errorStateText}>Couldn't load milestones. Check your connection.</Text>
            <TouchableOpacity onPress={() => refetch()} style={s.retryBtn}>
              <Text style={s.retryBtnText}>Try again</Text>
            </TouchableOpacity>
          </View>
        )}

        {!isLoading && !isMsError && filtered.length === 0 && (
          <View style={s.empty}>
            <MaterialCommunityIcons name="check-circle-outline" size={52} color={colors.border} />
            <Text style={s.emptyTitle}>No milestones</Text>
            <Text style={s.emptyText}>Add milestones in My Goals</Text>
          </View>
        )}

        {pending.length > 0 && (
          <View style={s.msGroup}>
            <Text style={s.msGroupLabel}>Pending · {pending.length}</Text>
            {pending.map((ms) => <MsRow key={ms.id} ms={ms} onToggle={() => toggleMsMutation.mutate(ms)} colors={colors} />)}
          </View>
        )}

        {done.length > 0 && (
          <View style={s.msGroup}>
            <Text style={s.msGroupLabel}>Completed · {done.length}</Text>
            {done.map((ms) => <MsRow key={ms.id} ms={ms} onToggle={() => toggleMsMutation.mutate(ms)} colors={colors} />)}
          </View>
        )}
      </ScrollView>
    </View>
  );
}

// ─── GoalsView ────────────────────────────────────────────────────────────────

function GoalsView({
  goals, isLoading, refetch, isRefetching,
  onSelectGoal,
}: {
  goals: Goal[];
  isLoading: boolean;
  refetch: () => void;
  isRefetching: boolean;
  onSelectGoal: (g: Goal) => void;
}) {
  const colors = useThemeStore((s) => s.colors);
  const s = useMemo(() => makeStyles(colors), [colors]);
  const qc = useQueryClient();

  const togglePublicMutation = useMutation({
    mutationFn: ({ id, isPublic }: { id: string; isPublic: boolean }) =>
      apiFetch(`/goals/${id}`, { method: 'PATCH', body: JSON.stringify({ isPublic }) }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['goals'] }),
  });

  return (
    <ScrollView
      contentContainerStyle={s.goalsViewContent}
      refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={colors.primary} />}
    >
      {isLoading && <ActivityIndicator color={colors.primary} style={{ marginTop: 40 }} />}

      {!isLoading && goals.length === 0 && (
        <View style={s.empty}>
          <MaterialCommunityIcons name="flag-checkered" size={52} color={colors.border} />
          <Text style={s.emptyTitle}>No goals yet</Text>
          <Text style={s.emptyText}>Tap + to add your first goal</Text>
        </View>
      )}

      {goals.map((goal) => {
        const cat = GOAL_CATEGORIES.find((c) => c.key === goal.category);
        return (
          <TouchableOpacity key={goal.id} style={[s.goalCard, { backgroundColor: colors.card }]} onPress={() => onSelectGoal(goal)} activeOpacity={0.8}>
            <View style={s.goalCardTop}>
              <View style={[s.catBadge, { backgroundColor: colors.primaryLight }]}>
                <MaterialCommunityIcons name={cat?.icon as MCIName} size={13} color={colors.primary} />
                <Text style={[s.catLabel, { color: colors.primary }]}>{cat?.label}</Text>
              </View>
              <View style={s.goalCardRight}>
                <TouchableOpacity
                  onPress={(e) => { e.stopPropagation(); togglePublicMutation.mutate({ id: goal.id, isPublic: !goal.is_public }); }}
                  hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                >
                  <MaterialCommunityIcons
                    name={goal.is_public ? 'eye-outline' : 'eye-off-outline'}
                    size={17}
                    color={goal.is_public ? colors.primary : colors.border}
                  />
                </TouchableOpacity>
                <MaterialCommunityIcons name="chevron-right" size={18} color={colors.textSecondary} />
              </View>
            </View>

            <Text style={[s.goalCardTitle, { color: colors.text }]}>{goal.title}</Text>
            {goal.description ? <Text style={[s.goalCardDesc, { color: colors.textSecondary }]}>{goal.description}</Text> : null}

            <View style={s.buddyRow}>
              {goal.connection_status === 'accepted' ? (
                <View style={[s.buddyStatusPill, { backgroundColor: colors.primaryLight }]}>
                  <MaterialCommunityIcons name="account-check" size={13} color={colors.primary} />
                  <Text style={[s.buddyStatusText, { color: colors.primary }]}>{goal.buddy_name}</Text>
                  {goal.buddy_activity_level && <ActivityBadge level={goal.buddy_activity_level} small />}
                </View>
              ) : goal.has_pending_request ? (
                <View style={[s.buddyStatusPill, { backgroundColor: colors.accentLight }]}>
                  <MaterialCommunityIcons name="account-clock-outline" size={13} color={colors.accent} />
                  <Text style={[s.buddyStatusText, { color: colors.accent }]}>Request pending</Text>
                </View>
              ) : (
                <View style={[s.buddyStatusPill, { backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border }]}>
                  <MaterialCommunityIcons name="account-plus-outline" size={13} color={colors.textSecondary} />
                  <Text style={[s.buddyStatusText, { color: colors.textSecondary }]}>No buddy yet</Text>
                </View>
              )}
            </View>
          </TouchableOpacity>
        );
      })}

      <View style={{ height: 100 }} />
    </ScrollView>
  );
}

// ─── GoalDetailSheet ──────────────────────────────────────────────────────────

function GoalDetailSheet({
  goal, onClose, onRequestBuddy, onUseTemplate, requestPending, templatePending,
}: {
  goal: PublicGoal;
  onClose: () => void;
  onRequestBuddy: () => void;
  onUseTemplate: () => void;
  requestPending: boolean;
  templatePending: boolean;
}) {
  const colors = useThemeStore((s) => s.colors);
  const s = useMemo(() => makeStyles(colors), [colors]);
  const cat = GOAL_CATEGORIES.find((c) => c.key === goal.category);

  const { data: milestones = [], isLoading } = useGoalMilestones(goal.id);

  const buddyLabel = () => {
    if (goal.has_buddy) return 'Already has a buddy';
    if (goal.my_request_status === 'pending') return 'Request sent';
    if (goal.my_request_status === 'accepted') return 'Buddied up';
    return 'Request Buddy';
  };
  const buddyDisabled = goal.has_buddy || goal.my_request_status != null;

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
          <Text style={[s.discoverUserName, { color: colors.text, fontWeight: '600' }]}>{goal.display_name}</Text>
          <ActivityBadge level={goal.activity_level} small />
        </View>

        {/* Actions */}
        <View style={{ flexDirection: 'row', gap: 10 }}>
          <TouchableOpacity
            style={[s.saveBtn, { flex: 1, backgroundColor: buddyDisabled ? colors.card : colors.primary, borderWidth: buddyDisabled ? 1 : 0, borderColor: colors.border }]}
            onPress={onRequestBuddy}
            disabled={buddyDisabled || requestPending}
          >
            {requestPending
              ? <ActivityIndicator color="#fff" size="small" />
              : <Text style={[s.saveBtnText, { color: buddyDisabled ? colors.textSecondary : '#fff' }]}>{buddyLabel()}</Text>}
          </TouchableOpacity>
          <TouchableOpacity
            style={[s.saveBtn, { flex: 1, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border }]}
            onPress={onUseTemplate}
            disabled={templatePending}
          >
            {templatePending
              ? <ActivityIndicator color={colors.primary} size="small" />
              : <Text style={[s.saveBtnText, { color: colors.primary }]}>Use as Template</Text>}
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
                <Text style={[s.msCardFreq, { color: colors.primary }]}>{FREQ_LABELS[ms.frequency]}</Text>
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
  const [buddyFilter, setBuddyFilter] = useState<'all' | 'open' | 'taken'>('all');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [selectedGoal, setSelectedGoal] = useState<PublicGoal | null>(null);

  const { data: results = [], isLoading } = usePublicGoals(debouncedSearch, filterCat, buddyFilter);
  const requestBuddyMutation = useRequestBuddy();
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

  if (selectedGoal) {
    return (
      <Modal visible animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setSelectedGoal(null)}>
        <GoalDetailSheet
          goal={selectedGoal}
          onClose={() => setSelectedGoal(null)}
          onRequestBuddy={() => {
            requestBuddyMutation.mutate(selectedGoal.id, {
              onSuccess: () => {
                setSelectedGoal((prev) => prev ? { ...prev, my_request_status: 'pending' } : null);
              },
            });
          }}
          onUseTemplate={() => useTemplateMutation.mutate(selectedGoal.id)}
          requestPending={requestBuddyMutation.isPending}
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
            <Text style={[s.discoverSub, { color: colors.textSecondary }]}>Find co-op partners</Text>
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

        {/* Category filter */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.filterContent} style={s.filterRow}>
          <TouchableOpacity
            style={[s.chip, !filterCat && { backgroundColor: colors.primary, borderColor: colors.primary }]}
            onPress={() => setFilterCat('')}
          >
            <Text style={[s.chipText, !filterCat && { color: '#fff' }]}>All</Text>
          </TouchableOpacity>
          {GOAL_CATEGORIES.map((cat) => (
            <TouchableOpacity
              key={cat.key}
              style={[s.chip, filterCat === cat.key && { backgroundColor: colors.primary, borderColor: colors.primary }]}
              onPress={() => setFilterCat(filterCat === cat.key ? '' : cat.key)}
            >
              <MaterialCommunityIcons name={cat.icon as MCIName} size={13} color={filterCat === cat.key ? '#fff' : colors.textSecondary} />
              <Text style={[s.chipText, filterCat === cat.key && { color: '#fff' }]}>{cat.label}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* Buddy filter */}
        <View style={[s.filterRow, { maxHeight: 40 }]}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.filterContent}>
            {BUDDY_FILTERS.map((f) => (
              <TouchableOpacity
                key={f.key}
                style={[s.chip, buddyFilter === f.key && { backgroundColor: colors.primary, borderColor: colors.primary }]}
                onPress={() => setBuddyFilter(f.key)}
              >
                {f.key === 'open' && <MaterialCommunityIcons name="account-plus-outline" size={13} color={buddyFilter === f.key ? '#fff' : colors.textSecondary} />}
                {f.key === 'taken' && <MaterialCommunityIcons name="account-check-outline" size={13} color={buddyFilter === f.key ? '#fff' : colors.textSecondary} />}
                <Text style={[s.chipText, buddyFilter === f.key && { color: '#fff' }]}>{f.label}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        <ScrollView contentContainerStyle={{ padding: 16, gap: 12, paddingBottom: 40 }}>
          {isLoading && <ActivityIndicator color={colors.primary} style={{ marginTop: 20 }} />}
          {!isLoading && results.length === 0 && (
            <View style={s.empty}>
              <MaterialCommunityIcons name="magnify" size={40} color={colors.border} />
              <Text style={s.emptyTitle}>No results</Text>
            </View>
          )}
          {results.map((g: PublicGoal) => {
            const cat = GOAL_CATEGORIES.find((c) => c.key === g.category);
            return (
              <TouchableOpacity key={g.id} style={[s.discoverCard, { backgroundColor: colors.card }]} onPress={() => setSelectedGoal(g)} activeOpacity={0.8}>
                <View style={s.discoverCardTop}>
                  <View style={[s.catBadge, { backgroundColor: colors.primaryLight }]}>
                    <MaterialCommunityIcons name={cat?.icon as MCIName} size={12} color={colors.primary} />
                    <Text style={[s.catLabel, { color: colors.primary }]}>{cat?.label}</Text>
                  </View>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                    {g.milestone_count > 0 && (
                      <Text style={[s.discoverMs, { color: colors.textSecondary }]}>{g.milestone_count} milestones</Text>
                    )}
                    {g.has_buddy
                      ? <MaterialCommunityIcons name="account-check" size={16} color={colors.textSecondary} />
                      : <MaterialCommunityIcons name="account-plus-outline" size={16} color={colors.primary} />
                    }
                  </View>
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
  const [activeTab, setActiveTab] = useState<'milestones' | 'goals'>('milestones');
  const [selectedGoal, setSelectedGoal] = useState<Goal | null>(null);
  const [showAdd, setShowAdd] = useState(false);
  const [showDiscover, setShowDiscover] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newCategory, setNewCategory] = useState('');
  const [newDescription, setNewDescription] = useState('');
  const [newIsPublic, setNewIsPublic] = useState(true);

  const { data: goals = [], isLoading, isError, refetch, isRefetching } = useGoals();
  const addMutation = useCreateGoal();

  const handleAddGoal = () => {
    addMutation.mutate(
      { title: newTitle, category: newCategory, description: newDescription, isPublic: newIsPublic },
      {
        onSuccess: () => {
          setShowAdd(false);
          setNewTitle(''); setNewCategory(''); setNewDescription(''); setNewIsPublic(true);
        },
      }
    );
  };

  // Full-screen goal config
  if (selectedGoal) {
    const fresh = goals.find((g) => g.id === selectedGoal.id) ?? selectedGoal;
    return <GoalConfig goal={fresh} onBack={() => setSelectedGoal(null)} />;
  }

  if (isError && goals.length === 0) return (
    <SafeAreaView style={s.container}>
      <View style={s.topBar}>
        <Text style={s.title}>Goals</Text>
      </View>
      <View style={s.errorState}>
        <MaterialCommunityIcons name="wifi-off" size={40} color={colors.border} />
        <Text style={s.errorStateText}>Couldn't load goals. Check your connection.</Text>
        <TouchableOpacity onPress={() => refetch()} style={s.retryBtn}>
          <Text style={s.retryBtnText}>Try again</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );

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
            refetch={refetch}
            isRefetching={isRefetching}
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
      <Modal visible={showAdd} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setShowAdd(false)}>
        <SafeAreaView style={[s.addGoalScreen, { backgroundColor: colors.background }]}>
          <View style={s.addGoalHeader}>
            <Text style={[s.addGoalTitle, { color: colors.text }]}>New Goal</Text>
            <TouchableOpacity onPress={() => setShowAdd(false)} style={[s.discoverClose, { backgroundColor: colors.card }]}>
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
              onPress={() => setNewIsPublic(!newIsPublic)}
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

            <TouchableOpacity
              style={[s.saveBtn, { backgroundColor: colors.primary, marginTop: 8 }, (!newTitle || !newCategory) && { opacity: 0.5 }]}
              onPress={handleAddGoal}
              disabled={!newTitle || !newCategory || addMutation.isPending}
            >
              {addMutation.isPending
                ? <ActivityIndicator color="#fff" size="small" />
                : <Text style={s.saveBtnText}>Save Goal</Text>}
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
  title:            { fontSize: 28, fontWeight: '700', color: colors.text, letterSpacing: -0.5 },

  tabBar:           { flexDirection: 'row', paddingHorizontal: 20 },
  tabItem:          { flex: 1, alignItems: 'center', paddingVertical: 10 },
  tabText:          { fontSize: 14, fontWeight: '600' },
  tabUnderline:     { position: 'absolute', bottom: 0, left: 16, right: 16, height: 2, borderRadius: 1 },

  filterRow:        { maxHeight: 44 },
  filterContent:    { paddingHorizontal: 16, gap: 8, flexDirection: 'row', alignItems: 'center' },
  chip: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    paddingHorizontal: 12, paddingVertical: 7,
    borderRadius: 20, backgroundColor: colors.card,
    borderWidth: 1, borderColor: colors.border,
  },
  chipText:         { fontSize: 13, color: colors.textSecondary, fontWeight: '500' },
  filterBar:        { flexDirection: 'row', gap: 8, paddingHorizontal: 16, paddingVertical: 10 },
  filterPill:       { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 12, paddingVertical: 7, borderRadius: 20, borderWidth: 1 },
  filterPillText:   { fontSize: 13, fontWeight: '600' },
  dropdownPanel:    { marginHorizontal: 16, borderRadius: 14, borderWidth: 1, marginBottom: 4, overflow: 'hidden' },
  dropdownItem:     { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 14, paddingVertical: 12 },
  dropdownItemText: { fontSize: 14, fontWeight: '500' },

  // Milestones view
  msViewContent:    { padding: 16, gap: 0, paddingBottom: 40 },
  msGroup:          { marginTop: 20, gap: 8 },
  msGroupLabel:     { fontSize: 11, fontWeight: '700', color: colors.textSecondary, textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 4 },
  msRow:            { flexDirection: 'row', alignItems: 'center', gap: 12, borderRadius: 14, padding: 14 },
  msRowTitle:       { fontSize: 15, fontWeight: '500' },
  msRowMeta:        { flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 3 },
  msRowGoal:        { fontSize: 12, flex: 1 },
  freqPill:         { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6 },
  freqPillText:     { fontSize: 10, fontWeight: '700' },
  msDueText:        { fontSize: 11, marginTop: 3 },

  // Goals view
  goalsViewContent: { padding: 16, gap: 12 },
  goalCard:         { borderRadius: 16, padding: 16, gap: 6 },
  goalCardTop:      { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  goalCardRight:    { flexDirection: 'row', alignItems: 'center', gap: 10 },
  goalCardTitle:    { fontSize: 16, fontWeight: '700' },
  goalCardDesc:     { fontSize: 13 },
  buddyRow:         { flexDirection: 'row', alignItems: 'center', marginTop: 4 },
  buddyStatusPill:  { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20 },
  buddyStatusText:  { fontSize: 12, fontWeight: '600' },

  catBadge:         { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
  catLabel:         { fontSize: 12, fontWeight: '600' },

  empty:            { alignItems: 'center', paddingTop: 60, gap: 10 },
  emptyTitle:       { fontSize: 18, fontWeight: '700', color: colors.text },
  emptyText:        { fontSize: 14, color: colors.textSecondary },
  errorState:       { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12, padding: 32 },
  errorStateText:   { fontSize: 15, color: colors.textSecondary, textAlign: 'center' },
  retryBtn:         { backgroundColor: colors.primary, paddingHorizontal: 24, paddingVertical: 10, borderRadius: 10 },
  retryBtnText:     { color: '#fff', fontWeight: '700', fontSize: 14 },

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
  configTitle:      { fontSize: 22, fontWeight: '700', color: colors.text, letterSpacing: -0.3 },
  configDesc:       { fontSize: 14, color: colors.textSecondary, lineHeight: 20 },
  configSection:    { gap: 10 },
  configSectionTitle: { fontSize: 12, fontWeight: '700', color: colors.textSecondary, textTransform: 'uppercase', letterSpacing: 0.8 },
  configEmpty:      { borderRadius: 14, padding: 24, alignItems: 'center', gap: 8 },
  configEmptyText:  { fontSize: 14 },
  msCard:           { flexDirection: 'row', alignItems: 'center', gap: 12, borderRadius: 14, padding: 14, borderWidth: 1 },
  msCardTitle:      { fontSize: 15, fontWeight: '500' },
  msCardFreq:       { fontSize: 11, fontWeight: '700', textTransform: 'capitalize', marginTop: 2 },
  addMsBtn:         { flexDirection: 'row', alignItems: 'center', gap: 8, borderRadius: 14, borderWidth: 1.5, borderStyle: 'dashed', padding: 14, justifyContent: 'center' },
  addMsBtnText:     { fontSize: 14, fontWeight: '600' },
  addMsForm:        { borderRadius: 14, padding: 14, gap: 12, borderWidth: 1 },
  addMsFormRow:     { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  addMsFormTitle:   { fontSize: 14, fontWeight: '700' },
  addMsInput:       { borderWidth: 1, borderRadius: 10, padding: 11, fontSize: 15 },
  freqRow:          { flexDirection: 'row', gap: 8 },
  freqChip:         { flex: 1, paddingVertical: 8, borderRadius: 10, borderWidth: 1, alignItems: 'center' },
  freqChipText:     { fontSize: 12, fontWeight: '600' },

  publicRow:        { flexDirection: 'row', alignItems: 'center', gap: 12, borderRadius: 14, padding: 14, borderWidth: 1 },
  publicLabel:      { fontSize: 15, fontWeight: '600' },
  publicSub:        { fontSize: 12, marginTop: 1 },
  toggle:           { width: 44, height: 26, borderRadius: 13, justifyContent: 'center', paddingHorizontal: 3 },
  toggleThumb:      { width: 20, height: 20, borderRadius: 10, backgroundColor: '#fff' },
  toggleThumbOn:    { alignSelf: 'flex-end' },

  saveBtn:          { padding: 14, borderRadius: 12, alignItems: 'center' },
  saveBtnText:      { color: '#fff', fontWeight: '700', fontSize: 16 },

  // Add goal screen
  addGoalScreen:    { flex: 1 },
  addGoalHeader:    { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingTop: 8, paddingBottom: 4 },
  addGoalTitle:     { fontSize: 22, fontWeight: '700' },
  addGoalContent:   { padding: 20, gap: 4, paddingBottom: 40 },
  inputLabel:       { fontSize: 13, fontWeight: '600', marginBottom: 6, marginTop: 8 },
  input:            { borderWidth: 1, borderRadius: 12, padding: 12, fontSize: 15, marginBottom: 4 },
  catGrid:          { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 4 },
  catChip:          { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 20, borderWidth: 1 },
  catChipText:      { fontSize: 13 },

  // Discover modal
  discoverScreen:   { flex: 1 },
  discoverHeader:   { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingTop: 8, paddingBottom: 4 },
  discoverClose:    { width: 36, height: 36, borderRadius: 18, justifyContent: 'center', alignItems: 'center' },
  discoverTitle:    { fontSize: 22, fontWeight: '700' },
  discoverSub:      { fontSize: 13, marginTop: 2 },
  searchBar:        { flexDirection: 'row', alignItems: 'center', gap: 8, borderWidth: 1, borderRadius: 12, paddingHorizontal: 12, paddingVertical: 10, marginHorizontal: 16, marginTop: 12, marginBottom: 4 },
  searchInput:      { flex: 1, fontSize: 15 },
  discoverCard:     { borderRadius: 14, padding: 14, gap: 6 },
  discoverCardTop:  { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  discoverMs:       { fontSize: 11, fontWeight: '600' },
  discoverUser:     { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 4 },
  discoverAvatar:   { width: 24, height: 24, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
  discoverAvatarText: { fontSize: 11, fontWeight: '700' },
  discoverUserName: { fontSize: 12, fontWeight: '500', flex: 1 },
});
