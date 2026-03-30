import { useMemo } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { FS, FW, LH } from '../../../theme/typography';
import { useThemeStore } from '../../../store/themeStore';
import { ActivityBadge } from '../../../shared/components/ActivityBadge';
import { GOAL_CATEGORIES } from '../../../lib/constants';
import { useBuddies, useRespondToRequest } from '../hooks';

type MCIName = React.ComponentProps<typeof MaterialCommunityIcons>['name'];

export function BuddyRequestsView() {
  const colors = useThemeStore((s) => s.colors);
  const s = useMemo(() => makeStyles(colors), [colors]);
  const respondMutation = useRespondToRequest();
  const { data: connections = [], isLoading } = useBuddies();
  const requests = connections.filter((c) => c.status === 'pending' && c.is_incoming);

  return (
    <SafeAreaView style={s.container} edges={['top']}>
      <View style={s.requestsHeader}>
        <TouchableOpacity onPress={() => router.back()} style={s.backBtn}>
          <MaterialCommunityIcons name="arrow-left" size={22} color={colors.primary} />
        </TouchableOpacity>
        <Text style={s.requestsHeaderTitle}>Buddy Requests</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={s.content}>
        {isLoading && <ActivityIndicator color={colors.primary} style={{ marginTop: 40 }} />}
        {!isLoading && requests.length === 0 && (
          <View style={s.empty}>
            <MaterialCommunityIcons name="account-clock-outline" size={52} color={colors.border} />
            <Text style={s.emptyTitle}>No pending requests</Text>
          </View>
        )}

        {!isLoading && requests.map((req) => {
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
                {req.connection_type === 'coop' && (
                  <View style={[s.coopBadge, { backgroundColor: colors.primaryLight }]}>
                    <MaterialCommunityIcons name="account-multiple" size={11} color={colors.primary} />
                    <Text style={[s.coopBadgeText, { color: colors.primary }]}>Co-op</Text>
                  </View>
                )}
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

const makeStyles = (colors: any) => StyleSheet.create({
  container:       { flex: 1, backgroundColor: colors.background },
  content:         { padding: 16, gap: 16 },

  requestsHeader:  { flexDirection: 'row', alignItems: 'center', padding: 16, gap: 12, backgroundColor: colors.card, borderBottomWidth: 1, borderBottomColor: colors.border },
  requestsHeaderTitle: { flex: 1, fontSize: FS.section, lineHeight: LH.section, fontWeight: FW.bold, color: colors.text, textAlign: 'center' },
  backBtn:         { padding: 4 },
  requestCard:     { backgroundColor: colors.card, borderRadius: 18, padding: 16, gap: 14 },
  requestCardHeader: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  avatarCircleLg:  { width: 54, height: 54, borderRadius: 27, backgroundColor: colors.primaryLight, justifyContent: 'center', alignItems: 'center' },
  avatarTextLg:    { fontSize: FS.title, lineHeight: LH.title, fontWeight: FW.bold, color: colors.primary },
  requestName:     { fontSize: FS.section, lineHeight: LH.section, fontWeight: FW.bold, color: colors.text, marginBottom: 4 },
  statsRow:        { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.background, borderRadius: 12, paddingVertical: 12, paddingHorizontal: 8 },
  statItem:        { flex: 1, alignItems: 'center', gap: 2 },
  statValue:       { fontSize: FS.section, lineHeight: LH.section, fontWeight: FW.semibold, color: colors.text },
  statLabel:       { fontSize: FS.caption, lineHeight: LH.caption, color: colors.textSecondary, fontWeight: FW.medium },
  statDivider:     { width: 1, height: 32, backgroundColor: colors.border },
  requestGoalRow:  { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: colors.background, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 10 },
  requestGoalTitle: { fontSize: FS.secondary, lineHeight: LH.secondary, color: colors.textSecondary, fontWeight: FW.medium, flex: 1 },
  coopBadge:        { flexDirection: 'row', alignItems: 'center', gap: 3, paddingHorizontal: 7, paddingVertical: 3, borderRadius: 10 },
  coopBadgeText:    { fontSize: FS.caption, lineHeight: LH.caption, fontWeight: FW.bold },

  pendingActions:  { flexDirection: 'row', gap: 10, marginTop: 4 },
  declineBtn:      { flex: 1, padding: 10, borderRadius: 10, borderWidth: 1, borderColor: colors.border, alignItems: 'center' },
  declineBtnText:  { color: colors.textSecondary, fontWeight: FW.semibold },
  acceptBtn:       { flex: 1, padding: 10, borderRadius: 10, backgroundColor: colors.primary, alignItems: 'center' },
  acceptBtnText:   { color: '#fff', fontWeight: FW.semibold },

  empty:           { alignItems: 'center', paddingTop: 60, gap: 8 },
  emptyTitle:      { fontSize: FS.section, lineHeight: LH.section, fontWeight: FW.bold, color: colors.text },
});
