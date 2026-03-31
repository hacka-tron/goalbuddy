import { useMemo, useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity,
  ActivityIndicator, RefreshControl,
} from 'react-native';
import { FlashList } from '@shopify/flash-list';
import { FS, FW, LH } from '../../../theme/typography';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useThemeStore } from '../../../store/themeStore';
import { WinCard } from '../components/WinCard';
import { useWinsFeed } from '../hooks';

export default function MilestonesScreen() {
  const colors = useThemeStore((s) => s.colors);
  const s = useMemo(() => makeStyles(colors), [colors]);

  const { data: feed = [], isLoading, isError, refetch } = useWinsFeed();
  const [manualRefreshing, setManualRefreshing] = useState(false);
  
  const handleRefresh = useCallback(async () => {
    setManualRefreshing(true);
    try { await refetch(); } finally { setManualRefreshing(false); }
  }, [refetch]);

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

      <FlashList
        data={feed}
        renderItem={({ item }) => <WinCard item={item} colors={colors} />}
        estimatedItemSize={120}
        contentContainerStyle={{ padding: 16 }}
        refreshControl={<RefreshControl refreshing={manualRefreshing} onRefresh={handleRefresh} tintColor={colors.primary} />}
        ListHeaderComponent={() => (
          isLoading ? <ActivityIndicator color={colors.primary} style={{ marginTop: 40 }} /> : null
        )}
        ListEmptyComponent={() => (
          !isLoading ? (
            <View style={s.empty}>
              <MaterialCommunityIcons name="trophy-outline" size={52} color={colors.border} />
              <Text style={s.emptyTitle}>No wins yet</Text>
              <Text style={s.emptyText}>Complete milestones and they'll show up here</Text>
            </View>
          ) : null
        )}
        ItemSeparatorComponent={() => <View style={{ height: 12 }} />}
      />
    </SafeAreaView>
  );
}

const makeStyles = (colors: any) => StyleSheet.create({
  container:  { flex: 1, backgroundColor: colors.background },
  title:      { fontSize: FS.title, lineHeight: LH.title, fontWeight: FW.bold, color: colors.text, paddingHorizontal: 20, paddingTop: 8, paddingBottom: 12 },
  empty:      { alignItems: 'center', paddingTop: 60, gap: 12 },
  emptyTitle: { fontSize: FS.section, lineHeight: LH.section, fontWeight: FW.bold, color: colors.text },
  emptyText:  { fontSize: FS.secondary, lineHeight: LH.secondary, color: colors.textSecondary, textAlign: 'center' },
  errorState: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12, padding: 32 },
  errorText:  { fontSize: FS.body, lineHeight: LH.body, color: colors.textSecondary, textAlign: 'center' },
  retryBtn:   { backgroundColor: colors.primary, paddingHorizontal: 24, paddingVertical: 10, borderRadius: 10 },
  retryText:  { color: '#fff', fontWeight: FW.bold, fontSize: FS.secondary, lineHeight: LH.secondary },
});
