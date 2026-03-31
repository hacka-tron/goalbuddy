import { useState, useMemo } from 'react';
import * as Haptics from 'expo-haptics';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  TextInput, Alert, ActivityIndicator,
} from 'react-native';
import { FS, FW, LH } from '../../../theme/typography';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { useAuthStore } from '../../../store/authStore';
import { useThemeStore } from '../../../store/themeStore';
import {
  THEMES, ThemeKey, LIGHT_THEME_KEYS, DARK_THEME_KEYS,
  PRIMARY_SWATCHES, BACKGROUND_SWATCHES, ColorPalette,
} from '../../../lib/constants';
import { useSaveProfile } from '../hooks';

export default function SettingsScreen() {
  const user = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);
  const colors = useThemeStore((s) => s.colors);
  const themeKey = useThemeStore((s) => s.themeKey);
  const customPrimary = useThemeStore((s) => s.customPrimary);
  const customAccent = useThemeStore((s) => s.customAccent);
  const customBackground = useThemeStore((s) => s.customBackground);
  const setTheme = useThemeStore((s) => s.setTheme);
  const setCustomColors = useThemeStore((s) => s.setCustomColors);

  const [displayName, setDisplayName] = useState(user?.display_name || '');
  const [bio, setBio] = useState(user?.bio || '');

  const saveMutation = useSaveProfile();
  const s = useMemo(() => makeStyles(colors), [colors]);

  const handleLogout = () => {
    Alert.alert('Sign Out', 'Are you sure?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Sign Out',
        style: 'destructive',
        onPress: async () => {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
          await logout();
          router.replace('/(auth)/login');
        },
      },
    ]);
  };

  const ThemeRow = ({ keys, label }: { keys: Exclude<ThemeKey, 'custom'>[]; label: string }) => (
    <View style={s.themeGroup}>
      <Text style={s.themeGroupLabel}>{label}</Text>
      <View style={s.themeRow}>
        {keys.map((key) => {
          const theme = THEMES[key];
          const active = themeKey === key;
          return (
            <TouchableOpacity key={key} style={s.themeOption} onPress={() => setTheme(key)}>
              <View style={[s.themeSwatchWrap, active && { borderColor: colors.text }]}>
                <View style={[s.themeSwatch, { backgroundColor: theme.colors.primary }]}>
                  <View style={[s.themeSwatchInner, { backgroundColor: theme.colors.background }]} />
                </View>
              </View>
              <Text style={s.themeLabel}>{theme.name}</Text>
            </TouchableOpacity>
          );
        })}
        {/* Custom swatch — only in Dark row */}
        {label === 'Dark' && (
          <TouchableOpacity style={s.themeOption} onPress={() => setCustomColors(customPrimary, customAccent, customBackground)}>
            <View style={[s.themeSwatchWrap, themeKey === 'custom' && { borderColor: colors.text }]}>
              <View style={[s.themeSwatch, { backgroundColor: customPrimary }]}>
                <View style={[s.themeSwatchInner, { backgroundColor: customBackground }]} />
              </View>
            </View>
            <Text style={s.themeLabel}>Custom</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );

  return (
    <SafeAreaView style={s.container}>
      <Text style={s.title}>Settings</Text>

      <ScrollView contentContainerStyle={s.content}>
        {/* Avatar */}
        <View style={s.avatarSection}>
          <View style={s.avatar}>
            <Text style={s.avatarText}>{user?.display_name?.[0]?.toUpperCase()}</Text>
          </View>
          <Text style={s.username}>@{user?.username}</Text>
        </View>

        {/* Profile */}
        <View style={s.card}>
          <Text style={s.cardTitle}>Profile</Text>
          <Text style={s.label}>Display Name</Text>
          <TextInput style={s.input} value={displayName} onChangeText={setDisplayName} placeholder="Your name" placeholderTextColor={colors.textSecondary} />
          <Text style={s.label}>Bio</Text>
          <TextInput style={[s.input, { height: 80, textAlignVertical: 'top' }]} value={bio} onChangeText={setBio} placeholder="Tell buddies about yourself..." placeholderTextColor={colors.textSecondary} multiline />
        </View>

        {/* Theme */}
        <View style={s.card}>
          <Text style={s.cardTitle}>Theme</Text>
          <ThemeRow keys={LIGHT_THEME_KEYS} label="Light" />
          <ThemeRow keys={DARK_THEME_KEYS} label="Dark" />
        </View>

        {/* Custom theme builder — only visible when custom is active */}
        {themeKey === 'custom' && (
          <View style={s.card}>
            <Text style={s.cardTitle}>Customize</Text>

            <Text style={s.swatchLabel}>Primary Color</Text>
            <View style={s.swatchGrid}>
              {PRIMARY_SWATCHES.map((c) => (
                <TouchableOpacity
                  key={c}
                  onPress={() => setCustomColors(c, customAccent, customBackground)}
                  style={[s.swatch, { backgroundColor: c }, customPrimary === c && s.swatchActive]}
                >
                  {customPrimary === c && <MaterialCommunityIcons name="check" size={14} color="#fff" />}
                </TouchableOpacity>
              ))}
            </View>

            <Text style={s.swatchLabel}>Background</Text>
            <View style={s.swatchGrid}>
              {BACKGROUND_SWATCHES.map((bg) => (
                <TouchableOpacity
                  key={bg}
                  onPress={() => setCustomColors(customPrimary, customAccent, bg)}
                  style={[s.swatch, { backgroundColor: bg, borderWidth: 1, borderColor: colors.border }, customBackground === bg && s.swatchActive]}
                >
                  {customBackground === bg && (
                    <MaterialCommunityIcons
                      name="check"
                      size={14}
                      color={(0.299 * parseInt(bg.slice(1,3),16) + 0.587 * parseInt(bg.slice(3,5),16) + 0.114 * parseInt(bg.slice(5,7),16)) / 255 < 0.5 ? '#fff' : '#000'}
                    />
                  )}
                </TouchableOpacity>
              ))}
            </View>
          </View>
        )}

        {/* Save profile */}
        <TouchableOpacity style={s.saveBtn} onPress={() => saveMutation.mutate({ displayName, bio })} disabled={saveMutation.isPending}>
          {saveMutation.isPending
            ? <ActivityIndicator color="#fff" />
            : <Text style={s.saveBtnText}>Save Profile</Text>}
        </TouchableOpacity>
        {saveMutation.isError && (
          <Text style={s.saveError}>{(saveMutation.error as Error).message}</Text>
        )}

        {/* Account */}
        <View style={s.card}>
          <Text style={s.cardTitle}>Account</Text>
          <Text style={s.emailText}>{user?.email}</Text>
        </View>

        <TouchableOpacity style={s.logoutBtn} onPress={handleLogout}>
          <MaterialCommunityIcons name="logout" size={18} color={colors.accent} />
          <Text style={s.logoutText}>Sign Out</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const makeStyles = (colors: ColorPalette) => StyleSheet.create({
  container:        { flex: 1, backgroundColor: colors.background },
  title:            { fontSize: FS.title, lineHeight: LH.title, fontWeight: FW.bold, color: colors.text, paddingHorizontal: 20, paddingTop: 20, paddingBottom: 12 },
  content:          { padding: 16, gap: 16, paddingBottom: 40 },

  avatarSection:    { alignItems: 'center', paddingVertical: 8 },
  avatar:           { width: 80, height: 80, borderRadius: 40, backgroundColor: colors.primaryLight, justifyContent: 'center', alignItems: 'center' },
  avatarText:       { fontSize: FS.display, lineHeight: LH.display, fontWeight: FW.bold, color: colors.primary },
  username:         { fontSize: FS.body, lineHeight: LH.body, color: colors.textSecondary, marginTop: 8, fontWeight: FW.semibold },

  card:             { backgroundColor: colors.card, borderRadius: 16, padding: 16, gap: 12 },
  cardTitle:        { fontSize: FS.caption, lineHeight: LH.caption, fontWeight: FW.bold, color: colors.textSecondary, textTransform: 'uppercase', letterSpacing: 0.8 },
  label:            { fontSize: FS.secondary, lineHeight: LH.secondary, fontWeight: FW.semibold, color: colors.text },
  input:            { backgroundColor: colors.background, borderWidth: 1, borderColor: colors.border, borderRadius: 10, padding: 12, fontSize: FS.body, lineHeight: LH.body, color: colors.text },
  emailText:        { fontSize: FS.body, lineHeight: LH.body, color: colors.textSecondary },

  themeGroup:       { gap: 8 },
  themeGroupLabel:  { fontSize: FS.caption, lineHeight: LH.caption, fontWeight: FW.bold, color: colors.textSecondary, textTransform: 'uppercase', letterSpacing: 0.6 },
  themeRow:         { flexDirection: 'row', gap: 12, flexWrap: 'wrap' },
  themeOption:      { alignItems: 'center', gap: 5, width: 56 },
  themeSwatchWrap:  { borderRadius: 16, padding: 2.5, borderWidth: 2.5, borderColor: 'transparent' },
  themeSwatch:      { width: 48, height: 48, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
  themeSwatchInner: { width: 18, height: 18, borderRadius: 9 },
  themeLabel:       { fontSize: FS.caption, lineHeight: LH.caption, fontWeight: FW.semibold, color: colors.textSecondary, textAlign: 'center' },

  swatchLabel:      { fontSize: FS.secondary, lineHeight: LH.secondary, fontWeight: FW.semibold, color: colors.text },
  swatchGrid:       { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  swatch:           { width: 36, height: 36, borderRadius: 18, justifyContent: 'center', alignItems: 'center' },
  swatchActive:     { borderWidth: 3, borderColor: colors.text },
  toggle:           { width: 44, height: 26, borderRadius: 13, justifyContent: 'center', paddingHorizontal: 3 },
  toggleThumb:      { width: 20, height: 20, borderRadius: 10, backgroundColor: '#fff' },
  toggleThumbOn:    { alignSelf: 'flex-end' },

  saveBtn:          { backgroundColor: colors.primary, borderRadius: 12, padding: 16, alignItems: 'center' },
  saveBtnText:      { color: '#fff', fontWeight: FW.bold, fontSize: FS.body, lineHeight: LH.body },
  saveError:        { fontSize: FS.secondary, lineHeight: LH.secondary, color: '#EF4444', textAlign: 'center' },
  logoutBtn:        { backgroundColor: colors.accentLight, borderRadius: 12, padding: 16, alignItems: 'center', flexDirection: 'row', justifyContent: 'center', gap: 8 },
  logoutText:       { color: colors.accent, fontWeight: FW.bold, fontSize: FS.body, lineHeight: LH.body },
});
