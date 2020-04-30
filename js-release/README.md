# js-release

## Usage

Publishes a package built in GitHub Actions to npm and updates the package.json with the new versions..

Assuming you have a [Makefile][makefile-example] that builds a package to `./pkg`:

```yaml
name: release

on:
  push:
    tags:
      - "v[0-9]+.[0-9]+.[0-9]+"

jobs:
  js-release:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - uses: actions/setup-node@v1
      - run: npm install
      - run: npm run typecheck
      - run: make package
      - uses: manifoldco/github-actions/js-release@master
        with:
          npm_publish_directory: pkg # what directory should be published to npm
      env:
        NPM_TOKEN: ${{secrets.NPM_TOKEN}}
```

[makefile-example]: https://github.com/manifoldco/manifold-plan-table/blob/master/Makefile

## Contributing

⚠️ Run `npm run build` and **commit your changes** in `./dist`!
