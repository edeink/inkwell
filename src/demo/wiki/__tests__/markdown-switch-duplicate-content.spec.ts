/** @jsxImportSource @/utils/compiler */
import { describe, expect, it } from 'vitest';

import { MarkdownBody } from '../widgets/markdown-preview/markdown-body';
import { NodeType, type MarkdownNode } from '../widgets/markdown-preview/parser';

import type { Widget } from '@/core/base';

import { Themes } from '@/styles/theme';

import '@/core/registry';

function countTextByValue(root: Widget | null, value: string): number {
  if (!root) {
    return 0;
  }

  let count = 0;
  const stack: Widget[] = [root];
  while (stack.length > 0) {
    const cur = stack.pop()!;

    if (cur.type === 'Text' && (cur as any).text === value) {
      count++;
    }

    const children = cur.children;
    for (let i = 0; i < children.length; i++) {
      const c = children[i];
      if (c) {
        stack.push(c);
      }
    }
  }

  return count;
}

function collectTextValuesInOrder(root: Widget | null, values: Set<string>): string[] {
  if (!root) {
    return [];
  }

  const out: string[] = [];
  const stack: Widget[] = [root];
  while (stack.length > 0) {
    const cur = stack.pop()!;

    if (cur.type === 'Text') {
      const text = (cur as any).text as string | undefined;
      if (text && values.has(text)) {
        out.push(text);
      }
    }

    const children = cur.children;
    for (let i = children.length - 1; i >= 0; i--) {
      const c = children[i];
      if (c) {
        stack.push(c);
      }
    }
  }
  return out;
}

function expectOrder(root: Widget, first: string, second: string) {
  const values = new Set([first, second]);
  const seq = collectTextValuesInOrder(root, values);
  const i1 = seq.indexOf(first);
  const i2 = seq.indexOf(second);
  expect(i1).toBeGreaterThanOrEqual(0);
  expect(i2).toBeGreaterThanOrEqual(0);
  expect(i1).toBeLessThan(i2);
}

describe('Wiki Demo 频繁切换文档', () => {
  it('切换后应始终只存在一个 Content，且顺序不应被污染', () => {
    const ast1: MarkdownNode = {
      type: NodeType.Root,
      children: [
        {
          type: NodeType.Header,
          level: 1,
          children: [{ type: NodeType.Text, content: 'Title' }],
        },
        {
          type: NodeType.Paragraph,
          children: [{ type: NodeType.Text, content: 'Content' }],
        },
      ],
    };

    const ast2: MarkdownNode = {
      type: NodeType.Root,
      children: [
        {
          type: NodeType.Paragraph,
          children: [{ type: NodeType.Text, content: 'Content' }],
        },
        {
          type: NodeType.Header,
          level: 1,
          children: [{ type: NodeType.Text, content: 'Title' }],
        },
      ],
    };

    const theme = Themes.light;
    const doc1 = { docPath: 'doc-1', headerKeyPrefix: 'doc-1-h' };
    const doc2 = { docPath: 'doc-2', headerKeyPrefix: 'doc-2-h' };

    const body = new MarkdownBody({
      ast: ast1,
      theme,
      headerKeyPrefix: doc1.headerKeyPrefix,
      docPath: doc1.docPath,
    } as any);
    body.createElement(body.data as any);

    try {
      expect(countTextByValue(body as any, 'Title')).toBe(1);
      expect(countTextByValue(body as any, 'Content')).toBe(1);
      expectOrder(body as any, 'Title', 'Content');

      for (let i = 0; i < 10; i++) {
        const doc = i % 2 === 0 ? doc2 : doc1;
        body.createElement({
          ast: i % 2 === 0 ? ast2 : ast1,
          theme,
          headerKeyPrefix: doc.headerKeyPrefix,
          docPath: doc.docPath,
        } as any);
      }

      body.createElement({
        ast: ast2,
        theme,
        headerKeyPrefix: doc2.headerKeyPrefix,
        docPath: doc2.docPath,
      } as any);

      expect(countTextByValue(body as any, 'Title')).toBe(1);
      const contentCount = countTextByValue(body as any, 'Content');
      expect(contentCount).toBe(1);
      expect((body as any).children[0].type).toBe('Column');
      const doc2c0 = collectTextValuesInOrder(
        (body as any).children[0].children[0],
        new Set(['Title', 'Content']),
      );
      const doc2c1 = collectTextValuesInOrder(
        (body as any).children[0].children[1],
        new Set(['Title', 'Content']),
      );
      expect(doc2c0).toEqual(['Content']);
      expect(doc2c1).toEqual(['Title']);
      expectOrder(body as any, 'Content', 'Title');

      body.createElement({
        ast: ast1,
        theme,
        headerKeyPrefix: doc1.headerKeyPrefix,
        docPath: doc1.docPath,
      } as any);

      expect(countTextByValue(body as any, 'Title')).toBe(1);
      expect(countTextByValue(body as any, 'Content')).toBe(1);
      expect((body as any).children[0].type).toBe('Column');
      const doc1c0 = collectTextValuesInOrder(
        (body as any).children[0].children[0],
        new Set(['Title', 'Content']),
      );
      const doc1c1 = collectTextValuesInOrder(
        (body as any).children[0].children[1],
        new Set(['Title', 'Content']),
      );
      expect(doc1c0).toEqual(['Title']);
      expect(doc1c1).toEqual(['Content']);
      expectOrder(body as any, 'Title', 'Content');
    } finally {
      body.dispose();
    }
  });
});
