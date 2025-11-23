import js from '@eslint/js';
import globals from 'globals';

export default [
  js.configs.recommended,
  {
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: 'module',
      globals: {
        ...globals.browser,
        ...globals.node,
        ...globals.es2021,
        ...globals.mocha, // Add Mocha test globals (describe, it, before, after, etc.)
      },
    },
    rules: {
      // Possible Errors
      'no-console': 'off', // Allow console for logging in workers
      'no-unused-vars': ['warn', { argsIgnorePattern: '^_', varsIgnorePattern: '^_' }],

      // Best Practices
      eqeqeq: ['error', 'always'],
      'no-var': 'error',
      'prefer-const': 'warn',
      'prefer-arrow-callback': 'warn',

      // Style
      indent: ['error', 2, { SwitchCase: 1 }],
      quotes: ['error', 'single', { avoidEscape: true }],
      semi: ['error', 'always'],
      'comma-dangle': ['error', 'only-multiline'],

      // ES6+
      'arrow-spacing': 'error',
      'no-duplicate-imports': 'error',
      'object-shorthand': 'warn',
      'prefer-template': 'warn',
    },
  },
  {
    // Ignore patterns
    ignores: [
      '**/node_modules/**',
      '**/build/**',
      '**/dist/**',
      '**/coverage/**',
      '**/.svelte-kit/**',
      '**/.wrangler/**',
      '**/wrangler.toml',
      '**/*.config.js',
      'frontend-worker/ecommerce/build/**',
    ],
  },
];
