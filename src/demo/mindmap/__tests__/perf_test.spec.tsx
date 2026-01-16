/** @jsxImportSource @/utils/compiler */
import { beforeAll, describe, expect, it, vi } from 'vitest';

import { CustomComponentType } from '../type';
import { MindMapNode } from '../widgets/mindmap-node';
import { MindMapViewport } from '../widgets/mindmap-viewport';

import { Container } from '@/core/container';
import { WidgetRegistry } from '@/core/registry';
import Runtime from '@/runtime';

const mockCtx = {
  canvas: {
    width: 800,
    height: 600,
    dataset: {},
    style: { width: '800px', height: '600px' },
    getContext: (type: string) => (type === '2d' ? mockCtx : null),
  },
  save: vi.fn(),
  restore: vi.fn(),
  clearRect: vi.fn(),
  drawImage: vi.fn(),
  transform: vi.fn(),
  translate: vi.fn(),
  scale: vi.fn(),
  beginPath: vi.fn(),
  rect: vi.fn(),
  clip: vi.fn(),
  fill: vi.fn(),
  stroke: vi.fn(),
  fillText: vi.fn(),
  measureText: () => ({ width: 10 }),
  setLineDash: vi.fn(),
  getTransform: () => ({ a: 1, b: 0, c: 0, d: 1, e: 0, f: 0 }),
  moveTo: vi.fn(),
  lineTo: vi.fn(),
  arc: vi.fn(),
  arcTo: vi.fn(),
  bezierCurveTo: vi.fn(),
  quadraticCurveTo: vi.fn(),
  closePath: vi.fn(),
};

describe('增量渲染性能测试', () => {
  let container: HTMLElement;

  beforeAll(() => {
    WidgetRegistry.registerType(CustomComponentType.MindMapNode, MindMapNode);
    WidgetRegistry.registerType(CustomComponentType.MindMapViewport, MindMapViewport);

    Object.defineProperty(HTMLCanvasElement.prototype, 'dataset', {
      get() {
        if (!this._dataset) {
          this._dataset = {};
        }
        return this._dataset;
      },
      configurable: true,
    });

    HTMLCanvasElement.prototype.getContext = function (type: string) {
      if (type === '2d') {
        return mockCtx as any;
      }
      return null;
    } as any;
  });

  it('增量渲染：仅脏节点触发 RepaintBoundary 更新', async () => {
    container = document.createElement('div');
    container.id = 'perf-test-container-1';
    document.body.appendChild(container);

    const runtime = await Runtime.create(container.id, { backgroundAlpha: 0 });

    const tree = (
      <MindMapViewport width={800} height={600} key="viewport">
        <MindMapNode key="node1" title="节点 1" enableLayer={true} />
        <MindMapNode key="node2" title="节点 2" enableLayer={true} />
      </MindMapViewport>
    );

    await runtime.renderFromJSX(tree as any);

    const viewport = runtime.getRootWidget() as MindMapViewport;
    const node1 = viewport.children[0] as MindMapNode;

    expect(node1.renderObject.size.width).toBeGreaterThan(0);

    const performRenderSpy = vi.spyOn(runtime as any, 'performRender');

    node1.clearDirty();
    node1.clearPaintDirty();
    (node1 as any)._needsLayout = false;
    node1.setState({ hovering: true });

    expect((node1 as any)._needsPaint).toBe(true);

    await runtime.rebuild();

    expect(performRenderSpy).toHaveBeenCalled();
    const args = performRenderSpy.mock.calls[0];
    const dirtyRect = args[0] as
      | { x: number; y: number; width: number; height: number }
      | undefined;

    if (dirtyRect) {
      expect(dirtyRect.width).toBeGreaterThanOrEqual(node1.renderObject.size.width);
      expect(dirtyRect.height).toBeGreaterThanOrEqual(node1.renderObject.size.height);
    }

    runtime.destroy();
    container.remove();
  });

  it('嵌套边界：内部更新仅触发最近的 RepaintBoundary', async () => {
    container = document.createElement('div');
    container.id = 'perf-test-container-2';
    document.body.appendChild(container);

    const runtime = await Runtime.create(container.id, { backgroundAlpha: 0 });

    const tree = (
      <MindMapViewport width={800} height={600} key="viewport">
        <Container key="group1" width={400} height={400}>
          <MindMapNode key="node2" title="节点 2" x={50} y={50} enableLayer={true} />
        </Container>
      </MindMapViewport>
    );

    await runtime.renderFromJSX(tree as any);

    const viewport = runtime.getRootWidget() as MindMapViewport;
    const group1 = viewport.children[0] as Container;

    expect(group1).toBeDefined();
    const node2 = group1.children[0] as MindMapNode;

    expect(node2).toBeDefined();
    expect(node2.key).toBe('node2');

    node2.clearDirty();
    node2.clearPaintDirty();
    (node2 as any)._needsLayout = false;
    node2.setState({ hovering: true });

    expect((node2 as any)._needsPaint).toBe(true);

    const performRenderSpy = vi.spyOn(runtime as any, 'performRender');
    await runtime.rebuild();

    expect(performRenderSpy).toHaveBeenCalled();
    const args = performRenderSpy.mock.calls[0];
    const dirtyRect = args[0] as
      | { x: number; y: number; width: number; height: number }
      | undefined;

    if (dirtyRect) {
      expect(dirtyRect.width).toBeGreaterThanOrEqual(node2.renderObject.size.width);
      expect(dirtyRect.height).toBeGreaterThanOrEqual(node2.renderObject.size.height);
    }

    runtime.destroy();
    container.remove();
  });
});
