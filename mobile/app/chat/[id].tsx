import { useState, useMemo, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  TextInput, ActivityIndicator, KeyboardAvoidingView, Platform,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useLocalSearchParams, router } from 'expo-router';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiFetch } from '../../lib/api';
import { GOAL_CATEGORIES } from '../../lib/constants';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { ActivityBadge } from '../../components/ui/ActivityBadge';
import { useThemeStore } from '../../store/themeStore';
import { useNotificationStore } from '../../store/notificationStore';

type Connection = {
  id: string;
  goal_title: string;
  goal_category: string;
  goal_id: string;
  buddy_id: string;
  buddy_name: string;
  buddy_avatar: string | null;
  activity_level: string;
  connection_type: string;
};

type CheckIn = {
  id: string;
  author_id: string;
  message: string;
  mood: string;
  display_name: string;
  created_at: string;
  milestone_title: string | null;
  syncStatus?: 'pending' | 'sent' | 'failed';
};

type MCIName = React.ComponentProps<typeof MaterialCommunityIcons>['name'];

// ── Grouping helper ──────────────────────────────────────────────────────────
function isSameGroup(prev: CheckIn, curr: CheckIn): boolean {
  if (prev.author_id !== curr.author_id) return false;
  const diffMs = Math.abs(new Date(prev.created_at).getTime() - new Date(curr.created_at).getTime());
  return diffMs < 2 * 60 * 1000; // within 2 minutes
}

