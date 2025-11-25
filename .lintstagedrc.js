export default {
  // JavaScript and Svelte files - run ESLint and Prettier
  '*.{js,svelte}': ['eslint --fix', 'prettier --write'],

  // JSON and Markdown files - only Prettier
  '*.{json,md}': ['prettier --write'],

  // Run tests with coverage for changed worker directories
  // Only runs if src/ files are changed (skips test-only changes)
  // Enforces 50% minimum coverage threshold
  'auth-worker/**/*.js': async files => {
    const hasSourceChanges = files.some(file => file.includes('/src/'));
    if (hasSourceChanges) {
      return [
        'cd auth-worker && npm run test:coverage -- --reporter min',
        'cd auth-worker && c8 check-coverage --lines 50 --functions 50 --branches 50',
      ];
    }
    return [];
  },

  'cart-worker/**/*.js': async files => {
    const hasSourceChanges = files.some(file => file.includes('/src/'));
    if (hasSourceChanges) {
      return [
        'cd cart-worker && npm run test:coverage',
        'cd cart-worker && c8 check-coverage --lines 50 --functions 50 --branches 50',
      ];
    }
    return [];
  },

  'catalog-worker/**/*.js': async files => {
    const hasSourceChanges = files.some(file => file.includes('/src/'));
    if (hasSourceChanges) {
      return [
        'cd catalog-worker && npm run test:coverage -- --reporter min',
        'cd catalog-worker && c8 check-coverage --lines 50 --functions 50 --branches 50',
      ];
    }
    return [];
  },

  'fulfilment-worker/**/*.js': async files => {
    const hasSourceChanges = files.some(file => file.includes('/src/'));
    if (hasSourceChanges) {
      return [
        'cd fulfilment-worker && npm run test:coverage -- --reporter min',
        'cd fulfilment-worker && c8 check-coverage --lines 50 --functions 50 --branches 50',
      ];
    }
    return [];
  },

  'order-worker/**/*.js': async files => {
    const hasSourceChanges = files.some(file => file.includes('/src/'));
    if (hasSourceChanges) {
      return [
        'cd order-worker && npm run test:coverage',
        'cd order-worker && c8 check-coverage --lines 50 --functions 50 --branches 50',
      ];
    }
    return [];
  },

  'payment-worker/**/*.js': async files => {
    const hasSourceChanges = files.some(file => file.includes('/src/'));
    if (hasSourceChanges) {
      return [
        'cd payment-worker && npm run test:coverage -- --reporter min',
        'cd payment-worker && c8 check-coverage --lines 50 --functions 50 --branches 50',
      ];
    }
    return [];
  },

  'price-worker/**/*.js': async files => {
    const hasSourceChanges = files.some(file => file.includes('/src/'));
    if (hasSourceChanges) {
      return [
        'cd price-worker && npm run test:coverage -- --reporter min',
        'cd price-worker && c8 check-coverage --lines 50 --functions 50 --branches 50',
      ];
    }
    return [];
  },

  // Note: log-consolidator-worker excluded (cron-only, no tests)
  // Note: frontend-worker excluded (different build system)
};
