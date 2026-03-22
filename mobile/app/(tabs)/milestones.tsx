import { useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  ActivityIndicator, RefreshControl,
} from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { apiFetch } from '../../lib/api';
import { COLORS, GOAL_CATEGORIES } from '../../lib/constants';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuthStore } from '../../store/authStore';

type Milestone = {
  id: string;
  title: string;
  description: string | null;
  due_date: string | null;
  completed_at: string | null;
  ai_suggested: boolean;
  goal_title: string;
  goal_category: string;
  display_name?: string;
};

export default function MilestonesScreen() {
  const [tab, setTab] = useState<'mine' | 'buddies'>('mine');
  const { user } = useAuthStore();

  const { data: myMilestones = [], isLoading: loadingMine, refetch: refetchMine, isRefetching: refetchingMine } = useQuery<Milestone[]>({
    queryKey: ['milestones', 'me'],
    queryFn: () => apiFetch('/milestones/me'),
  });

  const { data: buddyMilestones = [], isLoading: loadingBuddies, refetch: refetchBuddies, isRefetching: refetchingBuddies } = useQuery<Milestone[]>({
    queryKey: ['milestones', 'buddies'],
    queryFn: () => apiFetch('/milestones/buddies'),
    enabled: tab === 'buddies',
  });

  const completed = myMilestones.filter((m) => m.completed_at);
  const upcoming = myMilestones.filter((m) => !m.completed_at);

  return (
    <SafeAreaView style={s.container}>
      <Text style={s.title}>Milestones</Text>

      <View style={s.tabs}>
        <TouchableOpacity style={[s.tab, tab === 'mine' && s.tabActive]} onPress={() => setTab('mine')}>
          <Text style={[s.tabText, tab === 'mine' && s.tabTextActive]}>My Wins</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[s.tab, tab === 'buddies' && s.tabActive]} onPress={() => setTab('buddies')}>
          <Text style={[s.tabText, tab === 'buddies' && s.tabTextActive]}>Buddy Wins</Text>
        </TouchableOpacity>
      </View>

      {tab === 'mine' ? (
        <ScrollView
          contentContainerStyle={s.content}
          refreshControl={<RefreshControl refreshing={refetchingMine} onRefresh={refetchMine} tintColor={COLORS.primary} />}
        >
          {loadingMine && <ActivityIndicator color={COLORS.primary} style={{ marginTop: 40 }} />}

          {completed.length > 0 && (
            <View style={s.section}>
              <Text style={s.sectionTitle}>🏆 Completed</Text>
              {completed.map((m) => <MilestoneCard key={m.id} milestone={m} done />)}
            </View>
          )}

          {upcoming.length > 0 && (
            <View style={s.section}>
              <Text style={s.sectionTitle}>🎯 Upcoming</Text>
              {upcoming.map((m) => <MilestoneCard key={m.id} milestone={m} done={false} />)}
            </View>
          )}

          {!loadingMine && myMilestones.length === 0 && (
            <View style={s.empty}>
              <Text style={s.emptyIcon}>🏆</Text>
              <Text style={s.emptyTitle}>No milestones yet</Text>
              <Text style={s.emptyText}>Connect with a buddy and track your progress together</Text>
            </View>
          )}

          {/* Stats summary */}
          {!loadingMine && (
            <View style={s.statsCard}>
              <Text style={s.statsTitle}>Your Progress</Text>
              <View style={s.statsRow}>
                <StatBox icon="✅" value={completed.length} label="Completed" />
                <StatBox icon="🎯" value={upcoming.length} label="Upcoming" />
                <StatBox icon="✨" value={myMilestones.filter((m) => m.ai_suggested).length} label="AI Suggested" />
              </View>
            </View>
          )}
        </ScrollView>
      ) : (
        <ScrollView
          contentContainerStyle={s.content}
          refreshControl={<RefreshControl refreshing={refetchingBuddies} onRefresh={refetchBuddies} tintColor={COLORS.primary} />}
        >
          {loadingBuddies && <ActivityIndicator color={COLORS.primary} style={{ marginTop: 40 }} />}
          {buddyMilestones.map((m) => (
            <View key={m.id} style={s.buddyCard}>
              <View style={s.buddyCardHeader}>
                <View style={s.avatarCircle}>
                  <Text style={s.avatarText}>{(m.display_name || '?')[0]}</Text>
                </View>
                <View>
                  <Text style={s.buddyName}>{m.display_name}</Text>
                  <Text style={s.buddyTime}>
                    {m.completed_at ? new Date(m.completed_at).toLocaleDateString() : ''}
                  </Text>
                </View>
                <Text style={s.trophy}>🏆</Text>
              </View>
              <Text style={s.milestoneTitle}>{m.title}</Text>
              <Text style={s.milestoneGoal}>
                {GOAL_CATEGORIES.find((c) => c.key === m.goal_category)?.icon} {m.goal_title}
              </Text>
            </View>
          ))}
          {!loadingBuddies && buddyMilestones.length === 0 && (
            <View style={s.empty}>
              <Text style={s.emptyIcon}>🤝</Text>
              <Text style={s.emptyTitle}>No buddy wins yet</Text>
              <Text style={s.emptyText}>When your buddies hit milestones, they'll show up here</Text>
            </View>
          )}
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

function MilestoneCard({ milestone: m, done }: { milestone: Milestone; done: boolean }) {
  const cat = GOAL_CATEGORIES.find((c) => c.key === m.goal_category);
  return (
    <View style={[s.mCard, done && s.mCardDone]}>
      <View style={s.mCardLeft}>
        {done ? <Text style={s.mCheck}>✅</Text> : <Text style={s.mPending}>⏳</Text>}
      </View>
      <View style={s.mCardBody}>
        <Text style={s.mTitle}>{m.title}</Text>
        <Text style={s.mGoal}>{cat?.icon} {m.goal_title}</Text>
        {m.due_date && <Text style={s.mDate}>Due {new Date(m.due_date).toLocaleDateString()}</Text>}
        {m.ai_suggested && <Text style={s.aiTag}>✨ AI suggested</Text>}
      </View>
    </View>
  );
}

function StatBox({ icon, value, label }: { icon: string; value: number; label: string }) {
  return (
    <View style={s.statBox}>
      <Text style={s.statIcon}>{icon}</Text>
      <Text style={s.statValue}>{value}</Text>
      <Text style={s.statLabel}>{label}</Text>
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  title: { fontSize: 26, fontWeight: '700', color: COLORS.text, paddingHorizontal: 20, paddingTop: 8, paddingBottom: 12 },
  tabs: { flexDirection: 'row', marginHorizontal: 20, marginBottom: 12, backgroundColor: COLORS.card, borderRadius: 12, padding: 4 },
  tab: { flex: 1, paddingVertical: 8, borderRadius: 10, alignItems: 'center' },
  tabActive: { backgroundColor: COLORS.primary },
  tabText: { fontWeight: '600', color: COLORS.textSecondary },
  tabTextActive: { color: '#fff' },
  content: { padding: 16, gap: 16 },
  section: { gap: 10 },
  sectionTitle: { fontSize: 14, fontWeight: '700', color: COLORS.textSecondary, textTransform: 'uppercase', letterSpacing: 0.5 },
  empty: { alignItems: 'center', paddingTop: 60 },
  emptyIcon: { fontSize: 48, marginBottom: 12 },
  emptyTitle: { fontSize: 18, fontWeight: '700', color: COLORS.text },
  emptyText: { fontSize: 14, color: COLORS.textSecondary, marginTop: 4, textAlign: 'center' },
  mCard: { backgroundColor: COLORS.card, borderRadius: 14, padding: 14, flexDirection: 'row', gap: 12 },
  mCardDone: { borderLeftWidth: 3, borderLeftColor: COLORS.primary },
  mCardLeft: { justifyContent: 'flex-start' },
  mCheck: { fontSize: 20 },
  mPending: { fontSize: 20 },
  mCardBody: { flex: 1, gap: 2 },
  mTitle: { fontSize: 15, fontWeight: '600', color: COLORS.text },
  mGoal: { fontSize: 12, color: COLORS.textSecondary },
  mDate: { fontSize: 12, color: COLORS.textSecondary },
  aiTag: { fontSize: 11, color: COLORS.primary, fontWeight: '600' },
  statsCard: { backgroundColor: COLORS.card, borderRadius: 16, padding: 16, gap: 12 },
  statsTitle: { fontSize: 15, fontWeight: '700', color: COLORS.text },
  statsRow: { flexDirection: 'row', justifyContent: 'space-around' },
  statBox: { alignItems: 'center', gap: 4 },
  statIcon: { fontSize: 24 },
  statValue: { fontSize: 22, fontWeight: '700', color: COLORS.text },
  statLabel: { fontSize: 12, color: COLORS.textSecondary },
  buddyCard: { backgroundColor: COLORS.card, borderRadius: 14, padding: 16, gap: 8 },
  buddyCardHeader: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  avatarCircle: { width: 40, height: 40, borderRadius: 20, backgroundColor: COLORS.primaryLight, justifyContent: 'center', alignItems: 'center' },
  avatarText: { fontWeight: '700', color: COLORS.primary },
  buddyName: { fontSize: 14, fontWeight: '600', color: COLORS.text },
  buddyTime: { fontSize: 12, color: COLORS.textSecondary },
  trophy: { marginLeft: 'auto', fontSize: 22 },
  milestoneTitle: { fontSize: 16, fontWeight: '700', color: COLORS.text },
  milestoneGoal: { fontSize: 13, color: COLORS.textSecondary },
});
