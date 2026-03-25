import { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  ActivityIndicator, RefreshControl, Alert,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { router } from 'expo-router';
import { apiFetch } from '../../lib/api';
import { GOAL_CATEGORIES } from '../../lib/constants';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ActivityBadge } from '../../components/ui/ActivityBadge';
import { useThemeStore } from '../../store/themeStore';
import { useNotificationStore } from '../../store/notificationStore';

type Connection = {
  id: string;
  status: string;
  goal_title: string;
  goal_category: string;
  goal_id: string;
  buddy_id: string;
  buddy_name: string;
  buddy_avatar: string | null;
  activity_level: string;
  current_streak: number;
  last_checkin_at: string | null;
  connection_type: string;
  overdue_count: number;
  total_checkins: number;
  milestones_completed: number;
  response_rate: number;
  is_incoming: boolean;
  is_my_goal: boolean;
  is_last_message_mine: boolean | null;
  last_message_at: string | null;
};

type BuddyGroup = {
  buddy_id: string;
  buddy_name: string;
  buddy_avatar: string | null;
  activity_level: string;
  connections: Connection[];
  has_overdue: boolean;
};

type CheckIn = {
  id: string;
  author_id: string;
  message: string;
  mood: string;
  display_name: string;
  created_at: string;
  milestone_title: string | null;
};

type MCIName = React.ComponentProps<typeof MaterialCommunityIcons>['name'];

type TabKey = 'my_goals' | 'coaching' | 'coop';

function groupByBuddy(connections: Connection[]): BuddyGroup[] {
  const map = new Map<string, BuddyGroup>();
  for (const conn of connections) {
    if (!map.has(conn.buddy_id)) {
      map.set(conn.buddy_id, {
        buddy_id: conn.buddy_id,
        buddy_name: conn.buddy_name,
        buddy_avatar: conn.buddy_avatar,
        activity_level: conn.activity_level,
        connections: [],
        has_overdue: false,
      });
    }
    const group = map.get(conn.buddy_id)!;
    group.connections.push(conn);
    if (conn.overdue_count > 0) group.has_overdue = true;
  }
  return Array.from(map.values());
}

