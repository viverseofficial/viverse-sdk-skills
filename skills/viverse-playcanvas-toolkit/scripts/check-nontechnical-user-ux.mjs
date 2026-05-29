import { readdir, readFile } from 'node:fs/promises';
import path from 'node:path';

const SCRIPT_FILE = new URL(import.meta.url).pathname;
const REPO_ROOT = path.resolve(path.dirname(SCRIPT_FILE), '..');

const CONFIG_PATH = path.join(REPO_ROOT, 'scripts', 'nontechnical-user-ux.config.json');

function compileRegexRule(rule) {
  return {
    ...rule,
    regex: new RegExp(rule.pattern, rule.flags ?? ''),
  };
}

async function loadConfig() {
  const configSource = await readFile(CONFIG_PATH, 'utf8');
  const config = JSON.parse(configSource);

  return {
    userFacingDirs: (config.userFacingDirs ?? []).map((dirPath) => path.join(REPO_ROOT, dirPath)),
    userFacingFiles: (config.userFacingFiles ?? []).map((filePath) => path.join(REPO_ROOT, filePath)),
    ignorePatterns: (config.ignorePatterns ?? []).map((pattern) => new RegExp(pattern, 'i')),
    allowRuleIdsByFilePattern: (config.allowRuleIdsByFilePattern ?? []).map((entry) => ({
      fileRegex: new RegExp(entry.filePattern, entry.flags ?? ''),
      ruleIds: new Set(entry.ruleIds ?? []),
    })),
    termRules: (config.termRules ?? []).map(compileRegexRule),
    decisionLeakRules: (config.decisionLeakRules ?? []).map(compileRegexRule),
    skipLinePatterns: (config.skipLinePatterns ?? []).map((rule) => new RegExp(rule.pattern, rule.flags ?? '')),
    userFacingScriptLineRegex: new RegExp(config.userFacingScriptLinePattern ?? '', 'u'),
  };
}

function isIgnored(filePath, config) {
  return config.ignorePatterns.some((pattern) => pattern.test(filePath));
}

function isMarkdown(filePath) {
  return filePath.endsWith('.md');
}

function isUserFacingScriptLine(line, config) {
  return config.userFacingScriptLineRegex.test(line);
}

function shouldSkipLine(line, filePath, config) {
  const normalizedLine = line.trim();

  if (!normalizedLine) {
    return true;
  }

  if (config.skipLinePatterns.some((pattern) => pattern.test(normalizedLine))) {
    return true;
  }

  if (filePath.endsWith('.mjs') && /runtime entry/i.test(normalizedLine)) {
    return true;
  }

  return false;
}

async function collectFiles(rootDir) {
  const entries = await readdir(rootDir, { withFileTypes: true });
  const files = [];

  for (const entry of entries) {
    const fullPath = path.join(rootDir, entry.name);
    if (entry.isDirectory()) {
      files.push(...(await collectFiles(fullPath)));
      continue;
    }

    if (entry.isFile()) {
      files.push(fullPath);
    }
  }

  return files;
}

function toWorkspacePath(filePath) {
  return path.relative(REPO_ROOT, filePath) || path.basename(filePath);
}

function isRuleAllowedForFile(ruleId, workspacePath, config) {
  return config.allowRuleIdsByFilePattern.some(
    (entry) => entry.fileRegex.test(workspacePath) && entry.ruleIds.has(ruleId),
  );
}

function scanLine(line, filePath, config) {
  if (shouldSkipLine(line, filePath, config)) {
    return [];
  }

  if (!isMarkdown(filePath) && !isUserFacingScriptLine(line, config)) {
    return [];
  }

  const workspacePath = toWorkspacePath(filePath);
  const findings = [];
  for (const rule of config.termRules) {
    if (rule.regex.test(line) && !isRuleAllowedForFile(rule.id, workspacePath, config)) {
      findings.push({ rule: rule.id, message: rule.message });
    }
  }

  for (const rule of config.decisionLeakRules) {
    if (rule.regex.test(line) && !isRuleAllowedForFile(rule.id, workspacePath, config)) {
      findings.push({ rule: rule.id, message: rule.message });
    }
  }

  return findings;
}

async function main() {
  const config = await loadConfig();

  const discoveredFiles = [
    ...config.userFacingFiles,
    ...(await Promise.all(config.userFacingDirs.map((dir) => collectFiles(dir)))).flat(),
  ]
    .filter((filePath, index, allPaths) => allPaths.indexOf(filePath) === index)
    .filter((filePath) => !isIgnored(filePath, config));

  const findings = [];

  for (const filePath of discoveredFiles) {
    const workspacePath = toWorkspacePath(filePath);
    const source = await readFile(filePath, 'utf8');
    const lines = source.split(/\r?\n/u);

    lines.forEach((line, lineIndex) => {
      const lineFindings = scanLine(line, filePath, config);
      for (const finding of lineFindings) {
        findings.push({
          filePath: workspacePath,
          lineNumber: lineIndex + 1,
          line: line.trim(),
          ...finding,
        });
      }
    });
  }

  if (findings.length === 0) {
    console.log('status: pass');
    console.log('checked: non-technical user UX wording');
    console.log('next action: no flagged jargon or decision-leak phrases were found in the scanned user-facing files.');
    return;
  }

  console.log('status: review');
  console.log(`findings: ${findings.length}`);
  findings.forEach((finding) => {
    console.log(`${finding.filePath}:${finding.lineNumber} [${finding.rule}] ${finding.message}`);
    console.log(`  ${finding.line}`);
  });
  process.exitCode = 1;
}

try {
  await main();
} catch (error) {
  console.error(error.message);
  process.exitCode = 1;
}