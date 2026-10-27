import { access, readFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const marketplacePath = resolve(root, ".claude-plugin/marketplace.json");
const pluginPath = resolve(root, ".claude-plugin/plugin.json");

function fail(message) {
  console.error(`Claude marketplace validation failed: ${message}`);
  process.exitCode = 1;
}

async function readJson(path) {
  try {
    return JSON.parse(await readFile(path, "utf8"));
  } catch (error) {
    fail(`could not parse ${path.replace(`${root}/`, "")} (${error.message})`);
    return null;
  }
}

async function assertFile(path) {
  try {
    await access(path);
  } catch {
    fail(`missing ${path.replace(`${root}/`, "")}`);
  }
}

const [marketplace, plugin] = await Promise.all([
  readJson(marketplacePath),
  readJson(pluginPath),
]);

if (!marketplace || !plugin) process.exit(process.exitCode || 1);

if (marketplace.name !== "transitions-dev-marketplace") {
  fail('marketplace.name must be "transitions-dev-marketplace"');
}

if (!Array.isArray(marketplace.plugins) || marketplace.plugins.length !== 1) {
  fail("marketplace must declare exactly one plugin");
} else {
  const [entry] = marketplace.plugins;
  if (entry.name !== "transitions-dev") fail('marketplace plugin name must be "transitions-dev"');
  if (entry.source !== "./") fail('marketplace plugin source must be "./"');
  if (!entry.description) fail("marketplace plugin needs a description");
}

if (plugin.name !== "transitions-dev") {
  fail('plugin.name must be "transitions-dev"');
}

if (!/^\d+\.\d+\.\d+$/.test(plugin.version || "")) {
  fail("plugin.version must be a semantic version");
}

if (plugin.icon !== ".claude-plugin/icon.png") {
  fail('plugin.icon must be ".claude-plugin/icon.png"');
}

for (const skill of [
  ".claude-plugin/icon.png",
  "skills/transitions-dev/SKILL.md",
  "skills/transitions-polish/SKILL.md",
  "skills/transitions-ui-generation/SKILL.md",
]) {
  await assertFile(resolve(root, skill));
}

if (!process.exitCode) {
  console.log("Claude marketplace manifest and Web / Cowork skill payload are valid.");
}
