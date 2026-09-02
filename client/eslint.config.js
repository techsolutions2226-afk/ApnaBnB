import js from '@eslint/js'
import globals from 'globals'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import { defineConfig, globalIgnores } from 'eslint/config'

export default defineConfig([
  globalIgnores(['dist']),
  {
    files: ['**/*.{js,jsx}'],
    extends: [
      js.configs.recommended,
      reactHooks.configs.flat.recommended,
      reactRefresh.configs.vite,
    ],
    languageOptions: {
      ecmaVersion: 2020,
      globals: globals.browser,
      parserOptions: {
        ecmaVersion: 'latest',
        ecmaFeatures: { jsx: true },
        sourceType: 'module',
      },
    },
    rules: {
      // This config has no eslint-plugin-react, so JSX usage isn't tracked;
      // it relies on the pattern below to skip capitalised components. Lower-
      // case namespaces used only as JSX (framer-motion's `motion.div`) need
      // to be listed explicitly or they read as unused.
      'no-unused-vars': [
        'error',
        { varsIgnorePattern: '^([A-Z_]|motion$)' },
      ],
    },
  },
])
