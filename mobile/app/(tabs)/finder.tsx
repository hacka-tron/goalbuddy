import { useState, useRef } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView,
  ActivityIndicator, PanResponder, Animated, Dimensions, Alert,
} from 'react-native';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiFetch } from '../../lib/api';
import { COLORS, GOAL_CATEGORIES, ACTIVITY_LEVELS } from '../../lib/constants';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ActivityBadge } from '../../components/ui/ActivityBadge';

const SCREEN_WIDTH = Dimensions.get('window').width;
const SWIPE_THRESHOLD = 100;

type Goal = { id: string; title: string; category: string };
type Candidate = {
  id: string;
  display_name: string;
  username: string;
  avatar_url: string | null;
  bio: string | null;
  goal_id?: string;
  goal_title?: string;
  category?: string;
  activity_level: string;
  current_streak: number;
  total_checkins: number;
  shared_goal_count: number;
  shared_categories?: string[];
  their_goal_titles?: string[];
};

export default function FinderScreen() {
  const qc = useQueryClient();
  const [mode, setMode] = useState<'specific' | 'any' | null>(null);
  const [selectedGoal, setSelectedGoal] = useState<Goal | null>(null);
  const [deckIndex, setDeckIndex] = useState(0);
  const [matchedUser, setMatchedUser] = useState<Candidate | null>(null);

  const position = useRef(new Animated.ValueXY()).current;
  const rotate = position.x.interpolate({ inputRange: [-SCREEN_WIDTH / 2, 0, SCREEN_WIDTH / 2], outputRange: ['-10deg', '0deg', '10deg'] });
  const likeOpacity = position.x.interpolate({ inputRange: [0, SWIPE_THRESHOLD], outputRange: [0, 1], extrapolate: 'clamp' });
  const passOpacity = position.x.interpolate({ inputRange: [-SWIPE_THRESHOLD, 0], outputRange: [1, 0], extrapolate: 'clamp' });

  const { data: myGoals = [] } = useQuery<Goal[]>({ queryKey: ['goals'], queryFn: () => apiFetch('/goals') });

  const deckQueryKey = mode === 'specific'
    ? ['deck', 'specific', selectedGoal?.id]
    : ['deck', 'any'];

  const { data: deck = [], isLoading } = useQuery<Candidate[]>({
    queryKey: deckQueryKey,
    queryFn: () => {
      const params = mode === 'specific'
        ? `?mode=specific&goalId=${selectedGoal!.id}`
        : '?mode=any';
      return apiFetch(`/finder/deck${params}`);
    },
    enabled: mode === 'any' || (mode === 'specific' && !!selectedGoal),
  });

  const swipeMutation = useMutation({
    mutationFn: (body: { swipedId: string; action: string; mode: string; goalId?: string }) =>
      apiFetch('/finder/swipe', { method: 'POST', body: JSON.stringify(body) }),
    onSuccess: (data, vars) => {
      if (data.matched && data.connection) {
        const candidate = deck[deckIndex];
        setMatchedUser(candidate);
      }
      setDeckIndex((i) => i + 1);
      position.setValue({ x: 0, y: 0 });
      qc.invalidateQueries({ queryKey: ['buddies'] });
    },
    onError: (e: Error) => Alert.alert('Error', e.message),
  });

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onPanResponderMove: (_, g) => position.setValue({ x: g.dx, y: g.dy }),
      onPanResponderRelease: (_, g) => {
        if (g.dx > SWIPE_THRESHOLD) swipeCard('like');
        else if (g.dx < -SWIPE_THRESHOLD) swipeCard('pass');
        else Animated.spring(position, { toValue: { x: 0, y: 0 }, useNativeDriver: false }).start();
      },
    })
  ).current;

  const swipeCard = (action: 'like' | 'pass') => {
    const card = deck[deckIndex];
    if (!card) return;
    const toX = action === 'like' ? SCREEN_WIDTH * 1.5 : -SCREEN_WIDTH * 1.5;
    Animated.timing(position, { toValue: { x: toX, y: 0 }, duration: 250, useNativeDriver: false }).start(() => {
      swipeMutation.mutate({
        swipedId: card.id,
        action,
        mode: mode!,
        goalId: mode === 'specific' ? selectedGoal?.id : undefined,
      });
    });
  };

  const currentCard = deck[deckIndex];
  const nextCard = deck[deckIndex + 1];

  // ── Mode selection ──
  if (!mode) {
    return (
      <SafeAreaView style={s.container}>
        <Text style={s.title}>Find a Buddy</Text>
        <Text style={s.subtitle}>How do you want to match?</Text>
        <View style={s.modeOptions}>
          <TouchableOpacity style={s.modeCard} onPress={() => setMode('specific')}>
            <Text style={s.modeIcon}>🎯</Text>
            <Text style={s.modeTitle}>Specific Goal</Text>
            <Text style={s.modeDesc}>Find someone focused on the same goal as you</Text>
          </TouchableOpacity>
          <TouchableOpacity style={s.modeCard} onPress={() => setMode('any')}>
            <Text style={s.modeIcon}>✨</Text>
            <Text style={s.modeTitle}>Any Match</Text>
            <Text style={s.modeDesc}>See anyone who shares at least one of your goals</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  // ── Goal selection (specific mode) ──
  if (mode === 'specific' && !selectedGoal) {
    const publicGoals = myGoals.filter((g: any) => g.is_public !== false && g.status === 'active');
    return (
      <SafeAreaView style={s.container}>
        <TouchableOpacity onPress={() => setMode(null)} style={s.backBtn}>
          <Text style={s.backText}>← Back</Text>
        </TouchableOpacity>
        <Text style={s.title}>Pick a Goal</Text>
        <Text style={s.subtitle}>Which goal do you want a buddy for?</Text>
        <ScrollView contentContainerStyle={s.goalList}>
          {publicGoals.map((g: any) => {
            const cat = GOAL_CATEGORIES.find((c) => c.key === g.category);
            const hasBuddy = !!g.connection_id && g.connection_status === 'accepted';
            return (
              <TouchableOpacity
                key={g.id}
                style={[s.goalOption, hasBuddy && s.goalOptionLocked]}
                onPress={() => !hasBuddy && setSelectedGoal(g)}
                disabled={hasBuddy}
              >
                <Text style={s.goalOptionIcon}>{cat?.icon}</Text>
                <View style={{ flex: 1 }}>
                  <Text style={s.goalOptionTitle}>{g.title}</Text>
                  {hasBuddy && <Text style={s.lockedText}>Already has a buddy</Text>}
                </View>
                {hasBuddy ? <Text>🔒</Text> : <Text style={s.arrow}>→</Text>}
              </TouchableOpacity>
            );
          })}
          {publicGoals.length === 0 && (
            <Text style={s.noGoals}>Add some public goals first!</Text>
          )}
        </ScrollView>
      </SafeAreaView>
    );
  }

  // ── Swipe deck ──
  return (
    <SafeAreaView style={s.container}>
      <View style={s.deckHeader}>
        <TouchableOpacity onPress={() => { setMode(null); setSelectedGoal(null); setDeckIndex(0); }}>
          <Text style={s.backText}>← Change</Text>
        </TouchableOpacity>
        <Text style={s.deckTitle}>
          {mode === 'specific' ? `${selectedGoal?.title}` : 'Any Goal Match'}
        </Text>
        <View style={{ width: 60 }} />
      </View>

      {isLoading && <ActivityIndicator color={COLORS.primary} style={{ marginTop: 60 }} />}

      {!isLoading && !currentCard && (
        <View style={s.empty}>
          <Text style={s.emptyIcon}>🎉</Text>
          <Text style={s.emptyTitle}>All caught up!</Text>
          <Text style={s.emptyText}>Check back later for more potential buddies</Text>
        </View>
      )}

      {!isLoading && currentCard && (
        <View style={s.deckContainer}>
          {/* Next card (behind) */}
          {nextCard && (
            <View style={[s.card, s.cardBehind]}>
              <CardContent card={nextCard} mode={mode!} />
            </View>
          )}

          {/* Current card */}
          <Animated.View
            style={[s.card, { transform: [{ translateX: position.x }, { translateY: position.y }, { rotate }] }]}
            {...panResponder.panHandlers}
          >
            {/* Like overlay */}
            <Animated.View style={[s.overlay, s.likeOverlay, { opacity: likeOpacity }]}>
              <Text style={s.overlayText}>BUDDY UP!</Text>
            </Animated.View>
            {/* Pass overlay */}
            <Animated.View style={[s.overlay, s.passOverlay, { opacity: passOpacity }]}>
              <Text style={s.overlayText}>PASS</Text>
            </Animated.View>
            <CardContent card={currentCard} mode={mode!} />
          </Animated.View>

          {/* Action buttons */}
          <View style={s.actions}>
            <TouchableOpacity style={[s.actionBtn, s.passBtn]} onPress={() => swipeCard('pass')}>
              <Text style={s.actionBtnText}>✕</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[s.actionBtn, s.likeBtn]} onPress={() => swipeCard('like')}>
              <Text style={s.actionBtnText}>🤝</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* Match Modal */}
      {matchedUser && (
        <View style={s.matchModal}>
          <Text style={s.matchEmoji}>🎉</Text>
          <Text style={s.matchTitle}>It's a Match!</Text>
          <Text style={s.matchSub}>You and {matchedUser.display_name} want to buddy up!</Text>
          <TouchableOpacity style={s.matchBtn} onPress={() => setMatchedUser(null)}>
            <Text style={s.matchBtnText}>Keep Swiping</Text>
          </TouchableOpacity>
        </View>
      )}
    </SafeAreaView>
  );
}

function CardContent({ card, mode }: { card: Candidate; mode: string }) {
  const cat = GOAL_CATEGORIES.find((c) => c.key === card.category);
  return (
    <View style={s.cardContent}>
      <View style={s.avatarCircle}>
        <Text style={s.avatarText}>{card.display_name[0].toUpperCase()}</Text>
      </View>
      <Text style={s.cardName}>{card.display_name}</Text>
      <Text style={s.cardUsername}>@{card.username}</Text>
      {card.bio && <Text style={s.cardBio}>{card.bio}</Text>}

      {mode === 'specific' && card.goal_title && (
        <View style={s.goalTag}>
          <Text style={s.goalTagText}>{cat?.icon} {card.goal_title}</Text>
        </View>
      )}

      {mode === 'any' && card.shared_categories && (
        <View style={s.sharedCats}>
          {card.shared_categories.slice(0, 3).map((cat) => {
            const catInfo = GOAL_CATEGORIES.find((c) => c.key === cat);
            return (
              <View key={cat} style={s.catTag}>
                <Text style={s.catTagText}>{catInfo?.icon} {catInfo?.label}</Text>
              </View>
            );
          })}
        </View>
      )}

      <View style={s.statsRow}>
        <StatItem icon="🔥" value={card.current_streak} label="streak" />
        <StatItem icon="✅" value={card.total_checkins} label="check-ins" />
        <StatItem icon="⭐" value={card.shared_goal_count} label="in common" />
      </View>

      <ActivityBadge level={card.activity_level} />
    </View>
  );
}

function StatItem({ icon, value, label }: { icon: string; value: number; label: string }) {
  return (
    <View style={s.statItem}>
      <Text style={s.statIcon}>{icon}</Text>
      <Text style={s.statValue}>{value}</Text>
      <Text style={s.statLabel}>{label}</Text>
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background, padding: 20 },
  title: { fontSize: 26, fontWeight: '700', color: COLORS.text, marginTop: 8 },
  subtitle: { fontSize: 15, color: COLORS.textSecondary, marginTop: 4, marginBottom: 24 },
  modeOptions: { gap: 16 },
  modeCard: { backgroundColor: COLORS.card, borderRadius: 20, padding: 24, alignItems: 'center', shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 8, elevation: 2 },
  modeIcon: { fontSize: 40, marginBottom: 10 },
  modeTitle: { fontSize: 18, fontWeight: '700', color: COLORS.text, marginBottom: 6 },
  modeDesc: { fontSize: 14, color: COLORS.textSecondary, textAlign: 'center' },
  backBtn: { marginBottom: 16 },
  backText: { color: COLORS.primary, fontWeight: '600', fontSize: 15 },
  goalList: { gap: 10 },
  goalOption: { backgroundColor: COLORS.card, borderRadius: 14, padding: 16, flexDirection: 'row', alignItems: 'center', gap: 12 },
  goalOptionLocked: { opacity: 0.5 },
  goalOptionIcon: { fontSize: 24 },
  goalOptionTitle: { fontSize: 15, fontWeight: '600', color: COLORS.text },
  lockedText: { fontSize: 12, color: COLORS.textSecondary },
  arrow: { fontSize: 18, color: COLORS.primary },
  noGoals: { textAlign: 'center', color: COLORS.textSecondary, marginTop: 40 },
  deckHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  deckTitle: { fontSize: 15, fontWeight: '600', color: COLORS.text, flex: 1, textAlign: 'center' },
  deckContainer: { flex: 1, alignItems: 'center' },
  card: {
    position: 'absolute',
    width: SCREEN_WIDTH - 40,
    backgroundColor: COLORS.card,
    borderRadius: 24,
    padding: 24,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 16,
    elevation: 4,
    top: 0,
  },
  cardBehind: { top: 10, transform: [{ scale: 0.96 }], zIndex: 0 },
  overlay: { position: 'absolute', top: 24, paddingHorizontal: 16, paddingVertical: 8, borderRadius: 10, borderWidth: 3, zIndex: 10 },
  likeOverlay: { left: 20, borderColor: COLORS.primary, backgroundColor: COLORS.primaryLight },
  passOverlay: { right: 20, borderColor: COLORS.accent, backgroundColor: COLORS.accentLight },
  overlayText: { fontSize: 18, fontWeight: '900', color: COLORS.text },
  cardContent: { alignItems: 'center' },
  avatarCircle: { width: 80, height: 80, borderRadius: 40, backgroundColor: COLORS.primaryLight, justifyContent: 'center', alignItems: 'center', marginBottom: 12 },
  avatarText: { fontSize: 32, fontWeight: '700', color: COLORS.primary },
  cardName: { fontSize: 22, fontWeight: '700', color: COLORS.text },
  cardUsername: { fontSize: 14, color: COLORS.textSecondary, marginBottom: 8 },
  cardBio: { fontSize: 14, color: COLORS.textSecondary, textAlign: 'center', marginBottom: 12 },
  goalTag: { backgroundColor: COLORS.primaryLight, paddingHorizontal: 14, paddingVertical: 6, borderRadius: 20, marginBottom: 12 },
  goalTagText: { color: COLORS.primary, fontWeight: '600' },
  sharedCats: { flexDirection: 'row', gap: 8, marginBottom: 12, flexWrap: 'wrap', justifyContent: 'center' },
  catTag: { backgroundColor: COLORS.primaryLight, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
  catTagText: { color: COLORS.primary, fontSize: 12, fontWeight: '600' },
  statsRow: { flexDirection: 'row', gap: 20, marginBottom: 14 },
  statItem: { alignItems: 'center' },
  statIcon: { fontSize: 18 },
  statValue: { fontSize: 16, fontWeight: '700', color: COLORS.text },
  statLabel: { fontSize: 11, color: COLORS.textSecondary },
  actions: { position: 'absolute', bottom: 20, flexDirection: 'row', gap: 40 },
  actionBtn: { width: 64, height: 64, borderRadius: 32, justifyContent: 'center', alignItems: 'center', shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 8, elevation: 3 },
  passBtn: { backgroundColor: COLORS.accentLight },
  likeBtn: { backgroundColor: COLORS.primaryLight },
  actionBtnText: { fontSize: 24 },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  emptyIcon: { fontSize: 56, marginBottom: 16 },
  emptyTitle: { fontSize: 20, fontWeight: '700', color: COLORS.text },
  emptyText: { fontSize: 14, color: COLORS.textSecondary, marginTop: 4 },
  matchModal: { position: 'absolute', inset: 0, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'center', alignItems: 'center', padding: 40 },
  matchEmoji: { fontSize: 64, marginBottom: 16 },
  matchTitle: { fontSize: 28, fontWeight: '900', color: '#fff', marginBottom: 8 },
  matchSub: { fontSize: 16, color: 'rgba(255,255,255,0.8)', textAlign: 'center', marginBottom: 32 },
  matchBtn: { backgroundColor: COLORS.primary, paddingHorizontal: 32, paddingVertical: 16, borderRadius: 16 },
  matchBtnText: { color: '#fff', fontWeight: '700', fontSize: 16 },
});
