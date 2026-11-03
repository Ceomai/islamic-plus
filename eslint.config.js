// https://docs.expo.dev/guides/using-eslint/
const { defineConfig } = require('eslint/config');
const expoConfig = require('eslint-config-expo/flat');

module.exports = defineConfig([
  expoConfig,
  {
    ignores: ['dist/*', 'supabase/functions/*', 'site/*'],
  },
  {
    rules: {
      // React Compiler advice (the app does not use the compiler yet): reported, not blocking
      'react-hooks/set-state-in-effect': 'warn',
      'react-hooks/preserve-manual-memoization': 'warn',
      'react-hooks/refs': 'warn',
      'react-hooks/purity': 'warn',
      'react-hooks/immutability': 'warn',
      // expo-notifications re-exports its enums in a way eslint-plugin-import cannot see (tsc checks them)
      'import/namespace': 'off',
    },
  },
]);
