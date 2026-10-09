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
const executable = path.join(dist, "YTM_Discord_RPC_silent_v6.exe");
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

// Switch the PE subsystem from Console (3) to Windows GUI (2), so launching
// the executable directly does not open a command window.
const binary = fs.readFileSync(executable);
if (binary.subarray(0, 2).toString("ascii") !== "MZ") {
  throw new Error("Generated executable is not a valid Windows PE file.");
}
const peOffset = binary.readUInt32LE(0x3c);
if (binary.subarray(peOffset, peOffset + 4).toString("ascii") !== "PE\0\0") {
  throw new Error("Generated executable has an invalid PE header.");
}
const optionalHeader = peOffset + 24;
const optionalHeaderMagic = binary.readUInt16LE(optionalHeader);
if (optionalHeaderMagic !== 0x20b && optionalHeaderMagic !== 0x10b) {
  throw new Error("Generated executable has an unsupported PE optional header.");
}
const subsystemOffset = optionalHeader + 68;
const subsystem = binary.readUInt16LE(subsystemOffset);
if (subsystem !== 3) {
  throw new Error(`Expected console subsystem (3), found ${subsystem}.`);
}
binary.writeUInt16LE(2, subsystemOffset);

// Keep the existing UTF-16 string size unchanged while replacing the
// executable description shown by Windows Task Manager.
const oldDescription = Buffer.from("Node.js JavaScript Runtime", "utf16le");
const newDescriptionText = "YTM Discord RPC".padEnd(
  oldDescription.length / 2,
  "\0",
);
const newDescription = Buffer.from(newDescriptionText, "utf16le");
const descriptionOffset = binary.indexOf(oldDescription);
if (
  descriptionOffset < 0 ||
  binary.indexOf(oldDescription, descriptionOffset + 1) >= 0
) {
  throw new Error("Could not find a unique executable description resource.");
}
newDescription.copy(binary, descriptionOffset);

const descriptionKey = Buffer.from("FileDescription\0", "utf16le");
const descriptionKeyOffset = binary.indexOf(descriptionKey);
if (descriptionKeyOffset < 6 || binary.indexOf(descriptionKey, descriptionKeyOffset + 1) >= 0) {
  throw new Error("Could not find a unique FileDescription resource key.");
}
const valueLengthOffset = descriptionKeyOffset - 4;
const previousValueLength = binary.readUInt16LE(valueLengthOffset);
const newValueLength = Buffer.byteLength("YTM Discord RPC", "utf16le") / 2 + 1;
if (previousValueLength !== oldDescription.length / 2 + 1) {
  throw new Error("Unexpected FileDescription resource length.");
}
binary.writeUInt16LE(newValueLength, valueLengthOffset);

fs.writeFileSync(executable, binary);

console.log(`Created ${executable}`);
