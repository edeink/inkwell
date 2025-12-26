/** @jsxImportSource @/utils/compiler */
import { describe, expect, it } from 'vitest';

import type { Widget } from '@/core/base';

import { Container } from '@/core';
import { Widget as BaseWidget } from '@/core/base';
import { clearSelectorCache, findWidget } from '@/core/helper/widget-selector';
import { WidgetRegistry } from '@/core/registry';
import { CustomComponentType } from '@/demo/mindmap/type';
import { MindMapViewport } from '@/demo/mindmap/widgets/mindmap-viewport';
import { compileElement } from '@/utils/compiler/jsx-compiler';

class MindMapViewportStub extends BaseWidget<{
  key: string;
  width?: number;
  height?: number;
  scale?: number;
  tx?: number;
  ty?: number;
}> {
  width?: number;
  height?: number;
  scale: number = 1;
  tx: number = 0;
  ty: number = 0;
  protected createChildWidget(childData: any): BaseWidget | null {
    return WidgetRegistry.createWidget(childData as any) as BaseWidget | null;
  }
  protected performLayout(): { width: number; height: number } {
    return { width: this.width ?? 300, height: this.height ?? 200 };
  }
  protected paintSelf(): void {}
}

class NodeStub extends BaseWidget<{
  key: string;
  title?: string;
  active?: boolean;
  className?: string;
  ['data-type']?: string;
}> {
  protected createChildWidget(childData: any): BaseWidget | null {
    return WidgetRegistry.createWidget(childData as any) as BaseWidget | null;
  }
  protected performLayout(): { width: number; height: number } {
    return { width: 80, height: 40 };
  }
  protected paintSelf(): void {}
}

class ConnectorStub extends BaseWidget<{ key: string; fromKey: string; toKey: string }> {
  fromKey!: string;
  toKey!: string;
  constructor(data: { key: string; fromKey: string; toKey: string }) {
    super(data);
    this.fromKey = data.fromKey;
    this.toKey = data.toKey;
  }
  protected createChildWidget(): Widget | null {
    return null;
  }
  protected performLayout(): { width: number; height: number } {
    return { width: 0, height: 0 };
  }
  protected paintSelf(): void {}
}

WidgetRegistry.registerType(CustomComponentType.MindMapViewport, MindMapViewportStub);
WidgetRegistry.registerType('Node', NodeStub);
WidgetRegistry.registerType('Connector', ConnectorStub);

function buildTree() {
  const el = (
    <Container key="root" width={400} height={300}>
      <MindMapViewport key="v" width={400} height={300} scale={2} tx={10} ty={20}>
        <NodeStub key="n1" title="A" className="widget-class" data-type="node" />
        <ConnectorStub key="e12" fromKey="n1" toKey="n2" />
        <NodeStub key="n2" title="B" active={true} />
      </MindMapViewport>
    </Container>
  );
  const json = compileElement(el);
  const root = WidgetRegistry.createWidget(json)!;
  root.createElement(json);
  root.layout({ minWidth: 0, minHeight: 0, maxWidth: 800, maxHeight: 600 });
  return root;
}

describe('Widget 选择器', () => {
  it('findViewport 正常工作', () => {
    const root = buildTree();
    const vp = findWidget(root, CustomComponentType.MindMapViewport) as Widget | null;
    expect(vp?.type).toBe(CustomComponentType.MindMapViewport);
  });

  it('findByKey 正常工作', () => {
    const root = buildTree();
    const n2 = findWidget(root, '#n2') as Widget | null;
    expect(n2?.type).toBe('NodeStub');
  });

  it('getActiveNode 正常工作', () => {
    const root = buildTree();
    const act = findWidget(root, ':active') as Widget | null;
    expect(act?.key).toBe('n2');
  });

  it('isRootNode 检测无入边', () => {
    const root = buildTree();
    const edgeToN1 = findWidget(root, 'Connector[toKey="n1"]');
    const edgeToN2 = findWidget(root, 'Connector[toKey="n2"]');
    expect(edgeToN1 == null).toBe(true);
    expect(edgeToN2 != null).toBe(true);
  });

  it('类 CSS 选择器：id、class、attr、child 和后代', () => {
    const root = buildTree();
    const byId = findWidget(root, '#n2');
    expect((byId as any)?.key).toBe('n2');

    const byClass = findWidget(root, '.widget-class');
    expect((byClass as any)?.key).toBe('n1');

    const byAttr = findWidget(root, '[data-type="node"]');
    expect((byAttr as any)?.key).toBe('n1');

    const chainChild = findWidget(root, 'MindMapViewportStub > NodeStub', {
      multiple: true,
    }) as Widget[];
    expect(chainChild.map((w) => w.key)).toEqual(['n1', 'n2']);

    const chainDesc = findWidget(root, 'MindMapViewportStub NodeStub', {
      multiple: true,
    }) as Widget[];
    expect(chainDesc.map((w) => w.key)).toEqual(['n1', 'n2']);
  });

  it('对多次查询缓存结果', () => {
    const root = buildTree();
    clearSelectorCache(root);
    const a = findWidget(root, 'MindMapViewport > Node', { multiple: true }) as Widget[];
    const b = findWidget(root, 'MindMapViewport > Node', { multiple: true }) as Widget[];
    expect(a.map((w) => w.key)).toEqual(b.map((w) => w.key));
  });
});
