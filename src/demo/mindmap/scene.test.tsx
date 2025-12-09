import { describe, expect, it } from 'vitest';

import { ConnectorElement as Connector } from './custom-widget/connector';
import { ConnectorStyleProviderElement as ConnectorStyleProvider } from './custom-widget/connector-style-provider';
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
    const providerEl = children[0] as JSXElement;
    expect(providerEl.type).toBe(ConnectorStyleProvider);
    const rawProviderChildren = providerEl.props?.children as unknown;
    const providerChildren = Array.isArray(rawProviderChildren)
      ? (rawProviderChildren as JSXElement[])
      : ([rawProviderChildren] as JSXElement[]);
    expect(providerChildren.length).toBe(1);
    const layoutEl = providerChildren[0];
    expect(layoutEl.type).toBe(MindMapLayout);
    const layoutChildren = ((layoutEl.props?.children as unknown[]) || []) as JSXElement[];
    const nodeCount = layoutChildren.filter((c) => c.type === MindMapNode).length;
    const edgeCount = layoutChildren.filter((c) => c.type === Connector).length;
    expect(nodeCount).toBe(12);
    expect(edgeCount).toBe(11);
    expect((layoutEl.props as Record<string, unknown> | undefined)?.positions).toBeUndefined();
  });
});
