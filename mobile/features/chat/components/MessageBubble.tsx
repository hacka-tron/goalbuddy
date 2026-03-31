import { useMemo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { CheckIn } from '../types';
import { FS, FW, LH } from '../../../theme/typography';

type MCIName = React.ComponentProps<typeof MaterialCommunityIcons>['name'];

interface Props {
  item: CheckIn;
  isMe: boolean;
  isFirstInGroup: boolean;
  colors: any;
  onRetry: () => void;
}

export function MessageBubble({ item, isMe, isFirstInGroup, colors, onRetry }: Props) {
  const s = useMemo(() => makeStyles(colors), [colors]);
  const isPending = item.syncStatus === 'pending';
  const isFailed = item.syncStatus === 'failed';

  return (
    <View style={[s.bubbleRow, isMe ? s.bubbleRowRight : s.bubbleRowLeft, isPending && { opacity: 0.5 }]}>
      <View style={[s.bubble, isMe ? s.bubbleMe : s.bubbleThem]}>
        {item.milestone_title && (
          <View style={s.milestoneTag}>
            <MaterialCommunityIcons
              name="map-marker" size={11}
              color={isMe ? 'rgba(255,255,255,0.8)' : colors.primary}
            />
            <Text style={[s.milestoneTagText, isMe && { color: 'rgba(255,255,255,0.85)' }]}>
              {item.milestone_title}
            </Text>
          </View>
        )}
        <Text style={[s.bubbleText, isMe ? s.bubbleTextMe : s.bubbleTextThem]}>
          {item.message}
        </Text>
        <View style={s.bubbleFooter}>
          <Text style={[s.bubbleTime, isMe ? s.bubbleTimeMe : s.bubbleTimeThem]}>
            {new Date(item.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </Text>
          {isFailed && (
            <TouchableOpacity onPress={onRetry} style={s.retryInline}>
              <Text style={s.retryInlineText}>Failed · Tap to retry</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    </View>
  );
}

const makeStyles = (colors: any) => StyleSheet.create({
  bubbleRow:     { flexDirection: 'row', marginVertical: 2 },
  bubbleRowLeft: { justifyContent: 'flex-start' },
  bubbleRowRight:{ justifyContent: 'flex-end' },
  bubble:        { maxWidth: '75%', borderRadius: 18, paddingHorizontal: 14, paddingVertical: 10, gap: 3 },
  bubbleMe:      { backgroundColor: colors.primary, borderTopRightRadius: 4 },
  bubbleThem:    { backgroundColor: colors.card, borderTopLeftRadius: 4, borderWidth: 1, borderColor: colors.border },
  bubbleText:    { fontSize: FS.body, lineHeight: LH.body },
  bubbleTextMe:  { color: '#fff' },
  bubbleTextThem:{ color: colors.text },
  bubbleFooter:  { flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' },
  bubbleTime:    { fontSize: FS.caption, lineHeight: LH.caption },
  bubbleTimeMe:  { color: 'rgba(255,255,255,0.65)' },
  bubbleTimeThem:{ color: colors.textSecondary },

  milestoneTag:     { flexDirection: 'row', alignItems: 'center', gap: 3 },
  milestoneTagText: { fontSize: FS.caption, lineHeight: LH.caption, color: colors.primary, fontWeight: FW.semibold },

  retryInline:     { paddingHorizontal: 4 },
  retryInlineText: { fontSize: FS.caption, lineHeight: LH.caption, color: '#FF6B6B', fontWeight: FW.bold },
});