export default function BuddiesScreen() {
  const [showRequests, setShowRequests] = useState(false);
  const [activeTab, setActiveTab] = useState<TabKey>('my_goals');
  const { colors } = useThemeStore();
  // Use selectors so only relevant slice changes trigger re-render
  const lastSeenAt = useNotificationStore((s) => s.lastSeenAt);
  const setUnread = useNotificationStore((s) => s.setUnread);
  const loadSeenTimes = useNotificationStore((s) => s.loadSeenTimes);
  const s = useMemo(() => makeStyles(colors), [colors]);

  useEffect(() => { loadSeenTimes(); }, []);

  const { data: connectionsData, isLoading, isError, refetch, isRefetching } = useQuery<Connection[]>({
    queryKey: ['buddies'],
    queryFn: () => apiFetch('/buddies'),
    staleTime: 0,
    refetchInterval: 5000,
  });
  const connections = connectionsData ?? [];

  const accepted = useMemo(() => connections.filter((c) => c.status === 'accepted'), [connections]);
  const incomingPending = useMemo(() => connections.filter((c) => c.status === 'pending' && c.is_incoming), [connections]);
  const overdueConns = useMemo(() => accepted.filter((c) => c.overdue_count > 0), [accepted]);

  // Compute unread — use a ref to avoid stale closure without retriggering loop
  const lastSeenAtRef = useRef(lastSeenAt);
  lastSeenAtRef.current = lastSeenAt;
  useEffect(() => {
    const unread = accepted.filter(
      (c) => !c.is_last_message_mine && c.last_message_at &&
             c.last_message_at > (lastSeenAtRef.current[c.id] ?? '')
    );
    const ids = unread.map((c) => c.id);
    setUnread(ids, ids.length);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [accepted]); // lastSeenAt intentionally excluded — ref tracks it without causing loop

  const tabAccepted = useMemo(() => {
    const coop = accepted.filter((c) => c.connection_type === 'coop');
    const accountability = accepted.filter((c) => c.connection_type !== 'coop');
    if (activeTab === 'coop') return coop;
    if (activeTab === 'my_goals') return accountability.filter((c) => c.is_my_goal);
    return accountability.filter((c) => !c.is_my_goal);
  }, [accepted, activeTab]);
  const buddyGroups = useMemo(() => groupByBuddy(tabAccepted), [tabAccepted]);

  if (isError && !connectionsData) return (
    <SafeAreaView style={s.container}>
      <View style={s.headerRow}>
        <Text style={s.title}>Buddies</Text>
      </View>
      <View style={s.errorState}>
        <MaterialCommunityIcons name="wifi-off" size={40} color={colors.border} />
        <Text style={s.errorText}>Couldn't load buddies. Check your connection.</Text>
        <TouchableOpacity onPress={() => refetch()} style={s.retryBtn}>
          <Text style={s.retryBtnText}>Try again</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );

  if (showRequests) {
    return <BuddyRequestsView requests={incomingPending} onBack={() => setShowRequests(false)} />;
  }

  const TABS: { key: TabKey; label: string }[] = [
    { key: 'my_goals', label: 'My Goals' },
    { key: 'coaching', label: 'Coaching' },
    { key: 'coop', label: 'Co-op' },
  ];

  const emptyMessages: Record<TabKey, { title: string; body: string }> = {
    my_goals:  { title: 'No buddies yet',       body: 'Head to Find to discover a goal buddy' },
    coaching:  { title: 'Not coaching anyone',  body: 'Request to buddy up on someone\'s goal in Find' },
    coop:      { title: 'No co-op goals',       body: 'Co-op connections share a common goal together' },
  };

  return (
    <SafeAreaView style={s.container}>
      <View style={s.headerRow}>
        <Text style={s.title}>Buddies</Text>
        {incomingPending.length > 0 && (
          <TouchableOpacity style={s.requestsBadge} onPress={() => setShowRequests(true)}>
            <MaterialCommunityIcons name="account-clock" size={18} color="#fff" />
            <Text style={s.requestsBadgeText}>Requests</Text>
            <View style={s.requestsCount}>
              <Text style={s.requestsCountText}>{incomingPending.length}</Text>
            </View>
          </TouchableOpacity>
        )}
      </View>

      {/* Sub-tabs */}
      <View style={[s.tabBar, { borderBottomColor: colors.border }]}>
        {TABS.map((t) => (
          <TouchableOpacity key={t.key} style={s.tabItem} onPress={() => setActiveTab(t.key)}>
            <Text style={[s.tabText, { color: activeTab === t.key ? colors.primary : colors.textSecondary }]}>
              {t.label}
            </Text>
            {activeTab === t.key && <View style={[s.tabUnderline, { backgroundColor: colors.primary }]} />}
          </TouchableOpacity>
        ))}
      </View>

      {/* Overdue nudge banners — shown above the scroll view */}
      {overdueConns.length > 0 && (
        <View style={s.nudgeList}>
          {overdueConns.map((conn) => (
            <TouchableOpacity
              key={conn.id}
              style={s.nudgeCard}
              onPress={() => router.push(`/chat/${conn.id}` as any)}
              activeOpacity={0.75}
            >
              <View style={s.nudgeIcon}>
                <MaterialCommunityIcons name="bell-ring" size={16} color="#FF6B6B" />
              </View>
              <View style={s.nudgeBody}>
                <Text style={s.nudgeTitle}>
                  <Text style={s.nudgeName}>{conn.buddy_name}</Text>
                  {' is behind on '}
                  <Text style={s.nudgeName}>{conn.goal_title}</Text>
                </Text>
                <Text style={s.nudgeSub}>
                  {conn.overdue_count} milestone{conn.overdue_count > 1 ? 's' : ''} overdue · tap to check in
                </Text>
              </View>
              <MaterialCommunityIcons name="chevron-right" size={16} color="#FF6B6B" />
            </TouchableOpacity>
          ))}
        </View>
      )}

      <ScrollView
        contentContainerStyle={s.content}
        refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={colors.primary} />}
      >
        {isLoading && <ActivityIndicator color={colors.primary} style={{ marginTop: 40 }} />}

        {buddyGroups.length > 0 && (
          <View style={s.section}>
            {buddyGroups.map((group) => (
              <BuddyCard key={group.buddy_id} group={group} />
            ))}
          </View>
        )}

        {!isLoading && tabAccepted.length === 0 && (
          <View style={s.empty}>
            <MaterialCommunityIcons name="account-group-outline" size={52} color={colors.border} />
            <Text style={s.emptyTitle}>{emptyMessages[activeTab].title}</Text>
            <Text style={s.emptyText}>{emptyMessages[activeTab].body}</Text>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

// ─── BuddyRequestsView ────────────────────────────────────────────────────────

function BuddyRequestsView({ requests, onBack }: { requests: Connection[]; onBack: () => void }) {
  const qc = useQueryClient();
  const { colors } = useThemeStore();
  const s = useMemo(() => makeStyles(colors), [colors]);

  const respondMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) =>
      apiFetch(`/buddies/${id}`, { method: 'PATCH', body: JSON.stringify({ status }) }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['buddies'] }),
    onError: (_err, variables) => {
      const action = variables.status === 'accepted' ? 'accept' : 'decline';
      Alert.alert(
        `Couldn't ${action} request`,
        'Check your connection and try again.',
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Retry', onPress: () => respondMutation.mutate(variables) },
        ]
      );
    },
  });

  return (
    <SafeAreaView style={s.container}>
      <View style={s.requestsHeader}>
        <TouchableOpacity onPress={onBack}>
          <MaterialCommunityIcons name="arrow-left" size={22} color={colors.primary} />
        </TouchableOpacity>
        <Text style={s.requestsHeaderTitle}>Buddy Requests</Text>
        <View style={{ width: 22 }} />
      </View>

      <ScrollView contentContainerStyle={s.content}>
        {requests.length === 0 && (
          <View style={s.empty}>
            <MaterialCommunityIcons name="account-clock-outline" size={52} color={colors.border} />
            <Text style={s.emptyTitle}>No pending requests</Text>
          </View>
        )}

        {requests.map((req) => {
          const cat = GOAL_CATEGORIES.find((c) => c.key === req.goal_category);
          const isPending = respondMutation.isPending && respondMutation.variables?.id === req.id;
          return (
            <View key={req.id} style={s.requestCard}>
              <View style={s.requestCardHeader}>
                <View style={s.avatarCircleLg}>
                  <Text style={s.avatarTextLg}>{req.buddy_name[0]}</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={s.requestName}>{req.buddy_name}</Text>
                  <ActivityBadge level={req.activity_level} small />
                </View>
              </View>

              <View style={s.statsRow}>
                <View style={s.statItem}>
                  <Text style={s.statValue}>{req.current_streak ?? 0}</Text>
                  <Text style={s.statLabel}>Streak</Text>
                </View>
                <View style={s.statDivider} />
                <View style={s.statItem}>
                  <Text style={s.statValue}>{req.total_checkins ?? 0}</Text>
                  <Text style={s.statLabel}>Check-ins</Text>
                </View>
                <View style={s.statDivider} />
                <View style={s.statItem}>
                  <Text style={s.statValue}>{req.milestones_completed ?? 0}</Text>
                  <Text style={s.statLabel}>Milestones</Text>
                </View>
                <View style={s.statDivider} />
                <View style={s.statItem}>
                  <Text style={s.statValue}>
                    {req.response_rate != null ? `${Math.round(req.response_rate)}%` : '—'}
                  </Text>
                  <Text style={s.statLabel}>Response</Text>
                </View>
              </View>

              <View style={s.requestGoalRow}>
                {cat && <MaterialCommunityIcons name={cat.icon as MCIName} size={14} color={colors.textSecondary} />}
                <Text style={s.requestGoalTitle} numberOfLines={1}>{req.goal_title}</Text>
              </View>

              <View style={s.pendingActions}>
                <TouchableOpacity
                  style={s.declineBtn}
                  onPress={() => respondMutation.mutate({ id: req.id, status: 'declined' })}
                  disabled={isPending}
                >
                  <Text style={s.declineBtnText}>Decline</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[s.acceptBtn, isPending && { opacity: 0.6 }]}
                  onPress={() => respondMutation.mutate({ id: req.id, status: 'accepted' })}
                  disabled={isPending}
                >
                  {isPending
                    ? <ActivityIndicator color="#fff" size="small" />
                    : <Text style={s.acceptBtnText}>Accept</Text>}
                </TouchableOpacity>
              </View>
            </View>
          );
        })}
      </ScrollView>
    </SafeAreaView>
  );
}

