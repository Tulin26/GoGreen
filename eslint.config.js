import globals from 'globals';

const rules = {
  'no-undef': 'error',
  'no-unused-vars': ['error', { args: 'none', caughtErrors: 'none' }],
};

export default [
  { ignores: ['dist/', 'node_modules/', 'public/', 'docs/', 'tests/e2e/'] },
  { files: ['src/**/*.js'], languageOptions: { globals: globals.browser }, rules },
  { files: ['api/**/*.js', 'scripts/**/*.mjs', 'tests/**/*.js', '*.js'], languageOptions: { globals: globals.node }, rules },
];
