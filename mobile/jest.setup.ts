import { THEMES } from './lib/constants';

const mockThemeState = {
  themeKey: 'sage' as const,
  colors: THEMES.sage.colors,
};

jest.mock('./store/themeStore', () => ({
  useThemeStore: jest.fn((selector: (state: typeof mockThemeState) => unknown) => selector(mockThemeState)),
}));

jest.mock('./lib/api', () => ({
  API_URL: 'http://127.0.0.1:3000',
  getToken: jest.fn(),
  setToken: jest.fn(),
  clearToken: jest.fn(),
  apiFetch: jest.fn(() => Promise.reject(new Error('Unexpected apiFetch call. Mock it in the test.'))),
}));

jest.mock('expo-haptics', () => ({
  impactAsync: jest.fn(),
  notificationAsync: jest.fn(),
  selectionAsync: jest.fn(),
  ImpactFeedbackStyle: {},
  NotificationFeedbackType: {},
}));

jest.mock('expo-router', () => {
  const React = require('react');

  const Link = ({ children }: { children: React.ReactNode }) => children;
  const Stack = ({ children }: { children?: React.ReactNode }) => children ?? null;
  Stack.Screen = ({ children }: { children?: React.ReactNode }) => children ?? null;

  return {
    Link,
    Redirect: ({ children }: { children?: React.ReactNode }) => children ?? null,
    Stack,
    router: {
      back: jest.fn(),
      canGoBack: jest.fn(() => true),
      navigate: jest.fn(),
      push: jest.fn(),
      replace: jest.fn(),
      setParams: jest.fn(),
    },
    useFocusEffect: jest.fn(),
    useLocalSearchParams: jest.fn(() => ({})),
    usePathname: jest.fn(() => '/'),
    useRouter: jest.fn(() => ({
      back: jest.fn(),
      canGoBack: jest.fn(() => true),
      navigate: jest.fn(),
      push: jest.fn(),
      replace: jest.fn(),
      setParams: jest.fn(),
    })),
  };
});

jest.mock('expo-image', () => {
  const React = require('react');
  const { View } = require('react-native');

  return {
    Image: ({ children, ...props }: { children?: React.ReactNode }) => React.createElement(View, props, children),
  };
});

jest.mock('react-native-mmkv', () => ({
  MMKV: jest.fn().mockImplementation(() => ({
    clearAll: jest.fn(),
    contains: jest.fn(() => false),
    delete: jest.fn(),
    getBoolean: jest.fn(),
    getNumber: jest.fn(),
    getString: jest.fn(),
    set: jest.fn(),
  })),
}));

jest.mock('@expo/vector-icons', () => ({
  MaterialCommunityIcons: ({ name, testID = 'material-community-icon' }: { name: string; testID?: string }) => {
    const React = require('react');
    const { Text } = require('react-native');
    return React.createElement(Text, { testID }, name);
  },
  Ionicons: ({ name, testID = 'ionicon' }: { name: string; testID?: string }) => {
    const React = require('react');
    const { Text } = require('react-native');
    return React.createElement(Text, { testID }, name);
  },
}));

const originalFetch = global.fetch;

beforeAll(() => {
  global.fetch = jest.fn(() =>
    Promise.reject(new Error('Unexpected network call. Use mocked apiFetch in tests.'))
  ) as jest.Mock;
});

afterEach(() => {
  jest.clearAllMocks();
});

afterAll(() => {
  global.fetch = originalFetch;
});
