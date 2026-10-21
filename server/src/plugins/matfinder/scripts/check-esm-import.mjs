/**
 * Fails if a built server bundle loads @tanstack/ai or one of its adapters statically (ported from the maison plugin).
 *
 * The plugin's server is CommonJS, and these packages ship ES modules only. A static require, or an import the bundler
 * keeps, would make Strapi fail at boot with ERR_PACKAGE_PATH_NOT_EXPORTED. The only allowed way to load them is
 * `await import()` in server/src/ai/sdk.ts. That's a property of the built bundle, so this checks the bundle; it runs
 * after `strapi-plugin build` (server's `npm run build:plugin`).
 *
 *   node scripts/check-esm-import.mjs            checks dist/server/index.js and dist/server/index.mjs
 *   node scripts/check-esm-import.mjs <folder>   checks <folder>/index.js and <folder>/index.mjs
 */
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';

const folder = process.argv[2] ?? path.join('dist', 'server');
const pkg = '["\'`](@tanstack\\/ai[^"\'`]*)["\'`]';
let failed = false;

for (const file of ['index.js', 'index.mjs'].map((name) => path.join(folder, name))) {
  if (!existsSync(file)) {
    console.error(`  x ${file} is missing: build the plugin first`);
    failed = true;
    continue;
  }
  const source = readFileSync(file, 'utf8');
  const statics = [
    ...source.matchAll(new RegExp(`\\brequire\\s*\\(\\s*${pkg}\\s*\\)`, 'g')),
    // An import with bindings. `import(` is a dynamic import and `import.meta` isn't an import.
    ...source.matchAll(new RegExp(`\\bimport\\b(?!\\s*[(.])[^;"'\`()]*?\\bfrom\\s*${pkg}`, 'g')),
    // A bare `import "pkg";`, which still loads the module.
    ...source.matchAll(new RegExp(`\\bimport\\s*${pkg}`, 'g')),
    ...source.matchAll(new RegExp(`\\bexport\\b[^;"'\`()]*?\\bfrom\\s*${pkg}`, 'g')),
  ].map((match) => match[1]);
  if (statics.length > 0) {
    console.error(`  x ${file} loads TanStack AI statically: ${[...new Set(statics)].join(', ')}`);
    failed = true;
    continue;
  }
  const dynamic = [...source.matchAll(new RegExp(`\\bimport\\s*\\(\\s*${pkg}\\s*\\)`, 'g'))].length;
  console.log(`  ok ${file}: no static load of TanStack AI (${dynamic} dynamic import site${dynamic === 1 ? '' : 's'})`);
}

process.exit(failed ? 1 : 0);
