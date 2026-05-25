import { existsSync } from 'node:fs';
import { readdir } from 'node:fs/promises';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

function printHelp() {
  console.log(`Usage:
  node scripts/publish-build-output-to-viverse.mjs \
    --path <build-output-dir> \
    (--app-id <id> | --auto-create-app --name <app-name>) \
    [--description <text>] [--login] [--skip-auth-check] [--dry-run]

Options:
  --path              Build output directory to publish
  --app-id            Existing VIVERSE app ID
  --auto-create-app   Create a new app during publish
  --name              App name for auto-create flow
  --description       Optional app description for auto-create flow
  --login             Run interactive auth login if auth check fails
  --skip-auth-check   Skip auth status verification before publish
  --dry-run           Print the resolved publish command without executing it
  --help              Show this help message
`);
}

function parseArgs(argv) {
  const result = {
    autoCreateApp: false,
    login: false,
    skipAuthCheck: false,
    dryRun: false,
    help: false,
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];

    if (arg === '--') {
      continue;
    }

    if (arg === '--auto-create-app') {
      result.autoCreateApp = true;
      continue;
    }

    if (arg === '--login') {
      result.login = true;
      continue;
    }

    if (arg === '--skip-auth-check') {
      result.skipAuthCheck = true;
      continue;
    }

    if (arg === '--dry-run') {
      result.dryRun = true;
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
  if (!options.path) {
    throw new Error('Missing required argument: --path');
  }

  if (options.appId && options.autoCreateApp) {
    throw new Error('--app-id and --auto-create-app cannot be used together');
  }

  if (!options.appId && !options.autoCreateApp) {
    throw new Error('Use either --app-id <id> or --auto-create-app');
  }

  if (options.autoCreateApp && !options.name) {
    throw new Error('--name is required when using --auto-create-app');
  }
}

async function inspectFolder(folderPath) {
  if (!existsSync(folderPath)) {
    throw new Error(`Build output folder does not exist: ${folderPath}`);
  }

  const entries = await readdir(folderPath, { withFileTypes: true });
  if (entries.length === 0) {
    throw new Error(`Build output folder is empty: ${folderPath}`);
  }

  const entryNames = new Set(entries.map((entry) => entry.name));
  const sourceMarkers = [
    'src',
    'node_modules',
    'package.json',
    'pnpm-lock.yaml',
    'package-lock.json',
    'yarn.lock',
    'tsconfig.json',
    'tsconfig.node.json',
    'vite.config.ts',
    'vite.config.js',
  ];

  const detectedMarkers = sourceMarkers.filter((marker) => entryNames.has(marker));
  const sourceLikeFiles = entries
    .filter(
      (entry) =>
        entry.isFile() && /\.(ts|tsx|jsx|vue|svelte)$/.test(entry.name) && entry.name !== 'index.ts',
    )
    .map((entry) => entry.name);

  if (detectedMarkers.length > 0 || sourceLikeFiles.length > 0) {
    const details = [...detectedMarkers, ...sourceLikeFiles].join(', ');
    throw new Error(
      `The folder looks like source code rather than deployable output: ${folderPath}${details ? ` (${details})` : ''}`,
    );
  }
}

function detectCliRunner() {
  const local = spawnSync('pnpm', ['exec', 'viverse-cli', '--version'], { encoding: 'utf8' });
  if (local.status === 0) {
    return { command: 'pnpm', baseArgs: ['exec', 'viverse-cli'], label: 'pnpm exec viverse-cli' };
  }

  const global = spawnSync('viverse-cli', ['--version'], { encoding: 'utf8' });
  if (global.status === 0) {
    return { command: 'viverse-cli', baseArgs: [], label: 'viverse-cli' };
  }

  return null;
}

function buildDryRunRunner() {
  return { command: 'pnpm', baseArgs: ['exec', 'viverse-cli'], label: 'pnpm exec viverse-cli' };
}

function runCommand(runner, args, options = {}) {
  return spawnSync(runner.command, [...runner.baseArgs, ...args], {
    stdio: 'inherit',
    ...options,
  });
}

async function main() {
  const options = parseArgs(process.argv.slice(2));

  if (options.help) {
    printHelp();
    return;
  }

  validateOptions(options);

  const resolvedPath = path.resolve(options.path);
  await inspectFolder(resolvedPath);

  const detectedRunner = detectCliRunner();
  const runner = detectedRunner ?? (options.dryRun ? buildDryRunRunner() : null);
  if (!runner) {
    throw new Error(
      'VIVERSE CLI was not found. Install it with `pnpm add -w @viverse/cli` or `npm install -g @viverse/cli`.',
    );
  }

  const publishArgs = ['app', 'publish', resolvedPath];
  if (options.appId) {
    publishArgs.push('--app-id', options.appId);
  } else {
    publishArgs.push('--auto-create-app', '--name', options.name);
    if (options.description) {
      publishArgs.push('--description', options.description);
    }
  }

  console.log(`Using CLI runner: ${runner.label}`);
  console.log(`Resolved build output: ${resolvedPath}`);

  if (options.dryRun) {
    console.log('Dry run only. The publish command would be:');
    console.log(`  ${runner.label} ${publishArgs.join(' ')}`);
    return;
  }

  if (!options.skipAuthCheck) {
    console.log('Checking VIVERSE CLI authentication...');
    const statusResult = runCommand(runner, ['auth', 'status']);

    if (statusResult.status !== 0) {
      if (!options.login) {
        throw new Error('Authentication check failed. Re-run with --login or authenticate manually first.');
      }

      console.log('Running interactive VIVERSE CLI login...');
      const loginResult = runCommand(runner, ['auth', 'login']);
      if (loginResult.status !== 0) {
        throw new Error(`viverse-cli auth login failed with exit code ${loginResult.status ?? 'unknown'}`);
      }
    }
  }

  console.log('Publishing build output to VIVERSE...');
  const publishResult = runCommand(runner, publishArgs);
  if (publishResult.status !== 0) {
    throw new Error(`VIVERSE publish failed with exit code ${publishResult.status ?? 'unknown'}`);
  }

  console.log('Publish command completed. Check VIVERSE Studio for any remaining review or release steps.');
}

main().catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
});