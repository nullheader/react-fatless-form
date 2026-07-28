import js from '@eslint/js';
import tseslint from 'typescript-eslint';
import reactPlugin from 'eslint-plugin-react';
import reactHooksPlugin from 'eslint-plugin-react-hooks';
import globals from 'globals';

export default tseslint.config(
  // Global ignores (replaces .eslintignore)
  { ignores: ['**/dist/**', '**/node_modules/**', '**/.expo/**'] },
  
  // Base recommended configs
  js.configs.recommended,
  ...tseslint.configs.recommended,
  
  // Custom setup for React and TypeScript
  {
    files: ['**/*.{js,mjs,cjs,ts,jsx,tsx}'],
    languageOptions: {
      ecmaVersion: 'latest',
      globals: {
        ...globals.browser,
        ...globals.node,
      },
      parserOptions: {
        ecmaFeatures: { jsx: true },
      },
    },
    plugins: {
      react: reactPlugin,
      'react-hooks': reactHooksPlugin,
    },
    settings: {
      react: { version: 'detect' },
    },
    rules: {
      ...reactPlugin.configs.recommended.rules,
      ...reactHooksPlugin.configs.recommended.rules,
      
      // Turn off the requirement for importing React in Next.js/Vite/Modern React
      'react/react-in-jsx-scope': 'off',
    },
  }
);