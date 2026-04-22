import fs from 'fs/promises';
import path from 'path';

const SKIP_DIRS = new Set(['node_modules', '.git', 'build', 'dist']);
const SUPPORTED_EXTENSIONS = {
  javascript: new Set(['.js', '.jsx', '.mjs', '.cjs']),
  typescript: new Set(['.ts', '.tsx']),
  python: new Set(['.py']),
  java: new Set(['.java']),
  go: new Set(['.go']),
  cpp: new Set(['.cpp', '.cc', '.cxx', '.hpp', '.hh', '.h'])
};
const BINARY_EXTENSIONS = new Set([
  '.png', '.jpg', '.jpeg', '.gif', '.bmp', '.ico', '.webp', '.pdf', '.zip', '.gz',
  '.tar', '.7z', '.exe', '.dll', '.so', '.dylib', '.class', '.jar', '.wasm'
]);
const CHUNK_SIZE = 120;
const DEFAULT_CONCURRENCY = 8;

const parserCtorCache = { value: null };
const languageCache = new Map();

function normalizePath(filePath) {
  return filePath.replace(/\\/g, '/');
}

function detectLanguage(filePath) {
  const ext = path.extname(filePath).toLowerCase();

  for (const [language, extensions] of Object.entries(SUPPORTED_EXTENSIONS)) {
    if (extensions.has(ext)) {
      return language;
    }
  }

  return ext ? ext.slice(1) : 'unknown';
}

function isTextCandidate(filePath) {
  const ext = path.extname(filePath).toLowerCase();
  return !BINARY_EXTENSIONS.has(ext);
}

async function scanProjectFiles(projectPath) {
  const files = [];
  const stack = [projectPath];

  while (stack.length > 0) {
    const current = stack.pop();
    const entries = await fs.readdir(current, { withFileTypes: true });

    for (const entry of entries) {
      const fullPath = path.join(current, entry.name);

      if (entry.isDirectory()) {
        if (SKIP_DIRS.has(entry.name)) {
          continue;
        }
        stack.push(fullPath);
        continue;
      }

      if (entry.isFile() && isTextCandidate(fullPath)) {
        files.push(fullPath);
      }
    }
  }

  return files;
}

async function getParserCtor() {
  if (parserCtorCache.value) {
    return parserCtorCache.value;
  }

  try {
    const mod = await import('tree-sitter');
    const ctor = mod.default || mod.Parser || mod;
    parserCtorCache.value = ctor;
    return ctor;
  } catch {
    return null;
  }
}

async function loadLanguageGrammar(language) {
  if (languageCache.has(language)) {
    return languageCache.get(language);
  }

  let grammar = null;

  try {
    if (language === 'javascript') {
      const mod = await import('tree-sitter-javascript');
      grammar = mod.default || mod.javascript || mod;
    } else if (language === 'typescript') {
      const mod = await import('tree-sitter-typescript');
      grammar = mod.typescript || mod.default?.typescript || mod.default || mod;
    } else if (language === 'python') {
      const mod = await import('tree-sitter-python');
      grammar = mod.default || mod.python || mod;
    } else if (language === 'java') {
      const mod = await import('tree-sitter-java');
      grammar = mod.default || mod.java || mod;
    } else if (language === 'go') {
      const mod = await import('tree-sitter-go');
      grammar = mod.default || mod.go || mod;
    } else if (language === 'cpp') {
      const mod = await import('tree-sitter-cpp');
      grammar = mod.default || mod.cpp || mod;
    }
  } catch {
    grammar = null;
  }

  languageCache.set(language, grammar);
  return grammar;
}

function getNodeName(node, lines) {
  const nameNode = node.childForFieldName?.('name');
  if (nameNode) {
    return lines
      .slice(nameNode.startPosition.row, nameNode.endPosition.row + 1)
      .join('\n')
      .trim();
  }

  return null;
}

function toEntry({ file, language, type, name, code, startLine, endLine }) {
  return {
    id: `${file}::${startLine}`,
    language,
    type,
    name,
    file,
    code,
    start_line: startLine,
    end_line: endLine
  };
}

