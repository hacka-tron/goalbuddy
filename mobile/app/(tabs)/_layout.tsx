import { Tabs } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useThemeStore } from '../../store/themeStore';

type MCIName = React.ComponentProps<typeof MaterialCommunityIcons>['name'];

const TAB_ICONS: Record<string, { active: MCIName; inactive: MCIName }> = {
  goals:      { active: 'checkbox-marked-circle',    inactive: 'checkbox-marked-circle-outline' },
  finder:     { active: 'compass',                   inactive: 'compass-outline' },
  buddies:    { active: 'account-multiple',          inactive: 'account-multiple-outline' },
  milestones: { active: 'trophy',                    inactive: 'trophy-outline' },
  settings:   { active: 'cog',                       inactive: 'cog-outline' },
};

export default function TabsLayout() {
  const { colors } = useThemeStore();

  return (
    <Tabs
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarStyle: {
          backgroundColor: colors.card,
          borderTopColor: colors.border,
          height: 60,
          paddingBottom: 8,
          paddingTop: 6,
        },
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textSecondary,
        tabBarLabelStyle: { fontSize: 11, fontWeight: '600' },
        tabBarIcon: ({ focused, color }) => {
          const icons = TAB_ICONS[route.name];
          const name = focused ? icons?.active : icons?.inactive;
          return <MaterialCommunityIcons name={name ?? 'circle-outline'} size={22} color={color} />;
        },
      })}
    >
      <Tabs.Screen name="goals"      options={{ title: 'Goals' }} />
      <Tabs.Screen name="finder"     options={{ title: 'Find' }} />
      <Tabs.Screen name="buddies"    options={{ title: 'Buddies' }} />
      <Tabs.Screen name="milestones" options={{ title: 'Wins' }} />
      <Tabs.Screen name="settings"   options={{ title: 'Settings' }} />
    </Tabs>
  );
}
