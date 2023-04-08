module.exports = {
  extends: 'standard-with-typescript',
  parserOptions: {
    project: './tsconfig.json',
  },
  rules: {
    // disable the eslint rule as it can report incorrectly
    'space-before-function-paren': 'off',
    '@typescript-eslint/space-before-function-paren': [
      'error',
      {
        anonymous: 'always',
        named: 'never',
        asyncArrow: 'always',
      },
    ],
    '@typescript-eslint/comma-dangle': [
      'error',
      'always-multiline',
    ],
    'no-labels': 'off',
    '@typescript-eslint/no-non-null-assertion': 'off',
  },
  // "env": {
  //   "browser": true,
  //   "es6": true,
  //   "node": true
  // },
  // "parser": "@typescript-eslint/parser",
  // "parserOptions": {
  //   "project": "tsconfig.json",
  //   "sourceType": "module"
  // },
  // "plugins": [
  //   "eslint-plugin-import",
  //   "@typescript-eslint"
  // ],
  // "rules": {
  //   "@typescript-eslint/consistent-type-definitions": "error",
  //   "@typescript-eslint/dot-notation": "off",
  //   "@typescript-eslint/explicit-member-accessibility": [
  //     "off",
  //     {
  //       "accessibility": "explicit"
  //     }
  //   ],
  //   "@typescript-eslint/indent": [
  //     "error",
  //     2
  //   ],
  //   "@typescript-eslint/member-delimiter-style": [
  //     "error",
  //     {
  //       "multiline": {
  //         "delimiter": "none",
  //         "requireLast": true
  //       },
  //       "singleline": {
  //         "delimiter": "semi",
  //         "requireLast": false
  //       }
  //     }
  //   ],
  //   "@typescript-eslint/member-ordering": "error",
  //   "@typescript-eslint/naming-convention": "error",
  //   "@typescript-eslint/no-empty-function": "off",
  //   "@typescript-eslint/no-empty-interface": "error",
  //   "@typescript-eslint/no-inferrable-types": [
  //     "error",
  //     {
  //       "ignoreParameters": true
  //     }
  //   ],
  //   "@typescript-eslint/no-misused-new": "error",
  //   "@typescript-eslint/no-unused-expressions": "error",
  //   "@typescript-eslint/prefer-function-type": "error",
  //   "@typescript-eslint/quotes": [
  //     "error",
  //     "single",
  //     {
  //       "avoidEscape": true
  //     }
  //   ],
  //   "@typescript-eslint/semi": [
  //     "error",
  //     "never"
  //   ],
  //   "@typescript-eslint/type-annotation-spacing": "error",
  //   "@typescript-eslint/unified-signatures": "error",
  //   "arrow-body-style": "error",
  //   "brace-style": [
  //     "error",
  //     "1tbs"
  //   ],
  //   "comma-dangle": [
  //     "error",
  //     "always-multiline"
  //   ],
  //   "constructor-super": "error",
  //   "curly": "error",
  //   "eol-last": "error",
  //   "eqeqeq": [
  //     "error",
  //     "smart"
  //   ],
  //   "guard-for-in": "error",
  //   "id-blacklist": "off",
  //   "id-match": "off",
  //   "import/order": "error",
  //   "max-len": [
  //     "error",
  //     {
  //       "code": 140
  //     }
  //   ],
  //   "no-bitwise": "error",
  //   "no-caller": "error",
  //   "no-console": [
  //     "error",
  //     {
  //       "allow": [
  //         "warn",
  //         "dir",
  //         "timeLog",
  //         "assert",
  //         "clear",
  //         "count",
  //         "countReset",
  //         "group",
  //         "groupEnd",
  //         "table",
  //         "dirxml",
  //         "error",
  //         "groupCollapsed",
  //         "Console",
  //         "profile",
  //         "profileEnd",
  //         "timeStamp",
  //         "context"
  //       ]
  //     }
  //   ],
  //   "no-debugger": "error",
  //   "no-empty": "off",
  //   "no-eval": "error",
  //   "no-fallthrough": "error",
  //   "no-new-wrappers": "error",
  //   "no-restricted-imports": "off",
  //   "no-shadow": [
  //     "error",
  //     {
  //       "hoist": "all"
  //     }
  //   ],
  //   "no-throw-literal": "error",
  //   "no-trailing-spaces": "error",
  //   "no-undef-init": "error",
  //   "no-underscore-dangle": "off",
  //   "no-unused-labels": "error",
  //   "no-var": "error",
  //   "prefer-const": "error",
  //   "radix": "error",
  //   "space-before-function-paren": [
  //     "error",
  //     {
  //       "anonymous": "always",
  //       "named": "never",
  //       "asyncArrow": "always"
  //     }
  //   ],
  //   "space-in-parens": [
  //     "error",
  //     "always"
  //   ],
  //   "spaced-comment": [
  //     "error",
  //     "always",
  //     {
  //       "markers": [
  //         "/"
  //       ]
  //     }
  //   ],
  //   // "@typescript-eslint/tslint/config": [
  //   //   "error",
  //   //   {
  //   //     "rules": {
  //   //       "import-spacing": true,
  //   //       "whitespace": [
  //   //         true,
  //   //         "check-branch",
  //   //         "check-decl",
  //   //         "check-operator",
  //   //         "check-module",
  //   //         "check-rest-spread",
  //   //         "check-separator",
  //   //         "check-type",
  //   //         "check-typecast",
  //   //         "check-type-operator",
  //   //         "check-preblock"
  //   //       ]
  //   //     }
  //   //   }
  //   // ]
  // }
}
