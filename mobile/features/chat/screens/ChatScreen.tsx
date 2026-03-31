import { useState, useMemo, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity,
  ActivityIndicator, KeyboardAvoidingView, Platform, Modal,
  ScrollView, Pressable,
} from 'react-native';
import { FlashList } from '@shopify/flash-list';
import { FS, FW, LH } from '../../../theme/typography';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useLocalSearchParams, router } from 'expo-router';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useThemeStore } from '../../../store/themeStore';
import { useNotificationStore } from '../../../store/notificationStore';
import { GOAL_CATEGORIES } from '../../../lib/constants';
import { ActivityBadge } from '../../../shared/components/ActivityBadge';
import { MessageBubble } from '../components/MessageBubble';
import { ChatInput } from '../components/ChatInput';
import { useConnection, useCheckIns, useSendMessage, useGoalStats } from '../hooks';
import { CheckIn, DeadlineWarning } from '../types';

type MCIName = React.ComponentProps<typeof MaterialCommunityIcons>['name'];

function isSameGroup(prev: CheckIn, curr: CheckIn): boolean {
  if (prev.author_id !== curr.author_id) return false;
  const diffMs = Math.abs(new Date(prev.created_at).getTime() - new Date(curr.created_at).getTime());
  return diffMs < 2 * 60 * 1000;
}

// ---------------------------------------------------------------------------
// DeadlineWarningCard
// ---------------------------------------------------------------------------
function DeadlineWarningCard({ warning, buddyName, colors }: {
  warning: DeadlineWarning;
  buddyName: string;
  colors: any;
}) {
  const s = useMemo(() => makeWarningCardStyles(colors), [colors]);

  const hoursLabel = useMemo(() => {
    if (warning.hours_remaining < 3) return 'Due tonight';
    return `Due in ${Math.round(warning.hours_remaining)}h`;
  }, [warning.hours_remaining]);

  return (
    <View style={s.card}>
      <View style={s.cardRow}>
        <MaterialCommunityIcons name="clock-alert-outline" size={16} color="#D97706" />
        <Text style={s.title} numberOfLines={1}>⏰ {warning.title}</Text>
      </View>
      <Text style={s.subtitle}>
        {buddyName} · {hoursLabel}
      </Text>
      <View style={s.progressTrack}>
        <View style={[s.progressFill, { width: `${Math.min(warning.percent_elapsed, 100)}%` as any }]} />
      </View>
    </View>
  );
}

const makeWarningCardStyles = (colors: any) => StyleSheet.create({
  card: {
    backgroundColor: '#FEF3C7',
    borderLeftWidth: 3,
    borderLeftColor: '#D97706',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
    marginHorizontal: 16,
    marginBottom: 6,
    gap: 4,
  },
  cardRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  title: { fontSize: FS.secondary, lineHeight: LH.secondary, fontWeight: FW.bold, color: '#92400E', flex: 1 },
  subtitle: { fontSize: FS.caption, lineHeight: LH.caption, color: '#B45309' },
  progressTrack: { height: 4, backgroundColor: '#FDE68A', borderRadius: 2, overflow: 'hidden', marginTop: 4 },
  progressFill: { height: 4, backgroundColor: '#D97706', borderRadius: 2 },
});

