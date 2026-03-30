import { Tabs } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useThemeStore } from '../../store/themeStore';
import { useNotificationStore } from '../../store/notificationStore';

type MCIName = React.ComponentProps<typeof MaterialCommunityIcons>['name'];

const TAB_ICONS: Record<string, MCIName> = {
  goals:      'checkbox-marked-circle',
  finder:     'magnify',
  buddies:    'account-multiple',
  milestones: 'trophy',
  settings:   'cog',
};

export default function TabsLayout() {
  const { colors } = useThemeStore();
  const unreadCount = useNotificationStore((s) => s.unreadCount);
  const pendingRequestCount = useNotificationStore((s) => s.pendingRequestCount);
  const buddiesBadge = unreadCount + pendingRequestCount;

  return (
    <Tabs
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarStyle: {
          backgroundColor: colors.card,
          borderTopColor: colors.border,
          height: 62,
          paddingBottom: 8,
          paddingTop: 8,
        },
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textSecondary,
        tabBarShowLabel: false,
        tabBarIcon: ({ focused, color }) => {
          const name = TAB_ICONS[route.name] ?? 'circle';
          return <MaterialCommunityIcons name={name} size={26} color={focused ? color : colors.textSecondary + '80'} />;
        },
      })}
    >
      <Tabs.Screen name="milestones" options={{ title: 'Wins' }} />
      <Tabs.Screen name="finder"     options={{ title: 'Find' }} />
      <Tabs.Screen name="goals"      options={{ title: 'Goals' }} />
      <Tabs.Screen name="buddies"    options={{ title: 'Buddies', tabBarBadge: buddiesBadge > 0 ? buddiesBadge : undefined }} />
      <Tabs.Screen name="settings"   options={{ title: 'Settings' }} />
    </Tabs>
  );
}
