import { useState, useEffect } from 'react';
import {
  View, Text, TextInput, TouchableOpacity,
  StyleSheet, ScrollView, Alert, ActivityIndicator,
} from 'react-native';
import { FS, FW, LH } from '../../../theme/typography';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { router } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';
import { useAuthRequest, ResponseType } from 'expo-auth-session';
import { useAuthStore } from '../../../store/authStore';
import { apiFetch } from '../../../lib/api';
import { useThemeStore } from '../../../store/themeStore';

WebBrowser.maybeCompleteAuthSession();

const WEB_CLIENT_ID = process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID ?? '';

export default function LoginScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const setAuth = useAuthStore((s) => s.setAuth);
  const colors = useThemeStore((s) => s.colors);
  const s = makeStyles(colors);

  const redirectUri = 'https://auth.expo.io/@bagelbogel/goalbuddy';

  const [request, response, promptAsync] = useAuthRequest(
    {
      clientId: WEB_CLIENT_ID,
      redirectUri,
      responseType: ResponseType.Code,
      scopes: ['openid', 'profile', 'email'],
      usePKCE: true,
    },
    {
      authorizationEndpoint: 'https://accounts.google.com/o/oauth2/v2/auth',
      tokenEndpoint: 'https://oauth2.googleapis.com/token',
    },
  );

  useEffect(() => {
    if (response?.type === 'success') {
      const { code } = response.params;
      handleGoogleCode(code, request?.codeVerifier);
    }
  }, [response]);

  const handleGoogleCode = async (code: string, codeVerifier?: string) => {
    setLoading(true);
    try {
      const { token, user } = await apiFetch('/auth/google/token', {
        method: 'POST',
        body: JSON.stringify({ code, codeVerifier, redirectUri }),
      });
      await setAuth(token, user);
      router.replace('/(tabs)/goals');
    } catch {
      Alert.alert('Google sign-in failed', 'Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleLogin = async () => {
    if (!email || !password) { Alert.alert('Please fill in all fields'); return; }
    setLoading(true);
    try {
      const { token, user } = await apiFetch('/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email, password }),
      });
      await setAuth(token, user);
      router.replace('/(tabs)/goals');
    } catch (err: unknown) {
      Alert.alert('Login failed', err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView style={s.container} contentContainerStyle={s.content} keyboardShouldPersistTaps="handled">
      <View style={s.header}>
        <View style={s.logoCircle}>
          <MaterialCommunityIcons name="account-group" size={38} color={colors.primary} />
        </View>
        <Text style={s.title}>GoalBuddy</Text>
        <Text style={s.subtitle}>Achieve more, together</Text>
      </View>

      {/* Google sign-in */}
      <TouchableOpacity
        style={s.googleBtn}
        onPress={() => promptAsync()}
        disabled={loading || !WEB_CLIENT_ID}
        activeOpacity={0.8}
      >
        <MaterialCommunityIcons name="google" size={20} color="#4285F4" />
        <Text style={s.googleBtnText}>Continue with Google</Text>
      </TouchableOpacity>

      <View style={s.dividerRow}>
        <View style={[s.dividerLine, { backgroundColor: colors.border }]} />
        <Text style={[s.dividerText, { color: colors.textSecondary }]}>or</Text>
        <View style={[s.dividerLine, { backgroundColor: colors.border }]} />
      </View>

      <View style={s.form}>
        <Text style={s.label}>Email</Text>
        <TextInput
          style={s.input}
          value={email}
          onChangeText={setEmail}
          placeholder="you@example.com"
          placeholderTextColor={colors.textSecondary}
          autoCapitalize="none"
          keyboardType="email-address"
        />

        <Text style={s.label}>Password</Text>
        <TextInput
          style={s.input}
          value={password}
          onChangeText={setPassword}
          placeholder="••••••••"
          placeholderTextColor={colors.textSecondary}
          secureTextEntry
        />

        <TouchableOpacity style={s.btn} onPress={handleLogin} disabled={loading}>
          {loading ? <ActivityIndicator color="#fff" /> : <Text style={s.btnText}>Sign In</Text>}
        </TouchableOpacity>

        <TouchableOpacity style={s.linkBtn} onPress={() => router.push('/(auth)/register')}>
          <Text style={s.linkText}>Don't have an account? <Text style={s.linkAccent}>Sign up</Text></Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const makeStyles = (colors: any) => StyleSheet.create({
  container:      { flex: 1, backgroundColor: colors.background },
  content:        { padding: 24, paddingTop: 80 },
  header:         { alignItems: 'center', marginBottom: 36 },
  logoCircle: {
    width: 80, height: 80, borderRadius: 24,
    backgroundColor: colors.primaryLight,
    justifyContent: 'center', alignItems: 'center',
    marginBottom: 16,
  },
  title:          { fontSize: FS.display, lineHeight: LH.display, fontWeight: FW.bold, color: colors.text, letterSpacing: -0.5 },
  subtitle:       { fontSize: FS.body, lineHeight: LH.body, color: colors.textSecondary, marginTop: 4 },

  googleBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10,
    backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border,
    borderRadius: 12, padding: 14, marginBottom: 16,
  },
  googleBtnText:  { fontSize: FS.body, lineHeight: LH.body, fontWeight: FW.semibold, color: colors.text },

  dividerRow:     { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 16 },
  dividerLine:    { flex: 1, height: 1 },
  dividerText:    { fontSize: FS.secondary, lineHeight: LH.secondary },

  form:           { gap: 12 },
  label:          { fontSize: FS.secondary, lineHeight: LH.secondary, fontWeight: FW.semibold, color: colors.text },
  input: {
    backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border,
    borderRadius: 12, padding: 14, fontSize: FS.body, lineHeight: LH.body, color: colors.text, marginBottom: 4,
  },
  btn:            { backgroundColor: colors.primary, borderRadius: 12, padding: 16, alignItems: 'center', marginTop: 8 },
  btnText:        { color: '#fff', fontSize: FS.body, lineHeight: LH.body, fontWeight: FW.bold },
  linkBtn:        { alignItems: 'center', paddingVertical: 12 },
  linkText:       { color: colors.textSecondary, fontSize: FS.secondary, lineHeight: LH.secondary },
  linkAccent:     { color: colors.primary, fontWeight: FW.semibold },
});
