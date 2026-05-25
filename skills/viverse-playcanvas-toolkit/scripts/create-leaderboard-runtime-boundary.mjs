import { existsSync } from 'node:fs';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { resolveRuntimeEntry, DEFAULT_RUNTIME_ENTRY } from './utils/resolve-runtime-entry.mjs';
import { syncToolkitSourceState } from './utils/sync-toolkit-source-state.mjs';

const SCRIPT_FILE = new URL(import.meta.url).pathname;
const REPO_ROOT = path.resolve(path.dirname(SCRIPT_FILE), '..');
const TEMPLATE_PATH = path.join(
  REPO_ROOT,
  'scripts',
  'templates',
  'leaderboard',
  'leaderboard-runtime-boundary.mjs.template',
);
const BOUNDARY_RELATIVE_PATH = path.join('features', 'leaderboard', 'leaderboard-runtime-boundary.mjs');
const START_MARKER = '// [LeaderboardRuntimeBoundary:start]';
const END_MARKER = '// [LeaderboardRuntimeBoundary:end]';
const LEADERBOARD_META_NAME_PATTERN = /^[A-Za-z0-9~@$,.-]+$/;

function printHelp() {
  console.log(`Usage:
  node scripts/create-leaderboard-runtime-boundary.mjs \
    --project-dir <absolute-path> \
    --app-id <id> \
    --leaderboard-key <meta-name> \
    [--runtime-entry <path>] \
    [--readback-view <top-entries|self-rank>] \
    [--submit-event-name <event-name>] \
    [--force]

Options:
  --project-dir        Absolute path to the local world project
  --app-id             App identity used by the target world
  --leaderboard-key    Studio Meta Name that the code will use as the leaderboard key. Display Name is a separate Studio label.
  --runtime-entry      Runtime bootstrap file path, relative to the project dir or absolute. When omitted, the script prefers ${DEFAULT_RUNTIME_ENTRY} and otherwise detects the single JS entry from index.html
  --readback-view      Install top-entries or self-rank wiring (default: top-entries)
  --submit-event-name  DOM/global event used for score submit (default: viverse:leaderboard:submit-score)
  --force              Overwrite an existing installed leaderboard runtime boundary module
  --help               Show this help message
`);
}

function parseArgs(argv) {
  const result = {
    readbackView: 'top-entries',
    submitEventName: 'viverse:leaderboard:submit-score',
    force: false,
    help: false,
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];

    if (arg === '--') continue;
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
  const missing = [];
  for (const key of ['projectDir', 'appId', 'leaderboardKey']) {
    if (!options[key]) {
      missing.push(`--${key.replace(/[A-Z]/g, (letter) => `-${letter.toLowerCase()}`)}`);
    }
  }

  if (missing.length) {
    throw new Error(`Missing required arguments: ${missing.join(', ')}`);
  }

  options.leaderboardKey = String(options.leaderboardKey).trim();
  if (!LEADERBOARD_META_NAME_PATTERN.test(options.leaderboardKey)) {
    throw new Error(
      'Invalid leaderboard Meta Name. Use the exact Studio Meta Name that the code should use as the leaderboard key. Meta Name may contain only letters, numbers, and ~@$-,., and underscores are not allowed. Display Name is a separate Studio label.',
    );
  }

  if (!path.isAbsolute(options.projectDir)) {
    throw new Error('--project-dir must be an absolute path');
  }

  if (!['top-entries', 'self-rank'].includes(options.readbackView)) {
    throw new Error('--readback-view must be top-entries or self-rank');
  }
}

function ensureProjectTarget(projectDir, runtimeEntry) {
  if (!existsSync(projectDir)) {
    throw new Error(`Project folder does not exist: ${projectDir}`);
  }

  if (path.resolve(projectDir) === REPO_ROOT || path.resolve(projectDir).startsWith(`${REPO_ROOT}${path.sep}`)) {
    throw new Error('Project folder must be a user-owned local project, not the Toolkit repo.');
  }

  if (!existsSync(runtimeEntry)) {
    throw new Error(`Runtime entry not found: ${runtimeEntry}`);
  }
}

function resolveBoundaryPath(runtimeEntry) {
  return path.join(path.dirname(runtimeEntry), BOUNDARY_RELATIVE_PATH);
}

