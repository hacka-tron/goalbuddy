import { useState, useMemo, useEffect, useCallback, useRef } from 'react';
import * as Haptics from 'expo-haptics';
import {
  View, Text, StyleSheet, TouchableOpacity,
  ActivityIndicator, KeyboardAvoidingView, Platform, Modal,
  ScrollView, Pressable,
} from 'react-native';
import { FlashList, FlashListRef } from '@shopify/flash-list';
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
import { Skeleton } from '../../../components/ui/Skeleton';
import { ScreenState } from '../../../components/ui/ScreenState';

type MCIName = React.ComponentProps<typeof MaterialCommunityIcons>['name'];
type TimestampItem = { type: 'timestamp'; key: string; label: string };
type ChatItem = CheckIn | TimestampItem;

function isSameGroup(a: CheckIn, b: CheckIn): boolean {
  if (a.author_id !== b.author_id) return false;
  return Math.abs(new Date(a.created_at).getTime() - new Date(b.created_at).getTime()) < 2 * 60 * 1000;
}

function formatTimestamp(iso: string): string {
  const date = new Date(iso);
  const now = new Date();
  const diffDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));
  const time = date.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
  if (diffDays === 0) return time;
  if (diffDays === 1) return `Yesterday ${time}`;
  if (diffDays < 7) return `${date.toLocaleDateString([], { weekday: 'short' })} ${time}`;
  return `${date.toLocaleDateString([], { month: 'short', day: 'numeric' })} ${time}`;
}

