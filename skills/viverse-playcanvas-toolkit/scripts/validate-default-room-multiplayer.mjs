import { existsSync, readFileSync, statSync } from 'node:fs';
import path from 'node:path';
import { loadToolkitSourceLock } from './utils/load-toolkit-source-lock.mjs';
import { resolveRuntimeEntry as resolveProjectRuntimeEntry, DEFAULT_RUNTIME_ENTRY } from './utils/resolve-runtime-entry.mjs';
import { syncToolkitSourceState } from './utils/sync-toolkit-source-state.mjs';

const VALID_MODES = new Set(['shared-presence', 'synchronized-interactions']);
const SCRIPT_FILE = new URL(import.meta.url).pathname;
const REPO_ROOT = path.resolve(path.dirname(SCRIPT_FILE), '..');

function printHelp() {
  console.log(`Usage:
  node scripts/validate-default-room-multiplayer.mjs \
    --project-dir <absolute-path> \
    [--runtime-entry <path>] \
    [--mode <shared-presence|synchronized-interactions>] \
    [--strict]

Options:
  --project-dir   Absolute path to the local world project
  --runtime-entry Runtime bootstrap file path, relative to the project dir or absolute
  --mode          Limit validation to shared-presence or synchronized-interactions
  --strict        Require scripts/index.mjs as the runtime entry
  --help          Show this help message
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

function pass(projectDir, runtimeEntry, runtimeSource, mode) {
  console.log('status: pass');
  console.log(`project target: ${projectDir}`);
  console.log(`runtime entry: ${runtimeEntry}`);
  console.log(`runtime source: ${runtimeSource}`);
  console.log(`mode: ${mode ?? 'default-room-eligibility'}`);
  console.log('next action: The project looks like a plausible target for default-room multiplayer integration.');
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

  const stats = statSync(projectDir);
  if (!stats.isDirectory()) {
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
      nextAction: 'Provide the separate local world project folder where default-room multiplayer should land.',
    };
  }

  return { ok: true, normalizedProjectDir };
}

function validateRuntimeEntry(projectDir, runtimeEntryArg, strict) {
  const runtimeEntryResolution = resolveProjectRuntimeEntry(projectDir, runtimeEntryArg);
  const runtimeEntry = runtimeEntryResolution.runtimeEntry;
  const defaultRuntimeEntry = path.join(projectDir, DEFAULT_RUNTIME_ENTRY);

  if (strict && path.resolve(runtimeEntry) !== path.resolve(defaultRuntimeEntry)) {
    return {
      ok: false,
      reason: 'strict mode requires scripts/index.mjs as the runtime entry',
      nextAction: 'Use scripts/index.mjs or rerun without --strict if your project uses an equivalent bootstrap file.',
    };
  }

  if (!existsSync(runtimeEntry)) {
    return {
      ok: false,
      reason: 'runtime entry not found',
      nextAction: 'Provide scripts/index.mjs or the equivalent runtime bootstrap file path.',
    };
  }

  const runtimeStats = statSync(runtimeEntry);
  if (!runtimeStats.isFile()) {
    return {
      ok: false,
      reason: 'runtime entry path is not a file',
      nextAction: 'Provide a runtime bootstrap file such as scripts/index.mjs.',
    };
  }

  if (!path.resolve(runtimeEntry).startsWith(`${path.resolve(projectDir)}${path.sep}`)) {
    return {
      ok: false,
      reason: 'runtime entry is outside the provided project folder',
      nextAction: 'Provide a runtime bootstrap file that belongs to the same local project folder.',
    };
  }

  return {
    ok: true,
    runtimeEntry: path.resolve(runtimeEntry),
    runtimeSource: runtimeEntryResolution.source,
  };
}

function validateMode(mode) {
  if (!mode) {
    return { ok: true, mode: null };
  }

  if (!VALID_MODES.has(mode)) {
    return {
      ok: false,
      reason: 'request exceeds default-room multiplayer boundary',
      nextAction: 'Use shared-presence or synchronized-interactions, or keep broader multiplayer planning in draft guidance only.',
    };
  }

  return { ok: true, mode };
}

function validateRepoCapability() {
  const entryPath = path.join(REPO_ROOT, 'packages', 'network', 'src', 'index.ts');
  const modulePath = path.join(
    REPO_ROOT,
    'packages',
    'network',
    'src',
    'modules',
    'multiplayer',
    'MultiplayerModule.ts',
  );

  if (!existsSync(entryPath) || !existsSync(modulePath)) {
    return {
      ok: false,
      reason: 'repo multiplayer capability surface missing or changed',
      nextAction: 'Re-check the evidence chain before using the default-room multiplayer workflow.',
    };
  }

  const entrySource = readFileSync(entryPath, 'utf8');
  const moduleSource = readFileSync(modulePath, 'utf8');
  const exportsExpectedSurface =
    entrySource.includes("export * from './NetworkSystem';") &&
    entrySource.includes("export * from './modules/multiplayer/MultiplayerModule';");
  const hasDefaultRoomSurface =
    moduleSource.includes('defaultRoomId') &&
    moduleSource.includes('joinDefaultRoom') &&
    moduleSource.includes('autoJoinDefaultRoom');

  if (!exportsExpectedSurface || !hasDefaultRoomSurface) {
    return {
      ok: false,
      reason: 'repo multiplayer capability surface missing or changed',
      nextAction: 'Re-check the network package exports and default-room behavior before using the workflow.',
    };
  }

  return { ok: true };
}

function validateToolkitNetworkReadiness(toolkitSource) {
  if (!toolkitSource.lock) {
    return { ok: true };
  }

  if (toolkitSource.hasDependency('@viverse/network') || toolkitSource.hasLockedPackage('@viverse/network')) {
    return { ok: true };
  }

  return {
    ok: false,
    reason: 'project is missing the built-in multiplayer support package',
    nextAction: 'Update the project with the current toolkit bundle, then try default-room multiplayer again.',
  };
}

async function main() {
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

  await syncToolkitSourceState(projectDirResult.normalizedProjectDir, REPO_ROOT);

  const toolkitSource = loadToolkitSourceLock(projectDirResult.normalizedProjectDir);

  const runtimeEntryResult = validateRuntimeEntry(
    projectDirResult.normalizedProjectDir,
    options.runtimeEntry,
    options.strict,
  );
  if (!runtimeEntryResult.ok) {
    fail(runtimeEntryResult.reason, runtimeEntryResult.nextAction);
    return;
  }

  const modeResult = validateMode(options.mode);
  if (!modeResult.ok) {
    fail(modeResult.reason, modeResult.nextAction);
    return;
  }

  const repoCapabilityResult = validateRepoCapability();
  if (!repoCapabilityResult.ok) {
    fail(repoCapabilityResult.reason, repoCapabilityResult.nextAction);
    return;
  }

  const toolkitNetworkReadinessResult = validateToolkitNetworkReadiness(toolkitSource);
  if (!toolkitNetworkReadinessResult.ok) {
    fail(toolkitNetworkReadinessResult.reason, toolkitNetworkReadinessResult.nextAction);
    return;
  }

  pass(
    projectDirResult.normalizedProjectDir,
    runtimeEntryResult.runtimeEntry,
    runtimeEntryResult.runtimeSource,
    modeResult.mode,
  );
}

try {
  await main();
} catch (error) {
  console.error(error.message);
  process.exitCode = 1;
}