export default function ChatScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { colors } = useThemeStore();
  const { markRead } = useNotificationStore();
  const insets = useSafeAreaInsets();
  const queryClient = useQueryClient();
  const s = useMemo(() => makeStyles(colors), [colors]);
  const [message, setMessage] = useState('');
  const [sendError, setSendError] = useState(false);

  const { data: conn, isLoading: connLoading, isError: connError, refetch: refetchConn } = useQuery<Connection>({
    queryKey: ['connection', id],
    queryFn: () => apiFetch(`/buddies/${id}`),
    enabled: !!id,
  });

  const { data: checkIns = [], refetch } = useQuery<CheckIn[]>({
    queryKey: ['checkins', id],
    queryFn: () => apiFetch(`/checkins/${id}`),
    enabled: !!id,
    refetchInterval: 5000,
  });

  // Mark as read using the server timestamp of the newest message.
  const newestId = checkIns[0]?.id ?? null;
  useEffect(() => {
    if (!id) return;
    markRead(id, checkIns[0]?.created_at);
  }, [id, newestId]);

  const sendMutation = useMutation({
    mutationFn: (msg: string) =>
      apiFetch('/checkins', {
        method: 'POST',
        body: JSON.stringify({ connectionId: id, message: msg, mood: 'good' }),
      }),
    onMutate: async (msg: string) => {
      setSendError(false);
      // Cancel any outgoing refetches so they don't overwrite our optimistic update
      await queryClient.cancelQueries({ queryKey: ['checkins', id] });
      const previous = queryClient.getQueryData<CheckIn[]>(['checkins', id]);
      const tempMessage: CheckIn = {
        id: `temp-${Date.now()}`,
        author_id: conn?.buddy_id ? 'me' : '',
        message: msg,
        mood: 'good',
        display_name: 'You',
        created_at: new Date().toISOString(),
        milestone_title: null,
        syncStatus: 'pending',
      };
      // Prepend to front (list is DESC — newest first)
      queryClient.setQueryData<CheckIn[]>(['checkins', id], (old) => [tempMessage, ...(old ?? [])]);
      return { previous };
    },
    onSuccess: () => {
      setMessage('');
      setSendError(false);
      refetch();
    },
    onError: (_err, _msg, context) => {
      // Restore the previous cache and show inline error
      if (context?.previous) {
        queryClient.setQueryData<CheckIn[]>(['checkins', id], context.previous);
      }
      setSendError(true);
    },
    onSettled: () => {
      refetch();
    },
  });

  const handleSend = useCallback(() => {
    if (!message.trim() || sendMutation.isPending) return;
    const msg = message.trim();
    setMessage('');
    sendMutation.mutate(msg);
  }, [message, sendMutation]);

  const handleRetry = useCallback(() => {
    if (!message.trim()) return;
    setSendError(false);
    sendMutation.mutate(message.trim());
  }, [message, sendMutation]);

  if (connLoading || (!conn && !connError)) {
    return (
      <SafeAreaView style={s.container} edges={['top']}>
        <ActivityIndicator color={colors.primary} style={{ marginTop: 40 }} />
      </SafeAreaView>
    );
  }

  if (connError || !conn) {
    return (
      <SafeAreaView style={s.container} edges={['top']}>
        <View style={s.header}>
          <TouchableOpacity onPress={() => router.back()} style={s.backBtn}>
            <MaterialCommunityIcons name="arrow-left" size={22} color={colors.primary} />
          </TouchableOpacity>
        </View>
        <View style={s.errorState}>
          <MaterialCommunityIcons name="wifi-off" size={40} color={colors.border} />
          <Text style={s.errorText}>Couldn't load this chat. Check your connection.</Text>
          <TouchableOpacity onPress={() => refetchConn()} style={s.retryBtn}>
            <Text style={s.retryText}>Try again</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  const cat = GOAL_CATEGORIES.find((c) => c.key === conn.goal_category);

  const renderItem = useCallback(({ item, index }: { item: CheckIn; index: number }) => {
    const isMe = item.author_id !== conn.buddy_id;
    const isPending = item.syncStatus === 'pending';
    const isFailed = item.syncStatus === 'failed';

    // For grouping: the next item in the array is the chronologically PREVIOUS message
    // (since array is DESC). We hide the sender name if this message and the next
    // (older) message are from the same author within 2 minutes.
    const nextItem = checkIns[index + 1];
    const isFirstInGroup = !nextItem || !isSameGroup(item, nextItem);

    return (
      <View style={[s.bubbleRow, isMe ? s.bubbleRowRight : s.bubbleRowLeft, isPending && { opacity: 0.5 }]}>
        <View style={[s.bubble, isMe ? s.bubbleMe : s.bubbleThem]}>
          {!isMe && isFirstInGroup && <Text style={s.bubbleSender}>{item.display_name}</Text>}
          {item.milestone_title && (
            <View style={s.milestoneTag}>
              <MaterialCommunityIcons
                name="map-marker" size={11}
                color={isMe ? 'rgba(255,255,255,0.8)' : colors.primary}
              />
              <Text style={[s.milestoneTagText, isMe && { color: 'rgba(255,255,255,0.85)' }]}>
                {item.milestone_title}
              </Text>
            </View>
          )}
          <Text style={[s.bubbleText, isMe ? s.bubbleTextMe : s.bubbleTextThem]}>
            {item.message}
          </Text>
          <View style={s.bubbleFooter}>
            <Text style={[s.bubbleTime, isMe ? s.bubbleTimeMe : s.bubbleTimeThem]}>
              {new Date(item.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </Text>
            {isFailed && (
              <TouchableOpacity onPress={handleRetry} style={s.retryInline}>
                <Text style={s.retryInlineText}>Failed · Tap to retry</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
      </View>
    );
  }, [conn.buddy_id, checkIns, colors, s, handleRetry]);

  return (
    <SafeAreaView style={s.container} edges={['top']}>
      <View style={s.header}>
        <TouchableOpacity onPress={() => router.back()} style={s.backBtn}>
          <MaterialCommunityIcons name="arrow-left" size={22} color={colors.primary} />
        </TouchableOpacity>
        <View style={s.headerTitles}>
          <Text style={s.headerName}>{conn.buddy_name}</Text>
          <View style={s.headerGoalRow}>
            {cat && <MaterialCommunityIcons name={cat.icon as MCIName} size={13} color={colors.textSecondary} />}
            <Text style={s.headerGoal} numberOfLines={1}>{conn.goal_title}</Text>
          </View>
        </View>
        <ActivityBadge level={conn.activity_level} small />
      </View>

      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <FlatList
          data={checkIns}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          style={s.feed}
          contentContainerStyle={[s.feedContent, checkIns.length === 0 && s.feedContentEmpty]}
          inverted
          ListEmptyComponent={
            <View style={s.emptyFeed}>
              <Text style={s.emptyFeedText}>No check-ins yet. Say hello!</Text>
            </View>
          }
        />

        <View style={[s.inputArea, { paddingBottom: insets.bottom + 12 }]}>
          {sendError && (
            <View style={s.sendErrorBanner}>
              <MaterialCommunityIcons name="alert-circle-outline" size={15} color="#FF6B6B" />
              <Text style={s.sendErrorText}>Couldn't send. </Text>
              <TouchableOpacity onPress={handleRetry}>
                <Text style={s.sendErrorRetry}>Retry</Text>
              </TouchableOpacity>
            </View>
          )}
          <View style={s.messageRow}>
            <TextInput
              style={s.messageInput}
              value={message}
              onChangeText={(t) => { setMessage(t); setSendError(false); }}
              placeholder="How's your progress?"
              placeholderTextColor={colors.textSecondary}
              multiline
            />
            <TouchableOpacity
              style={[s.sendBtn, (!message.trim() || sendMutation.isPending) && s.sendBtnDisabled]}
              onPress={handleSend}
              disabled={!message.trim() || sendMutation.isPending}
            >
              {sendMutation.isPending
                ? <ActivityIndicator color="#fff" size="small" />
                : <MaterialCommunityIcons name="send" size={18} color="#fff" />}
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const makeStyles = (colors: any) => StyleSheet.create({
  container:     { flex: 1, backgroundColor: colors.background },
  header:        { flexDirection: 'row', alignItems: 'center', padding: 16, gap: 12, backgroundColor: colors.card, borderBottomWidth: 1, borderBottomColor: colors.border },
  backBtn:       { padding: 4 },
  headerTitles:  { flex: 1 },
  headerName:    { fontSize: 16, fontWeight: '700', color: colors.text },
  headerGoalRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 1 },
  headerGoal:    { fontSize: 13, color: colors.textSecondary, flex: 1 },

  feed:          { flex: 1 },
  feedContent:   { paddingVertical: 12, paddingHorizontal: 16, gap: 6 },
  feedContentEmpty: { flex: 1, justifyContent: 'center' },

  bubbleRow:     { flexDirection: 'row', marginVertical: 2 },
  bubbleRowLeft: { justifyContent: 'flex-start' },
  bubbleRowRight:{ justifyContent: 'flex-end' },
  bubble:        { maxWidth: '75%', borderRadius: 18, paddingHorizontal: 14, paddingVertical: 10, gap: 3 },
  bubbleMe:      { backgroundColor: colors.primary, borderTopRightRadius: 4 },
  bubbleThem:    { backgroundColor: colors.card, borderTopLeftRadius: 4, borderWidth: 1, borderColor: colors.border },
  bubbleSender:  { fontSize: 11, fontWeight: '700', color: colors.primary, marginBottom: 1 },
  bubbleText:    { fontSize: 15, lineHeight: 21 },
  bubbleTextMe:  { color: '#fff' },
  bubbleTextThem:{ color: colors.text },
  bubbleFooter:  { flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' },
  bubbleTime:    { fontSize: 11 },
  bubbleTimeMe:  { color: 'rgba(255,255,255,0.65)' },
  bubbleTimeThem:{ color: colors.textSecondary },

  milestoneTag:     { flexDirection: 'row', alignItems: 'center', gap: 3 },
  milestoneTagText: { fontSize: 11, color: colors.primary, fontWeight: '600' },

  retryInline:     { paddingHorizontal: 4 },
  retryInlineText: { fontSize: 11, color: '#FF6B6B', fontWeight: '700' },

  emptyFeed:     { alignItems: 'center', paddingTop: 60 },
  emptyFeedText: { color: colors.textSecondary },

  inputArea:     { backgroundColor: colors.card, borderTopWidth: 1, borderTopColor: colors.border, paddingTop: 12, paddingHorizontal: 12 },
  sendErrorBanner: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingBottom: 8 },
  sendErrorText:   { fontSize: 13, color: '#FF6B6B' },
  sendErrorRetry:  { fontSize: 13, color: colors.primary, fontWeight: '700', textDecorationLine: 'underline' },
  messageRow:    { flexDirection: 'row', gap: 8, alignItems: 'flex-end' },
  messageInput:  { flex: 1, backgroundColor: colors.background, borderWidth: 1, borderColor: colors.border, borderRadius: 22, paddingHorizontal: 14, paddingVertical: 10, fontSize: 15, color: colors.text, maxHeight: 100 },
  sendBtn:       { width: 40, height: 40, borderRadius: 20, backgroundColor: colors.primary, justifyContent: 'center', alignItems: 'center' },
  sendBtnDisabled: { opacity: 0.4 },

  errorState:    { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12, padding: 32 },
  errorText:     { fontSize: 15, color: colors.textSecondary, textAlign: 'center' },
  retryBtn:      { backgroundColor: colors.primary, paddingHorizontal: 24, paddingVertical: 10, borderRadius: 10 },
  retryText:     { color: '#fff', fontWeight: '700', fontSize: 14 },
});
