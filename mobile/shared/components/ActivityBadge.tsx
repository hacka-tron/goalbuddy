import { View, Text, StyleSheet } from 'react-native';
import { ACTIVITY_LEVELS } from '../../lib/constants';
import { FS, FW, LH } from '../../theme/typography';

interface Props {
  level: string;
  small?: boolean;
}

export const ActivityBadge = ({ level, small }: Props) => {
  const info = ACTIVITY_LEVELS[level] || ACTIVITY_LEVELS.new;
  return (
    <View style={[s.badge, { backgroundColor: info.color + '20' }, small && s.small]}>
      <View style={[s.dot, { backgroundColor: info.color }]} />
      <Text style={[s.label, { color: info.color }, small && s.labelSmall]}>{info.label}</Text>
    </View>
  );
};

const s = StyleSheet.create({
  badge: { flexDirection: 'row', alignItems: 'center', gap: 3, paddingHorizontal: 7, paddingVertical: 3, borderRadius: 6, alignSelf: 'flex-start' },
  small: { paddingHorizontal: 5, paddingVertical: 2 },
  dot: { width: 5, height: 5, borderRadius: 3 },
  label: { fontSize: FS.caption, lineHeight: LH.caption, fontWeight: FW.semibold },
  labelSmall: { fontSize: FS.caption, lineHeight: LH.caption },
});
