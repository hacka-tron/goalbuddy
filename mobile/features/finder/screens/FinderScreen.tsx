import { useState, useRef, useMemo } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView,
  ActivityIndicator, PanResponder, Animated, Dimensions,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useThemeStore } from '../../../store/themeStore';
import { GOAL_CATEGORIES } from '../../../lib/constants';
import { ActivityBadge } from '../../../shared/components/ActivityBadge';
import { SwipeCard } from '../components/SwipeCard';
import { useMyGoals, useDeck, useSwipe } from '../hooks';
import { Goal, Candidate } from '../types';

const { width: SW, height: SH } = Dimensions.get('window');
const SWIPE_THRESHOLD = 100;
const CARD_HEIGHT = SH * 0.58;

export default function FinderScreen() {
  const colors = useThemeStore((s) => s.colors);
  const s = useMemo(() => makeStyles(colors), [colors]);
  const [selectedGoal, setSelectedGoal] = useState<Goal | null>(null);
  const [deckIndex, setDeckIndex] = useState(0);
  const [matchedUser, setMatchedUser] = useState<Candidate | null>(null);

  const position = useRef(new Animated.ValueXY()).current;
  const rotate = position.x.interpolate({ inputRange: [-SW / 2, 0, SW / 2], outputRange: ['-12deg', '0deg', '12deg'] });
  const likeOpacity = position.x.interpolate({ inputRange: [0, SWIPE_THRESHOLD], outputRange: [0, 1], extrapolate: 'clamp' });
  const passOpacity = position.x.interpolate({ inputRange: [-SWIPE_THRESHOLD, 0], outputRange: [1, 0], extrapolate: 'clamp' });
  const nextScale = position.x.interpolate({ inputRange: [-SW / 2, 0, SW / 2], outputRange: [1, 0.95, 1], extrapolate: 'clamp' });

  const { data: myGoals = [] } = useMyGoals();
  const { data: deck = [], isLoading, isError: isDeckError, refetch: refetchDeck } = useDeck(selectedGoal?.id ?? null);

  const swipeMutation = useSwipe(
    deck,
    deckIndex,
    (card) => setMatchedUser(card),
    () => setDeckIndex((i) => i + 1),
    () => position.setValue({ x: 0, y: 0 }),
    selectedGoal?.id ?? null
  );

  const swipeCard = (action: 'like' | 'pass') => {
    const card = deck[deckIndex];
    if (!card) return;
    Animated.timing(position, {
      toValue: { x: action === 'like' ? SW * 1.5 : -SW * 1.5, y: 0 },
      duration: 240,
      useNativeDriver: false,
    }).start(() => {
      swipeMutation.mutate({ swipedId: card.id, action, mode: 'specific', goalId: selectedGoal?.id });
    });
  };

  const panResponder = useRef(PanResponder.create({
    onStartShouldSetPanResponder: () => true,
    onPanResponderMove: (_, g) => position.setValue({ x: g.dx, y: g.dy }),
    onPanResponderRelease: (_, g) => {
      if (g.dx > SWIPE_THRESHOLD) swipeCard('like');
      else if (g.dx < -SWIPE_THRESHOLD) swipeCard('pass');
      else Animated.spring(position, { toValue: { x: 0, y: 0 }, useNativeDriver: false }).start();
    },
  })).current;

  const currentCard = deck[deckIndex];
  const nextCard = deck[deckIndex + 1];

  // ── Goal picker ─────────────────────────────────────────────
  if (!selectedGoal) {
    const publicGoals = myGoals.filter((g: any) => g.status === 'active');
    return (
      <SafeAreaView style={s.container}>
        <Text style={s.pickerTitle}>Pick a Goal</Text>
        <Text style={s.pickerSub}>We'll find someone working on the same thing</Text>

        <ScrollView contentContainerStyle={s.goalList} showsVerticalScrollIndicator={false}>
          {publicGoals.map((g: any) => {
            const cat = GOAL_CATEGORIES.find((c) => c.key === g.category);
            const hasBuddy = !!g.connection_id && g.connection_status === 'accepted';
            return (
              <TouchableOpacity
                key={g.id}
                style={[s.goalCard, hasBuddy && s.goalCardLocked]}
                onPress={() => !hasBuddy && setSelectedGoal(g)}
                disabled={hasBuddy}
                activeOpacity={0.8}
              >
                <View style={[s.goalCardIconBox, { backgroundColor: hasBuddy ? colors.border : colors.primaryLight }]}>
                  {cat && (
                    <MaterialCommunityIcons
                      name={cat.icon as any}
                      size={28}
                      color={hasBuddy ? colors.textSecondary : colors.primary}
                    />
                  )}
                </View>
                <View style={s.goalCardBody}>
                  <Text style={[s.goalCardTitle, hasBuddy && { color: colors.textSecondary }]}>{g.title}</Text>
                  <Text style={s.goalCardCat}>{cat?.label}</Text>
                  {hasBuddy && (
                    <View style={s.buddiedPill}>
                      <MaterialCommunityIcons name="check-circle" size={11} color={colors.primary} />
                      <Text style={s.buddiedText}>Has a buddy</Text>
                    </View>
                  )}
                </View>
                {!hasBuddy && (
                  <MaterialCommunityIcons name="chevron-right" size={22} color={colors.primary} />
                )}
              </TouchableOpacity>
            );
          })}
          {publicGoals.length === 0 && (
            <View style={s.emptyPicker}>
              <MaterialCommunityIcons name="plus-circle-outline" size={48} color={colors.border} />
              <Text style={s.emptyPickerText}>Add some goals first</Text>
            </View>
          )}
        </ScrollView>
      </SafeAreaView>
    );
  }

  // ── Swipe deck ──────────────────────────────────────────────
  return (
    <SafeAreaView style={[s.container, { padding: 0 }]}>
      {/* Header */}
      <View style={s.deckHeader}>
        <TouchableOpacity onPress={() => { setSelectedGoal(null); setDeckIndex(0); }} style={s.deckBackBtn}>
          <MaterialCommunityIcons name="arrow-left" size={20} color={colors.text} />
        </TouchableOpacity>
        <View style={s.deckTitleWrap}>
          {selectedGoal && (() => {
            const cat = GOAL_CATEGORIES.find(c => c.key === selectedGoal.category);
            return (
              <>
                {cat && <MaterialCommunityIcons name={cat.icon as any} size={15} color={colors.primary} />}
                <Text style={s.deckTitle} numberOfLines={1}>{selectedGoal.title}</Text>
              </>
            );
          })()}
        </View>
        <View style={{ width: 40 }} />
      </View>

      {isLoading && <ActivityIndicator color={colors.primary} style={{ marginTop: 80 }} />}

      {!isLoading && isDeckError && (
        <View style={s.empty}>
          <MaterialCommunityIcons name="wifi-off" size={52} color={colors.border} />
          <Text style={s.emptyTitle}>Couldn't load buddies</Text>
          <Text style={s.emptyText}>Check your connection and try again</Text>
          <TouchableOpacity style={s.retryBtn} onPress={() => refetchDeck()}>
            <Text style={s.retryText}>Try again</Text>
          </TouchableOpacity>
        </View>
      )}

      {!isLoading && !isDeckError && !currentCard && (
        <View style={s.empty}>
          <MaterialCommunityIcons name="check-all" size={56} color={colors.border} />
          <Text style={s.emptyTitle}>You're all caught up</Text>
          <Text style={s.emptyText}>Check back later for more potential buddies</Text>
        </View>
      )}

      {!isLoading && !isDeckError && currentCard && (
        <View style={s.deckContainer}>
          {/* Card behind */}
          {nextCard && (
            <Animated.View style={[s.card, s.cardBehind, { transform: [{ scale: nextScale }] }]}>
              <SwipeCard card={nextCard} colors={colors} />
            </Animated.View>
          )}

          {/* Front card */}
          <Animated.View
            style={[s.card, { transform: [{ translateX: position.x }, { translateY: position.y }, { rotate }] }]}
            {...panResponder.panHandlers}
          >
            <Animated.View style={[s.stampOverlay, s.stampLike, { opacity: likeOpacity }]}>
              <Text style={[s.stampText, { color: colors.primary }]}>BUDDY UP</Text>
            </Animated.View>
            <Animated.View style={[s.stampOverlay, s.stampPass, { opacity: passOpacity }]}>
              <Text style={[s.stampText, { color: colors.accent }]}>PASS</Text>
            </Animated.View>
            <SwipeCard card={currentCard} colors={colors} />
          </Animated.View>

          {/* Action buttons */}
          <View style={s.actions}>
            <TouchableOpacity style={[s.actionBtn, s.passBtn]} onPress={() => swipeCard('pass')} activeOpacity={0.8}>
              <MaterialCommunityIcons name="close" size={28} color={colors.accent} />
            </TouchableOpacity>
            <TouchableOpacity style={[s.actionBtn, s.likeBtn]} onPress={() => swipeCard('like')} activeOpacity={0.8}>
              <MaterialCommunityIcons name="handshake" size={28} color={colors.primary} />
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* Match overlay */}
      {matchedUser && (
        <View style={s.matchModal}>
          <View style={s.matchCard}>
            <Text style={s.matchEmoji}>🎉</Text>
            <Text style={s.matchTitle}>It's a Match!</Text>
            <Text style={s.matchSub}>You and {matchedUser.display_name} both want to buddy up</Text>
            <TouchableOpacity style={s.matchBtn} onPress={() => setMatchedUser(null)}>
              <Text style={s.matchBtnText}>Keep Swiping</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}
    </SafeAreaView>
  );
}

const makeStyles = (colors: any) => StyleSheet.create({
  container:           { flex: 1, backgroundColor: colors.background, padding: 20 },

  // Goal picker
  pickerTitle:         { fontSize: 26, fontWeight: '800', color: colors.text, marginBottom: 4, letterSpacing: -0.3 },
  pickerSub:           { fontSize: 14, color: colors.textSecondary, marginBottom: 24 },
  goalList:            { gap: 12, paddingBottom: 20 },
  goalCard:            { backgroundColor: colors.card, borderRadius: 18, padding: 16, flexDirection: 'row', alignItems: 'center', gap: 14, borderWidth: 1, borderColor: colors.border },
  goalCardLocked:      { opacity: 0.55 },
  goalCardIconBox:     { width: 54, height: 54, borderRadius: 14, justifyContent: 'center', alignItems: 'center' },
  goalCardBody:        { flex: 1, gap: 3 },
  goalCardTitle:       { fontSize: 15, fontWeight: '700', color: colors.text, lineHeight: 20 },
  goalCardCat:         { fontSize: 12, color: colors.textSecondary, fontWeight: '500' },
  buddiedPill:         { flexDirection: 'row', alignItems: 'center', gap: 3, marginTop: 2 },
  buddiedText:         { fontSize: 11, color: colors.primary, fontWeight: '600' },
  emptyPicker:         { alignItems: 'center', paddingTop: 60, gap: 12 },
  emptyPickerText:     { fontSize: 15, color: colors.textSecondary },

  // Deck
  deckHeader:          { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12, gap: 8 },
  deckBackBtn:         { width: 40, height: 40, borderRadius: 20, backgroundColor: colors.card, justifyContent: 'center', alignItems: 'center' },
  deckTitleWrap:       { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6 },
  deckTitle:           { fontSize: 15, fontWeight: '700', color: colors.text, flexShrink: 1 },
  deckContainer:       { flex: 1, alignItems: 'center', paddingHorizontal: 16 },
  card:                {
    position: 'absolute',
    width: SW - 32,
    height: CARD_HEIGHT,
    backgroundColor: colors.card,
    borderRadius: 28,
    padding: 24,
    shadowColor: '#000',
    shadowOpacity: 0.12,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 8 },
    elevation: 6,
    top: 0,
    justifyContent: 'center',
  },
  cardBehind:          { top: 12, zIndex: 0 },
  stampOverlay:        { position: 'absolute', top: 28, paddingHorizontal: 14, paddingVertical: 6, borderRadius: 8, borderWidth: 3, zIndex: 10, transform: [{ rotate: '-12deg' }] },
  stampLike:           { left: 20, borderColor: 'transparent', backgroundColor: 'transparent' },
  stampPass:           { right: 20, borderColor: 'transparent', backgroundColor: 'transparent' },
  stampText:           { fontSize: 22, fontWeight: '900', letterSpacing: 2 },
  actions:             { position: 'absolute', bottom: 24, flexDirection: 'row', gap: 32 },
  actionBtn:           { width: 68, height: 68, borderRadius: 34, justifyContent: 'center', alignItems: 'center', shadowColor: '#000', shadowOpacity: 0.08, shadowRadius: 12, elevation: 3 },
  passBtn:             { backgroundColor: colors.accentLight, borderWidth: 1.5, borderColor: colors.accent },
  likeBtn:             { backgroundColor: colors.primaryLight, borderWidth: 1.5, borderColor: colors.primary },
  empty:               { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12 },
  emptyTitle:          { fontSize: 20, fontWeight: '800', color: colors.text },
  emptyText:           { fontSize: 14, color: colors.textSecondary },
  retryBtn:            { backgroundColor: colors.primary, paddingHorizontal: 24, paddingVertical: 10, borderRadius: 10, marginTop: 4 },
  retryText:           { color: '#fff', fontWeight: '700', fontSize: 14 },

  // Match modal
  matchModal:          { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.65)', justifyContent: 'center', alignItems: 'center', padding: 32 },
  matchCard:           { backgroundColor: colors.card, borderRadius: 28, padding: 32, alignItems: 'center', width: '100%' },
  matchEmoji:          { fontSize: 56, marginBottom: 12 },
  matchTitle:          { fontSize: 28, fontWeight: '900', color: colors.text, marginBottom: 8, letterSpacing: -0.5 },
  matchSub:            { fontSize: 15, color: colors.textSecondary, textAlign: 'center', marginBottom: 28, lineHeight: 22 },
  matchBtn:            { backgroundColor: colors.primary, paddingHorizontal: 36, paddingVertical: 15, borderRadius: 16, width: '100%', alignItems: 'center' },
  matchBtnText:        { color: '#fff', fontWeight: '800', fontSize: 16 },
});
