module.exports = {
  extends: [
    'airbnb-base',
    'prettier',
  ],
  plugins: ['jsdoc', 'prettier'],
  env: {
    browser: true,
    node: true,
    jest: true,
    es6: true,
  },
  rules: {
    'arrow-parens': 'off', // let Prettier decide
    camelcase: 'off', // underscores are a thing
    'class-methods-use-this': 'off', // component lifecycle methods sometimes don't use `this`
    'comma-dangle': [
      'error',
      {
        arrays: 'always-multiline',
        exports: 'never',
        functions: 'never', // function commas are weird
        imports: 'always-multiline',
        objects: 'always-multiline',
      },
    ],
    'consistent-return': 'off',
    curly: ['error', 'all'],
    'default-case': 'off',
    'func-names': 'off',
    'function-paren-newline': 'off', // let Prettier decide
    'implicit-arrow-linebreak': 'off', // let Prettier decide
    'import/extensions': 'off', // TypeScript handles this
    'import/no-extraneous-dependencies': 'off', // We need zero deps for npm
    'import/no-named-as-default': 'off',
    'import/no-unresolved': 'off', // TypeScript got this
    'import/prefer-default-export': 'off', // named exports are perfectly fine
    'lines-between-class-members': 'off', // class members don’t need that space!
    'max-len': 'off', // let Prettier decide
    'no-console': 'off',
    'no-irregular-whitespace': 'off',
    'no-restricted-globals': 'off',
    'no-useless-constructor': 'off', // it IS useful to NestJS
    'object-curly-newline': 'off', // let Prettier decide
    'prettier/prettier': 'error',
    'require-jsdoc': 'warn', // try it to see if we like it
  },
};
