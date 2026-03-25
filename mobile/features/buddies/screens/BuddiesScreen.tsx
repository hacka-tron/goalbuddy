import { useState, useEffect, useMemo, useRef } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  ActivityIndicator, RefreshControl,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useThemeStore } from '../../../store/themeStore';
import { useNotificationStore } from '../../../store/notificationStore';
import { useBuddies } from '../hooks';
import { BuddyCard } from '../components/BuddyCard';
import { BuddyRequestsView } from '../components/BuddyRequestsView';
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
  const [showRequests, setShowRequests] = useState(false);
  const [activeTab, setActiveTab] = useState<TabKey>('my_goals');
  const colors = useThemeStore((s) => s.colors);
  const lastSeenAt = useNotificationStore((s) => s.lastSeenAt);
  const setUnread = useNotificationStore((s) => s.setUnread);
  const loadSeenTimes = useNotificationStore((s) => s.loadSeenTimes);
  const s = useMemo(() => makeStyles(colors), [colors]);

  useEffect(() => { loadSeenTimes(); }, []);

  const { data: connectionsData, isLoading, isError, refetch, isRefetching } = useBuddies();
  const connections = connectionsData ?? [];

  const accepted = useMemo(() => connections.filter((c) => c.status === 'accepted'), [connections]);
  const incomingPending = useMemo(() => connections.filter((c) => c.status === 'pending' && c.is_incoming), [connections]);
  const overdueConns = useMemo(() => accepted.filter((c) => c.overdue_count > 0), [accepted]);

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
  }, [accepted]);

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
    coaching:  { title: 'Not coaching anyone',  body: "Request to buddy up on someone's goal in Find" },
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

      {/* Overdue nudge banners */}
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

const makeStyles = (colors: any) => StyleSheet.create({
  container:       { flex: 1, backgroundColor: colors.background },

  headerRow:       { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingTop: 8, paddingBottom: 12 },
  title:           { fontSize: 26, fontWeight: '700', color: colors.text },
  requestsBadge:   { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: colors.primary, paddingHorizontal: 12, paddingVertical: 7, borderRadius: 20 },
  requestsBadgeText: { color: '#fff', fontSize: 13, fontWeight: '700' },
  requestsCount:   { backgroundColor: 'rgba(255,255,255,0.3)', borderRadius: 10, minWidth: 20, height: 20, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 4 },
  requestsCountText: { color: '#fff', fontSize: 12, fontWeight: '800' },

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

  empty:           { alignItems: 'center', paddingTop: 60, gap: 8 },
  emptyTitle:      { fontSize: 18, fontWeight: '700', color: colors.text },
  emptyText:       { fontSize: 14, color: colors.textSecondary, textAlign: 'center' },

  errorState:      { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12, padding: 32 },
  errorText:       { fontSize: 15, color: colors.textSecondary, textAlign: 'center' },
  retryBtn:        { backgroundColor: colors.primary, paddingHorizontal: 24, paddingVertical: 10, borderRadius: 10 },
  retryBtnText:    { color: '#fff', fontWeight: '700', fontSize: 14 },
});
