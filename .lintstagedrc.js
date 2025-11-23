export default {
  // JavaScript and Svelte files - run ESLint and Prettier
  '*.{js,svelte}': ['eslint --fix', 'prettier --write'],

  // JSON and Markdown files - only Prettier
  '*.{json,md}': ['prettier --write'],

  // Run tests for changed worker directories
  'auth-worker/**/*.js': async files => {
    const hasSourceChanges = files.some(file => file.includes('/src/'));
    if (hasSourceChanges) {
      return 'cd auth-worker && npm run test:coverage -- --reporter min';
    }
    return [];
  },

  'cart-worker/**/*.js': async files => {
    const hasSourceChanges = files.some(file => file.includes('/src/'));
    if (hasSourceChanges) {
      return 'cd cart-worker && npm run test:coverage -- --reporter min';
    }
    return [];
  },

  'catalog-worker/**/*.js': async files => {
    const hasSourceChanges = files.some(file => file.includes('/src/'));
    if (hasSourceChanges) {
      return 'cd catalog-worker && npm run test:coverage -- --reporter min';
    }
    return [];
  },

  'fulfilment-worker/**/*.js': async files => {
    const hasSourceChanges = files.some(file => file.includes('/src/'));
    if (hasSourceChanges) {
      return 'cd fulfilment-worker && npm run test:coverage -- --reporter min';
    }
    return [];
  },

  'order-worker/**/*.js': async files => {
    const hasSourceChanges = files.some(file => file.includes('/src/'));
    if (hasSourceChanges) {
      return 'cd order-worker && npm run test:coverage -- --reporter min';
    }
    return [];
  },

  'payment-worker/**/*.js': async files => {
    const hasSourceChanges = files.some(file => file.includes('/src/'));
    if (hasSourceChanges) {
      return 'cd payment-worker && npm run test:coverage -- --reporter min';
    }
    return [];
  },

  'price-worker/**/*.js': async files => {
    const hasSourceChanges = files.some(file => file.includes('/src/'));
    if (hasSourceChanges) {
      return 'cd price-worker && npm run test:coverage -- --reporter min';
    }
    return [];
  },
};
