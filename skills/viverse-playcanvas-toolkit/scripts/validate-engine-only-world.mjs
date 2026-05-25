import { existsSync, readFileSync, statSync } from 'node:fs';
import path from 'node:path';
import { listIndexHtmlScriptEntries, resolveRuntimeEntry } from './utils/resolve-runtime-entry.mjs';

const SCRIPT_FILE = new URL(import.meta.url).pathname;
const REPO_ROOT = path.resolve(path.dirname(SCRIPT_FILE), '..');

function printHelp() {
  console.log(`Usage:
  node scripts/validate-engine-only-world.mjs \
    --project-dir <absolute-path> \
    [--runtime-entry <path>] \
    [--strict]

Options:
  --project-dir    Absolute path to the local engine-only world folder
  --runtime-entry  Runtime bootstrap file path, relative to the project dir or absolute. When omitted, the script detects the local JS entry from index.html
  --strict         Require index.html plus a local JS entry referenced with a relative path
  --help           Show this help message
`);
}

function parseArgs(argv) {
  const result = {
    strict: false,
    help: false,
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];

    if (arg === '--') continue;
    if (arg === '--strict') {
      result.strict = true;
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

function fail(reason, nextAction) {
  console.log('status: fail');
  console.log(`reason: ${reason}`);
  console.log(`next action: ${nextAction}`);
  process.exitCode = 1;
}

function pass(projectDir, runtimeEntry, runtimeSource) {
  console.log('status: pass');
  console.log(`project target: ${projectDir}`);
  console.log(`runtime entry: ${runtimeEntry}`);
  console.log(`runtime source: ${runtimeSource}`);
  console.log('next action: The folder looks like a plausible engine-only world. Preview it over HTTP before publishing.');
}

function validateProjectDir(projectDir) {
  if (!projectDir) {
    throw new Error('Missing required argument: --project-dir');
  }

  if (!path.isAbsolute(projectDir)) {
    throw new Error('--project-dir must be an absolute path');
  }

  if (!existsSync(projectDir)) {
    return {
      ok: false,
      reason: 'missing or invalid project folder',
      nextAction: 'Provide a valid local project folder path.',
    };
  }

  if (!statSync(projectDir).isDirectory()) {
    return {
      ok: false,
      reason: 'project folder path is not a directory',
      nextAction: 'Provide a local project folder path instead of a file path.',
    };
  }

  const normalizedProjectDir = path.resolve(projectDir);
  if (normalizedProjectDir === REPO_ROOT || normalizedProjectDir.startsWith(`${REPO_ROOT}${path.sep}`)) {
    return {
      ok: false,
      reason: 'project folder points to the Toolkit repo instead of a user-owned local project',
      nextAction: 'Provide the separate local world project folder that should be published.',
    };
  }

  return { ok: true, normalizedProjectDir };
}

function validateIndexHtml(projectDir, strict) {
  const indexHtmlPath = path.join(projectDir, 'index.html');
  if (!existsSync(indexHtmlPath)) {
    return {
      ok: false,
      reason: 'index.html is missing',
      nextAction: 'Create index.html before treating the folder as an engine-only world.',
    };
  }

  const indexHtmlSource = readFileSync(indexHtmlPath, 'utf8');
  const indexEntries = listIndexHtmlScriptEntries(projectDir);
  if (strict && indexEntries.length === 0) {
    return {
      ok: false,
      reason: 'index.html does not reference a local relative JS entry',
      nextAction: 'Add a local relative runtime entry such as <script type="module" src="./main.js"></script> to index.html.',
    };
  }

  if (indexEntries.some((entry) => entry.source.startsWith('/'))) {
    return {
      ok: false,
      reason: 'index.html uses a root-relative JS entry path',
      nextAction: 'Use relative script paths such as ./main.js so the folder can be moved safely.',
    };
  }

  return { ok: true, indexEntries };
}

function validateRuntimeEntry(projectDir, runtimeEntryArg, strict, indexEntries) {
  const resolution = resolveRuntimeEntry(projectDir, runtimeEntryArg);
  const runtimeEntry = resolution.runtimeEntry;

  if (!existsSync(runtimeEntry)) {
    return {
      ok: false,
      reason: 'runtime entry not found',
      nextAction: 'Add the JS entry file referenced by index.html, or provide --runtime-entry explicitly.',
    };
  }

  if (!statSync(runtimeEntry).isFile()) {
    return {
      ok: false,
      reason: 'runtime entry path is not a file',
      nextAction: 'Provide a JS file path for the runtime entry.',
    };
  }

  if (!path.resolve(runtimeEntry).startsWith(`${path.resolve(projectDir)}${path.sep}`)) {
    return {
      ok: false,
      reason: 'runtime entry is outside the project folder',
      nextAction: 'Keep the runtime entry inside the same publishable folder.',
    };
  }

  if (strict && indexEntries.length > 0 && !indexEntries.some((entry) => entry.absolutePath === path.resolve(runtimeEntry))) {
    return {
      ok: false,
      reason: 'runtime entry is not referenced by index.html',
      nextAction: 'Update index.html so it loads the same runtime entry file you plan to publish.',
    };
  }

  const runtimeSource = readFileSync(runtimeEntry, 'utf8');
  const loadsPlayCanvasEngine =
    /from\s+['"]playcanvas['"]/u.test(runtimeSource) ||
    /import\s+\*\s+as\s+pc\s+from\s+['"]playcanvas['"]/u.test(runtimeSource) ||
    /window\.pc/u.test(runtimeSource) ||
    /globalThis\.pc/u.test(runtimeSource) ||
    /pc\.Application/u.test(runtimeSource);

  if (!loadsPlayCanvasEngine) {
    return {
      ok: false,
      reason: 'runtime entry does not appear to load or reference the PlayCanvas Engine',
      nextAction: 'Import PlayCanvas in the runtime entry or ensure the runtime uses the global pc object before publishing.',
    };
  }

  if (!runtimeSource.includes('pc.Application')) {
    return {
      ok: false,
      reason: 'runtime entry does not appear to create a PlayCanvas application',
      nextAction: 'Create a pc.Application in the runtime entry before publishing.',
    };
  }

  if (!/app\.start\(\)/u.test(runtimeSource)) {
    return {
      ok: false,
      reason: 'runtime entry does not start the PlayCanvas application',
      nextAction: 'Call app.start() in the runtime entry before publishing.',
    };
  }

  const usesLocalPlayer =
    /from\s+['"]@viverse\/local-player['"]/u.test(runtimeSource) ||
    /LocalPlayerSystem/u.test(runtimeSource);
  const ammoAwaitIndex = runtimeSource.indexOf('await loadAmmo()');
  const viverseAppIndex = runtimeSource.indexOf('new ViverseApp');

  if (usesLocalPlayer && viverseAppIndex !== -1) {
    if (ammoAwaitIndex === -1) {
      return {
        ok: false,
        reason: 'runtime entry uses LocalPlayerSystem but does not await Ammo before runtime setup',
        nextAction: 'Load Ammo first, then construct ViverseApp or LocalPlayerSystem-dependent runtime objects.',
      };
    }

    if (ammoAwaitIndex > viverseAppIndex) {
      return {
        ok: false,
        reason: 'runtime entry constructs ViverseApp before awaiting Ammo for LocalPlayerSystem',
        nextAction: 'Move await loadAmmo() before new ViverseApp(...) so LocalPlayerSystem sees Ammo during construction.',
      };
    }
  }

  return {
    ok: true,
    runtimeEntry: path.resolve(runtimeEntry),
    runtimeSource: resolution.source,
  };
}

function main() {
  const options = parseArgs(process.argv.slice(2));

  if (options.help) {
    printHelp();
    return;
  }

  const projectDirResult = validateProjectDir(options.projectDir);
  if (!projectDirResult.ok) {
    fail(projectDirResult.reason, projectDirResult.nextAction);
    return;
  }

  const indexResult = validateIndexHtml(projectDirResult.normalizedProjectDir, options.strict);
  if (!indexResult.ok) {
    fail(indexResult.reason, indexResult.nextAction);
    return;
  }

  const runtimeResult = validateRuntimeEntry(
    projectDirResult.normalizedProjectDir,
    options.runtimeEntry,
    options.strict,
    indexResult.indexEntries,
  );
  if (!runtimeResult.ok) {
    fail(runtimeResult.reason, runtimeResult.nextAction);
    return;
  }

  pass(projectDirResult.normalizedProjectDir, runtimeResult.runtimeEntry, runtimeResult.runtimeSource);
}

try {
  main();
} catch (error) {
  console.error(error.message);
  process.exitCode = 1;
}