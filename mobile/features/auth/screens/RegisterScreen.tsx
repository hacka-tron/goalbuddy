import { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity,
  StyleSheet, ScrollView, Alert, ActivityIndicator,
} from 'react-native';
import { FS, FW, LH } from '../../../theme/typography';
import { router } from 'expo-router';
import { useAuthStore } from '../../../store/authStore';
import { apiFetch } from '../../../lib/api';
import { useThemeStore } from '../../../store/themeStore';

export default function RegisterScreen() {
  const [displayName, setDisplayName] = useState('');
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const setAuth = useAuthStore((s) => s.setAuth);
  const colors = useThemeStore((s) => s.colors);
  const s = makeStyles(colors);

  const handleRegister = async () => {
    if (!displayName || !username || !email || !password) {
      Alert.alert('Please fill in all fields');
      return;
    }
    setLoading(true);
    try {
      const { token, user } = await apiFetch('/auth/register', {
        method: 'POST',
        body: JSON.stringify({ displayName, username, email, password }),
      });
      await setAuth(token, user);
      router.replace('/(tabs)/goals');
    } catch (err: unknown) {
      Alert.alert('Registration failed', err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView style={s.container} contentContainerStyle={s.content} keyboardShouldPersistTaps="handled">
      <View style={s.header}>
        <Text style={s.logo}>🎯</Text>
        <Text style={s.title}>Create Account</Text>
        <Text style={s.subtitle}>Start your accountability journey</Text>
      </View>

      <View style={s.form}>
        {[
          { label: 'Your Name', value: displayName, set: setDisplayName, placeholder: 'Jane Doe' },
          { label: 'Username', value: username, set: setUsername, placeholder: 'janedoe' },
          { label: 'Email', value: email, set: setEmail, placeholder: 'jane@example.com' },
          { label: 'Password', value: password, set: setPassword, placeholder: '••••••••', secure: true },
        ].map(({ label, value, set, placeholder, secure }) => (
          <View key={label}>
            <Text style={s.label}>{label}</Text>
            <TextInput
              style={s.input}
              value={value}
              onChangeText={set}
              placeholder={placeholder}
              placeholderTextColor={colors.textSecondary}
              secureTextEntry={secure}
              autoCapitalize={label === 'Username' || label === 'Email' ? 'none' : 'words'}
              keyboardType={label === 'Email' ? 'email-address' : 'default'}
            />
          </View>
        ))}

        <TouchableOpacity style={s.btn} onPress={handleRegister} disabled={loading}>
          {loading ? <ActivityIndicator color="#fff" /> : <Text style={s.btnText}>Create Account</Text>}
        </TouchableOpacity>

        <TouchableOpacity style={s.linkBtn} onPress={() => router.back()}>
          <Text style={s.linkText}>Already have an account? <Text style={s.linkAccent}>Sign in</Text></Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const makeStyles = (colors: any) => StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: { padding: 24, paddingTop: 60 },
  header: { alignItems: 'center', marginBottom: 36 },
  logo: { fontSize: FS.display, lineHeight: LH.display, marginBottom: 10 },
  title: { fontSize: FS.title, lineHeight: LH.title, fontWeight: FW.bold, color: colors.text },
  subtitle: { fontSize: FS.body, lineHeight: LH.body, color: colors.textSecondary, marginTop: 4 },
  form: { gap: 10 },
  label: { fontSize: FS.secondary, lineHeight: LH.secondary, fontWeight: FW.semibold, color: colors.text, marginBottom: 4 },
  input: {
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    padding: 14,
    fontSize: FS.body,
    lineHeight: LH.body,
    color: colors.text,
    marginBottom: 4,
  },
  btn: {
    backgroundColor: colors.primary,
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    marginTop: 8,
  },
  btnText: { color: '#fff', fontSize: FS.body, lineHeight: LH.body, fontWeight: FW.bold },
  linkBtn: { alignItems: 'center', paddingVertical: 12 },
  linkText: { color: colors.textSecondary, fontSize: FS.secondary, lineHeight: LH.secondary },
  linkAccent: { color: colors.primary, fontWeight: FW.semibold },
});
