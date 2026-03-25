import { useMemo } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';

interface Props {
  message: string;
  onChangeText: (text: string) => void;
  onSend: () => void;
  onRetry: () => void;
  isSending: boolean;
  sendError: boolean;
  paddingBottom: number;
  colors: any;
}

export function ChatInput({
  message,
  onChangeText,
  onSend,
  onRetry,
  isSending,
  sendError,
  paddingBottom,
  colors,
}: Props) {
  const s = useMemo(() => makeStyles(colors), [colors]);

  return (
    <View style={[s.inputArea, { paddingBottom: paddingBottom + 12 }]}>
      {sendError && (
        <View style={s.sendErrorBanner}>
          <MaterialCommunityIcons name="alert-circle-outline" size={15} color="#FF6B6B" />
          <Text style={s.sendErrorText}>Couldn't send. </Text>
          <TouchableOpacity onPress={onRetry}>
            <Text style={s.sendErrorRetry}>Retry</Text>
          </TouchableOpacity>
        </View>
      )}
      <View style={s.messageRow}>
        <TextInput
          style={s.messageInput}
          value={message}
          onChangeText={onChangeText}
          placeholder="How's your progress?"
          placeholderTextColor={colors.textSecondary}
          multiline
        />
        <TouchableOpacity
          style={[s.sendBtn, (!message.trim() || isSending) && s.sendBtnDisabled]}
          onPress={onSend}
          disabled={!message.trim() || isSending}
        >
          {isSending
            ? <ActivityIndicator color="#fff" size="small" />
            : <MaterialCommunityIcons name="send" size={18} color="#fff" />}
        </TouchableOpacity>
      </View>
    </View>
  );
}

const makeStyles = (colors: any) => StyleSheet.create({
  inputArea:     { backgroundColor: colors.card, borderTopWidth: 1, borderTopColor: colors.border, paddingTop: 12, paddingHorizontal: 12 },
  sendErrorBanner: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingBottom: 8 },
  sendErrorText:   { fontSize: 13, color: '#FF6B6B' },
  sendErrorRetry:  { fontSize: 13, color: colors.primary, fontWeight: '700', textDecorationLine: 'underline' },
  messageRow:    { flexDirection: 'row', gap: 8, alignItems: 'flex-end' },
  messageInput:  { flex: 1, backgroundColor: colors.background, borderWidth: 1, borderColor: colors.border, borderRadius: 22, paddingHorizontal: 14, paddingVertical: 10, fontSize: 15, color: colors.text, maxHeight: 100 },
  sendBtn:       { width: 40, height: 40, borderRadius: 20, backgroundColor: colors.primary, justifyContent: 'center', alignItems: 'center' },
  sendBtnDisabled: { opacity: 0.4 },
});
