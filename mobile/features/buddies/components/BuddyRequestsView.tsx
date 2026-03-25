import { useMemo } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useThemeStore } from '../../../store/themeStore';
import { ActivityBadge } from '../../../shared/components/ActivityBadge';
import { GOAL_CATEGORIES } from '../../../lib/constants';
import { useRespondToRequest } from '../hooks';
import { Connection } from '../types';

type MCIName = React.ComponentProps<typeof MaterialCommunityIcons>['name'];

export function BuddyRequestsView({
  requests,
  onBack,
}: {
  requests: Connection[];
  onBack: () => void;
}) {
  const colors = useThemeStore((s) => s.colors);
  const s = useMemo(() => makeStyles(colors), [colors]);
  const respondMutation = useRespondToRequest();

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

const makeStyles = (colors: any) => StyleSheet.create({
  container:       { flex: 1, backgroundColor: colors.background },
  content:         { padding: 16, gap: 16 },

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

  pendingActions:  { flexDirection: 'row', gap: 10, marginTop: 4 },
  declineBtn:      { flex: 1, padding: 10, borderRadius: 10, borderWidth: 1, borderColor: colors.border, alignItems: 'center' },
  declineBtnText:  { color: colors.textSecondary, fontWeight: '600' },
  acceptBtn:       { flex: 1, padding: 10, borderRadius: 10, backgroundColor: colors.primary, alignItems: 'center' },
  acceptBtnText:   { color: '#fff', fontWeight: '600' },

  empty:           { alignItems: 'center', paddingTop: 60, gap: 8 },
  emptyTitle:      { fontSize: 18, fontWeight: '700', color: colors.text },
});
