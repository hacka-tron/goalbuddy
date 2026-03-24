import { View, Text, StyleSheet } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { GOAL_CATEGORIES } from '../../lib/constants';

type Props = {
  categoryKey: string;
  size?: number;
  color?: string;
  label?: string;
  labelStyle?: any;
};

/** Renders a MaterialCommunityIcons icon for a goal category, with optional label. */
export function CategoryIcon({ categoryKey, size = 16, color = '#6A9E7F', label, labelStyle }: Props) {
  const cat = GOAL_CATEGORIES.find((c) => c.key === categoryKey);
  if (!cat) return null;
  return (
    <View style={styles.row}>
      <MaterialCommunityIcons name={cat.icon as any} size={size} color={color} />
      {label !== undefined && <Text style={[{ fontSize: size - 2 }, labelStyle]}>{label}</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 5 },
});
