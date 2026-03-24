import { useState, useRef } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  TextInput, ActivityIndicator, RefreshControl, KeyboardAvoidingView, Platform,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiFetch } from '../../lib/api';
import { GOAL_CATEGORIES, MOODS } from '../../lib/constants';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ActivityBadge } from '../../components/ui/ActivityBadge';
import { useThemeStore } from '../../store/themeStore';

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
  const [selectedConn, setSelectedConn] = useState<Connection | null>(null);
  const { colors } = useThemeStore();
  const s = makeStyles(colors);
  const { data: connections = [], isLoading, refetch, isRefetching } = useQuery<Connection[]>({
    queryKey: ['buddies'],
    queryFn: () => apiFetch('/buddies'),
  });

  const accepted = connections.filter((c) => c.status === 'accepted');
  const pending = connections.filter((c) => c.status === 'pending');
  const buddyGroups = groupByBuddy(accepted);

  if (selectedConn) {
    return <ConnectionHub conn={selectedConn} onBack={() => setSelectedConn(null)} />;
  }

  return (
    <SafeAreaView style={s.container}>
      <Text style={s.title}>Buddies</Text>

      <ScrollView
        contentContainerStyle={s.content}
        refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={colors.primary} />}
      >
        {isLoading && <ActivityIndicator color={colors.primary} style={{ marginTop: 40 }} />}

        {/* Pending Requests */}
        {pending.length > 0 && (
          <View style={s.section}>
            <Text style={s.sectionTitle}>Pending Requests</Text>
            {pending.map((conn) => (
              <PendingCard key={conn.id} conn={conn} />
            ))}
          </View>
        )}

        {/* Buddy groups */}
        {buddyGroups.length > 0 && (
          <View style={s.section}>
            <Text style={s.sectionTitle}>My Buddies</Text>
            {buddyGroups.map((group) => (
              <BuddyCard
                key={group.buddy_id}
                group={group}
                onSelectConn={setSelectedConn}
              />
            ))}
          </View>
        )}

        {!isLoading && accepted.length === 0 && pending.length === 0 && (
          <View style={s.empty}>
            <MaterialCommunityIcons name="account-group-outline" size={52} color={colors.border} />
            <Text style={s.emptyTitle}>No buddies yet</Text>
            <Text style={s.emptyText}>Head to the Finder to swipe for a goal buddy</Text>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

// ─── BuddyCard ────────────────────────────────────────────────────────────────

function BuddyCard({
  group,
  onSelectConn,
}: {
  group: BuddyGroup;
  onSelectConn: (conn: Connection) => void;
}) {
  const { colors } = useThemeStore();
  const s = makeStyles(colors);

  return (
    <View style={s.buddyCard}>
      {/* Buddy header */}
      <View style={s.buddyCardHeader}>
        <View style={s.avatarCircle}>
          <Text style={s.avatarText}>{group.buddy_name[0]}</Text>
        </View>
        <View style={s.buddyCardInfo}>
          <Text style={s.buddyName}>{group.buddy_name}</Text>
          <ActivityBadge level={group.activity_level} small />
        </View>
        {group.has_overdue && (
          <MaterialCommunityIcons name="alert-circle" size={20} color={colors.accent ?? '#FF9500'} />
        )}
      </View>

      {/* Goal rows */}
      {group.connections.map((conn) => {
        const cat = GOAL_CATEGORIES.find((c) => c.key === conn.goal_category);
        return (
          <TouchableOpacity
            key={conn.id}
            style={s.goalRow}
            onPress={() => onSelectConn(conn)}
            activeOpacity={0.7}
          >
            <View style={s.goalRowLeft}>
              {cat && (
                <MaterialCommunityIcons
                  name={cat.icon as MCIName}
                  size={15}
                  color={colors.textSecondary}
                />
              )}
              <Text style={s.goalRowTitle} numberOfLines={1}>{conn.goal_title}</Text>
              {conn.connection_type === 'coop' && (
                <View style={[s.coopBadge, { backgroundColor: colors.primaryLight }]}>
                  <Text style={[s.coopBadgeText, { color: colors.primary }]}>CO-OP</Text>
                </View>
              )}
              {conn.overdue_count > 0 && (
                <MaterialCommunityIcons
                  name="alert-circle-outline"
                  size={15}
                  color={colors.accent ?? '#FF9500'}
                />
              )}
            </View>
            <MaterialCommunityIcons name="chevron-right" size={18} color={colors.textSecondary} />
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

// ─── PendingCard ──────────────────────────────────────────────────────────────

function PendingCard({ conn }: { conn: Connection }) {
  const qc = useQueryClient();
  const { colors } = useThemeStore();
  const s = makeStyles(colors);
  const cat = GOAL_CATEGORIES.find((c) => c.key === conn.goal_category);
  const respondMutation = useMutation({
    mutationFn: (status: string) =>
      apiFetch(`/buddies/${conn.id}`, { method: 'PATCH', body: JSON.stringify({ status }) }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['buddies'] }),
  });

  return (
    <View style={s.pendingCard}>
      <Text style={s.pendingTitle}>{conn.buddy_name} wants to buddy up!</Text>
      <View style={s.pendingGoalRow}>
        {cat && <MaterialCommunityIcons name={cat.icon as MCIName} size={14} color={colors.textSecondary} />}
        <Text style={s.pendingGoal}>{conn.goal_title}</Text>
      </View>
      <View style={s.pendingActions}>
        <TouchableOpacity style={s.declineBtn} onPress={() => respondMutation.mutate('declined')}>
          <Text style={s.declineBtnText}>Decline</Text>
        </TouchableOpacity>
        <TouchableOpacity style={s.acceptBtn} onPress={() => respondMutation.mutate('accepted')}>
          <Text style={s.acceptBtnText}>Accept</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

// ─── ConnectionHub ────────────────────────────────────────────────────────────

function ConnectionHub({ conn, onBack }: { conn: Connection; onBack: () => void }) {
  const qc = useQueryClient();
  const { colors } = useThemeStore();
  const s = makeStyles(colors);
  const [message, setMessage] = useState('');
  const [mood, setMood] = useState<string>('good');
  const scrollRef = useRef<ScrollView>(null);

  const { data: checkIns = [], refetch } = useQuery<CheckIn[]>({
    queryKey: ['checkins', conn.id],
    queryFn: () => apiFetch(`/checkins/${conn.id}`),
    refetchInterval: 5000,
  });

  const sendMutation = useMutation({
    mutationFn: () =>
      apiFetch('/checkins', {
        method: 'POST',
        body: JSON.stringify({ connectionId: conn.id, message, mood }),
      }),
    onSuccess: () => {
      setMessage('');
      refetch();
    },
  });

  const cat = GOAL_CATEGORIES.find((c) => c.key === conn.goal_category);

  return (
    <SafeAreaView style={s.container}>
      <View style={s.hubHeader}>
        <TouchableOpacity onPress={onBack}>
          <MaterialCommunityIcons name="arrow-left" size={22} color={colors.primary} />
        </TouchableOpacity>
        <View style={s.hubTitles}>
          <Text style={s.hubName}>{conn.buddy_name}</Text>
          <View style={s.hubGoalRow}>
            {cat && <MaterialCommunityIcons name={cat.icon as MCIName} size={13} color={colors.textSecondary} />}
            <Text style={s.hubGoal}>{conn.goal_title}</Text>
          </View>
        </View>
        <ActivityBadge level={conn.activity_level} small />
      </View>

      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView
          ref={scrollRef}
          style={s.feed}
          contentContainerStyle={s.feedContent}
          onContentSizeChange={() => scrollRef.current?.scrollToEnd({ animated: true })}
        >
          {checkIns.slice().reverse().map((ci) => (
            <View key={ci.id} style={s.checkIn}>
              <View style={s.checkInHeader}>
                <View style={s.ciAvatar}>
                  <Text style={s.ciAvatarText}>{ci.display_name[0]}</Text>
                </View>
                <View>
                  <Text style={s.ciName}>{ci.display_name}</Text>
                  <Text style={s.ciTime}>{new Date(ci.created_at).toLocaleString()}</Text>
                </View>
                <Text style={s.ciMood}>{MOODS.find((m) => m.key === ci.mood)?.emoji}</Text>
              </View>
              <Text style={s.ciMessage}>{ci.message}</Text>
              {ci.milestone_title && (
                <View style={s.milestoneTag}>
                  <MaterialCommunityIcons name="map-marker" size={12} color={colors.primary} />
                  <Text style={s.milestoneTagText}>{ci.milestone_title}</Text>
                </View>
              )}
            </View>
          ))}
          {checkIns.length === 0 && (
            <View style={s.emptyFeed}>
              <Text style={s.emptyFeedText}>No check-ins yet. Say hello!</Text>
            </View>
          )}
        </ScrollView>

        {/* Mood + Input */}
        <View style={s.inputArea}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={s.moodRow}>
            {MOODS.map((m) => (
              <TouchableOpacity
                key={m.key}
                style={[s.moodBtn, mood === m.key && s.moodBtnActive]}
                onPress={() => setMood(m.key)}
              >
                <Text style={s.moodEmoji}>{m.emoji}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
          <View style={s.messageRow}>
            <TextInput
              style={s.messageInput}
              value={message}
              onChangeText={setMessage}
              placeholder="How's your progress?"
              placeholderTextColor={colors.textSecondary}
              multiline
            />
            <TouchableOpacity
              style={[s.sendBtn, (!message || sendMutation.isPending) && s.sendBtnDisabled]}
              onPress={() => sendMutation.mutate()}
              disabled={!message || sendMutation.isPending}
            >
              {sendMutation.isPending
                ? <ActivityIndicator color="#fff" size="small" />
                : <Text style={s.sendBtnText}>Send</Text>}
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const makeStyles = (colors: any) => StyleSheet.create({
  container:       { flex: 1, backgroundColor: colors.background },
  title:           { fontSize: 26, fontWeight: '700', color: colors.text, paddingHorizontal: 20, paddingTop: 8, paddingBottom: 12 },
  content:         { padding: 16, gap: 16 },
  section:         { gap: 10 },
  sectionTitle:    { fontSize: 14, fontWeight: '700', color: colors.textSecondary, textTransform: 'uppercase', letterSpacing: 0.5 },

  // Buddy card (group)
  buddyCard: {
    backgroundColor: colors.card, borderRadius: 16, overflow: 'hidden',
    elevation: 1,
    shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 8,
  },
  buddyCardHeader: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    padding: 14, borderBottomWidth: 1, borderBottomColor: colors.border,
  },
  buddyCardInfo:   { flex: 1, gap: 4 },
  avatarCircle:    { width: 44, height: 44, borderRadius: 22, backgroundColor: colors.primaryLight, justifyContent: 'center', alignItems: 'center' },
  avatarText:      { fontSize: 18, fontWeight: '700', color: colors.primary },
  buddyName:       { fontSize: 15, fontWeight: '700', color: colors.text },

  // Goal rows inside buddy card
  goalRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 14, paddingVertical: 11,
    borderTopWidth: 1, borderTopColor: colors.border,
  },
  goalRowLeft:     { flexDirection: 'row', alignItems: 'center', gap: 6, flex: 1 },
  goalRowTitle:    { fontSize: 14, color: colors.text, fontWeight: '500', flex: 1 },
  coopBadge:       { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6 },
  coopBadgeText:   { fontSize: 10, fontWeight: '700', letterSpacing: 0.5 },

  // Pending card
  pendingCard:     { backgroundColor: colors.card, borderRadius: 16, padding: 16, gap: 8 },
  pendingTitle:    { fontSize: 15, fontWeight: '700', color: colors.text },
  pendingGoalRow:  { flexDirection: 'row', alignItems: 'center', gap: 5 },
  pendingGoal:     { fontSize: 13, color: colors.textSecondary },
  pendingActions:  { flexDirection: 'row', gap: 10, marginTop: 4 },
  declineBtn:      { flex: 1, padding: 10, borderRadius: 10, borderWidth: 1, borderColor: colors.border, alignItems: 'center' },
  declineBtnText:  { color: colors.textSecondary, fontWeight: '600' },
  acceptBtn:       { flex: 1, padding: 10, borderRadius: 10, backgroundColor: colors.primary, alignItems: 'center' },
  acceptBtnText:   { color: '#fff', fontWeight: '600' },

  // Empty state
  empty:           { alignItems: 'center', paddingTop: 60, gap: 8 },
  emptyTitle:      { fontSize: 18, fontWeight: '700', color: colors.text },
  emptyText:       { fontSize: 14, color: colors.textSecondary, textAlign: 'center' },

  // ConnectionHub
  hubHeader:       { flexDirection: 'row', alignItems: 'center', padding: 16, gap: 12, backgroundColor: colors.card, borderBottomWidth: 1, borderBottomColor: colors.border },
  hubTitles:       { flex: 1 },
  hubName:         { fontSize: 16, fontWeight: '700', color: colors.text },
  hubGoalRow:      { flexDirection: 'row', alignItems: 'center', gap: 4 },
  hubGoal:         { fontSize: 13, color: colors.textSecondary },
  feed:            { flex: 1 },
  feedContent:     { padding: 16, gap: 12 },
  checkIn:         { backgroundColor: colors.card, borderRadius: 14, padding: 14, gap: 8 },
  checkInHeader:   { flexDirection: 'row', alignItems: 'center', gap: 10 },
  ciAvatar:        { width: 36, height: 36, borderRadius: 18, backgroundColor: colors.primaryLight, justifyContent: 'center', alignItems: 'center' },
  ciAvatarText:    { fontWeight: '700', color: colors.primary },
  ciName:          { fontSize: 14, fontWeight: '600', color: colors.text },
  ciTime:          { fontSize: 11, color: colors.textSecondary },
  ciMood:          { fontSize: 20, marginLeft: 'auto' },
  ciMessage:       { fontSize: 14, color: colors.text, lineHeight: 20 },
  milestoneTag:    { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: colors.primaryLight, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 10, alignSelf: 'flex-start' },
  milestoneTagText: { fontSize: 12, color: colors.primary, fontWeight: '600' },
  emptyFeed:       { alignItems: 'center', paddingTop: 40 },
  emptyFeedText:   { color: colors.textSecondary },
  inputArea:       { backgroundColor: colors.card, borderTopWidth: 1, borderTopColor: colors.border, padding: 12, gap: 8 },
  moodRow:         { maxHeight: 44 },
  moodBtn:         { width: 44, height: 44, borderRadius: 22, backgroundColor: colors.background, justifyContent: 'center', alignItems: 'center', marginRight: 8 },
  moodBtnActive:   { backgroundColor: colors.primaryLight, borderWidth: 2, borderColor: colors.primary },
  moodEmoji:       { fontSize: 20 },
  messageRow:      { flexDirection: 'row', gap: 8, alignItems: 'flex-end' },
  messageInput:    { flex: 1, backgroundColor: colors.background, borderWidth: 1, borderColor: colors.border, borderRadius: 12, padding: 10, fontSize: 15, color: colors.text, maxHeight: 100 },
  sendBtn:         { backgroundColor: colors.primary, paddingHorizontal: 18, paddingVertical: 10, borderRadius: 12 },
  sendBtnDisabled: { opacity: 0.5 },
  sendBtnText:     { color: '#fff', fontWeight: '700' },
});
