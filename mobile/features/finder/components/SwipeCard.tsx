import { View, Text, StyleSheet } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { ActivityBadge } from '../../../shared/components/ActivityBadge';
import { GOAL_CATEGORIES } from '../../../lib/constants';
import { Candidate } from '../types';

export function SwipeCard({ card, colors }: { card: Candidate; colors: any }) {
  const cat = GOAL_CATEGORIES.find((c) => c.key === card.category);
  return (
    <View style={cardStyles.root}>
      {/* Avatar */}
      <View style={[cardStyles.avatar, { backgroundColor: colors.primaryLight }]}>
        <Text style={[cardStyles.avatarText, { color: colors.primary }]}>{card.display_name[0].toUpperCase()}</Text>
      </View>

      {/* Name + username */}
      <Text style={[cardStyles.name, { color: colors.text }]}>{card.display_name}</Text>
      <Text style={[cardStyles.username, { color: colors.textSecondary }]}>@{card.username}</Text>

      {/* Bio */}
      {card.bio ? (
        <Text style={[cardStyles.bio, { color: colors.textSecondary }]} numberOfLines={2}>{card.bio}</Text>
      ) : null}

      {/* Goal tag */}
      {card.goal_title && cat && (
        <View style={[cardStyles.goalPill, { backgroundColor: colors.primaryLight }]}>
          <MaterialCommunityIcons name={cat.icon as any} size={14} color={colors.primary} />
          <Text style={[cardStyles.goalPillText, { color: colors.primary }]}>{card.goal_title}</Text>
        </View>
      )}

      {/* Divider */}
      <View style={[cardStyles.divider, { backgroundColor: colors.border }]} />

      {/* Stats row */}
      <View style={cardStyles.stats}>
        <View style={cardStyles.stat}>
          <Text style={[cardStyles.statVal, { color: colors.text }]}>{card.current_streak}</Text>
          <Text style={[cardStyles.statLbl, { color: colors.textSecondary }]}>day streak</Text>
        </View>
        <View style={[cardStyles.statDivider, { backgroundColor: colors.border }]} />
        <View style={cardStyles.stat}>
          <Text style={[cardStyles.statVal, { color: colors.text }]}>{card.total_checkins}</Text>
          <Text style={[cardStyles.statLbl, { color: colors.textSecondary }]}>check-ins</Text>
        </View>
        <View style={[cardStyles.statDivider, { backgroundColor: colors.border }]} />
        <View style={cardStyles.stat}>
          <Text style={[cardStyles.statVal, { color: colors.text }]}>{card.shared_goal_count}</Text>
          <Text style={[cardStyles.statLbl, { color: colors.textSecondary }]}>in common</Text>
        </View>
      </View>

      <View style={cardStyles.badge}>
        <ActivityBadge level={card.activity_level} small />
      </View>
    </View>
  );
}

const cardStyles = StyleSheet.create({
  root:          { alignItems: 'center', paddingVertical: 8 },
  avatar:        { width: 88, height: 88, borderRadius: 44, justifyContent: 'center', alignItems: 'center', marginBottom: 14 },
  avatarText:    { fontSize: 36, fontWeight: '800', letterSpacing: -1 },
  name:          { fontSize: 24, fontWeight: '800', letterSpacing: -0.5, marginBottom: 2 },
  username:      { fontSize: 13, fontWeight: '500', marginBottom: 10 },
  bio:           { fontSize: 13, textAlign: 'center', lineHeight: 19, marginBottom: 12, paddingHorizontal: 8 },
  goalPill:      { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 14, paddingVertical: 7, borderRadius: 20, marginBottom: 12 },
  goalPillText:  { fontSize: 13, fontWeight: '700' },
  divider:       { width: '100%', height: 1, marginVertical: 14 },
  stats:         { flexDirection: 'row', alignItems: 'center', gap: 0, width: '100%', justifyContent: 'space-around' },
  stat:          { alignItems: 'center', flex: 1 },
  statVal:       { fontSize: 20, fontWeight: '800', letterSpacing: -0.5 },
  statLbl:       { fontSize: 10, fontWeight: '500', marginTop: 2 },
  statDivider:   { width: 1, height: 30 },
  badge:         { marginTop: 14 },
});
