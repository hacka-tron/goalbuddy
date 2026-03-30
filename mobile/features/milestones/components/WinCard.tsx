import { View, Text, StyleSheet } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { GOAL_CATEGORIES } from '../../../lib/constants';
import { WinItem } from '../types';
import { FS, FW, LH } from '../../../theme/typography';

function formatWhen(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(iso).toLocaleDateString();
}

export function WinCard({ item, colors }: { item: WinItem; colors: any }) {
  const cat = GOAL_CATEGORIES.find((c) => c.key === item.goal_category);
  const when = formatWhen(item.completed_at);

  return (
    <View style={[s.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
      {/* Avatar + name row */}
      <View style={s.cardHeader}>
        <View style={[s.avatar, { backgroundColor: colors.primaryLight }]}>
          <Text style={[s.avatarText, { color: colors.primary }]}>{(item.display_name || '?')[0].toUpperCase()}</Text>
        </View>
        <View style={s.headerText}>
          <Text style={[s.name, { color: colors.text }]}>
            {item.is_me ? 'You' : item.display_name}
            <Text style={[s.nameSuffix, { color: colors.textSecondary }]}> completed a milestone</Text>
          </Text>
          <Text style={[s.when, { color: colors.textSecondary }]}>{when}</Text>
        </View>
        <MaterialCommunityIcons name="trophy" size={20} color={colors.primary} />
      </View>

      {/* Milestone title */}
      <Text style={[s.milestoneTitle, { color: colors.text }]}>{item.title}</Text>

      {/* Goal tag */}
      <View style={s.goalRow}>
        {cat && <MaterialCommunityIcons name={cat.icon as any} size={13} color={colors.textSecondary} />}
        <Text style={[s.goalText, { color: colors.textSecondary }]}>{item.goal_title}</Text>
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  card:           { borderRadius: 16, padding: 16, gap: 10, borderWidth: 1 },
  cardHeader:     { flexDirection: 'row', alignItems: 'center', gap: 10 },
  avatar:         { width: 40, height: 40, borderRadius: 20, justifyContent: 'center', alignItems: 'center' },
  avatarText:     { fontWeight: FW.bold, fontSize: FS.body, lineHeight: LH.body },
  headerText:     { flex: 1 },
  name:           { fontSize: FS.secondary, lineHeight: LH.secondary, fontWeight: FW.bold },
  nameSuffix:     { fontWeight: FW.regular },
  when:           { fontSize: FS.caption, lineHeight: LH.caption, marginTop: 1 },
  milestoneTitle: { fontSize: FS.body, lineHeight: LH.body, fontWeight: FW.bold },
  goalRow:        { flexDirection: 'row', alignItems: 'center', gap: 5 },
  goalText:       { fontSize: FS.secondary, lineHeight: LH.secondary },
});
