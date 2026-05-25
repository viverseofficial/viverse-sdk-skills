import path from 'node:path';
import { spawnSync } from 'node:child_process';

const SCRIPT_FILE = new URL(import.meta.url).pathname;
const REPO_ROOT = path.resolve(path.dirname(SCRIPT_FILE), '..');

function printHelp() {
  console.log(`Usage:
  node scripts/run-engine-only-world-smoke.mjs \
    --project-dir <absolute-path> \
    (--app-id <id> | --auto-create-app --name <app-name>) \
    [--description <text>] [--preview-port <port>] [--with-toolkit-runtime] [--with-toolkit-player] [--with-toolkit-quest-ui] [--force]

Options:
  --project-dir      Absolute path to the local engine-only world folder
  --app-id           Existing VIVERSE app ID for publish dry run
  --auto-create-app  Use the auto-create publish flow for dry run
  --name             App name for auto-create dry run
  --description      Optional app description for auto-create dry run
  --preview-port     Port to suggest for local preview (default: 8080)
  --with-toolkit-runtime  Advanced: scaffold a world that is already ready for Toolkit runtime code
  --with-toolkit-player   Advanced: scaffold a world that already includes local avatar support
  --with-toolkit-quest-ui Advanced: scaffold a world with a sample Toolkit interaction plus quest UI flow
  --force            Overwrite package.json, index.html, and main.js when scaffolding
  --help             Show this help message
`);
}

function parseArgs(argv) {
  const result = {
    previewPort: '8080',
    autoCreateApp: false,
    force: false,
    help: false,
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];

    if (arg === '--') continue;
    if (arg === '--auto-create-app') {
      result.autoCreateApp = true;
      continue;
    }
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

function runNodeScript(scriptName, args, goal) {
  const scriptPath = path.join(REPO_ROOT, 'scripts', scriptName);
  const result = spawnSync('node', [scriptPath, ...args], {
    cwd: REPO_ROOT,
    stdio: 'inherit',
  });

  if (result.status !== 0) {
    throw new Error(`${goal} failed with exit code ${result.status ?? 'unknown'}`);
  }
}

function runProjectCommand(projectDir, command, args, goal) {
  const result = spawnSync(command, args, {
    cwd: projectDir,
    stdio: 'inherit',
  });

  if (result.status !== 0) {
    throw new Error(`${goal} failed with exit code ${result.status ?? 'unknown'}`);
  }
}

function main() {
  const options = parseArgs(process.argv.slice(2));

  if (options.help) {
    printHelp();
    return;
  }

  validateOptions(options);

  const projectDir = path.resolve(options.projectDir);
  const scaffoldArgs = ['--project-dir', projectDir];
  if (options.withToolkitRuntime) {
    scaffoldArgs.push('--with-toolkit-runtime');
  }
  if (options.withToolkitPlayer) {
    scaffoldArgs.push('--with-toolkit-player');
  }
  if (options.withToolkitQuestUi) {
    scaffoldArgs.push('--with-toolkit-quest-ui');
  }
  if (options.force) {
    scaffoldArgs.push('--force');
  }

  runNodeScript('create-engine-only-world.mjs', scaffoldArgs, 'Engine-only scaffold');
  runNodeScript('validate-engine-only-world.mjs', ['--project-dir', projectDir, '--strict'], 'Engine-only validation');
  runProjectCommand(projectDir, 'npm', ['install'], 'Dependency install');
  runProjectCommand(projectDir, 'npm', ['run', 'build'], 'Project build');

  const buildOutputDir = path.join(projectDir, 'dist');
  const publishArgs = ['--path', buildOutputDir, '--dry-run'];
  if (options.appId) {
    publishArgs.push('--app-id', options.appId);
  } else {
    publishArgs.push('--auto-create-app', '--name', options.name);
    if (options.description) {
      publishArgs.push('--description', options.description);
    }
  }

  runNodeScript('publish-build-output-to-viverse.mjs', publishArgs, 'VIVERSE publish dry run');

  console.log('Engine-only smoke flow completed.');
  console.log(`Built output: ${buildOutputDir}`);
  console.log(
    `World setup: ${options.withToolkitQuestUi ? 'sample Toolkit interaction and quest UI included' : options.withToolkitPlayer ? 'local avatar starter included' : options.withToolkitRuntime ? 'Toolkit-ready world code included' : 'basic code-first PlayCanvas world'}`,
  );
  console.log(`Preview next by installing dependencies and starting the local dev server, for example: cd ${projectDir} && npm install && npm run dev -- --host 127.0.0.1 --port ${options.previewPort}`);
  console.log(`Then open the matching local URL, for example: http://127.0.0.1:${options.previewPort}/`);
}

try {
  main();
} catch (error) {
  console.error(error.message);
  process.exitCode = 1;
}