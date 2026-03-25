import { useMemo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { GOAL_CATEGORIES } from '../../../lib/constants';
import { ActivityBadge } from '../../../shared/components/ActivityBadge';
import { Goal } from '../types';

type MCIName = React.ComponentProps<typeof MaterialCommunityIcons>['name'];

interface Props {
  goal: Goal;
  onPress: () => void;
  onTogglePublic: () => void;
  colors: any;
}

export function GoalCard({ goal, onPress, onTogglePublic, colors }: Props) {
  const s = useMemo(() => makeStyles(colors), [colors]);
  const cat = GOAL_CATEGORIES.find((c) => c.key === goal.category);

  return (
    <TouchableOpacity style={[s.goalCard, { backgroundColor: colors.card }]} onPress={onPress} activeOpacity={0.8}>
      <View style={s.goalCardTop}>
        <View style={[s.catBadge, { backgroundColor: colors.primaryLight }]}>
          <MaterialCommunityIcons name={cat?.icon as MCIName} size={13} color={colors.primary} />
          <Text style={[s.catLabel, { color: colors.primary }]}>{cat?.label}</Text>
        </View>
        <View style={s.goalCardRight}>
          <TouchableOpacity
            onPress={(e) => { e.stopPropagation(); onTogglePublic(); }}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <MaterialCommunityIcons
              name={goal.is_public ? 'eye-outline' : 'eye-off-outline'}
              size={17}
              color={goal.is_public ? colors.primary : colors.border}
            />
          </TouchableOpacity>
          <MaterialCommunityIcons name="chevron-right" size={18} color={colors.textSecondary} />
        </View>
      </View>

      <Text style={[s.goalCardTitle, { color: colors.text }]}>{goal.title}</Text>
      {goal.description ? <Text style={[s.goalCardDesc, { color: colors.textSecondary }]}>{goal.description}</Text> : null}

      <View style={s.buddyRow}>
        {goal.connection_status === 'accepted' ? (
          <View style={[s.buddyStatusPill, { backgroundColor: colors.primaryLight }]}>
            <MaterialCommunityIcons name="account-check" size={13} color={colors.primary} />
            <Text style={[s.buddyStatusText, { color: colors.primary }]}>{goal.buddy_name}</Text>
            {goal.buddy_activity_level && <ActivityBadge level={goal.buddy_activity_level} small />}
          </View>
        ) : goal.has_pending_request ? (
          <View style={[s.buddyStatusPill, { backgroundColor: colors.accentLight }]}>
            <MaterialCommunityIcons name="account-clock-outline" size={13} color={colors.accent} />
            <Text style={[s.buddyStatusText, { color: colors.accent }]}>Request pending</Text>
          </View>
        ) : (
          <View style={[s.buddyStatusPill, { backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border }]}>
            <MaterialCommunityIcons name="account-plus-outline" size={13} color={colors.textSecondary} />
            <Text style={[s.buddyStatusText, { color: colors.textSecondary }]}>No buddy yet</Text>
          </View>
        )}
      </View>
    </TouchableOpacity>
  );
}

const makeStyles = (colors: any) => StyleSheet.create({
  goalCard:         { borderRadius: 16, padding: 16, gap: 6 },
  goalCardTop:      { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  goalCardRight:    { flexDirection: 'row', alignItems: 'center', gap: 10 },
  goalCardTitle:    { fontSize: 16, fontWeight: '700' },
  goalCardDesc:     { fontSize: 13 },
  buddyRow:         { flexDirection: 'row', alignItems: 'center', marginTop: 4 },
  buddyStatusPill:  { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20 },
  buddyStatusText:  { fontSize: 12, fontWeight: '600' },
  catBadge:         { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
  catLabel:         { fontSize: 12, fontWeight: '600' },
});
