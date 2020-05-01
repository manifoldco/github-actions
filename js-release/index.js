#!/usr/bin/env node
const fs = require('fs');
const path = require('path');
const git = require('simple-git/promise')();
const { execSync } = require('child_process');
const core = require('@actions/core');

// Utility method to write the result of execSync to the console.
const exec = (str) => process.stdout.write(execSync(str));

// Event information from the current workflow
const event = JSON.parse(fs.readFileSync(process.env.GITHUB_EVENT_PATH, 'utf8').toString());

// Function that will extract the current version info from the recent commits
const extractVersion = async () => {
  const messages = (event.commits || []).map((commit) => `${commit.message}\n${commit.body}`);

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
    const directory = input.npm_publish_directory || '';
    const remoteName = 'releaser';
    const githubActor = process.env.GITHUB_ACTOR;
    const githubToken = process.env.GITHUB_TOKEN;
    const githubRepo = process.env.GITHUB_REPOSITORY;

    // Get the path to the remote repo for acting there
    const remoteRepo = `https://${githubActor}:${githubToken}@github.com/${githubRepo}.git`;

    const pkgPath = path.join(process.env.GITHUB_WORKSPACE, directory, 'package.json');
    // eslint-disable-next-line import/no-dynamic-require,global-require
    const pkg = require(pkgPath);

    // Setup git for the push
    await git.addConfig('http.sslVerify', false);
    await git.addConfig('user.name', 'Auto-Releaser');
    await git.addConfig('user.email', 'actions@users.noreply.github.com');

    await git.addRemote(remoteName, remoteRepo);

    const version = await extractVersion();

    // Move into the directory if necessary
    if (directory !== '') {
      execSync(`cd ${directory}`);
    }

    // Update NPM version in package.json
    const current = execSync(`npm view ${pkg.name.replace('%2f', '/')} version`).toString();
    exec(`npm version --allow-same-version=true --git-tag-version=false ${current} `);
    console.log('current: ', current, ' / ', 'version: ', version);
    const newVersion = execSync(`npm version --git-tag-version=false ${version}`).toString();
    console.log('new version:', newVersion);

    // Publishes to NPM using a provided directory if any
    execSync(`EXPORT NPM_TOKEN=${process.env.NPM_TOKEN}`);
    exec(`npm publish ${directory}`);

    // Publish tag to GitHub
    await git.addTag(newVersion);
    exec(`echo "::set-output name=version::${newVersion}"`);

    // Publish changes to package.json to GitHub
    await git.commit(newVersion);
    await git.push(remoteName);
    await git.pushTags(remoteName);
  } catch (e) {
    console.error(e.message);
    core.setFailed(e.message);
  }
};

run();
