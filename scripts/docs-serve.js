import { readFile, stat } from 'node:fs/promises';
import http from 'node:http';
import path from 'node:path';

const rootDir = process.cwd();
const distDir = path.resolve(rootDir, '.vitepress/dist');

function parsePort() {
  const idx = process.argv.findIndex((x) => x === '--port' || x === '-p');
  const raw = idx >= 0 ? process.argv[idx + 1] : null;
  const fromEnv = process.env.PORT;
  const v = raw ?? fromEnv ?? '4173';
  const port = Number(v);
  if (!Number.isFinite(port) || port <= 0) {
    return 4173;
  }
  return port;
}

function contentTypeByExt(ext) {
  switch (ext) {
    case '.html':
      return 'text/html; charset=utf-8';
    case '.js':
      return 'text/javascript; charset=utf-8';
    case '.css':
      return 'text/css; charset=utf-8';
    case '.json':
      return 'application/json; charset=utf-8';
    case '.svg':
      return 'image/svg+xml';
    case '.png':
      return 'image/png';
    case '.jpg':
    case '.jpeg':
      return 'image/jpeg';
    case '.ico':
      return 'image/x-icon';
    case '.map':
      return 'application/json; charset=utf-8';
    default:
      return 'application/octet-stream';
  }
}

async function exists(p) {
  return stat(p).then(
    () => true,
    () => false,
  );
}

async function statSafe(p) {
  return stat(p).then(
    (s) => s,
    () => null,
  );
}

function rewriteHtmlForDebug(html) {
  const jsRe = /(\/assets\/[^"'\s<>]+?)\.js([?#][^"'\s<>]*)?/g;
  const cssRe = /(\/assets\/[^"'\s<>]+?)\.css([?#][^"'\s<>]*)?/g;

  const rewrite = (src, re, ext) =>
    src.replace(re, (_m, p1, p2) => {
      if (typeof p1 === 'string' && p1.endsWith('.debug')) {
        return `${p1}.${ext}${p2 ?? ''}`;
      }
      return `${p1}.debug.${ext}${p2 ?? ''}`;
    });

  return rewrite(rewrite(html, cssRe, 'css'), jsRe, 'js');
}

async function resolveFilePath(urlPathname) {
  const cleaned = decodeURIComponent(urlPathname);
  const withoutLeading = cleaned.startsWith('/') ? cleaned.slice(1) : cleaned;
  if (withoutLeading === '') {
    return path.resolve(distDir, 'index.html');
  }

  const direct = path.resolve(distDir, withoutLeading);
  const directStat = await statSafe(direct);
  if (directStat) {
    if (directStat.isDirectory()) {
      const indexFile = path.resolve(direct, 'index.html');
      if (await exists(indexFile)) {
        return indexFile;
      }
    }
    return direct;
  }

  if (!path.extname(withoutLeading)) {
    const asHtml = path.resolve(distDir, `${withoutLeading}.html`);
    if (await exists(asHtml)) {
      return asHtml;
    }
    const asIndex = path.resolve(distDir, withoutLeading, 'index.html');
    if (await exists(asIndex)) {
      return asIndex;
    }
  }

  return null;
}

async function main() {
  const distExists = await exists(distDir);
  if (!distExists) {
    process.stderr.write(`找不到 docs 产物目录：${distDir}\n`);
    process.stderr.write(`请先执行：pnpm run docs:build\n`);
    process.exit(1);
  }

  const port = parsePort();
  const server = http.createServer(async (req, res) => {
    try {
      const base = `http://${req.headers.host ?? `localhost:${port}`}`;
      const u = new URL(req.url ?? '/', base);
      const isDebug = u.searchParams.get('isDebug') === 'true';

      const filePath = await resolveFilePath(u.pathname);
      if (!filePath) {
        res.statusCode = 404;
        res.setHeader('Content-Type', 'text/plain; charset=utf-8');
        res.end('404 未找到资源');
        return;
      }

      const ext = path.extname(filePath);
      let body = await readFile(filePath);

      if (ext === '.html' && isDebug) {
        const html = body.toString('utf8');
        body = Buffer.from(rewriteHtmlForDebug(html), 'utf8');
      }

      res.statusCode = 200;
      res.setHeader('Content-Type', contentTypeByExt(ext));
      res.setHeader('Cache-Control', 'no-store');
      res.end(body);
    } catch (e) {
      res.statusCode = 500;
      res.setHeader('Content-Type', 'text/plain; charset=utf-8');
      res.end(`500 服务异常：${e instanceof Error ? e.message : String(e)}`);
    }
  });

  server.listen(port, '0.0.0.0', () => {
    process.stdout.write(`docs 预览已启动： http://localhost:${port}/\n`);
    process.stdout.write(`调试模式：在任意页面 URL 后追加 ?isDebug=true\n`);
  });
}

await main();
