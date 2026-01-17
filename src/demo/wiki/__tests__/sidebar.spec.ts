import { describe, expect, it } from 'vitest';

import { createWikiDocLoader, flattenSidebarToDocIds } from '../helpers/wiki-doc';
import sidebars from '../raw/sidebar';

describe('Wiki Demo sidebar 配置', () => {
  it('应从 sidebar 配置解析出文档 id 列表', () => {
    const modules = import.meta.glob('../raw/**/*.markdown', { query: '?raw', import: 'default' });
    const ids = flattenSidebarToDocIds((sidebars as any).docs, modules);
    expect(ids).toEqual(['intro', 'guide/getting-started', 'guide/layout', 'sample', 'sum-2025']);
  });

  it('应能按需加载指定文档内容', async () => {
    const modules = import.meta.glob('../raw/**/*.markdown', { query: '?raw', import: 'default' });
    const loadDoc = createWikiDocLoader(modules as any);
    const doc = await loadDoc('intro');
    expect(doc.content.length).toBeGreaterThan(0);
  });

  it('当文档不存在时应返回空内容', async () => {
    const modules = import.meta.glob('../raw/**/*.markdown', { query: '?raw', import: 'default' });
    const loadDoc = createWikiDocLoader(modules as any);
    const doc = await loadDoc('not-exist');
    expect(doc.content).toBe('');
  });
});
