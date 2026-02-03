import { mkdir, readdir, readFile, stat, writeFile } from 'node:fs/promises';
import { execFile } from 'node:child_process';
import path from 'node:path';
import { promisify } from 'node:util';

const DEFAULT_ROOTS = ['src', 'docs'];
const DEFAULT_OUT_DIR = 'reports/code-stats';

const TEXT_EXT = new Set([
  '.ts',
  '.tsx',
  '.js',
  '.jsx',
  '.mjs',
  '.cjs',
  '.json',
  '.css',
  '.less',
  '.md',
  '.mdx',
  '.html',
  '.vue',
  '.yml',
  '.yaml',
]);

const DOC_EXT = new Set(['.md', '.mdx']);
const STYLE_EXT = new Set(['.css', '.less']);
const SCRIPT_EXT = new Set(['.ts', '.tsx', '.js', '.jsx', '.mjs', '.cjs']);

const EXTRA_DOC_FILES_AT_PROJECT_ROOT = new Set(['index.md']);

const IGNORE_DIR_NAMES = new Set([
  'node_modules',
  'dist',
  'build',
  'coverage',
  '.vitepress',
  '.cache',
  '.turbo',
  '.next',
  '.output',
  'out',
  '.git',
  '.DS_Store',
]);

const IGNORE_PATH_SNIPPETS = [
  '/.vitepress/dist/',
  '/.vitepress/cache/',
  '/.vitepress/.temp/',
  '/node_modules/',
  '/dist/',
  '/build/',
  '/coverage/',
  '/.cache/',
  '/.turbo/',
  '/.next/',
  '/.output/',
];

const MAX_FILE_BYTES = 2 * 1024 * 1024;

function toPosix(p) {
  return p.split(path.sep).join('/');
}

function parseArgs(argv) {
  const out = {
    roots: DEFAULT_ROOTS.slice(),
    outDir: DEFAULT_OUT_DIR,
    serve: false,
    open: true,
    port: 5173,
  };
  for (let i = 2; i < argv.length; i++) {
    const a = argv[i] ?? '';
    if (a.startsWith('--root=')) {
      const v = a.slice('--root='.length).trim();
      out.roots = v ? [v] : out.roots;
      continue;
    }
    if (a === '--root') {
      const v = (argv[i + 1] ?? '').trim();
      out.roots = v ? [v] : out.roots;
      i++;
      continue;
    }
    if (a.startsWith('--roots=')) {
      const v = a.slice('--roots='.length).trim();
      if (v) {
        out.roots = v
          .split(',')
          .map((s) => s.trim())
          .filter(Boolean);
      }
      continue;
    }
    if (a === '--roots') {
      const v = (argv[i + 1] ?? '').trim();
      if (v) {
        out.roots = v
          .split(',')
          .map((s) => s.trim())
          .filter(Boolean);
      }
      i++;
      continue;
    }
    if (a.startsWith('--out=')) {
      out.outDir = a.slice('--out='.length).trim() || out.outDir;
      continue;
    }
    if (a === '--out') {
      out.outDir = (argv[i + 1] ?? '').trim() || out.outDir;
      i++;
      continue;
    }
    if (a === '-h' || a === '--help') {
      printHelpAndExit();
    }
    if (a === '--serve') {
      out.serve = true;
      continue;
    }
    if (a === '--no-open') {
      out.open = false;
      continue;
    }
    if (a.startsWith('--port=')) {
      const v = Number(a.slice('--port='.length).trim());
      if (Number.isFinite(v) && v > 0) {
        out.port = v;
      }
      continue;
    }
    if (a === '--port') {
      const v = Number((argv[i + 1] ?? '').trim());
      if (Number.isFinite(v) && v > 0) {
        out.port = v;
      }
      i++;
      continue;
    }
  }
  return out;
}

