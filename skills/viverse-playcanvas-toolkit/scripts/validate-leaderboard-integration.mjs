import { existsSync, readFileSync, statSync } from 'node:fs';
import path from 'node:path';
import { resolveRuntimeEntry, DEFAULT_RUNTIME_ENTRY } from './utils/resolve-runtime-entry.mjs';
import { syncToolkitSourceState } from './utils/sync-toolkit-source-state.mjs';

const VALID_MODES = new Set(['submit', 'readback', 'both']);
const LEADERBOARD_META_NAME_PATTERN = /^[A-Za-z0-9~@$,.-]+$/;
const SCRIPT_FILE = new URL(import.meta.url).pathname;
const REPO_ROOT = path.resolve(path.dirname(SCRIPT_FILE), '..');
function printHelp() {
  console.log(`Usage:
  node scripts/validate-leaderboard-integration.mjs \
    --project-dir <absolute-path> \
    [--runtime-entry <path>] \
    [--app-id <id>] \
    [--leaderboard-key <meta-name>] \
    [--mode <submit|readback|both>] \
    [--strict]

Options:
  --project-dir      Absolute path to the local world project
  --runtime-entry    Runtime bootstrap file path, relative to the project dir or absolute. When omitted, the script prefers ${DEFAULT_RUNTIME_ENTRY} and otherwise detects the single JS entry from index.html
  --app-id           App identity used by the target world
  --leaderboard-key  Studio Meta Name that the code will use as the leaderboard key. Display Name is a separate Studio label.
  --mode             Limit validation to submit, readback, or both
  --strict           Require scripts/index.mjs as the runtime entry
  --help             Show this help message
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

function pass(projectDir, runtimeEntry, mode, runtimeSource) {
  console.log('status: pass');
  console.log(`project target: ${projectDir}`);
  console.log(`runtime entry: ${runtimeEntry}`);
  console.log(`runtime source: ${runtimeSource}`);
  console.log('app identity: validated');
  console.log('leaderboard Meta Name: validated');
  console.log(`mode: ${mode ?? 'leaderboard-eligibility'}`);
  console.log('next action: The project looks like a plausible target for first-version leaderboard integration.');
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
      nextAction: 'Provide the separate local world project folder where leaderboard integration should land.',
    };
  }

  return { ok: true, normalizedProjectDir };
}

function validateRuntimeEntry(projectDir, runtimeEntryArg, strict) {
  const runtimeEntryResolution = resolveRuntimeEntry(projectDir, runtimeEntryArg);
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
      reason: 'request exceeds first leaderboard workflow boundary',
      nextAction: 'Use submit, readback, or both, or keep broader leaderboard planning in governance docs only.',
    };
  }

  return { ok: true, mode };
}

function validateRepoCapability() {
  const accountEntryPath = path.join(REPO_ROOT, 'packages', 'account', 'src', 'index.ts');
  const publishScriptPath = path.join(REPO_ROOT, 'scripts', 'publish-build-output-to-viverse.mjs');
  const contractPath = path.join(REPO_ROOT, 'viverse-leaderboard-integration-contract.md');

  if (!existsSync(accountEntryPath) || !existsSync(publishScriptPath) || !existsSync(contractPath)) {
    return {
      ok: false,
      reason: 'repo prerequisite surface missing or changed',
      nextAction: 'Re-check the leaderboard evidence chain before using the workflow.',
    };
  }

  const accountEntrySource = readFileSync(accountEntryPath, 'utf8');
  const publishScriptSource = readFileSync(publishScriptPath, 'utf8');
  const contractSource = readFileSync(contractPath, 'utf8');

  const hasAccountSurface =
    accountEntrySource.includes("export * from './AccountSystem';") &&
    accountEntrySource.includes("export * from './modules/auth/AuthModule';");
  const hasPublishTargetingSurface =
    publishScriptSource.includes("const publishArgs = ['app', 'publish', resolvedPath];") &&
    publishScriptSource.includes("runCommand(runner, ['auth', 'status'])");
  const hasLeaderboardBoundary =
    contractSource.includes('Current status: active first-version contract for the safest promoted leaderboard workflow.') &&
    contractSource.includes('Preferred target:') &&
    contractSource.includes('scripts/create-leaderboard-runtime-boundary.mjs') &&
    contractSource.includes('scripts/validate-leaderboard-integration.mjs');

  if (!hasAccountSurface || !hasPublishTargetingSurface || !hasLeaderboardBoundary) {
    return {
      ok: false,
      reason: 'repo prerequisite surface missing or changed',
      nextAction: 'Re-check the auth surface, publish targeting surface, and leaderboard contract before using the workflow.',
    };
  }

  return { ok: true };
}

function validateAppId(appId) {
  if (!appId || !String(appId).trim()) {
    return {
      ok: false,
      reason: 'app identity missing or invalid',
      nextAction: 'Provide the app identity used by the target world before leaderboard integration continues.',
    };
  }

  return { ok: true };
}

function validateLeaderboardKey(leaderboardKey) {
  const normalizedLeaderboardKey = String(leaderboardKey ?? '').trim();

  if (!normalizedLeaderboardKey) {
    return {
      ok: false,
      reason: 'leaderboard Meta Name missing',
      nextAction:
        'Provide the exact Studio Meta Name that the code should use as the leaderboard key. If the leaderboard does not exist yet, create it in Studio with both Display Name and Meta Name.',
    };
  }

  if (!LEADERBOARD_META_NAME_PATTERN.test(normalizedLeaderboardKey)) {
    return {
      ok: false,
      reason: 'leaderboard Meta Name invalid',
      nextAction:
        'Use the exact Studio Meta Name that the code should use as the leaderboard key. It may contain only letters, numbers, and ~@$-,.. Display Name is a separate Studio label, and underscores are not allowed.',
    };
  }

  return { ok: true, leaderboardKey: normalizedLeaderboardKey };
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

  const appIdResult = validateAppId(options.appId);
  if (!appIdResult.ok) {
    fail(appIdResult.reason, appIdResult.nextAction);
    return;
  }

  const leaderboardKeyResult = validateLeaderboardKey(options.leaderboardKey);
  if (!leaderboardKeyResult.ok) {
    fail(leaderboardKeyResult.reason, leaderboardKeyResult.nextAction);
    return;
  }

  options.leaderboardKey = leaderboardKeyResult.leaderboardKey;

  pass(
    projectDirResult.normalizedProjectDir,
    runtimeEntryResult.runtimeEntry,
    modeResult.mode,
    runtimeEntryResult.runtimeSource,
  );
}

try {
  await main();
} catch (error) {
  console.error(error.message);
  process.exitCode = 1;
}