function TimestampLabel({ label, colors }: { label: string; colors: any }) {
  return (
    <View style={tsLabelStyles.container}>
      <Text style={[tsLabelStyles.text, { color: colors.textSecondary }]}>{label}</Text>
    </View>
  );
}
const tsLabelStyles = StyleSheet.create({
  container: { alignItems: 'center', marginVertical: 8 },
  text: { fontSize: 11, lineHeight: 16 },
});

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
  const flashListRef = useRef<FlashListRef<ChatItem>>(null);
  const isAtBottomRef = useRef(true);
  const prevLengthRef = useRef(0);
  const loadingOlderRef = useRef(false);

  const { data: conn, isLoading: connLoading, isError: connError, refetch: refetchConn } = useConnection(id ?? '');

  const {
    data,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useCheckIns(id ?? '');

  // Server returns DESC (newest first). Reverse to get oldest→newest for display.
  const checkIns: CheckIn[] = useMemo(
    () => [...(data?.pages.flatMap((p) => p.messages) ?? [])].reverse(),
    [data]
  );

  // Inject timestamp separators for gaps > 1 hour
  const chatItems = useMemo<ChatItem[]>(() => {
    if (checkIns.length === 0) return [];
    const result: ChatItem[] = [];
    let prev: CheckIn | null = null;
    for (const msg of checkIns) {
      const gap = prev
        ? new Date(msg.created_at).getTime() - new Date(prev.created_at).getTime()
        : Infinity;
      if (gap > 60 * 60 * 1000) {
        result.push({ type: 'timestamp', key: `ts-${msg.id}`, label: formatTimestamp(msg.created_at) });
      }
      result.push(msg);
      prev = msg;
    }
    return result;
  }, [checkIns]);

  // markRead with newest = last item (reversed array)
  const newestMsg = checkIns[checkIns.length - 1];
  useEffect(() => {
    if (!id || !newestMsg?.created_at) return;
    markRead(id, newestMsg.created_at);
  }, [id, newestMsg?.id, markRead]);

  // Scroll to bottom on initial load and when new messages arrive while at bottom
  useEffect(() => {
    if (checkIns.length === 0) return;
    if (prevLengthRef.current === 0) {
      // First load: jump to bottom
      setTimeout(() => flashListRef.current?.scrollToEnd({ animated: false }), 80);
    } else if (checkIns.length > prevLengthRef.current && isAtBottomRef.current) {
      // New messages from polling while user is at bottom
      flashListRef.current?.scrollToEnd({ animated: true });
    }
    prevLengthRef.current = checkIns.length;
  }, [checkIns.length]);

  const handleScroll = useCallback(({ nativeEvent }: any) => {
    const { contentOffset, contentSize, layoutMeasurement } = nativeEvent;
    const distFromBottom = contentSize.height - layoutMeasurement.height - contentOffset.y;
    isAtBottomRef.current = distFromBottom < 80;

    // Trigger pagination when user scrolls near top (older messages)
    if (contentOffset.y < 100 && hasNextPage && !isFetchingNextPage && !loadingOlderRef.current) {
      loadingOlderRef.current = true;
      fetchNextPage().finally(() => { loadingOlderRef.current = false; });
    }
  }, [hasNextPage, isFetchingNextPage, fetchNextPage]);

  const { mutation: sendMutation } = useSendMessage(id ?? '', conn);

  const handleSend = useCallback(() => {
    if (!message.trim() || sendMutation.isPending) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const msg = message.trim();
    setMessage('');
    setSendError(false);
    sendMutation.mutate(msg, {
      onError: () => setSendError(true),
      onSuccess: () => setSendError(false),
    });
    setTimeout(() => flashListRef.current?.scrollToEnd({ animated: true }), 50);
  }, [message, sendMutation]);

  const handleRetry = useCallback(() => {
    if (!message.trim()) return;
    setSendError(false);
    sendMutation.mutate(message.trim(), {
      onError: () => setSendError(true),
      onSuccess: () => setSendError(false),
    });
  }, [message, sendMutation]);

  const handleStatsPress = useCallback(() => setStatsVisible(true), []);

  const renderItem = useCallback(({ item, index }: { item: ChatItem; index: number }) => {
    if ('type' in item) {
      return <TimestampLabel label={item.label} colors={colors} />;
    }
    if (!conn) return null;
    const isMe = item.author_id !== conn.buddy_id;
    return (
      <MessageBubble
        item={item}
        isMe={isMe}
        isFirstInGroup={false}
        colors={colors}
        onRetry={handleRetry}
      />
    );
  }, [conn, colors, handleRetry]);

  if (connLoading || (!conn && !connError)) {
    return (
      <SafeAreaView style={s.container} edges={['top']}>
        <View style={s.header}>
          <TouchableOpacity onPress={() => router.back()} style={s.backBtn}>
            <MaterialCommunityIcons name="arrow-left" size={22} color={colors.primary} />
          </TouchableOpacity>
          <View style={s.headerCenter}>
            <Skeleton width={36} height={36} borderRadius={18} />
            <View style={s.headerTitles}>
              <Skeleton width={120} height={16} />
              <Skeleton width={160} height={12} style={{ marginTop: 5 }} />
            </View>
          </View>
        </View>
        <View style={{ flex: 1, padding: 20, justifyContent: 'flex-end' }}>
          <Skeleton width="70%" height={40} borderRadius={18} style={{ alignSelf: 'flex-start', marginBottom: 16 }} />
          <Skeleton width="60%" height={40} borderRadius={18} style={{ alignSelf: 'flex-end', marginBottom: 16 }} />
          <Skeleton width="80%" height={40} borderRadius={18} style={{ alignSelf: 'flex-start', marginBottom: 16 }} />
        </View>
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
        <ScreenState
          type="error"
          title="Couldn't load chat"
          message="Check your connection and try again."
          onRetry={refetchConn}
        />
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
          <MaterialCommunityIcons name="arrow-left" size={22} color={colors.text} />
        </TouchableOpacity>
        <View style={s.headerCenter}>
          <View style={[s.avatarCircle, { backgroundColor: colors.primary + '20' }]}>
            <Text style={[s.avatarInitial, { color: colors.primary }]}>
              {conn.buddy_name.charAt(0).toUpperCase()}
            </Text>
          </View>
          <View style={s.headerTitles}>
            <Text style={s.headerName}>{conn.buddy_name}</Text>
            <View style={s.headerGoalRow}>
              {cat && <MaterialCommunityIcons name={cat.icon as MCIName} size={11} color={colors.textSecondary} />}
              <Text style={s.headerGoal} numberOfLines={1}>{conn.goal_title}</Text>
            </View>
          </View>
        </View>
        <View style={s.headerRight}>
          <ActivityBadge level={conn.activity_level} small />
        </View>
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
          ref={flashListRef}
          data={chatItems}
          keyExtractor={(item) => ('type' in item ? item.key : item.id)}
          renderItem={renderItem}
          getItemType={(item) => ('type' in item ? 'timestamp' : 'message')}
          contentContainerStyle={s.feedContent}
          onScroll={handleScroll}
          scrollEventThrottle={100}
          maintainVisibleContentPosition={{ disabled: false }}
          ListHeaderComponent={isFetchingNextPage ? (
            <ActivityIndicator color={colors.primary} style={{ marginVertical: 12 }} />
          ) : null}
          ListEmptyComponent={(
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
          onStatsPress={isBuddyView ? handleStatsPress : undefined}
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
  header:        { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 8, paddingVertical: 10, gap: 8, backgroundColor: colors.card, borderBottomWidth: 1, borderBottomColor: colors.border },
  backBtn:       { padding: 6 },
  headerCenter:  { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 10 },
  avatarCircle:  { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  avatarInitial: { fontSize: FS.body, fontWeight: FW.bold },
  headerTitles:  { flex: 1 },
  headerName:    { fontSize: FS.body, lineHeight: LH.body, fontWeight: FW.bold, color: colors.text },
  headerGoalRow: { flexDirection: 'row', alignItems: 'center', gap: 3, marginTop: 1 },
  headerGoal:    { fontSize: FS.caption, lineHeight: LH.caption, color: colors.textSecondary, flex: 1 },
  headerRight:   { flexDirection: 'row', alignItems: 'center', gap: 4 },
  overdueBanner: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: '#FF6B6B12', borderBottomWidth: 1, borderBottomColor: '#FF6B6B30', paddingHorizontal: 16, paddingVertical: 10 },
  overdueBannerText: { flex: 1, fontSize: FS.secondary, lineHeight: LH.secondary, color: '#FF6B6B', fontWeight: FW.medium },
  lateBanner: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: '#F59E0B12', borderBottomWidth: 1, borderBottomColor: '#F59E0B30', paddingHorizontal: 16, paddingVertical: 10 },
  lateBannerText: { flex: 1, fontSize: FS.secondary, lineHeight: LH.secondary, color: '#F59E0B', fontWeight: FW.medium },
  warningCardsContainer: { paddingTop: 10, paddingBottom: 4 },
  feedContent:   { paddingVertical: 12, paddingHorizontal: 16 },
  emptyFeed:     { alignItems: 'center', paddingTop: 80 },
  emptyFeedText: { color: colors.textSecondary },
  errorState:    { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12, padding: 32 },
  errorText:     { fontSize: FS.body, lineHeight: LH.body, color: colors.textSecondary, textAlign: 'center' },
  retryBtn:      { backgroundColor: colors.primary, paddingHorizontal: 24, paddingVertical: 10, borderRadius: 10 },
  retryText:     { color: '#fff', fontWeight: FW.bold, fontSize: FS.secondary, lineHeight: LH.secondary },
});
