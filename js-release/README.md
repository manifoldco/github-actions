# js-release

## Usage

Publishes a package built in GitHub Actions to npm and updates the package.json with the new versions..

Assuming you have a [Makefile][makefile-example] that builds a package to `./pkg`:

```yaml
name: release

on:
  push:
    branches:
      - master

jobs:
  js-release:
    if: github.actor != 'dependabot@github.com'
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - uses: actions/setup-node@v1
        with:
          always-auth: true
          node-version: '12.x'
          registry-url: https://registry.npmjs.org
          scope: '@manifoldco' # Replace with your scope
      - run: npm install
      - run: make package
      - uses: manifoldco/github-actions/js-release@gui/npm-releases
        with:
          npm_publish_directory: pkg
    env:
      NODE_AUTH_TOKEN: ${{secrets.NPM_TOKEN}}

```

[makefile-example]: https://github.com/manifoldco/manifold-plan-table/blob/master/Makefile

## Contributing

⚠️ Run `npm run build` and **commit your changes** in `./dist`!
