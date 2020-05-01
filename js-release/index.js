#!/usr/bin/env node
const os = require('os');
const fs = require('fs');
const path = require('path');
const bent = require('bent');
const git = require('simple-git/promise')();
const { execSync } = require('child_process');
const core = require('@actions/core');

// URL for the NPM registry, configurable.
const registeryURL = process.env.NPM_REGISTRY_URL || 'https://registry.npmjs.org/';

// Utility method to write the result of execSync to the console.
const exec = (str) => process.stdout.write(execSync(str));

// Utility method to get information as json from NPM
const get = bent('json', registeryURL);

// Event information from the current workflow
const event = JSON.parse(fs.readFileSync(process.env.GITHUB_EVENT_PATH, 'utf8').toString());

// eslint-disable-next-line import/no-dynamic-require
const pkg = require(path.join(process.cwd(), 'package.json'));

// Function that prepares the NPM local config for the deployment if the token is set.
const prepareNPMConfig = async () => {
  if (process.env.NPM_TOKEN) {
    // If the token is not set, attempt to create a config file.
    // Respect NPM_CONFIG_USERCONFIG if it is provided, default to $HOME/.npmrc

    const npmUserConfig = process.env.NPM_CONFIG_USERCONFIG || `${os.homedir()}/.npmrc`;
    let npmStrict = process.env.NPM_STRICT_SSL || true;
    const npmRegistryScheme = npmStrict ? 'https' : 'http';

    npmStrict = npmStrict ? 'true' : 'false';

    fs.writeFileSync(
      npmUserConfig,
      `${registeryURL}:_authToken=${process.env.NPM_TOKEN}\nregistry=${npmRegistryScheme}://${registeryURL}\nstrict-ssl=${npmStrict}`
    );

    fs.chmodSync(npmUserConfig, '600');
  }
};

// Function that will extract the current version info from the recent commits
const extractVersion = async () => {
  let latest;
  try {
    latest = await get(`${pkg.name}/latest`);
  } catch (e) {
    // unpublished
  }

  let messages;

  if (latest) {
    if (latest.gitHead === process.env.GITHUB_SHA) {
      return console.log('SHA matches latest release, skipping.');
    }
    if (latest.gitHead) {
      try {
        const logs = await git.log({ from: latest.gitHead, to: process.env.GITHUB_SHA });
        messages = logs.all.map((r) => `${r.message}\n${r.body}`);
      } catch (e) {
        latest = null;
      }
    } else {
      latest = null;
    }
  }
  if (!latest) {
    messages = (event.commits || []).map((commit) => `${commit.message}\n${commit.body}`);
  }

  let version = 'patch';
  if (messages.map((message) => message.includes('BREAKING CHANGE')).includes(true)) {
    version = 'major';
  } else if (messages.map((message) => message.toLowerCase().startsWith('feat')).includes(true)) {
    version = 'minor';
  }

  return version;
};

const run = async () => {
  const input = {
    npm_publish_directory: core.getInput('npm_publish_directory'),
  };

  try {
    await prepareNPMConfig();

    const remoteName = 'releaser';
    const githubActor = process.env.GITHUB_ACTOR;
    const githubToken = process.env.GITHUB_TOKEN;
    const githubRepo = process.env.GITHUB_REPOSITORY;

    // Get the path to the remote repo for acting there
    const remoteRepo = `https://${githubActor}:${githubToken}@github.com/${githubRepo}.git`;

    // Setup git for the push
    await git.addConfig('http.sslVerify', false);
    await git.addConfig('user.name', 'Auto-Releaser');
    await git.addConfig('user.email', 'actions@users.noreply.github.com');

    await git.addRemote(remoteName, remoteRepo);

    const version = await extractVersion();

    // Update NPM version in package.json
    const current = execSync(`npm view ${pkg.name} version`).toString();
    exec(`npm version --allow-same-version=true --git-tag-version=false ${current} `);
    console.log('current: ', current, ' / ', 'version: ', version);
    const newVersion = execSync(`npm version --git-tag-version=false ${version}`).toString();
    console.log('new version:', newVersion);

    // Publishes to NPM using a provided directory if any
    exec(`npm publish ${input.npm_publish_directory ? input.npm_publish_directory : ''}`);

    // Publish tag to GitHub
    await git.addTag(newVersion);
    exec(`echo "::set-output name=version::${newVersion}"`);

    // Publish changes to package.json to GitHub
    await git.commit(newVersion);
    await git.push(remoteName);
    await git.pushTags(remoteName);

    return 0;
  } catch (e) {
    console.error(e);
    return 1; // Return error code 1
  }
};

run();
