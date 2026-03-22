import { useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  TextInput, Alert, ActivityIndicator, Switch,
} from 'react-native';
import { useMutation } from '@tanstack/react-query';
import { apiFetch } from '../../lib/api';
import { COLORS } from '../../lib/constants';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuthStore } from '../../store/authStore';
import { router } from 'expo-router';

export default function SettingsScreen() {
  const { user, updateUser, logout } = useAuthStore();
  const [displayName, setDisplayName] = useState(user?.display_name || '');
  const [bio, setBio] = useState(user?.bio || '');
  const [notifFreq, setNotifFreq] = useState(user?.notification_frequency || 'daily');

  const saveMutation = useMutation({
    mutationFn: () =>
      apiFetch('/users/me', {
        method: 'PATCH',
        body: JSON.stringify({ displayName, bio, notificationFrequency: notifFreq }),
      }),
    onSuccess: (data) => {
      updateUser({ display_name: data.display_name, bio: data.bio, notification_frequency: data.notification_frequency });
      Alert.alert('Saved!');
    },
    onError: (e: Error) => Alert.alert('Error', e.message),
  });

  const handleLogout = () => {
    Alert.alert('Sign Out', 'Are you sure?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Sign Out', style: 'destructive', onPress: async () => { await logout(); router.replace('/(auth)/login'); } },
    ]);
  };

  return (
    <SafeAreaView style={s.container}>
      <Text style={s.title}>Profile & Settings</Text>

      <ScrollView contentContainerStyle={s.content}>
        {/* Avatar placeholder */}
        <View style={s.avatarSection}>
          <View style={s.avatar}>
            <Text style={s.avatarText}>{user?.display_name?.[0]?.toUpperCase()}</Text>
          </View>
          <Text style={s.username}>@{user?.username}</Text>
        </View>

        {/* Profile fields */}
        <View style={s.card}>
          <Text style={s.cardTitle}>Profile</Text>
          <Text style={s.label}>Display Name</Text>
          <TextInput style={s.input} value={displayName} onChangeText={setDisplayName} placeholder="Your name" placeholderTextColor={COLORS.textSecondary} />
          <Text style={s.label}>Bio</Text>
          <TextInput style={[s.input, { height: 80, textAlignVertical: 'top' }]} value={bio} onChangeText={setBio} placeholder="Tell buddies about yourself..." placeholderTextColor={COLORS.textSecondary} multiline />
        </View>

        {/* Notification preferences */}
        <View style={s.card}>
          <Text style={s.cardTitle}>Check-in Frequency</Text>
          {(['daily', '3x_week', 'weekly'] as const).map((freq) => (
            <TouchableOpacity key={freq} style={s.freqOption} onPress={() => setNotifFreq(freq)}>
              <Text style={s.freqLabel}>{freq === 'daily' ? 'Daily' : freq === '3x_week' ? '3x per week' : 'Weekly'}</Text>
              <View style={[s.radio, notifFreq === freq && s.radioActive]}>
                {notifFreq === freq && <View style={s.radioDot} />}
              </View>
            </TouchableOpacity>
          ))}
        </View>

        {/* Save */}
        <TouchableOpacity style={s.saveBtn} onPress={() => saveMutation.mutate()} disabled={saveMutation.isPending}>
          {saveMutation.isPending
            ? <ActivityIndicator color="#fff" />
            : <Text style={s.saveBtnText}>Save Changes</Text>}
        </TouchableOpacity>

        {/* Account */}
        <View style={s.card}>
          <Text style={s.cardTitle}>Account</Text>
          <Text style={s.emailText}>{user?.email}</Text>
        </View>

        <TouchableOpacity style={s.logoutBtn} onPress={handleLogout}>
          <Text style={s.logoutText}>Sign Out</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  title: { fontSize: 26, fontWeight: '700', color: COLORS.text, paddingHorizontal: 20, paddingTop: 8, paddingBottom: 12 },
  content: { padding: 16, gap: 16 },
  avatarSection: { alignItems: 'center', paddingVertical: 8 },
  avatar: { width: 80, height: 80, borderRadius: 40, backgroundColor: COLORS.primaryLight, justifyContent: 'center', alignItems: 'center' },
  avatarText: { fontSize: 32, fontWeight: '700', color: COLORS.primary },
  username: { fontSize: 15, color: COLORS.textSecondary, marginTop: 8, fontWeight: '600' },
  card: { backgroundColor: COLORS.card, borderRadius: 16, padding: 16, gap: 10 },
  cardTitle: { fontSize: 14, fontWeight: '700', color: COLORS.textSecondary, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 4 },
  label: { fontSize: 13, fontWeight: '600', color: COLORS.text },
  input: { backgroundColor: COLORS.background, borderWidth: 1, borderColor: COLORS.border, borderRadius: 10, padding: 12, fontSize: 15, color: COLORS.text },
  freqOption: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 8 },
  freqLabel: { fontSize: 15, color: COLORS.text },
  radio: { width: 22, height: 22, borderRadius: 11, borderWidth: 2, borderColor: COLORS.border, justifyContent: 'center', alignItems: 'center' },
  radioActive: { borderColor: COLORS.primary },
  radioDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: COLORS.primary },
  saveBtn: { backgroundColor: COLORS.primary, borderRadius: 12, padding: 16, alignItems: 'center' },
  saveBtnText: { color: '#fff', fontWeight: '700', fontSize: 16 },
  emailText: { fontSize: 15, color: COLORS.textSecondary },
  logoutBtn: { backgroundColor: COLORS.accentLight, borderRadius: 12, padding: 16, alignItems: 'center' },
  logoutText: { color: COLORS.accent, fontWeight: '700', fontSize: 16 },
});