// ─── BuddyCard ────────────────────────────────────────────────────────────────

function BuddyCard({ group }: { group: BuddyGroup }) {
  const { colors } = useThemeStore();
  const { unreadIds } = useNotificationStore();
  const s = useMemo(() => makeStyles(colors), [colors]);

  return (
    <View style={s.buddyCard}>
      <View style={s.buddyCardHeader}>
        <View style={s.avatarCircle}>
          <Text style={s.avatarText}>{group.buddy_name[0]}</Text>
        </View>
        <View style={s.buddyCardInfo}>
          <Text style={s.buddyName}>{group.buddy_name}</Text>
          <ActivityBadge level={group.activity_level} small />
        </View>
        {group.has_overdue && (
          <View style={s.overduePill}>
            <View style={s.overdueDot} />
            <Text style={s.overdueText}>Overdue</Text>
          </View>
        )}
      </View>

      {group.connections.map((conn) => {
        const cat = GOAL_CATEGORIES.find((c) => c.key === conn.goal_category);
        return (
          <TouchableOpacity
            key={conn.id}
            style={s.goalRow}
            onPress={() => router.push(`/chat/${conn.id}` as any)}
            activeOpacity={0.7}
          >
            <View style={s.goalRowLeft}>
              {cat && <MaterialCommunityIcons name={cat.icon as MCIName} size={15} color={colors.textSecondary} />}
              <Text style={s.goalRowTitle} numberOfLines={1}>{conn.goal_title}</Text>
              {conn.connection_type === 'coop' && (
                <View style={[s.coopBadge, { backgroundColor: colors.primaryLight }]}>
                  <Text style={[s.coopBadgeText, { color: colors.primary }]}>CO-OP</Text>
                </View>
              )}
              {conn.overdue_count > 0 && (
                <View style={s.overdueCountPill}>
                  <Text style={s.overdueCountText}>{conn.overdue_count}</Text>
                </View>
              )}
              {unreadIds[conn.id] && <View style={s.unreadDot} />}
            </View>
            <MaterialCommunityIcons name="chevron-right" size={18} color={colors.textSecondary} />
          </TouchableOpacity>
        );
      })}
    </View>
  );
}


