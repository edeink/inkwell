import { describe, expect, it } from 'vitest';

import { Connector } from '../connector';
import { MindMapLayout } from '../mindmap-layout';
import { MindMapNode } from '../mindmap-node';

import type { BoxConstraints, Size } from '@/core/base';

describe('MindMapLayout tree DFS layout', () => {
  it('places children on one side and aligns siblings vertically', () => {
    const layout = new MindMapLayout({
      type: 'MindMapLayout',
      key: 'layout-root',
      layout: 'tree',
      spacingX: 40,
      nodeSpacing: 28,
      side: 'right',
    } as any);

    const root = new MindMapNode({ type: 'MindMapNode', key: 'root', title: '主题' } as any);
    const n1 = new MindMapNode({ type: 'MindMapNode', key: 'n1', title: '分支 1' } as any);
    const n2 = new MindMapNode({ type: 'MindMapNode', key: 'n2', title: '分支 2' } as any);
    const n1_1 = new MindMapNode({ type: 'MindMapNode', key: 'n1-1', title: '分支 1.1' } as any);
    const n1_2 = new MindMapNode({ type: 'MindMapNode', key: 'n1-2', title: '分支 1.2' } as any);
    const n1_1_1 = new MindMapNode({
      type: 'MindMapNode',
      key: 'n1-1-1',
      title: '分支 1.1.1',
    } as any);
    const e1 = new Connector({
      type: 'Connector',
      key: 'e-root-n1',
      fromKey: 'root',
      toKey: 'n1',
    } as any);
    const e2 = new Connector({
      type: 'Connector',
      key: 'e-root-n2',
      fromKey: 'root',
      toKey: 'n2',
    } as any);
    const e3 = new Connector({
      type: 'Connector',
      key: 'e-n1-n1-1',
      fromKey: 'n1',
      toKey: 'n1-1',
    } as any);
    const e4 = new Connector({
      type: 'Connector',
      key: 'e-n1-n1-2',
      fromKey: 'n1',
      toKey: 'n1-2',
    } as any);
    const e5 = new Connector({
      type: 'Connector',
      key: 'e-n1-1-n1-1-1',
      fromKey: 'n1-1',
      toKey: 'n1-1-1',
    } as any);

    const children = [root, n1, n1_1, n1_2, n2, n1_1_1, e1, e2, e3, e4, e5];
    for (const c of children) {
      c.parent = layout as any;
      (layout.children as any[]).push(c);
    }

    const sizes: Size[] = children.map((c) =>
      c.type === 'MindMapNode'
        ? ({ width: 120, height: 40 } as Size)
        : ({ width: 0, height: 0 } as Size),
    );
    const constraints = {
      minWidth: 0,
      maxWidth: 1000,
      minHeight: 0,
      maxHeight: 800,
    } as BoxConstraints;

    const total = (layout as any).performLayout(constraints, sizes);
    expect(total.width).toBeGreaterThan(0);
    expect(total.height).toBeGreaterThan(0);

    const offsets = children.map((c, i) => (layout as any).positionChild(i, sizes[i]));
    const oRoot = offsets[0];
    const oN1 = offsets[1];
    const oN1_1 = offsets[2];
    const oN1_2 = offsets[3];
    const oN2 = offsets[4];
    expect(oN1.dx).toBeGreaterThan(oRoot.dx);
    expect(oN2.dx).toBe(oN1.dx);
    expect(oN1.dy).toBeLessThan(oN2.dy);
    const dy12 = oN2.dy - oN1.dy;
    expect(dy12).toBeGreaterThanOrEqual(28);
    expect(offsets[6].dx).toBe(0);
    expect(offsets[7].dx).toBe(0);
    expect(offsets[8].dx).toBe(0);
    expect(offsets[9].dx).toBe(0);
    expect(offsets[10].dx).toBe(0);
    expect(oN1_1.dx).toBeGreaterThan(oN1.dx);
    expect(oN1_2.dx).toBeGreaterThan(oN1.dx);
    const stats = (layout as any).lastLayoutStats;
    expect(stats.nodes).toBeGreaterThan(0);
    expect(stats.edges).toBeGreaterThan(0);
    expect(stats.durationMs).toBeGreaterThanOrEqual(0);
    expect(stats.levels).toBeGreaterThanOrEqual(2);
  });
});