function classifyNode(language, node, parentNode, lines) {
  const nodeType = node.type;
  const parentType = parentNode?.type;

  if (language === 'javascript' || language === 'typescript') {
    if (nodeType === 'class_declaration') {
      return { type: 'class', name: getNodeName(node, lines) || `class_${node.startPosition.row + 1}` };
    }
    if (nodeType === 'method_definition') {
      return { type: 'method', name: getNodeName(node, lines) || `method_${node.startPosition.row + 1}` };
    }
    if (nodeType === 'function_declaration') {
      return { type: 'function', name: getNodeName(node, lines) || `function_${node.startPosition.row + 1}` };
    }
    return null;
  }

  if (language === 'python') {
    if (nodeType === 'class_definition') {
      return { type: 'class', name: getNodeName(node, lines) || `class_${node.startPosition.row + 1}` };
    }
    if (nodeType === 'function_definition') {
      const type = parentType === 'class_definition' ? 'method' : 'function';
      return { type, name: getNodeName(node, lines) || `${type}_${node.startPosition.row + 1}` };
    }
    return null;
  }

  if (language === 'java') {
    if (nodeType === 'class_declaration') {
      return { type: 'class', name: getNodeName(node, lines) || `class_${node.startPosition.row + 1}` };
    }
    if (nodeType === 'method_declaration' || nodeType === 'constructor_declaration') {
      return { type: 'method', name: getNodeName(node, lines) || `method_${node.startPosition.row + 1}` };
    }
    return null;
  }

  if (language === 'go') {
    if (nodeType === 'function_declaration') {
      return { type: 'function', name: getNodeName(node, lines) || `function_${node.startPosition.row + 1}` };
    }
    if (nodeType === 'method_declaration') {
      return { type: 'method', name: getNodeName(node, lines) || `method_${node.startPosition.row + 1}` };
    }
    return null;
  }

  if (language === 'cpp') {
    if (nodeType === 'class_specifier' || nodeType === 'struct_specifier') {
      return { type: 'class', name: getNodeName(node, lines) || `class_${node.startPosition.row + 1}` };
    }
    if (nodeType === 'function_definition') {
      const type = parentType === 'field_declaration_list' ? 'method' : 'function';
      return { type, name: getNodeName(node, lines) || `${type}_${node.startPosition.row + 1}` };
    }
    return null;
  }

  return null;
}

function extractByTreeSitter({ tree, source, language, relativeFile }) {
  const lines = source.split(/\r?\n/);
  const entries = [];

  const walk = (node, parentNode) => {
    const classification = classifyNode(language, node, parentNode, lines);
    if (classification) {
      const startLine = node.startPosition.row + 1;
      const endLine = node.endPosition.row + 1;
      const code = lines.slice(startLine - 1, endLine).join('\n');
      entries.push(
        toEntry({
          file: relativeFile,
          language,
          type: classification.type,
          name: classification.name,
          code,
          startLine,
          endLine
        })
      );
    }

    const children = node.namedChildren || [];
    for (const child of children) {
      walk(child, node);
    }
  };

  walk(tree.rootNode, null);
  return entries;
}

function fallbackChunkFile({ source, language, relativeFile }) {
  const lines = source.split(/\r?\n/);
  const entries = [];

  for (let start = 0; start < lines.length; start += CHUNK_SIZE) {
    const startLine = start + 1;
    const endLine = Math.min(start + CHUNK_SIZE, lines.length);
    const code = lines.slice(start, endLine).join('\n');

    entries.push(
      toEntry({
        file: relativeFile,
        language,
        type: 'chunk',
        name: `chunk_${Math.floor(start / CHUNK_SIZE) + 1}`,
        code,
        startLine,
        endLine
      })
    );
  }

  return entries;
}

async function processFile({ projectPath, filePath }) {
  const relativeFile = normalizePath(path.relative(projectPath, filePath));
  const language = detectLanguage(filePath);
  const source = await fs.readFile(filePath, 'utf8');

  const isSupported = ['javascript', 'typescript', 'python', 'java', 'go', 'cpp'].includes(language);
  if (!isSupported) {
    return fallbackChunkFile({ source, language, relativeFile });
  }

  const ParserCtor = await getParserCtor();
  const grammar = await loadLanguageGrammar(language);
  if (!ParserCtor || !grammar) {
    return fallbackChunkFile({ source, language, relativeFile });
  }

  try {
    const parser = new ParserCtor();
    parser.setLanguage(grammar);
    const tree = parser.parse(source);
    return extractByTreeSitter({ tree, source, language, relativeFile });
  } catch {
    return fallbackChunkFile({ source, language, relativeFile });
  }
}

async function mapWithConcurrency(items, concurrency, mapper) {
  const results = new Array(items.length);
  let nextIndex = 0;

  const worker = async () => {
    while (true) {
      const current = nextIndex;
      nextIndex += 1;
      if (current >= items.length) {
        return;
      }

      try {
        results[current] = await mapper(items[current]);
      } catch {
        results[current] = [];
      }
    }
  };

  const workers = Array.from({ length: Math.min(concurrency, items.length) }, () => worker());
  await Promise.all(workers);
  return results;
}

export async function buildCodeIndex({ projectPath }) {
  if (!projectPath) {
    throw new Error('buildCodeIndex requires { projectPath }');
  }

  const startedAt = Date.now();
  const resolvedProjectPath = path.resolve(projectPath);
  const files = await scanProjectFiles(resolvedProjectPath);

  const batches = await mapWithConcurrency(
    files,
    DEFAULT_CONCURRENCY,
    async (filePath) => processFile({ projectPath: resolvedProjectPath, filePath })
  );

  const entries = batches.flat();
  const outPath = path.join(resolvedProjectPath, 'spectral', 'index.json');

  await fs.mkdir(path.dirname(outPath), { recursive: true });
  await fs.writeFile(outPath, JSON.stringify(entries, null, 2), 'utf8');

  return {
    filesProcessed: files.length,
    nodesExtracted: entries.length,
    timeTaken: Date.now() - startedAt
  };
}