// ─── Styles ───────────────────────────────────────────────────────────────────

const makeStyles = (colors: any) => StyleSheet.create({
  container:       { flex: 1, backgroundColor: colors.background },

  headerRow:       { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingTop: 8, paddingBottom: 12 },
  title:           { fontSize: 26, fontWeight: '700', color: colors.text },
  requestsBadge:   { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: colors.primary, paddingHorizontal: 12, paddingVertical: 7, borderRadius: 20 },
  requestsBadgeText: { color: '#fff', fontSize: 13, fontWeight: '700' },
  requestsCount:   { backgroundColor: 'rgba(255,255,255,0.3)', borderRadius: 10, minWidth: 20, height: 20, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 4 },
  requestsCountText: { color: '#fff', fontSize: 12, fontWeight: '800' },

  requestsHeader:  { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 16, backgroundColor: colors.card, borderBottomWidth: 1, borderBottomColor: colors.border },
  requestsHeaderTitle: { fontSize: 17, fontWeight: '700', color: colors.text },
  requestCard:     { backgroundColor: colors.card, borderRadius: 18, padding: 16, gap: 14 },
  requestCardHeader: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  avatarCircleLg:  { width: 54, height: 54, borderRadius: 27, backgroundColor: colors.primaryLight, justifyContent: 'center', alignItems: 'center' },
  avatarTextLg:    { fontSize: 22, fontWeight: '700', color: colors.primary },
  requestName:     { fontSize: 17, fontWeight: '700', color: colors.text, marginBottom: 4 },
  statsRow:        { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.background, borderRadius: 12, paddingVertical: 12, paddingHorizontal: 8 },
  statItem:        { flex: 1, alignItems: 'center', gap: 2 },
  statValue:       { fontSize: 17, fontWeight: '800', color: colors.text },
  statLabel:       { fontSize: 11, color: colors.textSecondary, fontWeight: '500' },
  statDivider:     { width: 1, height: 32, backgroundColor: colors.border },
  requestGoalRow:  { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: colors.background, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 10 },
  requestGoalTitle: { fontSize: 13, color: colors.textSecondary, fontWeight: '500', flex: 1 },

  nudgeList:       { paddingHorizontal: 16, paddingTop: 8, gap: 6 },
  nudgeCard:       {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    backgroundColor: '#FF6B6B12', borderWidth: 1, borderColor: '#FF6B6B30',
    borderRadius: 12, paddingHorizontal: 12, paddingVertical: 10,
  },
  nudgeIcon:       { width: 30, height: 30, borderRadius: 15, backgroundColor: '#FF6B6B18', justifyContent: 'center', alignItems: 'center' },
  nudgeBody:       { flex: 1, gap: 2 },
  nudgeTitle:      { fontSize: 13, color: colors.text, lineHeight: 18 },
  nudgeName:       { fontWeight: '700' },
  nudgeSub:        { fontSize: 12, color: '#FF6B6B', fontWeight: '500' },

  tabBar:          { flexDirection: 'row', paddingHorizontal: 20, borderBottomWidth: 1, marginBottom: 4 },
  tabItem:         { flex: 1, alignItems: 'center', paddingVertical: 10 },
  tabText:         { fontSize: 14, fontWeight: '600' },
  tabUnderline:    { position: 'absolute', bottom: 0, left: 8, right: 8, height: 2, borderRadius: 1 },
  content:         { padding: 16, gap: 16 },
  section:         { gap: 10 },

  buddyCard: {
    backgroundColor: colors.card, borderRadius: 16, overflow: 'hidden',
    elevation: 1, shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 8,
  },
  buddyCardHeader: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14, borderBottomWidth: 1, borderBottomColor: colors.border },
  buddyCardInfo:   { flex: 1, gap: 4 },
  avatarCircle:    { width: 44, height: 44, borderRadius: 22, backgroundColor: colors.primaryLight, justifyContent: 'center', alignItems: 'center' },
  avatarText:      { fontSize: 18, fontWeight: '700', color: colors.primary },
  buddyName:       { fontSize: 15, fontWeight: '700', color: colors.text },

  overduePill:     { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: '#FF6B6B18', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 },
  overdueDot:      { width: 6, height: 6, borderRadius: 3, backgroundColor: '#FF6B6B' },
  overdueText:     { fontSize: 11, fontWeight: '600', color: '#FF6B6B' },
  overdueCountPill: { minWidth: 18, height: 18, borderRadius: 9, backgroundColor: '#FF6B6B', justifyContent: 'center', alignItems: 'center', paddingHorizontal: 4 },
  overdueCountText: { fontSize: 10, fontWeight: '800', color: '#fff' },

  goalRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 14, paddingVertical: 11, borderTopWidth: 1, borderTopColor: colors.border },
  goalRowLeft:     { flexDirection: 'row', alignItems: 'center', gap: 6, flex: 1 },
  goalRowTitle:    { fontSize: 14, color: colors.text, fontWeight: '500', flex: 1 },
  coopBadge:       { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6 },
  coopBadgeText:   { fontSize: 10, fontWeight: '700', letterSpacing: 0.5 },

  pendingActions:  { flexDirection: 'row', gap: 10, marginTop: 4 },
  declineBtn:      { flex: 1, padding: 10, borderRadius: 10, borderWidth: 1, borderColor: colors.border, alignItems: 'center' },
  declineBtnText:  { color: colors.textSecondary, fontWeight: '600' },
  acceptBtn:       { flex: 1, padding: 10, borderRadius: 10, backgroundColor: colors.primary, alignItems: 'center' },
  acceptBtnText:   { color: '#fff', fontWeight: '600' },

  empty:           { alignItems: 'center', paddingTop: 60, gap: 8 },
  emptyTitle:      { fontSize: 18, fontWeight: '700', color: colors.text },
  emptyText:       { fontSize: 14, color: colors.textSecondary, textAlign: 'center' },

  unreadDot:       { width: 8, height: 8, borderRadius: 4, backgroundColor: colors.primary },

  errorState:      { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12, padding: 32 },
  errorText:       { fontSize: 15, color: colors.textSecondary, textAlign: 'center' },
  retryBtn:        { backgroundColor: colors.primary, paddingHorizontal: 24, paddingVertical: 10, borderRadius: 10 },
  retryBtnText:    { color: '#fff', fontWeight: '700', fontSize: 14 },
});
