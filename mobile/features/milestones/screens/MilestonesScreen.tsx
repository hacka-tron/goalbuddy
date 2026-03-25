import { useMemo } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  ActivityIndicator, RefreshControl,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useThemeStore } from '../../../store/themeStore';
import { WinCard } from '../components/WinCard';
import { useWinsFeed } from '../hooks';

export default function MilestonesScreen() {
  const colors = useThemeStore((s) => s.colors);
  const s = useMemo(() => makeStyles(colors), [colors]);

  const { data: feed = [], isLoading, isError, refetch, isRefetching } = useWinsFeed();

  if (isError) return (
    <SafeAreaView style={s.container}>
      <Text style={s.title}>Wins</Text>
      <View style={s.errorState}>
        <MaterialCommunityIcons name="wifi-off" size={40} color={colors.border} />
        <Text style={s.errorText}>Couldn't load wins. Check your connection.</Text>
        <TouchableOpacity onPress={() => refetch()} style={s.retryBtn}>
          <Text style={s.retryText}>Try again</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );

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

        {feed.map((item) => (
          <WinCard key={item.id} item={item} colors={colors} />
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}

const makeStyles = (colors: any) => StyleSheet.create({
  container:  { flex: 1, backgroundColor: colors.background },
  title:      { fontSize: 26, fontWeight: '700', color: colors.text, paddingHorizontal: 20, paddingTop: 8, paddingBottom: 12 },
  content:    { padding: 16, gap: 12, paddingBottom: 32 },
  empty:      { alignItems: 'center', paddingTop: 60, gap: 12 },
  emptyTitle: { fontSize: 18, fontWeight: '700', color: colors.text },
  emptyText:  { fontSize: 14, color: colors.textSecondary, textAlign: 'center' },
  errorState: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12, padding: 32 },
  errorText:  { fontSize: 15, color: colors.textSecondary, textAlign: 'center' },
  retryBtn:   { backgroundColor: colors.primary, paddingHorizontal: 24, paddingVertical: 10, borderRadius: 10 },
  retryText:  { color: '#fff', fontWeight: '700', fontSize: 14 },
});