function printHelpAndExit() {
  const msg = [
    '代码规模统计脚本',
    '',
    '用法：',
    '  node scripts/code-stats.js --roots src,docs --out reports/code-stats',
    '  node scripts/code-stats.js --serve',
    '',
    '参数：',
    '  --root <dir>   扫描单个目录（会覆盖默认值）',
    '  --roots <list> 扫描多个目录（用逗号分隔，默认 src,docs）',
    '  --out <dir>    报告输出目录（默认 reports/code-stats）',
    '  --serve        启动本地服务并打开可视化页面（基于 Vite）',
    '  --port <n>     指定 serve 端口（默认 5173；已占用会自动递增）',
    '  --no-open      serve 时不自动打开浏览器',
    '',
  ].join('\n');
  process.stdout.write(`${msg}\n`);
  process.exit(0);
}

function shouldIgnoreRelPath(relPosix) {
  for (const s of IGNORE_PATH_SNIPPETS) {
    if (relPosix.includes(s)) {
      return true;
    }
  }
  const parts = relPosix.split('/').filter(Boolean);
  for (const p of parts) {
    if (IGNORE_DIR_NAMES.has(p)) {
      return true;
    }
  }
  return false;
}

function isTestFile(relPosix) {
  if (relPosix.includes('/__tests__/') || relPosix.includes('/tests/')) {
    return true;
  }
  return /\.(test|spec)\.[cm]?[jt]sx?$/.test(relPosix);
}

function moduleNameFor(relPosix, rootRelPosix, rootRel) {
  if (rootRel === 'docs') {
    return 'docs';
  }
  const withoutRoot = relPosix.startsWith(rootRelPosix)
    ? relPosix.slice(rootRelPosix.length)
    : relPosix;
  const parts = withoutRoot.split('/').filter(Boolean);
  return parts[0] ?? (rootRel || '(root)');
}

function categoryFor(relPosix, ext) {
  const test = isTestFile(relPosix);
  if (DOC_EXT.has(ext)) {
    return '文档';
  }
  if (STYLE_EXT.has(ext)) {
    return '样式';
  }
  if (SCRIPT_EXT.has(ext)) {
    if (test) {
      return '测试';
    }
    if (ext === '.ts' || ext === '.tsx') {
      return 'TS';
    }
    return 'JS';
  }
  if (TEXT_EXT.has(ext)) {
    return '其他文本';
  }
  return null;
}

function countLines(text) {
  if (!text) {
    return 0;
  }
  let n = 1;
  for (let i = 0; i < text.length; i++) {
    if (text.charCodeAt(i) === 10) {
      n++;
    }
  }
  return n;
}

async function walkFiles(absDir, rootAbs) {
  const out = [];
  async function rec(dir) {
    let items;
    try {
      items = await readdir(dir, { withFileTypes: true });
    } catch {
      return;
    }
    for (const it of items) {
      const abs = path.join(dir, it.name);
      const rel = toPosix(path.relative(rootAbs, abs));
      if (shouldIgnoreRelPath(`/${rel}/`.replaceAll('//', '/'))) {
        continue;
      }
      if (it.isDirectory()) {
        await rec(abs);
        continue;
      }
      if (!it.isFile()) {
        continue;
      }
      out.push(abs);
    }
  }
  await rec(absDir);
  return out;
}

async function walkRoots(rootsRel, projectRoot) {
  const out = [];
  for (const rootRel of rootsRel) {
    const absDir = path.resolve(projectRoot, rootRel);
    const files = await walkFiles(absDir, projectRoot);
    for (const abs of files) {
      out.push({ abs, rootRel });
    }
  }
  return out;
}

function ensureBucket(obj, key) {
  if (!obj[key]) {
    obj[key] = { lines: 0, files: 0 };
  }
  return obj[key];
}

function formatInt(n) {
  return new Intl.NumberFormat('zh-CN').format(n);
}

function percent(part, total) {
  if (total <= 0) {
    return '0%';
  }
  const p = (part / total) * 100;
  if (p < 0.1 && part > 0) {
    return '<0.1%';
  }
  return `${p.toFixed(1)}%`;
}

