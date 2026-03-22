import { useState, useRef } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  TextInput, ActivityIndicator, RefreshControl, KeyboardAvoidingView, Platform,
} from 'react-native';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiFetch } from '../../lib/api';
import { COLORS, GOAL_CATEGORIES, MOODS } from '../../lib/constants';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ActivityBadge } from '../../components/ui/ActivityBadge';

type Connection = {
  id: string;
  status: string;
  goal_title: string;
  goal_category: string;
  buddy_id: string;
  buddy_name: string;
  buddy_avatar: string | null;
  activity_level: string;
  current_streak: number;
  last_checkin_at: string | null;
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

export default function BuddiesScreen() {
  const [selectedConn, setSelectedConn] = useState<Connection | null>(null);
  const { data: connections = [], isLoading, refetch, isRefetching } = useQuery<Connection[]>({
    queryKey: ['buddies'],
    queryFn: () => apiFetch('/buddies'),
  });

  const accepted = connections.filter((c) => c.status === 'accepted');
  const pending = connections.filter((c) => c.status === 'pending');

  if (selectedConn) {
    return <ConnectionHub conn={selectedConn} onBack={() => setSelectedConn(null)} />;
  }

  return (
    <SafeAreaView style={s.container}>
      <Text style={s.title}>Buddies</Text>

      <ScrollView
        contentContainerStyle={s.content}
        refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={COLORS.primary} />}
      >
        {isLoading && <ActivityIndicator color={COLORS.primary} style={{ marginTop: 40 }} />}

        {pending.length > 0 && (
          <View style={s.section}>
            <Text style={s.sectionTitle}>Pending Requests</Text>
            {pending.map((conn) => (
              <PendingCard key={conn.id} conn={conn} />
            ))}
          </View>
        )}

        {accepted.length > 0 && (
          <View style={s.section}>
            <Text style={s.sectionTitle}>My Buddies</Text>
            {accepted.map((conn) => {
              const cat = GOAL_CATEGORIES.find((c) => c.key === conn.goal_category);
              return (
                <TouchableOpacity key={conn.id} style={s.card} onPress={() => setSelectedConn(conn)}>
                  <View style={s.avatarCircle}>
                    <Text style={s.avatarText}>{conn.buddy_name[0]}</Text>
                  </View>
                  <View style={s.cardInfo}>
                    <Text style={s.buddyName}>{conn.buddy_name}</Text>
                    <Text style={s.goalLabel}>{cat?.icon} {conn.goal_title}</Text>
                    <ActivityBadge level={conn.activity_level} small />
                  </View>
                  <Text style={s.arrow}>→</Text>
                </TouchableOpacity>
              );
            })}
          </View>
        )}

        {!isLoading && accepted.length === 0 && pending.length === 0 && (
          <View style={s.empty}>
            <Text style={s.emptyIcon}>🤝</Text>
            <Text style={s.emptyTitle}>No buddies yet</Text>
            <Text style={s.emptyText}>Head to the Finder to swipe for a goal buddy</Text>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

function PendingCard({ conn }: { conn: Connection }) {
  const qc = useQueryClient();
  const cat = GOAL_CATEGORIES.find((c) => c.key === conn.goal_category);
  const respondMutation = useMutation({
    mutationFn: (status: string) =>
      apiFetch(`/buddies/${conn.id}`, { method: 'PATCH', body: JSON.stringify({ status }) }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['buddies'] }),
  });

  return (
    <View style={s.pendingCard}>
      <Text style={s.pendingTitle}>{conn.buddy_name} wants to buddy up!</Text>
      <Text style={s.pendingGoal}>{cat?.icon} {conn.goal_title}</Text>
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

function ConnectionHub({ conn, onBack }: { conn: Connection; onBack: () => void }) {
  const qc = useQueryClient();
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
          <Text style={s.backText}>← Back</Text>
        </TouchableOpacity>
        <View style={s.hubTitles}>
          <Text style={s.hubName}>{conn.buddy_name}</Text>
          <Text style={s.hubGoal}>{cat?.icon} {conn.goal_title}</Text>
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
                  <Text style={s.milestoneTagText}>📍 {ci.milestone_title}</Text>
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
              placeholderTextColor={COLORS.textSecondary}
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

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  title: { fontSize: 26, fontWeight: '700', color: COLORS.text, paddingHorizontal: 20, paddingTop: 8, paddingBottom: 12 },
  content: { padding: 16, gap: 16 },
  section: { gap: 10 },
  sectionTitle: { fontSize: 14, fontWeight: '700', color: COLORS.textSecondary, textTransform: 'uppercase', letterSpacing: 0.5 },
  card: { backgroundColor: COLORS.card, borderRadius: 16, padding: 16, flexDirection: 'row', alignItems: 'center', gap: 12, elevation: 1 },
  avatarCircle: { width: 48, height: 48, borderRadius: 24, backgroundColor: COLORS.primaryLight, justifyContent: 'center', alignItems: 'center' },
  avatarText: { fontSize: 20, fontWeight: '700', color: COLORS.primary },
  cardInfo: { flex: 1, gap: 4 },
  buddyName: { fontSize: 16, fontWeight: '700', color: COLORS.text },
  goalLabel: { fontSize: 13, color: COLORS.textSecondary },
  arrow: { fontSize: 18, color: COLORS.textSecondary },
  empty: { alignItems: 'center', paddingTop: 60 },
  emptyIcon: { fontSize: 48, marginBottom: 12 },
  emptyTitle: { fontSize: 18, fontWeight: '700', color: COLORS.text },
  emptyText: { fontSize: 14, color: COLORS.textSecondary, marginTop: 4, textAlign: 'center' },
  pendingCard: { backgroundColor: COLORS.card, borderRadius: 16, padding: 16, gap: 8 },
  pendingTitle: { fontSize: 15, fontWeight: '700', color: COLORS.text },
  pendingGoal: { fontSize: 13, color: COLORS.textSecondary },
  pendingActions: { flexDirection: 'row', gap: 10, marginTop: 4 },
  declineBtn: { flex: 1, padding: 10, borderRadius: 10, borderWidth: 1, borderColor: COLORS.border, alignItems: 'center' },
  declineBtnText: { color: COLORS.textSecondary, fontWeight: '600' },
  acceptBtn: { flex: 1, padding: 10, borderRadius: 10, backgroundColor: COLORS.primary, alignItems: 'center' },
  acceptBtnText: { color: '#fff', fontWeight: '600' },
  hubHeader: { flexDirection: 'row', alignItems: 'center', padding: 16, gap: 12, backgroundColor: COLORS.card, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  backText: { color: COLORS.primary, fontWeight: '600', fontSize: 15 },
  hubTitles: { flex: 1 },
  hubName: { fontSize: 16, fontWeight: '700', color: COLORS.text },
  hubGoal: { fontSize: 13, color: COLORS.textSecondary },
  feed: { flex: 1 },
  feedContent: { padding: 16, gap: 12 },
  checkIn: { backgroundColor: COLORS.card, borderRadius: 14, padding: 14, gap: 8 },
  checkInHeader: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  ciAvatar: { width: 36, height: 36, borderRadius: 18, backgroundColor: COLORS.primaryLight, justifyContent: 'center', alignItems: 'center' },
  ciAvatarText: { fontWeight: '700', color: COLORS.primary },
  ciName: { fontSize: 14, fontWeight: '600', color: COLORS.text },
  ciTime: { fontSize: 11, color: COLORS.textSecondary },
  ciMood: { fontSize: 20, marginLeft: 'auto' },
  ciMessage: { fontSize: 14, color: COLORS.text, lineHeight: 20 },
  milestoneTag: { backgroundColor: COLORS.primaryLight, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 10, alignSelf: 'flex-start' },
  milestoneTagText: { fontSize: 12, color: COLORS.primary, fontWeight: '600' },
  emptyFeed: { alignItems: 'center', paddingTop: 40 },
  emptyFeedText: { color: COLORS.textSecondary },
  inputArea: { backgroundColor: COLORS.card, borderTopWidth: 1, borderTopColor: COLORS.border, padding: 12, gap: 8 },
  moodRow: { maxHeight: 44 },
  moodBtn: { width: 44, height: 44, borderRadius: 22, backgroundColor: COLORS.background, justifyContent: 'center', alignItems: 'center', marginRight: 8 },
  moodBtnActive: { backgroundColor: COLORS.primaryLight, borderWidth: 2, borderColor: COLORS.primary },
  moodEmoji: { fontSize: 20 },
  messageRow: { flexDirection: 'row', gap: 8, alignItems: 'flex-end' },
  messageInput: { flex: 1, backgroundColor: COLORS.background, borderWidth: 1, borderColor: COLORS.border, borderRadius: 12, padding: 10, fontSize: 15, color: COLORS.text, maxHeight: 100 },
  sendBtn: { backgroundColor: COLORS.primary, paddingHorizontal: 18, paddingVertical: 10, borderRadius: 12 },
  sendBtnDisabled: { opacity: 0.5 },
  sendBtnText: { color: '#fff', fontWeight: '700' },
});
