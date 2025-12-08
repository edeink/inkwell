import { describe, expect, it } from 'vitest';

import { ConnectorElement as Connector } from './custom-widget/connector';
import { MindMapLayoutElement as MindMapLayout } from './custom-widget/mindmap-layout';
import { MindMapNodeElement as MindMapNode } from './custom-widget/mindmap-node';
import { ViewportElement as Viewport } from './custom-widget/viewport';
import { createScene } from './scene';

import type { JSXElement } from '@/utils/compiler/jsx-runtime';

describe('scene static JSX', () => {
  it('returns static JSX structure without positions prop', () => {
    const el = createScene(800, 600) as JSXElement;
    expect(el.type).toBe(Viewport);
    const rawChildren = el.props?.children as unknown;
    const children = Array.isArray(rawChildren)
      ? (rawChildren as JSXElement[])
      : ([rawChildren] as JSXElement[]);
    expect(children.length).toBe(1);
    const layoutEl = children[0] as JSXElement;
    expect(layoutEl.type).toBe(MindMapLayout);
    const layoutChildren = ((layoutEl.props?.children as unknown[]) || []) as JSXElement[];
    const nodeCount = layoutChildren.filter((c) => c.type === MindMapNode).length;
    const edgeCount = layoutChildren.filter((c) => c.type === Connector).length;
    expect(nodeCount).toBe(6);
    expect(edgeCount).toBe(5);
    expect((layoutEl.props as Record<string, unknown> | undefined)?.positions).toBeUndefined();
  });
});
