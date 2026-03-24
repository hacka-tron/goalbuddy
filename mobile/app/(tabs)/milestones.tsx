import {
  View, Text, StyleSheet, ScrollView,
  ActivityIndicator, RefreshControl,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useQuery } from '@tanstack/react-query';
import { apiFetch } from '../../lib/api';
import { GOAL_CATEGORIES } from '../../lib/constants';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useThemeStore } from '../../store/themeStore';

type WinItem = {
  id: string;
  title: string;
  completed_at: string;
  goal_title: string;
  goal_category: string;
  author_id: string;
  display_name: string;
  avatar_url: string | null;
  is_me: boolean;
};

export default function WinsScreen() {
  const { colors } = useThemeStore();
  const s = makeStyles(colors);

  const { data: feed = [], isLoading, refetch, isRefetching } = useQuery<WinItem[]>({
    queryKey: ['milestones', 'feed'],
    queryFn: () => apiFetch('/milestones/feed'),
  });

  return (
    <SafeAreaView style={s.container}>
      <Text style={s.title}>Wins</Text>

      <ScrollView
        contentContainerStyle={s.content}
        refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={colors.primary} />}
      >
        {isLoading && <ActivityIndicator color={colors.primary} style={{ marginTop: 40 }} />}

        {!isLoading && feed.length === 0 && (
          <View style={s.empty}>
            <MaterialCommunityIcons name="trophy-outline" size={52} color={colors.border} />
            <Text style={s.emptyTitle}>No wins yet</Text>
            <Text style={s.emptyText}>Complete milestones and they'll show up here</Text>
          </View>
        )}

        {feed.map((item) => {
          const cat = GOAL_CATEGORIES.find((c) => c.key === item.goal_category);
          const when = formatWhen(item.completed_at);
          return (
            <View key={item.id} style={s.card}>
              {/* Avatar + name row */}
              <View style={s.cardHeader}>
                <View style={s.avatar}>
                  <Text style={s.avatarText}>{(item.display_name || '?')[0].toUpperCase()}</Text>
                </View>
                <View style={s.headerText}>
                  <Text style={s.name}>
                    {item.is_me ? 'You' : item.display_name}
                    <Text style={s.nameSuffix}> completed a milestone</Text>
                  </Text>
                  <Text style={s.when}>{when}</Text>
                </View>
                <MaterialCommunityIcons name="trophy" size={20} color={colors.primary} />
              </View>

              {/* Milestone title */}
              <Text style={s.milestoneTitle}>{item.title}</Text>

              {/* Goal tag */}
              <View style={s.goalRow}>
                {cat && <MaterialCommunityIcons name={cat.icon as any} size={13} color={colors.textSecondary} />}
                <Text style={s.goalText}>{item.goal_title}</Text>
              </View>
            </View>
          );
        })}
      </ScrollView>
    </SafeAreaView>
  );
}

function formatWhen(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(iso).toLocaleDateString();
}

const makeStyles = (colors: any) => StyleSheet.create({
  container:      { flex: 1, backgroundColor: colors.background },
  title:          { fontSize: 26, fontWeight: '700', color: colors.text, paddingHorizontal: 20, paddingTop: 8, paddingBottom: 12 },
  content:        { padding: 16, gap: 12, paddingBottom: 32 },
  empty:          { alignItems: 'center', paddingTop: 60, gap: 12 },
  emptyTitle:     { fontSize: 18, fontWeight: '700', color: colors.text },
  emptyText:      { fontSize: 14, color: colors.textSecondary, textAlign: 'center' },
  card:           { backgroundColor: colors.card, borderRadius: 16, padding: 16, gap: 10, borderWidth: 1, borderColor: colors.border },
  cardHeader:     { flexDirection: 'row', alignItems: 'center', gap: 10 },
  avatar:         { width: 40, height: 40, borderRadius: 20, backgroundColor: colors.primaryLight, justifyContent: 'center', alignItems: 'center' },
  avatarText:     { fontWeight: '700', color: colors.primary, fontSize: 16 },
  headerText:     { flex: 1 },
  name:           { fontSize: 14, fontWeight: '700', color: colors.text },
  nameSuffix:     { fontWeight: '400', color: colors.textSecondary },
  when:           { fontSize: 12, color: colors.textSecondary, marginTop: 1 },
  milestoneTitle: { fontSize: 16, fontWeight: '700', color: colors.text },
  goalRow:        { flexDirection: 'row', alignItems: 'center', gap: 5 },
  goalText:       { fontSize: 13, color: colors.textSecondary },
});
