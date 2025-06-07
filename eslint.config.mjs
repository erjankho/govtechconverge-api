import eslint from '@eslint/js';
import pluginSimpleImportSort from 'eslint-plugin-simple-import-sort';
import globals from 'globals';
import tseslint from 'typescript-eslint';

export default tseslint.config(
  { ignores: ['**/build/**', '**/dist/**'] },

  eslint.configs.recommended,

  {
    files: ['**/*.ts'],
    extends: [...tseslint.configs.recommended, ...tseslint.configs.stylistic],
    rules: {
      '@typescript-eslint/no-unused-vars': [
        'error',
        {
          argsIgnorePattern: '^_',
          varsIgnorePattern: '^_',
        },
      ],
      '@typescript-eslint/consistent-type-imports': 'error',
    },
  },

  {
    plugins: {
      'simple-import-sort': pluginSimpleImportSort,
    },
    rules: {
      'simple-import-sort/imports': 'error',
      'simple-import-sort/exports': 'error',
    },
  },

  {
    files: ['packages/api/**/*.{js,mjs,ts}'],
    languageOptions: {
      globals: globals.node,
    },
  },

  {
    files: ['packages/db/**/*.{js,mjs,ts}'],
    languageOptions: {
      globals: globals.node,
    },
  },

  {
    files: ['packages/db-cli/**/*.{js,mjs,ts}'],
    languageOptions: {
      globals: globals.node,
    },
  },

  {
    files: ['packages/internal/**/*.{js,mjs,ts}'],
    languageOptions: {
      globals: globals.node,
    },
  },

  {
    files: ['packages/zing/**/*.{js,mjs,ts}'],
    languageOptions: {
      globals: globals.node,
    },
  },
);
