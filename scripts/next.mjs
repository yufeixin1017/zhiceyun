import { spawn } from "node:child_process";
import path from "node:path";

// Prefer the platform-native SWC. If macOS rejects its signature, Next.js can
// fall back to the official WASM package without changing system security settings.
const wasmDirectory = path.resolve("node_modules/@next/swc-wasm-nodejs");
const nextBinary = path.resolve("node_modules/next/dist/bin/next");
const child = spawn(process.execPath, [nextBinary, ...process.argv.slice(2)], {
  stdio: "inherit",
  env: {
    ...process.env,
    NEXT_TEST_WASM_DIR: process.env.NEXT_TEST_WASM_DIR || wasmDirectory,
  },
});

child.on("error", (error) => {
  console.error(error);
  process.exitCode = 1;
});
child.on("exit", (code, signal) => {
  if (signal) process.kill(process.pid, signal);
  else process.exitCode = code ?? 1;
});
