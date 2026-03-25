import { useMemo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useThemeStore } from '../../../store/themeStore';
import { useNotificationStore } from '../../../store/notificationStore';
import { ActivityBadge } from '../../../shared/components/ActivityBadge';
import { GOAL_CATEGORIES } from '../../../lib/constants';
import { BuddyGroup } from '../types';

type MCIName = React.ComponentProps<typeof MaterialCommunityIcons>['name'];

export function BuddyCard({ group }: { group: BuddyGroup }) {
  const colors = useThemeStore((s) => s.colors);
  const unreadIds = useNotificationStore((s) => s.unreadIds);
  const s = useMemo(() => makeStyles(colors), [colors]);

  return (
    <View style={s.buddyCard}>
      <View style={s.buddyCardHeader}>
        <View style={s.avatarCircle}>
          <Text style={s.avatarText}>{group.buddy_name[0]}</Text>
        </View>
        <View style={s.buddyCardInfo}>
          <Text style={s.buddyName}>{group.buddy_name}</Text>
          <ActivityBadge level={group.activity_level} small />
        </View>
        {group.has_overdue && (
          <View style={s.overduePill}>
            <View style={s.overdueDot} />
            <Text style={s.overdueText}>Overdue</Text>
          </View>
        )}
      </View>

      {group.connections.map((conn) => {
        const cat = GOAL_CATEGORIES.find((c) => c.key === conn.goal_category);
        return (
          <TouchableOpacity
            key={conn.id}
            style={s.goalRow}
            onPress={() => router.push(`/chat/${conn.id}` as any)}
            activeOpacity={0.7}
          >
            <View style={s.goalRowLeft}>
              {cat && <MaterialCommunityIcons name={cat.icon as MCIName} size={15} color={colors.textSecondary} />}
              <Text style={s.goalRowTitle} numberOfLines={1}>{conn.goal_title}</Text>
              {conn.connection_type === 'coop' && (
                <View style={[s.coopBadge, { backgroundColor: colors.primaryLight }]}>
                  <Text style={[s.coopBadgeText, { color: colors.primary }]}>CO-OP</Text>
                </View>
              )}
              {conn.overdue_count > 0 && (
                <View style={s.overdueCountPill}>
                  <Text style={s.overdueCountText}>{conn.overdue_count}</Text>
                </View>
              )}
              {unreadIds[conn.id] && <View style={s.unreadDot} />}
            </View>
            <MaterialCommunityIcons name="chevron-right" size={18} color={colors.textSecondary} />
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

const makeStyles = (colors: any) => StyleSheet.create({
  buddyCard: {
    backgroundColor: colors.card, borderRadius: 16, overflow: 'hidden',
    elevation: 1, shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 8,
  },
  buddyCardHeader: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14, borderBottomWidth: 1, borderBottomColor: colors.border },
  buddyCardInfo:   { flex: 1, gap: 4 },
  avatarCircle:    { width: 44, height: 44, borderRadius: 22, backgroundColor: colors.primaryLight, justifyContent: 'center', alignItems: 'center' },
  avatarText:      { fontSize: 18, fontWeight: '700', color: colors.primary },
  buddyName:       { fontSize: 15, fontWeight: '700', color: colors.text },

  overduePill:     { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: '#FF6B6B18', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 },
  overdueDot:      { width: 6, height: 6, borderRadius: 3, backgroundColor: '#FF6B6B' },
  overdueText:     { fontSize: 11, fontWeight: '600', color: '#FF6B6B' },
  overdueCountPill: { minWidth: 18, height: 18, borderRadius: 9, backgroundColor: '#FF6B6B', justifyContent: 'center', alignItems: 'center', paddingHorizontal: 4 },
  overdueCountText: { fontSize: 10, fontWeight: '800', color: '#fff' },

  goalRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 14, paddingVertical: 11, borderTopWidth: 1, borderTopColor: colors.border },
  goalRowLeft:     { flexDirection: 'row', alignItems: 'center', gap: 6, flex: 1 },
  goalRowTitle:    { fontSize: 14, color: colors.text, fontWeight: '500', flex: 1 },
  coopBadge:       { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6 },
  coopBadgeText:   { fontSize: 10, fontWeight: '700', letterSpacing: 0.5 },
  unreadDot:       { width: 8, height: 8, borderRadius: 4, backgroundColor: colors.primary },
});
