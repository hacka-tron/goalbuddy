import { View, Text, StyleSheet } from 'react-native';
import { ACTIVITY_LEVELS } from '../../lib/constants';

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
  badge: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 10 },
  small: { paddingHorizontal: 6, paddingVertical: 2 },
  dot: { width: 6, height: 6, borderRadius: 3 },
  label: { fontSize: 12, fontWeight: '600' },
  labelSmall: { fontSize: 11 },
});