function renderConsoleReport(report) {
  const cats = report.categories;
  const total = report.summary.total.lines;
  const lines = [];
  lines.push('');
  lines.push(`以下是项目代码模块统计（扫描：${(report.rootsRel || []).join(', ')}）`);
  lines.push('');
  const header = ['模块', 'TS(有效)', '测试', '样式', '文档', '其他', '合计'];
  lines.push(header.join('\t'));
  for (const m of report.modules) {
    const row = [
      `/${m.module}`,
      formatInt(m.totals.TS.lines),
      formatInt(m.totals.测试.lines),
      formatInt(m.totals.样式.lines),
      formatInt(m.totals.文档.lines),
      formatInt(m.totals.其他.lines),
      formatInt(m.totals.合计.lines),
    ];
    lines.push(row.join('\t'));
  }
  lines.push('');
  lines.push('总览：');
  lines.push(
    [
      `总行数 ${formatInt(total)}`,
      `TS ${formatInt(cats.TS.lines)} (${percent(cats.TS.lines, total)})`,
      `测试 ${formatInt(cats.测试.lines)} (${percent(cats.测试.lines, total)})`,
      `样式 ${formatInt(cats.样式.lines)} (${percent(cats.样式.lines, total)})`,
      `文档 ${formatInt(cats.文档.lines)} (${percent(cats.文档.lines, total)})`,
      `其他 ${formatInt(cats.其他.lines)} (${percent(cats.其他.lines, total)})`,
    ].join('，'),
  );
  return lines.join('\n');
}

const execFileAsync = promisify(execFile);

async function openInBrowser(url) {
  if (!url) return;
  try {
    if (process.platform === 'darwin') {
      await execFileAsync('open', [url]);
      return;
    }
    if (process.platform === 'win32') {
      await execFileAsync('cmd', ['/c', 'start', '', url]);
      return;
    }
    await execFileAsync('xdg-open', [url]);
  } catch {
    process.stdout.write(`\n未能自动打开浏览器，请手动访问：${url}\n`);
  }
}

async function serveAndOpen({ port, open }) {
  const { createServer } = await import('vite');
  const server = await createServer({
    root: process.cwd(),
    server: {
      port,
      strictPort: false,
    },
    logLevel: 'info',
  });
  await server.listen();
  server.printUrls();

  const base = server.resolvedUrls?.local?.[0] || `http://localhost:${server.config.server.port}/`;
  const url = new URL('/reports/code-stats', base).toString();
  process.stdout.write(`\n可视化地址：${url}\n`);
  if (open) {
    await openInBrowser(url);
  }

  process.on('SIGINT', async () => {
    await server.close();
    process.exit(0);
  });
}

