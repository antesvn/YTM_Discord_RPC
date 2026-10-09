"use strict";

const fs = require("node:fs");
const path = require("node:path");
const { spawnSync } = require("node:child_process");
const esbuild = require("esbuild");

const root = path.resolve(__dirname, "..");
const dist = path.join(root, "dist");
const bundle = path.join(dist, "bundle.cjs");
const seaConfig = path.join(dist, "sea-config.json");
const seaBlob = path.join(dist, "sea-prep.blob");
const executable = path.join(dist, "YTM_Discord_RPC.exe");
const minimumNode = [24, 8];

const [major, minor] = process.versions.node.split(".").map(Number);
if (major < minimumNode[0] || (major === minimumNode[0] && minor < minimumNode[1])) {
  throw new Error("Build requires Node.js 24.8 or newer.");
}

fs.mkdirSync(dist, { recursive: true });

esbuild.buildSync({
  entryPoints: [path.join(root, "server.js")],
  bundle: true,
  platform: "node",
  format: "cjs",
  target: "node24",
  outfile: bundle,
});

fs.writeFileSync(
  seaConfig,
  JSON.stringify(
    {
      main: bundle,
      output: seaBlob,
      disableExperimentalSEAWarning: true,
      useCodeCache: false,
    },
    null,
    2,
  ),
);

function runNode(args) {
  const result = spawnSync(process.execPath, args, {
    cwd: root,
    stdio: "inherit",
    windowsHide: true,
  });
  if (result.error) throw result.error;
  if (result.status !== 0) {
    throw new Error(`Build command failed with exit code ${result.status}`);
  }
}

runNode(["--experimental-sea-config", seaConfig]);
fs.copyFileSync(process.execPath, executable);
runNode([
  path.join(root, "node_modules", "postject", "dist", "cli.js"),
  executable,
  "NODE_SEA_BLOB",
  seaBlob,
  "--sentinel-fuse",
  "NODE_SEA_FUSE_fce680ab2cc467b6e072b8b5df1996b2",
]);

console.log(`Created ${executable}`);