// ---------------------------------------------------------------------------
// StatsModal
// ---------------------------------------------------------------------------
function StatsModal({ connectionId, buddyName, visible, onClose, colors }: {
  connectionId: string;
  buddyName: string;
  visible: boolean;
  onClose: () => void;
  colors: any;
}) {
  const { data: stats, isLoading, isError, refetch } = useGoalStats(connectionId, visible);
  const s = useMemo(() => makeStatsModalStyles(colors), [colors]);

  const overallPct = stats ? Math.round(stats.overall_completion_rate * 100) : 0;
  const overallSkipPct = stats ? Math.round(stats.overall_skip_rate * 100) : 0;

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      onRequestClose={onClose}
    >
      <Pressable style={s.overlay} onPress={onClose}>
        <Pressable style={s.sheet} onPress={(e) => e.stopPropagation()}>
          <View style={s.handle} />
          <View style={s.sheetHeader}>
            <Text style={s.sheetTitle}>{buddyName}'s Progress</Text>
            <TouchableOpacity onPress={onClose} style={s.closeBtn} accessibilityLabel="Close stats">
              <MaterialCommunityIcons name="close" size={20} color={colors.textSecondary} />
            </TouchableOpacity>
          </View>

          {isLoading && (
            <ActivityIndicator color={colors.primary} style={{ marginTop: 32, marginBottom: 32 }} />
          )}

          {isError && (
            <View style={s.errorState}>
              <Text style={s.errorText}>Couldn't load stats.</Text>
              <TouchableOpacity onPress={() => refetch()} style={s.retryBtn}>
                <Text style={s.retryText}>Try again</Text>
              </TouchableOpacity>
            </View>
          )}

          {stats && !isLoading && (
            <ScrollView
              style={s.scroll}
              contentContainerStyle={s.scrollContent}
              showsVerticalScrollIndicator={false}
            >
              <View style={s.summaryRow}>
                <View style={s.summaryChip}>
                  <Text style={s.summaryChipValue}>{overallPct}%</Text>
                  <Text style={s.summaryChipLabel}>completion</Text>
                </View>
                <View style={[s.summaryChip, s.summaryChipSkip]}>
                  <Text style={[s.summaryChipValue, s.summaryChipValueSkip]}>{overallSkipPct}%</Text>
                  <Text style={[s.summaryChipLabel, s.summaryChipLabelSkip]}>skipped</Text>
                </View>
              </View>

              {stats.milestone_stats.length === 0 && (
                <View style={s.emptyState}>
                  <Text style={s.emptyText}>No recurring milestones yet.</Text>
                </View>
              )}

              {stats.milestone_stats.map((m) => {
                const pct = Math.round(m.completion_rate * 100);
                const skipPct = Math.round(m.skip_rate * 100);
                return (
                  <View key={m.id} style={s.msRow}>
                    <View style={s.msRowTop}>
                      <Text style={s.msTitle} numberOfLines={1}>{m.title}</Text>
                      <View style={s.streakChip}>
                        <Text style={s.streakText}>🔥 {m.streak}</Text>
                      </View>
                    </View>
                    <View style={s.msStats}>
                      <Text style={s.msStatLabel}>{pct}% done · {skipPct}% skipped</Text>
                    </View>
                    <View style={s.msProgressTrack}>
                      <View style={[s.msProgressFill, { width: `${pct}%` as any }]} />
                    </View>
                  </View>
                );
              })}
            </ScrollView>
          )}
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const makeStatsModalStyles = (colors: any) => StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' },
  sheet: { backgroundColor: colors.card, borderTopLeftRadius: 20, borderTopRightRadius: 20, paddingBottom: 32, maxHeight: '85%' },
  handle: { width: 36, height: 4, borderRadius: 2, backgroundColor: colors.border, alignSelf: 'center', marginTop: 10, marginBottom: 4 },
  sheetHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: colors.border },
  sheetTitle: { fontSize: FS.body, lineHeight: LH.body, fontWeight: FW.bold, color: colors.text },
  closeBtn: { padding: 4 },
  scroll: { flexGrow: 0 },
  scrollContent: { paddingHorizontal: 20, paddingTop: 16, gap: 12 },
  summaryRow: { flexDirection: 'row', gap: 12, marginBottom: 4 },
  summaryChip: { flex: 1, backgroundColor: colors.primaryLight, borderRadius: 12, paddingVertical: 12, alignItems: 'center' },
  summaryChipSkip: { backgroundColor: '#FEF3C7' },
  summaryChipValue: { fontSize: FS.section, lineHeight: LH.section, fontWeight: FW.bold, color: colors.primary },
  summaryChipValueSkip: { color: '#D97706' },
  summaryChipLabel: { fontSize: FS.caption, lineHeight: LH.caption, color: colors.primary, marginTop: 2 },
  summaryChipLabelSkip: { color: '#B45309' },
  emptyState: { alignItems: 'center', paddingVertical: 24 },
  emptyText: { fontSize: FS.secondary, lineHeight: LH.secondary, color: colors.textSecondary },
  msRow: { backgroundColor: colors.background, borderRadius: 12, padding: 14, gap: 6 },
  msRowTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  msTitle: { flex: 1, fontSize: FS.secondary, lineHeight: LH.secondary, fontWeight: FW.semibold, color: colors.text },
  streakChip: { backgroundColor: '#FEF3C7', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8 },
  streakText: { fontSize: FS.caption, lineHeight: LH.caption, fontWeight: FW.bold, color: '#D97706' },
  msStats: {},
  msStatLabel: { fontSize: FS.caption, lineHeight: LH.caption, color: colors.textSecondary },
  msProgressTrack: { height: 6, backgroundColor: colors.border, borderRadius: 3, overflow: 'hidden' },
  msProgressFill: { height: 6, backgroundColor: colors.primary, borderRadius: 3 },
  errorState: { alignItems: 'center', paddingVertical: 32, gap: 12 },
  errorText: { fontSize: FS.secondary, lineHeight: LH.secondary, color: colors.textSecondary },
  retryBtn: { backgroundColor: colors.primary, paddingHorizontal: 20, paddingVertical: 8, borderRadius: 10 },
  retryText: { color: '#fff', fontWeight: FW.bold, fontSize: FS.secondary, lineHeight: LH.secondary },
});

