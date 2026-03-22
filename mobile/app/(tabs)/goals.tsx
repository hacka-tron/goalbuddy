import { useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  Modal, TextInput, Alert, ActivityIndicator, RefreshControl,
} from 'react-native';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiFetch } from '../../lib/api';
import { COLORS, GOAL_CATEGORIES } from '../../lib/constants';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ActivityBadge } from '../../components/ui/ActivityBadge';

type Goal = {
  id: string;
  title: string;
  category: string;
  description: string | null;
  target_date: string | null;
  status: string;
  connection_id: string | null;
  connection_status: string | null;
  buddy_name: string | null;
  buddy_avatar: string | null;
  buddy_activity_level: string | null;
};

export default function GoalsScreen() {
  const qc = useQueryClient();
  const [showAdd, setShowAdd] = useState(false);
  const [filterCat, setFilterCat] = useState<string>('all');
  const [newTitle, setNewTitle] = useState('');
  const [newCategory, setNewCategory] = useState('');
  const [newDescription, setNewDescription] = useState('');

  const { data: goals = [], isLoading, refetch, isRefetching } = useQuery<Goal[]>({
    queryKey: ['goals'],
    queryFn: () => apiFetch('/goals'),
  });

  const addMutation = useMutation({
    mutationFn: () =>
      apiFetch('/goals', {
        method: 'POST',
        body: JSON.stringify({ title: newTitle, category: newCategory, description: newDescription }),
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['goals'] });
      setShowAdd(false);
      setNewTitle('');
      setNewCategory('');
      setNewDescription('');
    },
    onError: (e: Error) => Alert.alert('Error', e.message),
  });

  const filtered = filterCat === 'all' ? goals : goals.filter((g) => g.category === filterCat);

  return (
    <SafeAreaView style={s.container}>
      {/* Header */}
      <View style={s.header}>
        <Text style={s.title}>My Goals</Text>
        <TouchableOpacity style={s.addBtn} onPress={() => setShowAdd(true)}>
          <Text style={s.addBtnText}>+ Add</Text>
        </TouchableOpacity>
      </View>

      {/* Category Filter */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={s.filterRow} contentContainerStyle={s.filterContent}>
        {[{ key: 'all', label: 'All', icon: '✦' }, ...GOAL_CATEGORIES].map((cat) => (
          <TouchableOpacity
            key={cat.key}
            style={[s.chip, filterCat === cat.key && s.chipActive]}
            onPress={() => setFilterCat(cat.key)}
          >
            <Text style={[s.chipText, filterCat === cat.key && s.chipTextActive]}>
              {cat.icon} {cat.label}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Goals List */}
      <ScrollView
        style={s.list}
        contentContainerStyle={s.listContent}
        refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={COLORS.primary} />}
      >
        {isLoading && <ActivityIndicator color={COLORS.primary} style={{ marginTop: 40 }} />}

        {!isLoading && filtered.length === 0 && (
          <View style={s.empty}>
            <Text style={s.emptyIcon}>🎯</Text>
            <Text style={s.emptyTitle}>No goals yet</Text>
            <Text style={s.emptyText}>Add your first goal to get started</Text>
          </View>
        )}

        {filtered.map((goal) => {
          const cat = GOAL_CATEGORIES.find((c) => c.key === goal.category);
          return (
            <View key={goal.id} style={s.card}>
              <View style={s.cardTop}>
                <View style={s.catBadge}>
                  <Text style={s.catIcon}>{cat?.icon}</Text>
                  <Text style={s.catLabel}>{cat?.label}</Text>
                </View>
                <View style={[s.statusDot, goal.status === 'active' ? s.dotActive : s.dotPaused]} />
              </View>
              <Text style={s.goalTitle}>{goal.title}</Text>
              {goal.description && <Text style={s.goalDesc}>{goal.description}</Text>}
              {goal.target_date && (
                <Text style={s.goalDate}>
                  Target: {new Date(goal.target_date).toLocaleDateString()}
                </Text>
              )}

              {goal.buddy_name ? (
                <View style={s.buddyRow}>
                  <Text style={s.buddyLabel}>Buddy: </Text>
                  <Text style={s.buddyName}>{goal.buddy_name}</Text>
                  {goal.buddy_activity_level && (
                    <ActivityBadge level={goal.buddy_activity_level} small />
                  )}
                </View>
              ) : (
                <Text style={s.noBuddy}>No buddy yet — find one in the Finder</Text>
              )}
            </View>
          );
        })}
      </ScrollView>

      {/* Add Goal Modal */}
      <Modal visible={showAdd} animationType="slide" transparent>
        <View style={s.modalOverlay}>
          <View style={s.modal}>
            <Text style={s.modalTitle}>New Goal</Text>

            <Text style={s.inputLabel}>Title</Text>
            <TextInput
              style={s.input}
              value={newTitle}
              onChangeText={setNewTitle}
              placeholder="e.g. Run 5K three times a week"
              placeholderTextColor={COLORS.textSecondary}
            />

            <Text style={s.inputLabel}>Category</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 12 }}>
              {GOAL_CATEGORIES.map((cat) => (
                <TouchableOpacity
                  key={cat.key}
                  style={[s.catChip, newCategory === cat.key && s.catChipActive]}
                  onPress={() => setNewCategory(cat.key)}
                >
                  <Text style={s.catChipText}>{cat.icon} {cat.label}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            <Text style={s.inputLabel}>Description (optional)</Text>
            <TextInput
              style={[s.input, { height: 80, textAlignVertical: 'top' }]}
              value={newDescription}
              onChangeText={setNewDescription}
              placeholder="Add some details..."
              placeholderTextColor={COLORS.textSecondary}
              multiline
            />

            <View style={s.modalActions}>
              <TouchableOpacity style={s.cancelBtn} onPress={() => setShowAdd(false)}>
                <Text style={s.cancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[s.saveBtn, (!newTitle || !newCategory) && s.saveBtnDisabled]}
                onPress={() => addMutation.mutate()}
                disabled={!newTitle || !newCategory || addMutation.isPending}
              >
                {addMutation.isPending
                  ? <ActivityIndicator color="#fff" size="small" />
                  : <Text style={s.saveText}>Save Goal</Text>}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingTop: 8, paddingBottom: 12 },
  title: { fontSize: 26, fontWeight: '700', color: COLORS.text },
  addBtn: { backgroundColor: COLORS.primary, paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20 },
  addBtnText: { color: '#fff', fontWeight: '700', fontSize: 14 },
  filterRow: { maxHeight: 48 },
  filterContent: { paddingHorizontal: 16, gap: 8 },
  chip: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, backgroundColor: COLORS.card, borderWidth: 1, borderColor: COLORS.border },
  chipActive: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  chipText: { fontSize: 13, color: COLORS.textSecondary, fontWeight: '500' },
  chipTextActive: { color: '#fff' },
  list: { flex: 1 },
  listContent: { padding: 16, gap: 12 },
  empty: { alignItems: 'center', paddingTop: 60 },
  emptyIcon: { fontSize: 48, marginBottom: 12 },
  emptyTitle: { fontSize: 18, fontWeight: '700', color: COLORS.text },
  emptyText: { fontSize: 14, color: COLORS.textSecondary, marginTop: 4 },
  card: { backgroundColor: COLORS.card, borderRadius: 16, padding: 16, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 8, elevation: 2 },
  cardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  catBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: COLORS.primaryLight, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
  catIcon: { fontSize: 13 },
  catLabel: { fontSize: 12, color: COLORS.primary, fontWeight: '600' },
  statusDot: { width: 8, height: 8, borderRadius: 4 },
  dotActive: { backgroundColor: COLORS.primary },
  dotPaused: { backgroundColor: COLORS.textSecondary },
  goalTitle: { fontSize: 16, fontWeight: '700', color: COLORS.text, marginBottom: 4 },
  goalDesc: { fontSize: 13, color: COLORS.textSecondary, marginBottom: 4 },
  goalDate: { fontSize: 12, color: COLORS.textSecondary, marginBottom: 8 },
  buddyRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 4 },
  buddyLabel: { fontSize: 12, color: COLORS.textSecondary },
  buddyName: { fontSize: 12, fontWeight: '600', color: COLORS.text },
  noBuddy: { fontSize: 12, color: COLORS.textSecondary, fontStyle: 'italic', marginTop: 4 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' },
  modal: { backgroundColor: COLORS.card, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24 },
  modalTitle: { fontSize: 20, fontWeight: '700', color: COLORS.text, marginBottom: 16 },
  inputLabel: { fontSize: 13, fontWeight: '600', color: COLORS.text, marginBottom: 6 },
  input: { backgroundColor: COLORS.background, borderWidth: 1, borderColor: COLORS.border, borderRadius: 12, padding: 12, fontSize: 15, color: COLORS.text, marginBottom: 12 },
  catChip: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, backgroundColor: COLORS.background, borderWidth: 1, borderColor: COLORS.border, marginRight: 8 },
  catChipActive: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  catChipText: { fontSize: 13, color: COLORS.text },
  modalActions: { flexDirection: 'row', gap: 12, marginTop: 8 },
  cancelBtn: { flex: 1, padding: 14, borderRadius: 12, borderWidth: 1, borderColor: COLORS.border, alignItems: 'center' },
  cancelText: { color: COLORS.text, fontWeight: '600' },
  saveBtn: { flex: 2, padding: 14, borderRadius: 12, backgroundColor: COLORS.primary, alignItems: 'center' },
  saveBtnDisabled: { opacity: 0.5 },
  saveText: { color: '#fff', fontWeight: '700' },
});
