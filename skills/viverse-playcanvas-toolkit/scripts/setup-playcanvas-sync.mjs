import { chmod, mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { homedir } from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

const DEFAULT_CONFIG = {
  PLAYCANVAS_BAD_FILE_REG: '^\\.(?!viverse(?:/|$))|~$',
  PLAYCANVAS_BAD_FOLDER_REG: '^\\.(?!viverse(?:/|$))',
  PLAYCANVAS_CONVERT_TO_POW2: 0,
};

const EXTRA_PULL_EXTENSIONS = [
  'mjs',
  'js',
  'json',
  'css',
  'woff2',
  'png',
  'jpg',
  'jpeg',
  'webp',
  'ktx2',
  'basis',
  'hdr',
  'glb',
  'gltf',
  'bin',
  'vrm',
  'vrma',
  'mp3',
  'ogg',
  'wav',
  'mp4',
];

function printHelp() {
  console.log(`Usage:
  node scripts/setup-playcanvas-sync.mjs \
    --project-id <id> \
    --branch-id <id> \
    --target-dir <absolute-path> \
    --api-key <key> \
    [--pull] [--force] [--require-watch]

Options:
  --project-id  PlayCanvas project ID
  --branch-id   PlayCanvas branch ID
  --target-dir  Absolute path for the local PlayCanvas asset root
  --api-key     PlayCanvas API key
  --pull        Run the installed pcsync download command after writing config if pcsync is available
  --force       Overwrite an existing pcconfig.json if present
  --require-watch  Fail if no automatic sync command is available
  --help        Show this help message
`);
}

function parseArgs(argv) {
  const result = {
    pull: false,
    force: false,
    requireWatch: false,
    help: false,
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];

    if (arg === '--') {
      continue;
    }

    if (arg === '--pull') {
      result.pull = true;
      continue;
    }

    if (arg === '--force') {
      result.force = true;
      continue;
    }

    if (arg === '--require-watch') {
      result.requireWatch = true;
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
  for (const key of ['projectId', 'branchId', 'targetDir', 'apiKey']) {
    if (!options[key]) {
      missing.push(`--${key.replace(/[A-Z]/g, (letter) => `-${letter.toLowerCase()}`)}`);
    }
  }

  if (missing.length) {
    throw new Error(`Missing required arguments: ${missing.join(', ')}`);
  }

  if (!path.isAbsolute(options.targetDir)) {
    throw new Error('--target-dir must be an absolute path');
  }
}

function detectCommand(command) {
  const direct = spawnSync(command, ['--help'], {
    encoding: 'utf8',
  });

  if (direct.status === 0) {
    return { command, helpText: direct.stdout };
  }

  const npmPrefix = spawnSync('npm', ['prefix', '-g'], { encoding: 'utf8' });
  if (npmPrefix.status === 0) {
    const binPath = path.join(npmPrefix.stdout.trim(), 'bin', command);
    const global = spawnSync(binPath, ['--help'], { encoding: 'utf8' });
    if (global.status === 0) {
      return { command: binPath, helpText: global.stdout };
    }
  }

  return null;
}

function detectPcsync() {
  const pcsync = detectCommand('pcsync');
  const pcwatch = detectCommand('pcwatch');

  if (!pcsync) {
    return null;
  }

  return {
    pcsync,
    pcwatch,
  };
}

function detectWatchCommand(install) {
  if (install.pcwatch) {
    return { command: install.pcwatch.command, args: [] };
  }

  const topLevelHelp = spawnSync(install.pcsync.command, ['--help'], {
    encoding: 'utf8',
  });

  if (topLevelHelp.status !== 0) {
    return null;
  }

  if (/^\s*watch(?:\s|\[|$)/m.test(topLevelHelp.stdout)) {
    return { command: install.pcsync.command, args: ['watch'] };
  }

  return null;
}

function detectSubcommand(pcsyncCommand, subcommand) {
  const helpResult = spawnSync(pcsyncCommand, [subcommand, '--help'], {
    encoding: 'utf8',
  });

  return helpResult.status === 0;
}

function getCommandProfile(install) {
  const watchCommand = detectWatchCommand(install);
  const hasWatch = Boolean(watchCommand);
  const hasDiff = detectSubcommand(install.pcsync.command, 'diff');
  const hasPushAll = detectSubcommand(install.pcsync.command, 'pushAll');

  return {
    pull: ['pullAll', '-y'],
    diff: hasDiff ? ['diff'] : ['diffAll'],
    ignore: ['parseIgnore'],
    pushAll: ['pushAll'],
    hasPushAll,
    hasWatch,
    watchCommand,
  };
}

function runPcsync(command, args, targetDir) {
  return spawnSync(command, args, {
    cwd: targetDir,
    stdio: 'inherit',
    env: {
      ...process.env,
      PLAYCANVAS_TARGET_DIR: targetDir,
    },
  });
}

function formatPcsyncInvocation(commandProfile, pcsyncCommand) {
  return `${pcsyncCommand}`;
}

function formatWatchInvocation(commandProfile) {
  if (!commandProfile.watchCommand) {
    return null;
  }

  return `${path.basename(commandProfile.watchCommand.command)} ${commandProfile.watchCommand.args.join(' ')}`.trim();
}

function getLauncherDefinitions(commandProfile) {
  const definitions = [
    {
      fileName: 'pull.sh',
      args: commandProfile.pull,
    },
    {
      fileName: 'diff.sh',
      args: commandProfile.diff,
    },
    {
      fileName: 'ignore.sh',
      args: commandProfile.ignore,
    },
  ];

  if (commandProfile.hasWatch) {
    definitions.push({
      fileName: 'watch.sh',
      args: ['watch', '--force'],
    });
  }

  return definitions;
}

async function writeLauncherScripts(targetDir, commandProfile) {
  const launcherDir = path.join(targetDir, '.pcsync');
  const watchLauncherPath = path.join(launcherDir, 'watch.sh');
  const exportTargetDirLine = `export PLAYCANVAS_TARGET_DIR="${targetDir}"
`;

  await mkdir(launcherDir, { recursive: true });

  if (!commandProfile.hasWatch && existsSync(watchLauncherPath)) {
    await rm(watchLauncherPath, { force: true });
  }

  for (const definition of getLauncherDefinitions(commandProfile)) {
    const launcherPath = path.join(launcherDir, definition.fileName);
    let content;

    if (definition.fileName === 'watch.sh' && commandProfile.hasWatch) {
      const watchExec = `${path.basename(commandProfile.watchCommand.command)} ${commandProfile.watchCommand.args.join(' ')}`.trim();
      const pushAllLine = commandProfile.hasPushAll
        ? `echo "Best-effort catch-up push before automatic sync..."
if ! pcsync ${commandProfile.pushAll.join(' ')}; then
  echo "Initial catch-up push did not finish cleanly. Continuing into automatic sync so later edits still sync." >&2
fi
`
        : '';
      content = `#!/bin/sh
set -eu
cd "$(CDPATH= cd -- "$(dirname "$0")/.." && pwd)"
${exportTargetDirLine}
${pushAllLine}
for arg in "$@"; do
  if [ "$arg" = "--force" ] || [ "$arg" = "-f" ]; then
    exec ${watchExec} "$@"
  fi
done
exec ${watchExec} --force "$@"
`;
    } else {
      const commandLine = `pcsync ${definition.args.join(' ')} "$@"`;
      content = `#!/bin/sh
set -eu
cd "$(CDPATH= cd -- "$(dirname "$0")/.." && pwd)"
${exportTargetDirLine}
exec ${commandLine}
`;
    }

    await writeFile(launcherPath, content, 'utf8');
    await chmod(launcherPath, 0o755);
  }

  return launcherDir;
}

function printWatchUpgradeGuidance() {
  console.warn('This installed playcanvas-sync build does not expose a watch command.');
  console.warn('Recommended install path:');
  console.warn('  npm install -g playcanvas-sync');
  console.warn('  pcsync --help');
  console.warn('  pcwatch --help');
}

function printNextSteps(targetDir, commandProfile) {
  const pcsyncInvocation = formatPcsyncInvocation(commandProfile, 'pcsync');
  const launcherDir = path.join(targetDir, '.pcsync');

  console.log('Next steps:');
  console.log(`  cd ${targetDir}`);
  console.log(`  ${pcsyncInvocation} ${commandProfile.pull.join(' ')}`);
  console.log(`  ${pcsyncInvocation} ${commandProfile.diff.join(' ')}`);
  console.log(`  ${pcsyncInvocation} ${commandProfile.ignore.join(' ')}`);
  if (commandProfile.hasWatch) {
    console.log(`  ${formatWatchInvocation(commandProfile)} --force`);
  } else {
    console.log('  automatic sync is not available in this installed playcanvas-sync version');
    printWatchUpgradeGuidance();
  }
  console.log('Local wrapper scripts:');
  console.log(`  ${path.join(launcherDir, 'pull.sh')}`);
  console.log(`  ${path.join(launcherDir, 'diff.sh')}`);
  console.log(`  ${path.join(launcherDir, 'ignore.sh')}`);
  if (commandProfile.hasWatch) {
    if (commandProfile.hasPushAll) {
      console.log(`  ${path.join(launcherDir, 'watch.sh')}  (best-effort push of existing local changes, then starts automatic sync with --force by default)`);
    } else {
      console.log(`  ${path.join(launcherDir, 'watch.sh')}  (starts automatic sync with --force by default)`);
    }
  }
}

async function readJsonIfExists(filePath) {
  if (!existsSync(filePath)) {
    return null;
  }

  const raw = await readFile(filePath, 'utf8');
  return JSON.parse(raw);
}

async function main() {
  const options = parseArgs(process.argv.slice(2));

  if (options.help) {
    printHelp();
    return;
  }

  validateOptions(options);

  const targetDir = path.resolve(options.targetDir);
  const configPath = path.join(targetDir, 'pcconfig.json');
  const pcsyncInstalled = detectPcsync();

  await mkdir(targetDir, { recursive: true });

  const existingConfig = await readJsonIfExists(configPath);
  if (existingConfig && !options.force) {
    throw new Error(
      `A pcconfig.json already exists at ${configPath}. Re-run with --force to overwrite it.`,
    );
  }

  const config = {
    ...DEFAULT_CONFIG,
    PLAYCANVAS_PROJECT_ID: Number.isNaN(Number(options.projectId))
      ? options.projectId
      : Number(options.projectId),
    PLAYCANVAS_BRANCH_ID: options.branchId,
    PLAYCANVAS_API_KEY: options.apiKey,
    PLAYCANVAS_TARGET_DIR: targetDir,
  };

  await writeFile(configPath, `${JSON.stringify(config, null, 2)}\n`, 'utf8');

  console.log(`Created ${configPath}`);
  console.log(`Target directory: ${targetDir}`);
  console.log(`Project ID: ${options.projectId}`);
  console.log(`Branch ID: ${options.branchId}`);

  if (!pcsyncInstalled) {
    if (options.requireWatch) {
      throw new Error(
        'playcanvas-sync was not found on PATH. Install playcanvas-sync before using --require-watch.',
      );
    }

    console.log('playcanvas-sync was not found on PATH.');
    console.log('Install it globally with: npm install -g playcanvas-sync');
    console.log('After installation, run:');
    console.log(`  cd ${targetDir}`);
    console.log('  pcsync --help');
    return;
  }

  const commandProfile = getCommandProfile(pcsyncInstalled);
  console.log('Detected npm playcanvas-sync command profile.');
  if (commandProfile.hasWatch) {
    console.log(`Detected automatic sync command: ${formatWatchInvocation(commandProfile)}`);
  }

  const launcherDir = await writeLauncherScripts(targetDir, commandProfile);
  console.log(`Created local wrapper scripts in ${launcherDir}`);

  if (options.requireWatch && !commandProfile.hasWatch) {
    printWatchUpgradeGuidance();
    throw new Error('The installed playcanvas-sync does not expose a watch command. Reinstall playcanvas-sync and try again.');
  }

  if (options.pull) {
    console.log(`Running pcsync ${commandProfile.pull.join(' ')}...`);
    const pullResult = runPcsync(pcsyncInstalled.pcsync.command, commandProfile.pull, targetDir);

    if (pullResult.status !== 0) {
      throw new Error(`pcsync download command failed with exit code ${pullResult.status ?? 'unknown'}`);
    }

    const extraPullArgs = [
      'pullAll',
      '-e',
      EXTRA_PULL_EXTENSIONS.join(','),
      '-y',
    ];

    console.log(
      'Running a best-effort follow-up pull for common binary and .viverse assets...',
    );
    const extraPullResult = runPcsync(pcsyncInstalled.pcsync.command, extraPullArgs, targetDir);

    if (extraPullResult.status !== 0) {
      console.warn(
        'The follow-up pull did not finish cleanly. This playcanvas-sync build can still crash on some remote asset metadata, but files downloaded before the failure are kept locally.',
      );
      console.warn('If .viverse still looks incomplete, run:');
      console.warn(`  cd ${targetDir}`);
      console.warn(`  pcsync ${commandProfile.diff.join(' ')} -r "^\\.viverse(/|$)"`);
    }

    if (commandProfile.hasWatch) {
      console.log('Initial pull completed. For day-to-day local editing, start:');
      console.log(`  cd ${targetDir}`);
      console.log(`  ${path.join(launcherDir, 'watch.sh')}`);
      if (commandProfile.hasPushAll) {
        console.log('This wrapper now does a best-effort push of local changes that already existed before watch startup.');
      }
    }

    return;
  }

  printNextSteps(targetDir, commandProfile);
  console.log(`Home directory note: ${homedir()}`);
}

main().catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
});