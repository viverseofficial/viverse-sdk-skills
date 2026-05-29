import { existsSync } from 'node:fs';
import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { loadToolkitSourceManifest } from './utils/load-toolkit-source-manifest.mjs';
import { buildPackageJsonWithToolkitSource, buildToolkitSourceLock } from './utils/write-toolkit-source-state.mjs';

const SCRIPT_FILE = new URL(import.meta.url).pathname;
const REPO_ROOT = path.resolve(path.dirname(SCRIPT_FILE), '..');

function printHelp() {
  console.log(`Usage:
  node scripts/refresh-toolkit-source-lock.mjs \
    --project-dir <absolute-path> \
    [--toolkit-profile <name>] \
    [--toolkit-source-manifest <path>]

Options:
  --project-dir             Absolute path to the existing local world project folder
  --toolkit-profile         Toolkit source profile name from toolkit-source-manifest.json
  --toolkit-source-manifest Override the repo-local toolkit source manifest path
  --help                    Show this help message
`);
}

function parseArgs(argv) {
  const result = { help: false };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];

    if (arg === '--') continue;
    if (arg === '--help' || arg === '-h') {
      result.help = true;
      continue;
    }
    if (!arg.startsWith('--')) {
      throw new Error(`Unexpected argument: ${arg}`);
    }

    const value = argv[index + 1];
    if (!value || value.startsWith('--')) {
      throw new Error(`Missing value for ${arg}`);
    }

    result[arg.slice(2).replace(/-([a-z])/g, (_, letter) => letter.toUpperCase())] = value;
    index += 1;
  }

  return result;
}

function validateOptions(options) {
  if (!options.projectDir) {
    throw new Error('Missing required argument: --project-dir');
  }

  if (!path.isAbsolute(options.projectDir)) {
    throw new Error('--project-dir must be an absolute path');
  }

  const normalizedProjectDir = path.resolve(options.projectDir);
  if (normalizedProjectDir === REPO_ROOT || normalizedProjectDir.startsWith(`${REPO_ROOT}${path.sep}`)) {
    throw new Error('Project folder must be a user-owned local project, not the Toolkit repo.');
  }

  const packageJsonPath = path.join(normalizedProjectDir, 'package.json');
  if (!existsSync(packageJsonPath)) {
    throw new Error(`Existing package.json not found: ${packageJsonPath}`);
  }
}

async function main() {
  const options = parseArgs(process.argv.slice(2));

  if (options.help) {
    printHelp();
    return;
  }

  validateOptions(options);
  const projectDir = path.resolve(options.projectDir);
  const toolkitSource = loadToolkitSourceManifest(REPO_ROOT, {
    manifestPath: options.toolkitSourceManifest,
    profileName: options.toolkitProfile,
  });
  const packageJsonPath = path.join(projectDir, 'package.json');
  const toolkitLockPath = path.join(projectDir, 'toolkit-source.lock.json');
  const packageJsonSource = await readFile(packageJsonPath, 'utf8');

  await Promise.all([
    writeFile(packageJsonPath, buildPackageJsonWithToolkitSource(packageJsonSource, toolkitSource), 'utf8'),
    writeFile(toolkitLockPath, buildToolkitSourceLock(toolkitSource), 'utf8'),
  ]);

  console.log(`Refreshed Toolkit source state in: ${projectDir}`);
  console.log(`Wrote: ${packageJsonPath}`);
  console.log(`Wrote: ${toolkitLockPath}`);
  console.log(`Resolved Toolkit source profile: ${toolkitSource.profileName}`);
  console.log('Next action: Run `npm install` in the consumer project to sync node_modules with the refreshed Toolkit package set.');
}

try {
  await main();
} catch (error) {
  console.error(error.message);
  process.exitCode = 1;
}