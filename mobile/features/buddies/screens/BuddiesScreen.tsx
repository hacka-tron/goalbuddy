import { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  ActivityIndicator, RefreshControl,
} from 'react-native';
import { FS, FW, LH } from '../../../theme/typography';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useQueryClient } from '@tanstack/react-query';
import { useThemeStore } from '../../../store/themeStore';
import { useNotificationStore, BuddyTabKey } from '../../../store/notificationStore';
import { useBuddies } from '../hooks';
import { BuddyCard } from '../components/BuddyCard';
import { Connection, BuddyGroup, TabKey } from '../types';

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
  const [activeTab, setActiveTab] = useState<TabKey>('my_goals');
  const colors = useThemeStore((s) => s.colors);
  const lastSeenAt = useNotificationStore((s) => s.lastSeenAt);
  const subTabLastSeen = useNotificationStore((s) => s.subTabLastSeen);
  const setUnread = useNotificationStore((s) => s.setUnread);
  const loadSeenTimes = useNotificationStore((s) => s.loadSeenTimes);
  const markSubTabSeen = useNotificationStore((s) => s.markSubTabSeen);
  const setPendingRequestCount = useNotificationStore((s) => s.setPendingRequestCount);
  const s = useMemo(() => makeStyles(colors), [colors]);

  useEffect(() => {
    loadSeenTimes();
    markSubTabSeen('my_goals'); // default tab is visible on mount
  }, []);

  const qc = useQueryClient();
  const { data: connectionsData, isLoading, isError, refetch } = useBuddies();
  const [manualRefreshing, setManualRefreshing] = useState(false);
  const handleRefresh = useCallback(async () => {
    setManualRefreshing(true);
    try { await refetch(); } finally { setManualRefreshing(false); }
  }, [refetch]);
  const connections = useMemo(() => {
    const raw = connectionsData ?? [];
    const seen = new Set<string>();
    return raw.filter((c) => {
      const key = `${c.buddy_id}:${c.goal_id}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }, [connectionsData]);

  const accepted = useMemo(() => connections.filter((c) => c.status === 'accepted'), [connections]);
  const incomingPending = useMemo(() => connections.filter((c) => c.status === 'pending' && c.is_incoming), [connections]);

  const lastSeenAtRef = useRef(lastSeenAt);
  lastSeenAtRef.current = lastSeenAt;

  // Keep pending request count in store for bottom nav badge
  useEffect(() => {
    setPendingRequestCount(incomingPending.length);
  }, [incomingPending.length]);

  useEffect(() => {
    const unread = accepted.filter(
      (c) => !c.is_last_message_mine && c.last_message_at &&
             c.last_message_at > (lastSeenAtRef.current[c.id] ?? '')
    );
    const ids = unread.map((c) => c.id);
    setUnread(ids, ids.length);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [accepted]);

  // Compute per-sub-tab unread counts (new messages since last tab visit)
  const subTabBadge = useMemo(() => {
    const connUnread = (conns: Connection[], tabKey: BuddyTabKey) => {
      const since = subTabLastSeen[tabKey] ?? '';
      return conns.filter(
        (c) => !c.is_last_message_mine && c.last_message_at && c.last_message_at > since
      ).length;
    };
    const coop = accepted.filter((c) => c.connection_type === 'coop');
    const accountability = accepted.filter((c) => c.connection_type !== 'coop');
    return {
      my_goals: connUnread(accountability.filter((c) => c.is_my_goal), 'my_goals'),
      coaching:  connUnread(accountability.filter((c) => !c.is_my_goal), 'coaching')
               + incomingPending.length
               + accepted.filter((c) => c.overdue_count > 0 || c.late_today_count > 0).length,
      coop:      connUnread(coop, 'coop'),
    };
  }, [accepted, incomingPending, subTabLastSeen]);

  const handleTabChange = useCallback((key: TabKey) => {
    setActiveTab(key);
    markSubTabSeen(key as BuddyTabKey);
  }, [markSubTabSeen]);

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

  const TABS: { key: TabKey; label: string }[] = [
    { key: 'my_goals', label: 'My Goals' },
    { key: 'coaching', label: 'Coaching' },
    { key: 'coop', label: 'Co-op' },
  ];

  const emptyMessages: Record<TabKey, { title: string; body: string }> = {
    my_goals:  { title: 'No buddies yet',       body: 'Head to Find to discover a goal buddy' },
    coaching:  { title: 'Not coaching anyone',  body: "Request to buddy up on someone's goal in Find" },
    coop:      { title: 'No co-op goals',       body: 'Co-op connections share a common goal together' },
  };

  return (
    <SafeAreaView style={s.container}>
      <View style={s.headerRow}>
        <Text style={s.title}>Buddies</Text>
        {incomingPending.length > 0 && (
          <TouchableOpacity style={s.requestsBadge} onPress={() => router.push('/buddy-requests')}>
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
        {TABS.map((t) => {
          const badge = subTabBadge[t.key as BuddyTabKey] ?? 0;
          return (
            <TouchableOpacity key={t.key} style={s.tabItem} onPress={() => handleTabChange(t.key)}>
              <View style={s.tabLabelRow}>
                <Text style={[s.tabText, { color: activeTab === t.key ? colors.primary : colors.textSecondary }]}>
                  {t.label}
                </Text>
                {badge > 0 && (
                  <View style={[s.tabBadge, { backgroundColor: colors.primary }]}>
                    <Text style={s.tabBadgeText}>{badge > 9 ? '9+' : badge}</Text>
                  </View>
                )}
              </View>
              {activeTab === t.key && <View style={[s.tabUnderline, { backgroundColor: colors.primary }]} />}
            </TouchableOpacity>
          );
        })}
      </View>


      <ScrollView
        contentContainerStyle={s.content}
        refreshControl={<RefreshControl refreshing={manualRefreshing} onRefresh={handleRefresh} tintColor={colors.primary} />}
      >
        {isLoading && <ActivityIndicator color={colors.primary} style={{ marginTop: 40 }} />}

        {activeTab === 'my_goals' && !isLoading && (
          <TouchableOpacity style={[s.goalsLink, { backgroundColor: colors.card, borderColor: colors.border }]} onPress={() => router.navigate({ pathname: '/(tabs)/goals', params: { tab: 'goals' } })} activeOpacity={0.7}>
            <MaterialCommunityIcons name="checkbox-marked-circle-outline" size={16} color={colors.primary} />
            <Text style={[s.goalsLinkText, { color: colors.primary }]}>View my goals</Text>
            <MaterialCommunityIcons name="chevron-right" size={16} color={colors.primary} />
          </TouchableOpacity>
        )}

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

const makeStyles = (colors: any) => StyleSheet.create({
  container:       { flex: 1, backgroundColor: colors.background },

  headerRow:       { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingTop: 8, paddingBottom: 12 },
  title:           { fontSize: FS.title, lineHeight: LH.title, fontWeight: FW.bold, color: colors.text },
  requestsBadge:   { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: colors.primary, paddingHorizontal: 12, paddingVertical: 7, borderRadius: 20 },
  requestsBadgeText: { color: '#fff', fontSize: FS.secondary, lineHeight: LH.secondary, fontWeight: FW.bold },
  requestsCount:   { backgroundColor: 'rgba(255,255,255,0.3)', borderRadius: 10, minWidth: 20, height: 20, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 4 },
  requestsCountText: { color: '#fff', fontSize: FS.caption, lineHeight: LH.caption, fontWeight: FW.semibold },

  tabBar:          { flexDirection: 'row', paddingHorizontal: 20, borderBottomWidth: 1, marginBottom: 4 },
  tabItem:         { flex: 1, alignItems: 'center', paddingVertical: 10 },
  tabLabelRow:     { flexDirection: 'row', alignItems: 'center', gap: 5 },
  tabText:         { fontSize: FS.secondary, lineHeight: LH.secondary, fontWeight: FW.semibold },
  tabUnderline:    { position: 'absolute', bottom: 0, left: 8, right: 8, height: 2, borderRadius: 1 },
  tabBadge:        { minWidth: 16, height: 16, borderRadius: 8, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 4 },
  tabBadgeText:    { color: '#fff', fontSize: FS.caption, lineHeight: LH.caption, fontWeight: FW.semibold },
  content:         { padding: 16, gap: 16 },
  section:         { gap: 10 },

  empty:           { alignItems: 'center', paddingTop: 60, gap: 8 },
  emptyTitle:      { fontSize: FS.section, lineHeight: LH.section, fontWeight: FW.bold, color: colors.text },
  emptyText:       { fontSize: FS.secondary, lineHeight: LH.secondary, color: colors.textSecondary, textAlign: 'center' },

  errorState:      { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12, padding: 32 },
  errorText:       { fontSize: FS.body, lineHeight: LH.body, color: colors.textSecondary, textAlign: 'center' },
  retryBtn:        { backgroundColor: colors.primary, paddingHorizontal: 24, paddingVertical: 10, borderRadius: 10 },
  retryBtnText:    { color: '#fff', fontWeight: FW.bold, fontSize: FS.secondary, lineHeight: LH.secondary },

  goalsLink:       { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 14, paddingVertical: 10, borderRadius: 12, borderWidth: 1 },
  goalsLinkText:   { flex: 1, fontSize: FS.secondary, lineHeight: LH.secondary, fontWeight: FW.semibold },
});
