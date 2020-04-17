import { exec } from "child_process";
import readdirp from "readdirp";
import * as core from "@actions/core";
import { Storage } from "@google-cloud/storage";
import setupGCloud from "./setup-gcloud/setup-gcloud";

// config
const BUCKET = "manifold-js";
const URL_MAP = "manifold-js-cdn-urlmap";

/**
 * Publish to npm
 */
async function npmPublish({
  npmDistTag,
  npmToken,
  workspace,
}: {
  npmDistTag: string;
  npmToken: string;
  workspace: string;
}) {
  await exec(`echo "//registry.npmjs.org/:_authToken=${npmToken}" > ~/.npmrc`);
  await exec(`npm publish ${workspace} --tag ${npmDistTag}`);
}

/**
 * Publish to Manifold CDN
 */
async function cdnPublish({
  packageName,
  semver,
  serviceAccountKey,
  workspace,
}: {
  packageName: string;
  semver: string;
  serviceAccountKey: string;
  workspace: string;
}) {
  // recursively read workspace dir
  const files = await readdirp.promise(workspace);

  // upload files to CDN
  const storage = new Storage({ keyFile: serviceAccountKey });
  files.forEach((file) => {
    storage.bucket(BUCKET).upload(file.fullPath, {
      destination: `${packageName}@${semver}/${file.path}`,
    });
  });

  // update URL Map
  await setupGCloud();
  // latest
  await exec(
    `gcloud compute url-maps remove-path-matcher ${URL_MAP} --path-matcher-name=latest`
  );
  await exec(
    `gcloud compute url-maps add-path-matcher ${URL_MAP} --path-matcher-name=latest --path-rules=/${packageName}=/${packageName}@${semver}`
  );
  // major
  const major = semver.split(".")[0];
  try {
    await exec(
      `gcloud compute url-maps remove-path-matcher ${URL_MAP} --path-matcher-name=v${major}`
    );
  } catch (err) {
    // new path matcher name; ignore
  }
  await exec(
    `gcloud compute url-maps add-path-matcher ${URL_MAP} --path-matcher-name=v${major} --path-rules=/${packageName}@${major}=/${packageName}@${semver}`
  );
  // minor
  const minor = semver.split(".")[1];
  try {
    await exec(
      `gcloud compute url-maps remove-path-matcher ${URL_MAP} --path-matcher-name=v${major}.${minor}`
    );
  } catch (err) {
    // new path matcher name; ignore
  }
  await exec(
    `gcloud compute url-maps add-path-matcher ${URL_MAP} --path-matcher-name=v${major}.${minor} --path-rules=/${packageName}@${major}.${minor}=/${packageName}@${semver}`
  );
}

/**
 * Main entry function
 */
async function run() {
  const input = {
    package_name: core.getInput("package_name"),
    workspace: core.getInput("workspace"),
    semver: core.getInput("semver"),
    npm_dist_tag: core.getInput("npm_dist_tag") || "next",
    npm_token: core.getInput("npm_token"),
    service_account_key: core.getInput("service_account_key"),
  };

  // check inputs
  Object.entries(input).forEach(([k, v]) => {
    if (!v) {
      throw new Error(`missing input: ${k}`);
    }
  });

  // publish to npm
  const bgNpm = npmPublish({
    npmDistTag: input.npm_dist_tag,
    npmToken: input.npm_token,
    workspace: input.workspace,
  });

  // publish to CDN
  const bgCDN = cdnPublish({
    packageName: input.package_name,
    semver: input.semver,
    serviceAccountKey: input.service_account_key,
    workspace: input.workspace,
  });

  // run both jobs in parallel
  await bgNpm;
  await bgCDN;
}

run();
