module.exports = {
  extends: ['@commitlint/config-conventional'],

  rules: {
    'type-enum': [
      2,
      'always',
      [
        'feature',
        'bug',
        'hotfix',
        'refactor',
        'chore',
        'docs',
        'test',
        'performance'
      ]
    ],

    'scope-enum': [
      2,
      'always',
      [
        'frontend',
        'ui-ux',
        'auth',
        'api-service',
        'component',
        'service',
        'guard',
        'interceptor',
        'route',
        'util',
        'other'
      ]
    ],

    'scope-empty': [2, 'never'],
    'subject-empty': [2, 'never'],
    'subject-case': [0]
  }
};