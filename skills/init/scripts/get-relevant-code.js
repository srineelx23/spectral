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
const UI_HINTS = new Set([
  'ui', 'ux', 'frontend', 'front-end', 'html', 'css', 'scss', 'style', 'styles',
  'template', 'layout', 'theme', 'dark', 'darkmode', 'dark-mode', 'component',
  'components', 'view', 'views', 'page', 'pages', 'screen', 'screens', 'responsive',
  'design', 'navbar', 'sidebar', 'modal', 'dialog', 'form', 'button'
]);
const BACKEND_HINTS = new Set([
  'backend', 'back-end', 'api', 'server', 'service', 'services', 'endpoint', 'endpoints',
  'route', 'routes', 'controller', 'controllers', 'database', 'db', 'sql', 'query',
  'worker', 'job', 'queue', 'cache', 'auth', 'authorization', 'authentication', 'graphql'
]);
const COMPONENT_PATH_HINTS = [
  '/component/', '/components/', '/page/', '/pages/', '/view/', '/views/', '/screen/',
  '/screens/', '/ui/', '/feature/', '/features/', '/widget/', '/widgets/', '/dialog/', '/modal/'
];

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

function detectTaskType(task, keywords) {
  const taskText = String(task || '').toLowerCase();
  let uiScore = 0;
  let backendScore = 0;

  for (const keyword of keywords) {
    if (UI_HINTS.has(keyword) || taskText.includes(keyword)) {
      uiScore += 1;
    }
    if (BACKEND_HINTS.has(keyword) || taskText.includes(keyword)) {
      backendScore += 1;
    }
  }

  if (uiScore > backendScore && uiScore > 0) {
    return 'ui';
  }

  if (backendScore > uiScore && backendScore > 0) {
    return 'backend';
  }

  return 'general';
}

function isComponentPath(filePath) {
  const normalized = normalizePath(String(filePath || '')).toLowerCase();
  return COMPONENT_PATH_HINTS.some((hint) => normalized.includes(hint));
}

function isAllowedForTask(node, taskType) {
  const language = String(node.language || '').toLowerCase();

  if (taskType === 'ui') {
    return language === 'html' || language === 'css' || language === 'scss' || language === 'typescript';
  }

  if (taskType === 'backend') {
    return language === 'typescript' || language === 'javascript';
  }

  return ['html', 'css', 'scss', 'typescript', 'javascript'].includes(language);
}

function nodeCategory(node, taskType) {
  const language = String(node.language || '').toLowerCase();
  const type = String(node.type || '').toLowerCase();

  if (taskType === 'ui') {
    if (language === 'html' || type === 'template') {
      return 'template';
    }

    if (language === 'css' || language === 'scss' || type === 'style') {
      return 'style';
    }

    if (language === 'typescript' && isComponentPath(node.file)) {
      return 'component';
    }

    if (language === 'typescript') {
      return 'ui-code';
    }

    return null;
  }

  if (taskType === 'backend') {
    if (language === 'typescript' || language === 'javascript') {
      return 'backend';
    }

    return null;
  }

  if (language === 'html' || type === 'template') return 'template';
  if (language === 'css' || language === 'scss' || type === 'style') return 'style';
  if (language === 'typescript' && isComponentPath(node.file)) return 'component';
  if (language === 'typescript' || language === 'javascript') return 'code';

  return null;
}

