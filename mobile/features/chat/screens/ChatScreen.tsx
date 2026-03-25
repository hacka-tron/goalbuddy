import { useState, useMemo, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  ActivityIndicator, KeyboardAvoidingView, Platform,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useLocalSearchParams, router } from 'expo-router';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useThemeStore } from '../../../store/themeStore';
import { useNotificationStore } from '../../../store/notificationStore';
import { GOAL_CATEGORIES } from '../../../lib/constants';
import { ActivityBadge } from '../../../shared/components/ActivityBadge';
import { MessageBubble } from '../components/MessageBubble';
import { ChatInput } from '../components/ChatInput';
import { useConnection, useCheckIns, useSendMessage } from '../hooks';
import { CheckIn } from '../types';

type MCIName = React.ComponentProps<typeof MaterialCommunityIcons>['name'];

function isSameGroup(prev: CheckIn, curr: CheckIn): boolean {
  if (prev.author_id !== curr.author_id) return false;
  const diffMs = Math.abs(new Date(prev.created_at).getTime() - new Date(curr.created_at).getTime());
  return diffMs < 2 * 60 * 1000;
}

export default function ChatScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const colors = useThemeStore((s) => s.colors);
  const markRead = useNotificationStore((s) => s.markRead);
  const insets = useSafeAreaInsets();
  const s = useMemo(() => makeStyles(colors), [colors]);
  const [message, setMessage] = useState('');
  const [sendError, setSendError] = useState(false);

  const { data: conn, isLoading: connLoading, isError: connError, refetch: refetchConn } = useConnection(id ?? '');

  const {
    data,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useCheckIns(id ?? '');

  const checkIns: CheckIn[] = useMemo(
    () => data?.pages.flatMap((p) => p.messages) ?? [],
    [data]
  );

  // Mark as read using the server timestamp of the newest message
  const newestId = checkIns[0]?.id ?? null;
  useEffect(() => {
    if (!id) return;
    markRead(id, checkIns[0]?.created_at);
  }, [id, newestId]);

  const { mutation: sendMutation } = useSendMessage(id ?? '', conn);

  const handleSend = useCallback(() => {
    if (!message.trim() || sendMutation.isPending) return;
    const msg = message.trim();
    setMessage('');
    setSendError(false);
    sendMutation.mutate(msg, {
      onError: () => setSendError(true),
      onSuccess: () => setSendError(false),
    });
  }, [message, sendMutation]);

  const handleRetry = useCallback(() => {
    if (!message.trim()) return;
    setSendError(false);
    sendMutation.mutate(message.trim(), {
      onError: () => setSendError(true),
      onSuccess: () => setSendError(false),
    });
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
    const nextItem = checkIns[index + 1];
    const isFirstInGroup = !nextItem || !isSameGroup(item, nextItem);

    return (
      <MessageBubble
        item={item}
        isMe={isMe}
        isFirstInGroup={isFirstInGroup}
        colors={colors}
        onRetry={handleRetry}
      />
    );
  }, [conn.buddy_id, checkIns, colors, handleRetry]);

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
          onEndReached={() => {
            if (hasNextPage && !isFetchingNextPage) fetchNextPage();
          }}
          onEndReachedThreshold={0.3}
          ListFooterComponent={
            isFetchingNextPage
              ? <ActivityIndicator color={colors.primary} style={{ marginVertical: 12 }} />
              : null
          }
          ListEmptyComponent={
            <View style={s.emptyFeed}>
              <Text style={s.emptyFeedText}>No check-ins yet. Say hello!</Text>
            </View>
          }
        />

        <ChatInput
          message={message}
          onChangeText={(t) => { setMessage(t); setSendError(false); }}
          onSend={handleSend}
          onRetry={handleRetry}
          isSending={sendMutation.isPending}
          sendError={sendError}
          paddingBottom={insets.bottom}
          colors={colors}
        />
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

  emptyFeed:     { alignItems: 'center', paddingTop: 60 },
  emptyFeedText: { color: colors.textSecondary },

  errorState:    { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12, padding: 32 },
  errorText:     { fontSize: 15, color: colors.textSecondary, textAlign: 'center' },
  retryBtn:      { backgroundColor: colors.primary, paddingHorizontal: 24, paddingVertical: 10, borderRadius: 10 },
  retryText:     { color: '#fff', fontWeight: '700', fontSize: 14 },
});