function toPosixPath(filePath) {
  return filePath.split(path.sep).join('/');
}

function buildBoundaryImportPath(runtimeEntry, boundaryPath) {
  const relativePath = toPosixPath(path.relative(path.dirname(runtimeEntry), boundaryPath));
  return relativePath.startsWith('.') ? relativePath : `./${relativePath}`;
}

function buildInstalledModule(templateSource, options) {
  return templateSource
    .replaceAll('__APP_ID__', options.appId)
    .replaceAll('__LEADERBOARD_KEY__', options.leaderboardKey)
    .replaceAll('__READBACK_VIEW__', options.readbackView)
    .replaceAll('__SUBMIT_EVENT_NAME__', options.submitEventName);
}

function buildRuntimeBlock(options, importPath, mode, indent = '') {
  const lines = [`${indent}${START_MARKER}`, `${indent}{`];

  if (mode === 'async-function') {
    lines.push(
      `${indent}  const { createLeaderboardRuntimeBoundary } = await import('${importPath}');`,
      `${indent}  const leaderboardRuntimeBoundary = createLeaderboardRuntimeBoundary();`,
      `${indent}  const leaderboardRuntimeBoundaryState = await leaderboardRuntimeBoundary.initialize();`,
      `${indent}  globalThis.viverseLeaderboardRuntimeBoundary = leaderboardRuntimeBoundary;`,
      `${indent}  globalThis.submitLeaderboardScore = (score) => leaderboardRuntimeBoundary.submitScore(score);`,
      `${indent}  globalThis.readLeaderboardTopEntries = () => leaderboardRuntimeBoundary.readTopEntries();`,
      `${indent}  globalThis.readLeaderboardSelfRank = () => leaderboardRuntimeBoundary.readSelfRank();`,
      `${indent}  globalThis.runLeaderboardSmokeTest = (score) => leaderboardRuntimeBoundary.runSmokeTest(score);`,
      `${indent}  console.log('[Leaderboard] leaderboard wiring installed', leaderboardRuntimeBoundaryState);`,
      `${indent}  console.log('[Leaderboard] submit event name: ${options.submitEventName}');`,
    );
  } else {
    lines.push(
      `${indent}  const installLeaderboardRuntimeBoundary = async () => {`,
      `${indent}    const { createLeaderboardRuntimeBoundary } = await import('${importPath}');`,
      `${indent}    const leaderboardRuntimeBoundary = createLeaderboardRuntimeBoundary();`,
      `${indent}    const leaderboardRuntimeBoundaryState = await leaderboardRuntimeBoundary.initialize();`,
      `${indent}    globalThis.viverseLeaderboardRuntimeBoundary = leaderboardRuntimeBoundary;`,
      `${indent}    globalThis.submitLeaderboardScore = (score) => leaderboardRuntimeBoundary.submitScore(score);`,
      `${indent}    globalThis.readLeaderboardTopEntries = () => leaderboardRuntimeBoundary.readTopEntries();`,
      `${indent}    globalThis.readLeaderboardSelfRank = () => leaderboardRuntimeBoundary.readSelfRank();`,
      `${indent}    globalThis.runLeaderboardSmokeTest = (score) => leaderboardRuntimeBoundary.runSmokeTest(score);`,
      `${indent}    console.log('[Leaderboard] leaderboard wiring installed', leaderboardRuntimeBoundaryState);`,
      `${indent}    console.log('[Leaderboard] submit event name: ${options.submitEventName}');`,
      `${indent}  };`,
      `${indent}`,
      `${indent}  void installLeaderboardRuntimeBoundary().catch((error) => {`,
      `${indent}    console.error('[Leaderboard] leaderboard wiring install failed', error);`,
      `${indent}  });`,
    );
  }

  lines.push(`${indent}}`, `${indent}${END_MARKER}`);
  return lines.join('\n');
}