function categoryPriority(category) {
  switch (category) {
    case 'template':
      return 5;
    case 'style':
      return 4;
    case 'component':
      return 3;
    case 'ui-code':
      return 2;
    case 'backend':
      return 2;
    case 'code':
      return 1;
    default:
      return 0;
  }
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

function scoreNode(node, keywords, rgFiles, taskType) {
  const haystack = [
    node.name || '',
    node.type || '',
    node.language || '',
    node.file || '',
    node.code || ''
  ].join('\n').toLowerCase();

  let score = 0;

  const category = nodeCategory(node, taskType);
  score += categoryPriority(category) * 20;

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

function trimCodeToLines(code, maxLines) {
  const lines = String(code || '').split(/\r?\n/);
  if (lines.length <= maxLines) {
    return String(code || '');
  }

  return lines.slice(0, maxLines).join('\n');
}

function compressSelectedNodes(nodes, maxTotalLines) {
  const copies = nodes.map((node) => ({ ...node }));
  let total = copies.reduce((sum, node) => sum + lineSpan(node), 0);

  if (total <= maxTotalLines) {
    return copies;
  }

  const order = copies
    .map((node) => ({ node, priority: categoryPriority(node.category), span: lineSpan(node) }))
    .sort((a, b) => a.priority - b.priority || b.span - a.span);

  for (const { node } of order) {
    if (total <= maxTotalLines) {
      break;
    }

    const currentSpan = lineSpan(node);
    if (currentSpan <= 1) {
      continue;
    }

    const reducible = Math.min(currentSpan - 1, total - maxTotalLines);
    const keepLines = currentSpan - reducible;
    node.code = trimCodeToLines(node.code, keepLines);
    node.end_line = Number(node.start_line) + keepLines - 1;
    total -= reducible;
  }

  return copies;
}

function sortNodesForRetrieval(nodes) {
  return [...nodes].sort((a, b) => {
    const scoreDelta = (b.score || 0) - (a.score || 0);
    if (scoreDelta !== 0) {
      return scoreDelta;
    }

    const categoryDelta = categoryPriority(b.category) - categoryPriority(a.category);
    if (categoryDelta !== 0) {
      return categoryDelta;
    }

    const spanDelta = lineSpan(a.node) - lineSpan(b.node);
    if (spanDelta !== 0) {
      return spanDelta;
    }

    return String(a.node.file || '').localeCompare(String(b.node.file || ''));
  });
}

function pickBestNode(nodes, selectedFiles) {
  for (const candidate of sortNodesForRetrieval(nodes)) {
    const fileKey = normalizePath(candidate.node.file || '');
    if (selectedFiles.has(fileKey)) {
      continue;
    }

    selectedFiles.add(fileKey);
    return candidate;
  }

  return null;
}

export async function getRelevantCode({ task, projectPath }) {
  if (!projectPath) {
    throw new Error('getRelevantCode requires { projectPath }');
  }

  const resolvedProjectPath = path.resolve(projectPath);
  const keywords = extractKeywords(task);
  const taskType = detectTaskType(task, keywords);
  const rg = await runRipgrep({ keywords, projectPath: resolvedProjectPath });
  const indexNodes = await loadIndex(resolvedProjectPath);

  const taskFilteredNodes = indexNodes.filter((node) => isAllowedForTask(node, taskType));
  const rgFilteredNodes = rg.files.size > 0
    ? taskFilteredNodes.filter((node) => rg.files.has(normalizePath(node.file || '')))
    : taskFilteredNodes;

  let candidateNodes = rgFilteredNodes;
  if (candidateNodes.length < MIN_RETURN_NODES) {
    const supplemental = taskFilteredNodes.filter((node) => !candidateNodes.includes(node));
    candidateNodes = candidateNodes.concat(supplemental);
  }

  const scored = candidateNodes
    .map((node) => ({
      node,
      category: nodeCategory(node, taskType),
      score: scoreNode(node, keywords, rg.files, taskType)
    }))
    .filter((entry) => entry.category !== null && entry.score > 0);

  const ranked = scored.length > 0
    ? scored
    : candidateNodes
      .map((node) => ({
        node,
        category: nodeCategory(node, taskType),
        score: scoreNode(node, keywords, rg.files, taskType)
      }))
      .filter((entry) => entry.category !== null)
      .sort((a, b) => b.score - a.score || categoryPriority(b.category) - categoryPriority(a.category));

  const selected = [];
  const selectedFiles = new Set();

  if (taskType === 'ui') {
    const requiredCategories = ['template', 'style', 'component'];
    for (const category of requiredCategories) {
      const best = pickBestNode(ranked.filter((entry) => entry.category === category), selectedFiles);
      if (best) {
        selected.push(best);
      }
    }
  }

  const remaining = ranked
    .filter((entry) => !selected.includes(entry))
    .sort((a, b) => b.score - a.score || categoryPriority(b.category) - categoryPriority(a.category) || lineSpan(a.node) - lineSpan(b.node));

  for (const entry of remaining) {
    if (selected.length >= MAX_RETURN_NODES) {
      break;
    }

    selected.push(entry);
    if (selected.length >= MIN_RETURN_NODES && selected.reduce((sum, item) => sum + lineSpan(item.node), 0) >= MAX_TOTAL_LINES) {
      break;
    }
  }

  const deduped = selected
    .map((entry) => entry.node)
    .filter((node, index, array) => array.findIndex((candidate) => candidate.file === node.file && candidate.start_line === node.start_line) === index)
    .slice(0, MAX_RETURN_NODES);

  const compressed = compressSelectedNodes(deduped, MAX_TOTAL_LINES);

  return {
    nodes: compressed
      .sort((a, b) => {
        const aCategory = nodeCategory(a, taskType);
        const bCategory = nodeCategory(b, taskType);
        return categoryPriority(bCategory) - categoryPriority(aCategory) || lineSpan(a) - lineSpan(b);
      })
      .slice(0, MAX_RETURN_NODES)
  };
}