async function main() {
  const { roots: rootsRel, outDir: outDirRel, serve, open, port } = parseArgs(process.argv);
  const projectRoot = process.cwd();
  const outAbs = path.resolve(projectRoot, outDirRel);

  const files = await walkRoots(rootsRel, projectRoot);
  for (const f of Array.from(EXTRA_DOC_FILES_AT_PROJECT_ROOT)) {
    const abs = path.resolve(projectRoot, f);
    try {
      const st = await stat(abs);
      if (st.isFile() && st.size <= MAX_FILE_BYTES) {
        files.push({ abs, rootRel: 'docs' });
      }
    } catch {
      continue;
    }
  }

  const moduleMap = new Map();
  const categories = {
    TS: { lines: 0, files: 0 },
    JS: { lines: 0, files: 0 },
    测试: { lines: 0, files: 0 },
    样式: { lines: 0, files: 0 },
    文档: { lines: 0, files: 0 },
    其他文本: { lines: 0, files: 0 },
    其他: { lines: 0, files: 0 },
  };

  for (const f of files) {
    const abs = f.abs;
    const rootRel = f.rootRel;
    const relPosix = toPosix(path.relative(projectRoot, abs));
    const ext = path.extname(abs).toLowerCase();
    if (!ext) {
      continue;
    }
    if (!TEXT_EXT.has(ext) && !DOC_EXT.has(ext) && !STYLE_EXT.has(ext) && !SCRIPT_EXT.has(ext)) {
      continue;
    }
    let st;
    try {
      st = await stat(abs);
    } catch {
      continue;
    }
    if (!st.isFile()) {
      continue;
    }
    if (st.size > MAX_FILE_BYTES) {
      continue;
    }
    let content = '';
    try {
      content = await readFile(abs, 'utf8');
    } catch {
      continue;
    }
    if (content.includes('\u0000')) {
      continue;
    }

    const cat = categoryFor(`/${relPosix}`, ext);
    if (!cat) {
      continue;
    }
    const rootRelPosix = `/${toPosix(rootRel).replace(/^\/+/, '').replace(/\/+$/, '')}/`;
    const mod = moduleNameFor(`/${relPosix}`, rootRelPosix, rootRel);
    if (!moduleMap.has(mod)) {
      moduleMap.set(mod, {
        module: mod,
        totals: {
          TS: { lines: 0, files: 0 },
          JS: { lines: 0, files: 0 },
          测试: { lines: 0, files: 0 },
          样式: { lines: 0, files: 0 },
          文档: { lines: 0, files: 0 },
          其他文本: { lines: 0, files: 0 },
          其他: { lines: 0, files: 0 },
          合计: { lines: 0, files: 0 },
        },
      });
    }
    const bucket = moduleMap.get(mod);
    const lines = countLines(content);

    ensureBucket(bucket.totals, cat).lines += lines;
    ensureBucket(bucket.totals, cat).files += 1;
    ensureBucket(bucket.totals, '合计').lines += lines;
    ensureBucket(bucket.totals, '合计').files += 1;

    if (cat === '其他文本') {
      categories['其他文本'].lines += lines;
      categories['其他文本'].files += 1;
    } else if (cat === 'JS') {
      categories.JS.lines += lines;
      categories.JS.files += 1;
    } else if (cat === 'TS') {
      categories.TS.lines += lines;
      categories.TS.files += 1;
    } else if (cat === '测试') {
      categories.测试.lines += lines;
      categories.测试.files += 1;
    } else if (cat === '样式') {
      categories.样式.lines += lines;
      categories.样式.files += 1;
    } else if (cat === '文档') {
      categories.文档.lines += lines;
      categories.文档.files += 1;
    } else {
      categories.其他.lines += lines;
      categories.其他.files += 1;
    }
  }

  const modules = Array.from(moduleMap.values())
    .map((m) => {
      const totals = m.totals;
      const otherLines = totals.JS.lines + totals['其他文本'].lines + totals['其他'].lines;
      const otherFiles = totals.JS.files + totals['其他文本'].files + totals['其他'].files;
      return {
        module: m.module,
        totals: {
          TS: totals.TS,
          测试: totals.测试,
          样式: totals.样式,
          文档: totals.文档,
          其他: { lines: otherLines, files: otherFiles },
          合计: totals.合计,
        },
      };
    })
    .sort((a, b) => b.totals.合计.lines - a.totals.合计.lines);

  const mergedCats = {
    TS: categories.TS,
    测试: categories.测试,
    样式: categories.样式,
    文档: categories.文档,
    其他: {
      lines: categories.JS.lines + categories['其他文本'].lines + categories.其他.lines,
      files: categories.JS.files + categories['其他文本'].files + categories.其他.files,
    },
  };

  const summary = {
    total: {
      lines:
        mergedCats.TS.lines +
        mergedCats.测试.lines +
        mergedCats.样式.lines +
        mergedCats.文档.lines +
        mergedCats.其他.lines,
      files:
        mergedCats.TS.files +
        mergedCats.测试.files +
        mergedCats.样式.files +
        mergedCats.文档.files +
        mergedCats.其他.files,
    },
  };

  const report = {
    generatedAt: new Date().toISOString(),
    rootsRel,
    outDir: outDirRel,
    categories: mergedCats,
    summary,
    modules,
  };

  await mkdir(outAbs, { recursive: true });
  const jsonPath = path.join(outAbs, 'code-stats.json');
  await writeFile(jsonPath, JSON.stringify(report, null, 2), 'utf8');

  process.stdout.write(renderConsoleReport(report));
  process.stdout.write(`数据文件：${toPosix(path.relative(projectRoot, jsonPath))}\n`);

  if (serve) {
    await serveAndOpen({ port, open });
  }
}

main().catch((e) => {
  const msg = (e && e.stack) || String(e);
  process.stderr.write(`统计失败：${msg}\n`);
  process.exit(1);
});
