import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';

export const DEFAULT_RUNTIME_ENTRY = path.join('scripts', 'index.mjs');

const SCRIPT_SRC_REGEX = /<script\b[^>]*\bsrc\s*=\s*["']([^"']+)["'][^>]*>/gi;

function stripQueryAndHash(value) {
  return value.split('#')[0].split('?')[0];
}

function isExternalScriptSource(source) {
  return /^(?:[a-z]+:)?\/\//iu.test(source) || source.startsWith('data:') || source.startsWith('javascript:');
}

function isRuntimeScriptSource(source) {
  return /\.(?:m?js|cjs)$/iu.test(source);
}

function resolveProjectRelativeScriptPath(projectDir, source) {
  if (source.startsWith('/')) {
    return null;
  }

  return path.resolve(projectDir, source);
}

export function listIndexHtmlScriptEntries(projectDir) {
  const indexHtmlPath = path.join(projectDir, 'index.html');
  if (!existsSync(indexHtmlPath)) {
    return [];
  }

  const indexHtmlSource = readFileSync(indexHtmlPath, 'utf8');
  const entries = [];

  for (const match of indexHtmlSource.matchAll(SCRIPT_SRC_REGEX)) {
    const rawSource = match[1]?.trim();
    if (!rawSource) {
      continue;
    }

    const normalizedSource = stripQueryAndHash(rawSource);
    if (!normalizedSource || isExternalScriptSource(normalizedSource) || !isRuntimeScriptSource(normalizedSource)) {
      continue;
    }

    const absolutePath = resolveProjectRelativeScriptPath(projectDir, normalizedSource);
    entries.push({
      source: normalizedSource,
      absolutePath,
      exists: absolutePath ? existsSync(absolutePath) : false,
    });
  }

  return entries;
}

export function resolveRuntimeEntry(projectDir, runtimeEntryArg, options = {}) {
  const defaultRelativeEntry = options.defaultRelativeEntry ?? DEFAULT_RUNTIME_ENTRY;

  if (runtimeEntryArg) {
    const runtimeEntry = path.isAbsolute(runtimeEntryArg)
      ? runtimeEntryArg
      : path.resolve(projectDir, runtimeEntryArg);

    return {
      runtimeEntry,
      source: 'argument',
      indexHtmlEntries: listIndexHtmlScriptEntries(projectDir),
    };
  }

  const indexHtmlEntries = listIndexHtmlScriptEntries(projectDir);
  const localExistingEntries = indexHtmlEntries.filter((entry) => entry.absolutePath && entry.exists);
  if (localExistingEntries.length > 0) {
    const selectedEntry = localExistingEntries.at(-1);
    return {
      runtimeEntry: selectedEntry.absolutePath,
      source: 'index-html',
      matchedScriptSource: selectedEntry.source,
      indexHtmlEntries,
    };
  }

  const defaultEntry = path.resolve(projectDir, defaultRelativeEntry);
  if (existsSync(defaultEntry)) {
    return {
      runtimeEntry: defaultEntry,
      source: 'default',
      indexHtmlEntries,
    };
  }

  return {
    runtimeEntry: defaultEntry,
    source: 'missing',
    indexHtmlEntries,
  };
}