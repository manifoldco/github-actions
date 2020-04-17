# js-release

## Usage

Publishes a package built in GitHub Actions to npm & Manifold’s JS CDN.

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
          package_name: "@manifoldco/my-package"
          workspace: ${GITHUB_WORKSPACE}/pkg # what directory should be published to npm/CDN
          semver: ${GITHUB_REF#refs/tags/v} # e.g. `0.1.2`
          npm_dist_tag: latest # or `next` if a pre-release
          npm_token: ${{ secrets.NPM_TOKEN }} # NPM token
          service_account_key: ${{ secrets.GOOGLE_APPLICATION_CREDENTIALS }} # GCP key file (base64-encoded)
```

[makefile-example]: https://github.com/manifoldco/manifold-plan-table/blob/master/Makefile

## Contributing

⚠️ Run `npm run build` and **commit your changes** in `./dist`!
