// @ts-check
/** @type {import('@commitlint/types').UserConfig} */
const config = {
  extends: ['@commitlint/config-conventional'],
  rules: {
    // Type must be one of the allowed values
    'type-enum': [
      2,
      'always',
      [
        'feat',     // New feature
        'fix',      // Bug fix
        'docs',     // Documentation only
        'style',    // Code style (no logic change)
        'refactor', // Refactoring
        'perf',     // Performance improvement
        'test',     // Tests
        'build',    // Build system / dependencies
        'ci',       // CI configuration
        'chore',    // Other changes
        'revert',   // Revert commit
      ],
    ],
    // Scope is optional
    'scope-empty': [0, 'never'],
    // Subject rules
    'subject-case': [2, 'never', ['sentence-case', 'start-case', 'pascal-case', 'upper-case']],
    'subject-empty': [2, 'never'],
    'subject-full-stop': [2, 'never', '.'],
    // Header max length (type + scope + subject)
    'header-max-length': [2, 'always', 100],
  },
};

module.exports = config;
