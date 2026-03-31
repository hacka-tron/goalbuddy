import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { FS, FW, LH } from '../../theme/typography';
import { useThemeStore } from '../../store/themeStore';

interface ScreenStateProps {
  type: 'empty' | 'error';
  title: string;
  message?: string;
  icon?: keyof typeof MaterialCommunityIcons.glyphMap;
  onRetry?: () => void;
  retryLabel?: string;
}

export const ScreenState: React.FC<ScreenStateProps> = ({
  type,
  title,
  message,
  icon,
  onRetry,
  retryLabel = 'Try Again',
}) => {
  const colors = useThemeStore((s) => s.colors);

  const defaultIcon = type === 'empty' ? 'clipboard-text-outline' : 'alert-circle-outline';
  const iconColor = type === 'empty' ? colors.border : colors.accent;

  return (
    <View style={styles.container}>
      <MaterialCommunityIcons name={icon || defaultIcon} size={64} color={iconColor} />
      <Text style={[styles.title, { color: colors.text }]}>{title}</Text>
      {message && <Text style={[styles.message, { color: colors.textSecondary }]}>{message}</Text>}
      
      {onRetry && (
        <TouchableOpacity
          style={[styles.button, { backgroundColor: colors.primary }]}
          onPress={onRetry}
          activeOpacity={0.8}
        >
          <Text style={styles.buttonText}>{retryLabel}</Text>
        </TouchableOpacity>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
    gap: 12,
  },
  title: {
    fontSize: FS.section,
    lineHeight: LH.section,
    fontWeight: FW.bold,
    textAlign: 'center',
    marginTop: 8,
  },
  message: {
    fontSize: FS.body,
    lineHeight: LH.body,
    textAlign: 'center',
    marginBottom: 12,
  },
  button: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 12,
    marginTop: 8,
  },
  buttonText: {
    color: '#fff',
    fontSize: FS.body,
    lineHeight: LH.body,
    fontWeight: FW.bold,
  },
});
