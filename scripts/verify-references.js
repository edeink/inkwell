import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import https from 'https';
import http from 'http';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DATA_FILE = path.join(__dirname, '../src/site/data/benchmarks.ts');

console.log('🔍 开始验证引用数据源有效性...');
console.log(`📂 读取文件: ${DATA_FILE}`);

try {
  const content = fs.readFileSync(DATA_FILE, 'utf-8');
  // 简单的正则提取 url: '...'
  const urlRegex = /url:\s*'([^']+)'/g;
  let match;
  const urls = [];

  while ((match = urlRegex.exec(content)) !== null) {
    urls.push(match[1]);
  }

  if (urls.length === 0) {
    console.warn('⚠️ 未找到任何 URL 链接。');
    process.exit(0);
  }

  console.log(`🔗 发现 ${urls.length} 个链接，开始检测连通性...\n`);

  const checkUrl = (url) => {
    return new Promise((resolve) => {
      const client = url.startsWith('https') ? https : http;
      // 使用简单的 User-Agent 避免被某些站点直接拒绝
      const options = {
        method: 'HEAD',
        timeout: 8000,
        headers: {
          'User-Agent':
            'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.114 Safari/537.36',
        },
      };

      const req = client.request(url, options, (res) => {
        if (res.statusCode && res.statusCode >= 200 && res.statusCode < 400) {
          resolve({ url, status: '✅ OK', code: res.statusCode });
        } else if (res.statusCode === 405) {
          // Method Not Allowed (likely HEAD not supported), try GET
          resolve({ url, status: '⚠️ Warn', code: 405, msg: 'HEAD not allowed' });
        } else {
          resolve({ url, status: '⚠️ Warn', code: res.statusCode });
        }
      });

      req.on('error', (err) => {
        resolve({ url, status: '❌ Fail', error: err.message });
      });

      req.on('timeout', () => {
        req.destroy();
        resolve({ url, status: '❌ Timeout' });
      });

      req.end();
    });
  };

  Promise.all(urls.map(checkUrl)).then((results) => {
    results.forEach((r) => {
      if (r.error) {
        console.log(`${r.status} ${r.url} - ${r.error}`);
      } else {
        console.log(`${r.status} [${r.code || '---'}] ${r.url}`);
      }
    });
    console.log('\n✨ 验证完成。');
  });
} catch (err) {
  console.error('❌ 读取或解析文件失败:', err);
  process.exit(1);
}