// ---------------------------------------------------------------------------
// ChatScreen
// ---------------------------------------------------------------------------
export default function ChatScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const colors = useThemeStore((s) => s.colors);
  const markRead = useNotificationStore((s) => s.markRead);
  const insets = useSafeAreaInsets();
  const s = useMemo(() => makeStyles(colors), [colors]);
  const [message, setMessage] = useState('');
  const [sendError, setSendError] = useState(false);
  const [statsVisible, setStatsVisible] = useState(false);

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

  const newestId = checkIns[0]?.id ?? null;
  useEffect(() => {
    if (!id || !checkIns[0]?.created_at) return;
    markRead(id, checkIns[0].created_at);
  }, [id, newestId, markRead, checkIns]);

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

  const renderItem = useCallback(({ item, index }: { item: CheckIn; index: number }) => {
    if (!conn) return null;
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
  }, [conn, checkIns, colors, handleRetry]);

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
  const isBuddyView = !conn.is_my_goal;
  const warnings = isBuddyView ? (conn.deadline_warnings ?? []) : [];

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
        {isBuddyView && (
          <TouchableOpacity
            onPress={() => setStatsVisible(true)}
            style={s.statsBtn}
            accessibilityLabel="View goal stats"
          >
            <MaterialCommunityIcons name="chart-bar" size={20} color={colors.primary} />
          </TouchableOpacity>
        )}
      </View>

      {conn.overdue_count > 0 && (
        <View style={s.overdueBanner}>
          <MaterialCommunityIcons name="bell-ring" size={15} color="#FF6B6B" />
          <Text style={s.overdueBannerText}>
            {conn.buddy_name} is behind on {conn.overdue_count} milestone{conn.overdue_count > 1 ? 's' : ''} — send them a nudge!
          </Text>
        </View>
      )}

      {conn.late_today_count > 0 && conn.overdue_count === 0 && (
        <View style={s.lateBanner}>
          <MaterialCommunityIcons name="clock-alert-outline" size={15} color="#F59E0B" />
          <Text style={s.lateBannerText}>
            {conn.buddy_name} hasn't checked in on {conn.late_today_count} daily goal{conn.late_today_count > 1 ? 's' : ''} yet today
          </Text>
        </View>
      )}

      {warnings.length > 0 && (
        <View style={s.warningCardsContainer}>
          {warnings.map((w) => (
            <DeadlineWarningCard
              key={w.milestone_id}
              warning={w}
              buddyName={conn.buddy_name}
              colors={colors}
            />
          ))}
        </View>
      )}

      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <FlashList
          data={checkIns}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          estimatedItemSize={80}
          contentContainerStyle={[s.feedContent, checkIns.length === 0 && s.feedContentEmpty]}
          inverted
          onEndReached={() => {
            if (hasNextPage && !isFetchingNextPage) fetchNextPage();
          }}
          onEndReachedThreshold={0.3}
          ListFooterComponent={() => (
            isFetchingNextPage
              ? <ActivityIndicator color={colors.primary} style={{ marginVertical: 12 }} />
              : null
          )}
          ListEmptyComponent={() => (
            <View style={s.emptyFeed}>
              <Text style={s.emptyFeedText}>No check-ins yet. Say hello!</Text>
            </View>
          )}
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

      {isBuddyView && (
        <StatsModal
          connectionId={id ?? ''}
          buddyName={conn.buddy_name}
          visible={statsVisible}
          onClose={() => setStatsVisible(false)}
          colors={colors}
        />
      )}
    </SafeAreaView>
  );
}

const makeStyles = (colors: any) => StyleSheet.create({
  container:     { flex: 1, backgroundColor: colors.background },
  header:        { flexDirection: 'row', alignItems: 'center', padding: 16, gap: 12, backgroundColor: colors.card, borderBottomWidth: 1, borderBottomColor: colors.border },
  backBtn:       { padding: 4 },
  headerTitles:  { flex: 1 },
  headerName:    { fontSize: FS.body, lineHeight: LH.body, fontWeight: FW.bold, color: colors.text },
  headerGoalRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 1 },
  headerGoal:    { fontSize: FS.secondary, lineHeight: LH.secondary, color: colors.textSecondary, flex: 1 },
  statsBtn:      { padding: 6 },
  overdueBanner: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: '#FF6B6B12', borderBottomWidth: 1, borderBottomColor: '#FF6B6B30', paddingHorizontal: 16, paddingVertical: 10 },
  overdueBannerText: { flex: 1, fontSize: FS.secondary, lineHeight: LH.secondary, color: '#FF6B6B', fontWeight: FW.medium },
  lateBanner: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: '#F59E0B12', borderBottomWidth: 1, borderBottomColor: '#F59E0B30', paddingHorizontal: 16, paddingVertical: 10 },
  lateBannerText: { flex: 1, fontSize: FS.secondary, lineHeight: LH.secondary, color: '#F59E0B', fontWeight: FW.medium },
  warningCardsContainer: { paddingTop: 10, paddingBottom: 4 },
  feedContent:   { paddingVertical: 12, paddingHorizontal: 16, gap: 6 },
  feedContentEmpty: { flex: 1, justifyContent: 'center' },
  emptyFeed:     { alignItems: 'center', paddingTop: 60 },
  emptyFeedText: { color: colors.textSecondary },
  errorState:    { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12, padding: 32 },
  errorText:     { fontSize: FS.body, lineHeight: LH.body, color: colors.textSecondary, textAlign: 'center' },
  retryBtn:      { backgroundColor: colors.primary, paddingHorizontal: 24, paddingVertical: 10, borderRadius: 10 },
  retryText:     { color: '#fff', fontWeight: FW.bold, fontSize: FS.secondary, lineHeight: LH.secondary },
});
