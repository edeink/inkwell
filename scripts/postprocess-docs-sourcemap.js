import { readdir, readFile, stat, writeFile } from 'node:fs/promises';
import path from 'node:path';

const rootDir = process.cwd();
const distDir = path.resolve(rootDir, '.vitepress/dist');

async function listFiles(dir) {
  const items = await readdir(dir);
  const out = [];
  for (const name of items) {
    const abs = path.resolve(dir, name);
    const st = await stat(abs);
    if (st.isDirectory()) {
      out.push(...(await listFiles(abs)));
      continue;
    }
    out.push(abs);
  }
  return out;
}

function stripSourceMappingURL(content, ext) {
  if (ext === '.js') {
    const jsRe = /(?:\r?\n)?\/\/# sourceMappingURL=.*?(?:\r?\n)?$/;
    if (!jsRe.test(content)) {
      return { changed: false, next: content };
    }
    return { changed: true, next: content.replace(jsRe, '\n') };
  }
  if (ext === '.css') {
    const cssRe = /(?:\r?\n)?\/\*# sourceMappingURL=.*?\*\/(?:\r?\n)?$/;
    if (!cssRe.test(content)) {
      return { changed: false, next: content };
    }
    return { changed: true, next: content.replace(cssRe, '\n') };
  }
  return { changed: false, next: content };
}

function toDebugPath(filePath) {
  const ext = path.extname(filePath);
  const base = filePath.slice(0, -ext.length);
  return `${base}.debug${ext}`;
}

async function main() {
  const distExists = await stat(distDir).then(
    () => true,
    () => false,
  );
  if (!distExists) {
    process.stderr.write(`找不到产物目录：${distDir}\n`);
    process.exit(1);
  }

  const files = await listFiles(distDir);
  let createdDebug = 0;
  let stripped = 0;

  for (const f of files) {
    const ext = path.extname(f);
    if (ext !== '.js' && ext !== '.css') {
      continue;
    }
    if (f.endsWith('.debug.js') || f.endsWith('.debug.css')) {
      continue;
    }
    if (f.endsWith('.map')) {
      continue;
    }

    const raw = await readFile(f, 'utf8');
    const debugPath = toDebugPath(f);
    const debugExists = await stat(debugPath).then(
      () => true,
      () => false,
    );
    if (!debugExists) {
      await writeFile(debugPath, raw, 'utf8');
      createdDebug++;
    }

    const res = stripSourceMappingURL(raw, ext);
    if (res.changed) {
      await writeFile(f, res.next, 'utf8');
      stripped++;
    }
  }

  process.stdout.write(
    `docs sourcemap 处理完成：生成 debug 文件 ${createdDebug} 个，剥离 sourceMappingURL ${stripped} 个\n`,
  );
}

await main();
