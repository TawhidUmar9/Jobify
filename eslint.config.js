// https://docs.expo.dev/guides/using-eslint/
const { defineConfig } = require('eslint/config');
const expoConfig = require('eslint-config-expo/flat');

module.exports = defineConfig([
  expoConfig,
  {
    ignores: ['dist/*', 'android/*', 'ios/*', 'coverage/*', 'expo-env.d.ts'],
  },
  {
    rules: {
      'no-console': 'error',
    },
  },
]);
