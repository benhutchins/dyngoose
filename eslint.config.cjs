const love = require('eslint-config-love')
const simpleImportSort = require('eslint-plugin-simple-import-sort')
const importPlugin = require('eslint-plugin-import')

module.exports = [
  {
    ...love,
    files: ['**/*.js', '**/*.ts'],
    plugins: {
      ...love.plugins ?? {},
      'simple-import-sort': simpleImportSort,
      'import': importPlugin,
    },
    rules: {
      ...love.rules,
      // disable the eslint rule as it can report incorrectly
      // 'space-before-function-paren': 'off',

      // sort imports!
      'simple-import-sort/imports': 'error',
      'simple-import-sort/exports': 'error',
      "import/first": "error",
      "import/newline-after-import": "error",
      "import/no-duplicates": "error",

      // we use a few labeled for loops
      'no-labels': 'off',

      '@typescript-eslint/no-non-null-assertion': 'off',

      // we want to use strict === false to avoid truthy logic
      '@typescript-eslint/no-unnecessary-boolean-literal-compare': 'off',

      // uninitialized variables are assumed as undefined
      '@typescript-eslint/init-declarations': 'off',

      // we use any
      '@typescript-eslint/no-explicit-any': 'off',
      '@typescript-eslint/no-unsafe-argument': 'off',

      // we use delete
      '@typescript-eslint/no-dynamic-delete': 'off',

      // attribute classes do not all use this in toDynamo, fromDynamo, toJSON, etc
      '@typescript-eslint/class-methods-use-this': 'off',

      // allow throwing of caught errors (unknowns)
      '@typescript-eslint/only-throw-error': ['error', {
        allowThrowingUnknown: true,
      }],

      // we need to rely on require at times
      '@typescript-eslint/no-require-imports': 'off',
    }
  }
]