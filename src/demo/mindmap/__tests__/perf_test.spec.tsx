/** @jsxImportSource @/utils/compiler */
import { beforeAll, describe, expect, it, vi } from 'vitest';

import { CustomComponentType } from '../type';
import { MindMapNode } from '../widgets/mindmap-node';
import { MindMapViewport } from '../widgets/mindmap-viewport';

import { Container } from '@/core/container'; // Assuming this is correct path based on previous search
import { WidgetRegistry } from '@/core/registry';
import Runtime from '@/runtime';
import { testLogger } from '@/utils/test-logger';

// Global Mock Setup
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
    // Register components
    WidgetRegistry.registerType(CustomComponentType.MindMapNode, MindMapNode);
    WidgetRegistry.registerType(CustomComponentType.MindMapViewport, MindMapViewport);

    // Mock dataset for canvas
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
    // 1. Setup Runtime
    container = document.createElement('div');
    container.id = 'perf-test-container-1';
    document.body.appendChild(container);

    const runtime = await Runtime.create(container.id, { backgroundAlpha: 0 });

    // 2. Build Tree
    const tree = (
      <MindMapViewport width={800} height={600} key="viewport">
        <MindMapNode key="node1" title="Node 1" enableLayer={true} />
        <MindMapNode key="node2" title="Node 2" enableLayer={true} />
      </MindMapViewport>
    );

    await runtime.renderFromJSX(tree as any);

    const viewport = runtime.getRootWidget() as MindMapViewport;
    const node1 = viewport.children[0] as MindMapNode;

    // Ensure layout is done
    expect(node1.renderObject.size.width).toBeGreaterThan(0);

    // 3. Spy on Runtime internals
    const performRenderSpy = vi.spyOn(runtime as any, 'performRender');

    // 4. Trigger markNeedsPaint on node1
    node1.markNeedsPaint();

    // Verify propagation stopped at node1 (RepaintBoundary)
    expect((node1 as any)._needsPaint).toBe(true);
    expect((viewport as any)._needsPaint).toBe(false);

    // 5. Trigger Rebuild (Tick)
    await runtime.rebuild();

    // 6. Verify Partial Repaint
    expect(performRenderSpy).toHaveBeenCalled();
    const args = performRenderSpy.mock.calls[0];
    const dirtyRect = args[0] as { x: number; y: number; width: number; height: number };

    expect(dirtyRect).toBeDefined();
    // Dirty rect should match node1 size (plus padding)
    expect(dirtyRect.width).toBeGreaterThanOrEqual(node1.renderObject.size.width);
    expect(dirtyRect.width).toBeLessThan(node1.renderObject.size.width + 10);

    // Cleanup
    runtime.destroy();
    container.remove();
  });

  it('嵌套边界：内部更新仅触发最近的 RepaintBoundary', async () => {
    // 1. Setup Runtime
    container = document.createElement('div');
    container.id = 'perf-test-container-2';
    document.body.appendChild(container);

    const runtime = await Runtime.create(container.id, { backgroundAlpha: 0 });

    // 2. Build Tree: Viewport -> Container (Group) -> Node2 (Boundary)
    const tree = (
      <MindMapViewport width={800} height={600} key="viewport">
        <Container key="group1" width={400} height={400}>
          <MindMapNode key="node2" title="Node 2" x={50} y={50} enableLayer={true} />
        </Container>
      </MindMapViewport>
    );

    await runtime.renderFromJSX(tree as any);

    const viewport = runtime.getRootWidget() as MindMapViewport;
    const group1 = viewport.children[0] as Container;

    // Check structure
    expect(group1).toBeDefined();
    // Since we used JSX, group1 children should be populated.
    // Container might wrap child in `child` prop if it's single child container,
    // or `children` if multi-child.
    // Let's assume standard Widget children array is populated by Runtime/Compiler.

    // Check if group1 has children
    // If Container implementation puts children in `this.children`, then:
    const node2 = group1.children[0] as MindMapNode;

    // If not found, maybe Container implementation differs.
    // But usually children are in children array.
    if (!node2) {
      testLogger.warn('Node2 not found in group1 children', group1);
    }

    expect(node2).toBeDefined();
    expect(node2.key).toBe('node2');

    // 3. Mark Node2 dirty
    node2.markNeedsPaint();

    // 4. Verify propagation
    // Node2 is dirty
    expect((node2 as any)._needsPaint).toBe(true);

    // Group1 (Parent) should NOT be dirty (blocked by Node2 boundary)
    expect((group1 as any)._needsPaint).toBe(false);

    // Viewport (Grandparent) should NOT be dirty
    expect((viewport as any)._needsPaint).toBe(false);

    // 5. Rebuild and check dirtyRect
    const performRenderSpy = vi.spyOn(runtime as any, 'performRender');
    await runtime.rebuild();

    expect(performRenderSpy).toHaveBeenCalled();
    const args = performRenderSpy.mock.calls[0];
    const dirtyRect = args[0] as { x: number; y: number; width: number; height: number };

    // Dirty rect should be Node2 size
    expect(dirtyRect.width).toBeGreaterThanOrEqual(node2.renderObject.size.width);
    expect(dirtyRect.width).toBeLessThan(node2.renderObject.size.width + 10);

    runtime.destroy();
    container.remove();
  });
});
