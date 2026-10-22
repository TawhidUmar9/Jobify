/**
 * Two Jest projects:
 * - rn:  React Native code (jest-expo preset). Files: *.test.ts(x) except *.dom.test.ts.
 * - dom: injected WebView scripts run in jsdom. Files: *.dom.test.ts.
 * @type {import('jest').Config}
 */
const ignore = ['/node_modules/', '/e2e/', '/android/', '/ios/'];
// babel-preset-expo is a dependency of expo (not top-level), so resolve it through expo.
const babelPresetExpo = require.resolve('babel-preset-expo', { paths: [require.resolve('expo/package.json')] });

module.exports = {
  projects: [
    {
      displayName: 'rn',
      preset: 'jest-expo',
      setupFilesAfterEnv: ['<rootDir>/jest.setup.ts'],
      testPathIgnorePatterns: [...ignore, '\\.dom\\.test\\.ts$'],
      transformIgnorePatterns: [
        'node_modules/(?!((jest-)?react-native|@react-native(-community)?)|expo(nent)?|@expo(nent)?/.*|@expo-google-fonts/.*|react-navigation|@react-navigation/.*|react-native-svg|lucide-react-native|@gorhom/.*)',
      ],
    },
    {
      displayName: 'dom',
      testEnvironment: 'jsdom',
      testMatch: ['<rootDir>/**/*.dom.test.ts'],
      testPathIgnorePatterns: ignore,
      transform: { '^.+\\.[jt]sx?$': ['babel-jest', { presets: [babelPresetExpo] }] },
    },
  ],
};
