// Metro config for a pnpm monorepo where workspace packages ship TypeScript
// source using `.js` import specifiers (the verbatimModuleSyntax convention).
// Metro resolves specifiers literally, so we (1) watch the repo root for the
// linked workspace packages and (2) rewrite `./foo.js` -> `./foo.ts` when the
// `.js` file does not exist but a `.ts`/`.tsx` sibling does.
const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');
const fs = require('fs');

const projectRoot = __dirname;
const workspaceRoot = path.resolve(projectRoot, '../..');

const config = getDefaultConfig(projectRoot);

config.watchFolders = [workspaceRoot];
config.resolver.nodeModulesPaths = [
  path.resolve(projectRoot, 'node_modules'),
  path.resolve(workspaceRoot, 'node_modules'),
];

const upstreamResolve = config.resolver.resolveRequest;
config.resolver.resolveRequest = (context, moduleName, platform) => {
  // Rewrite relative `.js` specifiers from TS source to their `.ts`/`.tsx`.
  if (moduleName.endsWith('.js') && (moduleName.startsWith('./') || moduleName.startsWith('../'))) {
    const base = path.resolve(path.dirname(context.originModulePath), moduleName.slice(0, -3));
    for (const ext of ['.ts', '.tsx']) {
      if (fs.existsSync(base + ext)) {
        return context.resolveRequest(context, moduleName.slice(0, -3) + ext, platform);
      }
    }
  }
  return (upstreamResolve ?? context.resolveRequest)(context, moduleName, platform);
};

module.exports = config;
