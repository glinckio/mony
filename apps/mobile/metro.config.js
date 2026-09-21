const { getDefaultConfig } = require("expo/metro-config");
const path = require("path");

const projectRoot = __dirname;
const monorepoRoot = path.resolve(projectRoot, "../..");

const config = getDefaultConfig(projectRoot);

// Monorepo support: let Metro see sibling workspace packages and the
// hoisted root node_modules (pnpm + shamefully-hoist=true).
config.watchFolders = [monorepoRoot];
config.resolver.nodeModulesPaths = [
  path.resolve(projectRoot, "node_modules"),
  path.resolve(monorepoRoot, "node_modules"),
];
config.resolver.disableHierarchicalLookup = true;
config.resolver.unstable_enableSymlinks = true;

// Metro's "package exports" resolution (default on since Expo SDK 52) trips
// up on packages with incomplete/ambiguous "exports" maps in pnpm monorepos —
// manifests as "Cannot read property 'default' of undefined" at runtime.
// Disable it until every dependency's exports map is verified clean.
config.resolver.unstable_enablePackageExports = false;

module.exports = config;
