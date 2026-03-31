const expoPreset = require('jest-expo/jest-preset');

module.exports = {
  ...expoPreset,
  rootDir: __dirname,
  preset: 'jest-expo',
  testEnvironment: 'node',
  setupFilesAfterEnv: ['<rootDir>/jest.setup.ts'],
  testMatch: ['<rootDir>/**/__tests__/**/*.test.ts', '<rootDir>/**/__tests__/**/*.test.tsx'],
  transformIgnorePatterns: [
    'node_modules/(?!(jest-)?react-native|@react-native|react-clone-referenced-element|@react-navigation|expo(nent)?|@expo(nent)?/.*|expo-router|react-native-safe-area-context|react-native-reanimated|react-native-gesture-handler|react-native-screens|react-native-mmkv|expo-image)',
  ],
  collectCoverageFrom: [
    'components/ui/**/*.{ts,tsx}',
    'features/**/*.{ts,tsx}',
    '!**/__tests__/**',
    '!**/*.d.ts',
  ],
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json'],
};
