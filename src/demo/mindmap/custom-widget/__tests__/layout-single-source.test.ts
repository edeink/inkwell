import { describe, expect, it } from 'vitest';

import { Connector } from '../connector';
import { MindMapLayout } from '../mindmap-layout';
import { MindMapNode } from '../mindmap-node';

import type { BoxConstraints, Size } from '@/core/base';

describe('MindMapLayout single-source layout', () => {
  it('performLayout computes node offsets; connectors at (0,0)', () => {
    const layout = new MindMapLayout({
      type: 'MindMapLayout',
      key: 'layout-root',
      layout: 'tree',
      spacingX: 28,
      spacingY: 28,
    } as any);

    const root = new MindMapNode({ type: 'MindMapNode', key: 'root', title: '主题' } as any);
    const n1 = new MindMapNode({ type: 'MindMapNode', key: 'n1', title: '分支 1' } as any);
    const n1_1 = new MindMapNode({ type: 'MindMapNode', key: 'n1-1', title: '分支 1.1' } as any);
    const n1_2 = new MindMapNode({ type: 'MindMapNode', key: 'n1-2', title: '分支 1.2' } as any);
    const n2 = new MindMapNode({ type: 'MindMapNode', key: 'n2', title: '分支 2' } as any);
    const n2_1 = new MindMapNode({ type: 'MindMapNode', key: 'n2-1', title: '分支 2.1' } as any);
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
      key: 'e-n2-n2-1',
      fromKey: 'n2',
      toKey: 'n2-1',
    } as any);

    const children = [root, n1, n1_1, n1_2, n2, n2_1, e1, e2, e3, e4, e5];
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
      maxWidth: 800,
      minHeight: 0,
      maxHeight: 600,
    } as BoxConstraints;

    const total = (layout as any).performLayout(constraints, sizes);
    expect(total.width).toBeGreaterThan(0);
    expect(total.height).toBeGreaterThan(0);

    const offsets = children.map((c, i) => (layout as any).positionChild(i, sizes[i]));
    const nodeOffsets = offsets.filter((_, i) => children[i].type === 'MindMapNode');
    const unique = new Set(nodeOffsets.map((o) => `${o.dx},${o.dy}`));
    expect(unique.size).toBeGreaterThan(1);

    const connectorOffsets = offsets.filter((_, i) => children[i].type === 'Connector');
    for (const off of connectorOffsets) {
      expect(off.dx).toBe(0);
      expect(off.dy).toBe(0);
    }
  });

  it('ignores external positions passed via data', () => {
    const layout = new MindMapLayout({
      type: 'MindMapLayout',
      key: 'layout-root',
      layout: 'tree',
      spacingX: 28,
      spacingY: 28,
    } as any);
    const a = new MindMapNode({ type: 'MindMapNode', key: 'a', title: 'A' } as any);
    const b = new MindMapNode({ type: 'MindMapNode', key: 'b', title: 'B' } as any);
    a.parent = layout as any;
    b.parent = layout as any;
    (layout.children as any[]).push(a, b);
    const sizes: Size[] = [{ width: 120, height: 40 } as Size, { width: 120, height: 40 } as Size];
    const constraints = {
      minWidth: 0,
      maxWidth: 800,
      minHeight: 0,
      maxHeight: 600,
    } as BoxConstraints;

    const given = { a: { dx: 999, dy: 999 }, b: { dx: 999, dy: 999 } } as Record<
      string,
      { dx: number; dy: number }
    >;
    layout.createElement({
      type: 'MindMapLayout',
      key: 'layout-root',
      layout: 'tree',
      spacingX: 28,
      spacingY: 28,
      positions: given,
    } as any);
    (layout as any).performLayout(constraints, sizes);
    const oa = (layout as any).positionChild(0, sizes[0]);
    const ob = (layout as any).positionChild(1, sizes[1]);
    expect(`${oa.dx},${oa.dy}`).not.toBe('999,999');
    expect(`${ob.dx},${ob.dy}`).not.toBe('999,999');
  });
});
