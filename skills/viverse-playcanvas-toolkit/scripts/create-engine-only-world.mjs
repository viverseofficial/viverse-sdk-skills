import { existsSync } from 'node:fs';
import { cp, mkdir, readFile, readdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { loadToolkitSourceManifest } from './utils/load-toolkit-source-manifest.mjs';
import { buildPackageJsonWithToolkitSource, buildToolkitSourceLock } from './utils/write-toolkit-source-state.mjs';

const SCRIPT_FILE = new URL(import.meta.url).pathname;
const REPO_ROOT = path.resolve(path.dirname(SCRIPT_FILE), '..');
const TEMPLATE_DIR = path.join(REPO_ROOT, 'scripts', 'templates', 'engine-only-world');

function printHelp() {
  console.log(`Usage:
  node scripts/create-engine-only-world.mjs \
    --project-dir <absolute-path> \
    [--with-toolkit-runtime] \
    [--with-toolkit-player] \
    [--with-toolkit-quest-ui] \
    [--toolkit-profile <name>] \
    [--toolkit-source-manifest <path>] \
    [--force]

Options:
  --project-dir             Absolute path to the local world project folder
  --with-toolkit-runtime    Advanced: create a world that is already wired for Toolkit-based runtime code
  --with-toolkit-player     Advanced: create a world that already includes local avatar and camera support
  --with-toolkit-quest-ui   Advanced: create a world with a sample Toolkit interaction plus quest UI flow
  --toolkit-profile         Advanced maintainer override for the bundled Toolkit source
  --toolkit-source-manifest Advanced maintainer override for the bundled Toolkit source settings
  --force                   Overwrite the generated world files if they already exist
  --help                    Show this help message
`);
}

function parseArgs(argv) {
  const result = {
    force: false,
    help: false,
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];

    if (arg === '--') continue;
    if (arg === '--with-toolkit-runtime') {
      result.withToolkitRuntime = true;
      continue;
    }
    if (arg === '--with-toolkit-player') {
      result.withToolkitPlayer = true;
      continue;
    }
    if (arg === '--with-toolkit-quest-ui') {
      result.withToolkitQuestUi = true;
      continue;
    }
    if (arg === '--force') {
      result.force = true;
      continue;
    }
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
}

async function ensureSafeTarget(projectDir, force) {
  await mkdir(projectDir, { recursive: true });

  const targetFiles = ['package.json', 'index.html', 'main.js', 'toolkit-source.lock.json'];
  const existingTargets = targetFiles.filter((fileName) => existsSync(path.join(projectDir, fileName)));
  if (existingTargets.length > 0 && !force) {
    throw new Error('Some generated world files already exist. Re-run with --force to replace them.');
  }

  const folderEntries = await readdir(projectDir, { withFileTypes: true });
  const userFiles = folderEntries
    .filter((entry) => entry.name !== '.DS_Store')
    .map((entry) => entry.name);

  return {
    existingFileCount: userFiles.length,
  };
}

function getMainTemplateName(options) {
  if (options.withToolkitQuestUi) {
    return 'main.toolkit-quest-ui.js.template';
  }

  if (options.withToolkitPlayer) {
    return 'main.toolkit-player.js.template';
  }

  if (options.withToolkitRuntime) {
    return 'main.toolkit-runtime.js.template';
  }

  return 'main.js.template';
}

async function copyRuntimeAssetsIfNeeded(projectDir, toolkitSource, options) {
  if (!options.withToolkitPlayer && !options.withToolkitQuestUi) {
    return [];
  }

  const runtimeAssets = toolkitSource.profile.runtimeAssets;
  if (!runtimeAssets || runtimeAssets.mode !== 'vendored-public-dir') {
    throw new Error(
      'The current bundled world setup cannot prepare the local avatar starter files for this mode.',
    );
  }

  const sourceDir = path.resolve(REPO_ROOT, runtimeAssets.sourceDir);
  const publicDir = path.join(projectDir, 'public');

  await mkdir(publicDir, { recursive: true });
  await cp(sourceDir, publicDir, { recursive: true });

  return [path.join(projectDir, 'public')];
}

async function main() {
  const options = parseArgs(process.argv.slice(2));

  if (options.help) {
    printHelp();
    return;
  }

  validateOptions(options);
  const projectDir = path.resolve(options.projectDir);
  const targetState = await ensureSafeTarget(projectDir, options.force);
  const toolkitSource = loadToolkitSourceManifest(REPO_ROOT, {
    manifestPath: options.toolkitSourceManifest,
    profileName: options.toolkitProfile,
  });

  const [packageTemplate, indexTemplate, mainTemplate] = await Promise.all([
    readFile(path.join(TEMPLATE_DIR, 'package.json.template'), 'utf8'),
    readFile(path.join(TEMPLATE_DIR, 'index.html.template'), 'utf8'),
    readFile(path.join(TEMPLATE_DIR, getMainTemplateName(options)), 'utf8'),
  ]);

  const toolkitSourceLock = buildToolkitSourceLock(toolkitSource);
  const packageJson = buildPackageJsonWithToolkitSource(packageTemplate, toolkitSource);
  const copiedPaths = await copyRuntimeAssetsIfNeeded(projectDir, toolkitSource, options);

  await Promise.all([
    writeFile(path.join(projectDir, 'package.json'), packageJson, 'utf8'),
    writeFile(path.join(projectDir, 'index.html'), indexTemplate, 'utf8'),
    writeFile(path.join(projectDir, 'main.js'), mainTemplate, 'utf8'),
    writeFile(path.join(projectDir, 'toolkit-source.lock.json'), toolkitSourceLock, 'utf8'),
  ]);

  console.log(`Created local world in: ${projectDir}`);
  console.log(`Prepared: ${path.join(projectDir, 'package.json')}`);
  console.log(`Prepared: ${path.join(projectDir, 'index.html')}`);
  console.log(`Prepared: ${path.join(projectDir, 'main.js')}`);
  console.log(
    `World setup: ${options.withToolkitQuestUi ? 'sample Toolkit interaction and quest UI included' : options.withToolkitPlayer ? 'local avatar starter included' : options.withToolkitRuntime ? 'Toolkit-ready world code included' : 'basic code-first PlayCanvas world'}`,
  );
  copiedPaths.forEach((copiedPath) => {
    console.log(`Prepared supporting files: ${copiedPath}`);
  });
  if (targetState.existingFileCount > 0) {
    console.log('Note: Existing files in the folder were preserved.');
  }
  console.log('Next action: Run `npm install`, then `pnpm validate:engine-only-world -- --project-dir <path>`, then start local preview with `npm run dev`.');
}

try {
  await main();
} catch (error) {
  console.error(error.message);
  process.exitCode = 1;
}