function stripExistingRuntimeBlock(runtimeSource) {
  const startIndex = runtimeSource.indexOf(START_MARKER);
  const endIndex = runtimeSource.indexOf(END_MARKER);

  if (startIndex === -1 || endIndex === -1 || endIndex < startIndex) {
    return runtimeSource;
  }

  const lineStart = runtimeSource.lastIndexOf('\n', startIndex);
  const lineEnd = runtimeSource.indexOf('\n', endIndex + END_MARKER.length);
  const before = runtimeSource.slice(0, lineStart === -1 ? 0 : lineStart + 1).replace(/[ \t]*$/u, '');
  const after = runtimeSource.slice(lineEnd === -1 ? runtimeSource.length : lineEnd + 1).replace(/^\n+/u, '');

  if (!before) {
    return after;
  }

  if (!after) {
    return `${before}\n`;
  }

  return `${before}\n\n${after}`;
}

function injectRuntimeBlock(runtimeSource, options, runtimeEntry, boundaryPath) {
  const importPath = buildBoundaryImportPath(runtimeEntry, boundaryPath);
  const runtimeSourceWithoutBlock = stripExistingRuntimeBlock(runtimeSource);
  const onReadyAnchor = 'export const onReady = async () => {';
  const onReadyIndex = runtimeSourceWithoutBlock.indexOf(onReadyAnchor);

  if (onReadyIndex !== -1) {
    const anchor = '  const context = createSceneContext();';
    const anchorIndex = runtimeSourceWithoutBlock.indexOf(anchor, onReadyIndex);

    if (anchorIndex !== -1) {
      const block = buildRuntimeBlock(options, importPath, 'async-function', '  ');
      return `${runtimeSourceWithoutBlock.slice(0, anchorIndex)}${block}\n\n${runtimeSourceWithoutBlock.slice(anchorIndex)}`;
    }
  }

  const appStartMatch = [...runtimeSourceWithoutBlock.matchAll(/^([ \t]*)app\.start\(\);?$/gm)].at(-1);
  if (appStartMatch?.index !== undefined) {
    const indent = appStartMatch[1] ?? '';
    const anchor = appStartMatch[0];
    const block = buildRuntimeBlock(options, importPath, 'top-level', indent);
    return `${runtimeSourceWithoutBlock.slice(0, appStartMatch.index)}${block}\n\n${runtimeSourceWithoutBlock.slice(appStartMatch.index)}`;
  }

  const block = buildRuntimeBlock(options, importPath, 'top-level');
  return `${runtimeSourceWithoutBlock.replace(/\s*$/u, '')}\n\n${block}\n`;
}

async function main() {
  const options = parseArgs(process.argv.slice(2));

  if (options.help) {
    printHelp();
    return;
  }

  validateOptions(options);

  const runtimeEntryResolution = resolveRuntimeEntry(options.projectDir, options.runtimeEntry);
  const runtimeEntry = runtimeEntryResolution.runtimeEntry;
  ensureProjectTarget(options.projectDir, runtimeEntry);
  await syncToolkitSourceState(options.projectDir, REPO_ROOT);
  const targetBoundaryPath = resolveBoundaryPath(runtimeEntry);

  if (existsSync(targetBoundaryPath) && !options.force) {
    throw new Error(`Leaderboard wiring file already exists: ${targetBoundaryPath}. Re-run with --force to overwrite it.`);
  }

  const [templateSource, runtimeSource] = await Promise.all([
    readFile(TEMPLATE_PATH, 'utf8'),
    readFile(runtimeEntry, 'utf8'),
  ]);

  const installedModule = buildInstalledModule(templateSource, options);
  const runtimeWithBoundary = injectRuntimeBlock(runtimeSource, options, runtimeEntry, targetBoundaryPath);

  await mkdir(path.dirname(targetBoundaryPath), { recursive: true });
  await writeFile(targetBoundaryPath, installedModule, 'utf8');
  await writeFile(runtimeEntry, runtimeWithBoundary, 'utf8');

  console.log(`Created leaderboard wiring file: ${targetBoundaryPath}`);
  console.log(`Updated runtime entry: ${runtimeEntry}`);
  if (runtimeEntryResolution.source === 'index-html' && runtimeEntryResolution.matchedScriptSource) {
    console.log(`Detected runtime entry from index.html: ${runtimeEntryResolution.matchedScriptSource}`);
  }
  console.log(`Submit event: ${options.submitEventName}`);
  console.log(`Readback view: ${options.readbackView}`);
  console.log('Next action: Trigger the submit event or call the installed global helper functions from your runtime.');
}

try {
  await main();
} catch (error) {
  console.error(error.message);
  process.exitCode = 1;
}