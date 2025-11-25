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

      // Style (Formatting rules disabled - Prettier handles these)
      // indent: ['error', 2, { SwitchCase: 1 }], // Disabled - Prettier handles indentation
      // quotes: ['error', 'single', { avoidEscape: true }], // Disabled - Prettier handles quotes
      // semi: ['error', 'always'], // Disabled - Prettier handles semicolons
      // 'comma-dangle': ['error', 'only-multiline'], // Disabled - Prettier handles trailing commas

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
