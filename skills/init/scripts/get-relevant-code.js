import fs from 'fs/promises';
import path from 'path';
import { execFile } from 'child_process';
import { promisify } from 'util';

const execFileAsync = promisify(execFile);
const STOP_WORDS = new Set([
  'a', 'an', 'and', 'are', 'as', 'at', 'be', 'by', 'for', 'from', 'how', 'i', 'if',
  'in', 'is', 'it', 'of', 'on', 'or', 'that', 'the', 'this', 'to', 'was', 'we', 'with',
  'what', 'when', 'where', 'which', 'who', 'why', 'you', 'your', 'please', 'need', 'want',
  'task', 'build', 'make', 'create', 'add', 'update', 'fix', 'implement'
]);
const MAX_RG_MATCHES = 20;
const MAX_RETURN_NODES = 8;
const MIN_RETURN_NODES = 5;
const MAX_TOTAL_LINES = 300;

function normalizePath(filePath) {
  return filePath.replace(/\\/g, '/');
}

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function extractKeywords(task) {
  return Array.from(
    new Set(
      String(task || '')
        .toLowerCase()
        .split(/[^a-z0-9_]+/)
        .filter((token) => token.length >= 3)
        .filter((token) => !STOP_WORDS.has(token))
    )
  ).slice(0, 12);
}

async function runRipgrep({ keywords, projectPath }) {
  if (!keywords.length) {
    return { matches: [], files: new Set() };
  }

  const pattern = keywords.map(escapeRegExp).join('|');
  const args = [
    '--json',
    '-S',
    '--max-count',
    String(MAX_RG_MATCHES),
    '--glob',
    '!**/node_modules/**',
    '--glob',
    '!**/.git/**',
    '--glob',
    '!**/build/**',
    '--glob',
    '!**/dist/**',
    '-e',
    pattern,
    projectPath
  ];

  try {
    const { stdout } = await execFileAsync('rg', args, {
      cwd: projectPath,
      maxBuffer: 1024 * 1024,
      windowsHide: true
    });

    const lines = [];
    const files = new Set();

    for (const rawLine of stdout.split(/\r?\n/)) {
      if (!rawLine || lines.length >= MAX_RG_MATCHES) {
        continue;
      }

      let event;
      try {
        event = JSON.parse(rawLine);
      } catch {
        continue;
      }

      if (event.type !== 'match' || !event.data) {
        continue;
      }

      const fileText = event.data.path?.text;
      if (!fileText) {
        continue;
      }

      const lineNumber = event.data.line_number || 0;
      const text = event.data.lines?.text || '';
      lines.push(`${normalizePath(fileText)}:${lineNumber}:${text.trimEnd()}`);
      files.add(normalizePath(fileText));
    }

    return { matches: lines, files };
  } catch (error) {
    const noMatchExit = error && typeof error.code === 'number' && error.code === 1;
    if (noMatchExit) {
      return { matches: [], files: new Set() };
    }

    const binaryMissing = error && (error.code === 'ENOENT' || error.code === 'EACCES');
    if (binaryMissing) {
      return { matches: [], files: new Set() };
    }

    throw error;
  }
}

async function loadIndex(projectPath) {
  const indexPath = path.join(projectPath, 'spectral', 'index.json');
  const raw = await fs.readFile(indexPath, 'utf8');
  const parsed = JSON.parse(raw);
  return Array.isArray(parsed) ? parsed : [];
}

function scoreNode(node, keywords, rgFiles) {
  const haystack = [
    node.name || '',
    node.type || '',
    node.language || '',
    node.file || '',
    node.code || ''
  ].join('\n').toLowerCase();

  let score = 0;
  for (const keyword of keywords) {
    const occurrences = haystack.split(keyword).length - 1;
    if (occurrences > 0) {
      score += Math.min(occurrences, 6);
      if ((node.name || '').toLowerCase().includes(keyword)) {
        score += 3;
      }
      if ((node.file || '').toLowerCase().includes(keyword)) {
        score += 2;
      }
    }
  }

  if (rgFiles.has(normalizePath(node.file || ''))) {
    score += 4;
  }

  return score;
}

function lineSpan(node) {
  const start = Number(node.start_line) || 0;
  const end = Number(node.end_line) || 0;
  if (start > 0 && end >= start) {
    return end - start + 1;
  }

  const codeLines = String(node.code || '').split(/\r?\n/).length;
  return Math.max(codeLines, 1);
}

function pickWithinLineBudget(sortedNodes) {
  const selected = [];
  let totalLines = 0;

  for (const node of sortedNodes) {
    if (selected.length >= MAX_RETURN_NODES) {
      break;
    }

    const span = lineSpan(node);
    if (totalLines + span > MAX_TOTAL_LINES) {
      continue;
    }

    selected.push(node);
    totalLines += span;
  }

  if (selected.length >= MIN_RETURN_NODES) {
    return selected;
  }

  // If we are below the minimum count, prefer short nodes while preserving line budget.
  const remaining = sortedNodes
    .filter((node) => !selected.includes(node))
    .sort((a, b) => lineSpan(a) - lineSpan(b));

  for (const node of remaining) {
    if (selected.length >= MIN_RETURN_NODES || selected.length >= MAX_RETURN_NODES) {
      break;
    }

    const span = lineSpan(node);
    if (totalLines + span > MAX_TOTAL_LINES) {
      continue;
    }

    selected.push(node);
    totalLines += span;
  }

  return selected;
}

export async function getRelevantCode({ task, projectPath }) {
  if (!projectPath) {
    throw new Error('getRelevantCode requires { projectPath }');
  }

  const resolvedProjectPath = path.resolve(projectPath);
  const keywords = extractKeywords(task);
  const rg = await runRipgrep({ keywords, projectPath: resolvedProjectPath });
  const indexNodes = await loadIndex(resolvedProjectPath);

  const candidateNodes = rg.files.size > 0
    ? indexNodes.filter((node) => rg.files.has(normalizePath(node.file || '')))
    : indexNodes;

  const ranked = candidateNodes
    .map((node) => ({ node, score: scoreNode(node, keywords, rg.files) }))
    .filter((entry) => entry.score > 0)
    .sort((a, b) => b.score - a.score)
    .map((entry) => entry.node);

  const fallbackRanked = ranked.length > 0
    ? ranked
    : candidateNodes
      .map((node) => ({ node, score: scoreNode(node, keywords, rg.files) }))
      .sort((a, b) => b.score - a.score)
      .map((entry) => entry.node);

  return {
    nodes: pickWithinLineBudget(fallbackRanked)
  };
}
