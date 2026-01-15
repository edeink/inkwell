/** @jsxImportSource @/utils/compiler */
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';

import { MindmapDemo } from '../app';
import { ConnectorStyle } from '../helpers/connection-drawer';
import { CustomComponentType } from '../type';
import { Connector } from '../widgets/connector';
import { MindMapLayout } from '../widgets/mindmap-layout';
import {
  MindMapNode,
  nodeBorderRadius,
  nodePaddingHorizontal,
  nodePaddingVertical,
} from '../widgets/mindmap-node';
import { MindMapNodeToolbar } from '../widgets/mindmap-node-toolbar';
import { MindMapViewport } from '../widgets/mindmap-viewport';

import type { Widget } from '@/core/base';

import { findWidget } from '@/core/helper/widget-selector';
import Runtime from '@/runtime';

// toolbar 不再包裹节点，改为同级存在

let originalGetContext:
  | ((
      this: HTMLCanvasElement,
      contextId: string,
      options?: CanvasRenderingContext2DSettings,
    ) => RenderingContext | null)
  | undefined;

beforeAll(() => {
  originalGetContext = HTMLCanvasElement.prototype.getContext;
});

afterAll(() => {
  if (originalGetContext) {
    HTMLCanvasElement.prototype.getContext = originalGetContext as any;
  }
});

async function createSceneWithToolbar(width: number, height: number, runtime: Runtime) {
  const scene = (
    <MindMapViewport
      key={CustomComponentType.MindMapViewport}
      scale={1}
      tx={0}
      ty={0}
      width={width}
      height={height}
    >
      <MindMapLayout key="layout-root" layout="treeBalanced" spacingX={48} spacingY={48}>
        <MindMapNode key="root" title="主题" />
        <MindMapNode key="n1" title="分支 1" />
        <MindMapNodeToolbar key="toolbar" />
        <Connector key="e-root-n1" fromKey="root" toKey="n1" style={ConnectorStyle.Elbow} />
      </MindMapLayout>
    </MindMapViewport>
  );
  await runtime.renderFromJSX(scene as any);
}

async function createSceneWithoutToolbar(width: number, height: number, runtime: Runtime) {
  const scene = (
    <MindMapViewport
      key={CustomComponentType.MindMapViewport}
      scale={1}
      tx={0}
      ty={0}
      width={width}
      height={height}
    >
      <MindMapLayout key="layout-root" layout="treeBalanced" spacingX={48} spacingY={48}>
        <MindMapNode key="root" title="主题" />
        <MindMapNode key="n1" title="分支 1" />
        <Connector key="e-root-n1" fromKey="root" toKey="n1" style={ConnectorStyle.Elbow} />
      </MindMapLayout>
    </MindMapViewport>
  );
  await runtime.renderFromJSX(scene);
}

async function waitNextFrame(ms: number = 30) {
  await new Promise((r) => setTimeout(r, ms));
}

describe('MindMapNode 布局稳定性与激活位置', () => {
  let containerA: HTMLDivElement;
  let containerB: HTMLDivElement;
  let runtimeA: Runtime;
  let runtimeB: Runtime;

  beforeEach(async () => {
    (HTMLCanvasElement.prototype as any)._inkwellCtxPatched = true;
    HTMLCanvasElement.prototype.getContext = function (this: HTMLCanvasElement, type: string) {
      if (type !== '2d') {
        return null as any;
      }
      const domMatrixCtor = (globalThis as any).DOMMatrix;
      const ctx: any = {
        canvas: this as HTMLCanvasElement,
        save: vi.fn(),
        restore: vi.fn(),
        scale: vi.fn(),
        translate: vi.fn(),
        rotate: vi.fn(),
        getTransform: vi.fn(() => {
          return domMatrixCtor ? new domMatrixCtor() : { a: 1, b: 0, c: 0, d: 1, e: 0, f: 0 };
        }),
        setTransform: vi.fn(),
        resetTransform: vi.fn(),
        clearRect: vi.fn(),
        fillStyle: '#000000',
        globalAlpha: 1,
        fillRect: vi.fn(),
        strokeRect: vi.fn(),
        fill: vi.fn(),
        stroke: vi.fn(),
        clip: vi.fn(),
        font: '',
        textAlign: 'left',
        textBaseline: 'top',
        fillText: vi.fn(),
        strokeText: vi.fn(),
        measureText: vi.fn((text: string) => ({
          width: text.length * 10,
          actualBoundingBoxAscent: 10,
          actualBoundingBoxDescent: 2,
        })),
        beginPath: vi.fn(),
        moveTo: vi.fn(),
        lineTo: vi.fn(),
        closePath: vi.fn(),
        quadraticCurveTo: vi.fn(),
        bezierCurveTo: vi.fn(),
        arc: vi.fn(),
        arcTo: vi.fn(),
        rect: vi.fn(),
        roundRect: vi.fn(),
        setLineDash: vi.fn(),
        drawImage: vi.fn(),
        imageSmoothingEnabled: true,
        imageSmoothingQuality: 'high',
      };
      return ctx;
    } as any;
    containerA = document.createElement('div');
    containerB = document.createElement('div');
    containerA.id = `mm-a-${Math.random().toString(36).slice(2)}`;
    containerB.id = `mm-b-${Math.random().toString(36).slice(2)}`;
    document.body.appendChild(containerA);
    document.body.appendChild(containerB);
    runtimeA = await Runtime.create(containerA.id, { backgroundAlpha: 0 });
    runtimeB = await Runtime.create(containerB.id, { backgroundAlpha: 0 });
  });

  it('节点位置在有无工具栏时应保持一致', async () => {
    await createSceneWithToolbar(800, 600, runtimeA);
    await createSceneWithoutToolbar(800, 600, runtimeB);
    const rootA = runtimeA.getRootWidget();
    const rootB = runtimeB.getRootWidget();
    const nodeA = findWidget(rootA, `${CustomComponentType.MindMapNode}#n1`) as Widget;
    const nodeB = findWidget(rootB, `${CustomComponentType.MindMapNode}#n1`) as Widget;
    const pa = nodeA.getAbsolutePosition();
    const pb = nodeB.getAbsolutePosition();
    expect(Math.abs(pa.dx - pb.dx)).toBeLessThan(1);
    expect(Math.abs(pa.dy - pb.dy)).toBeLessThan(1);
  });

  it('激活状态下节点绝对位置应保持稳定', async () => {
    await createSceneWithToolbar(800, 600, runtimeA);
    const rootA = runtimeA.getRootWidget();
    const vp = findWidget(rootA, `#${CustomComponentType.MindMapViewport}`) as MindMapViewport;
    const nodeA = findWidget(rootA, `${CustomComponentType.MindMapNode}#n1`) as Widget;
    const p0 = nodeA.getAbsolutePosition();
    (vp as any).setActiveKey?.('n1');
    const p1 = nodeA.getAbsolutePosition();
    expect(Math.abs(p1.dx - p0.dx)).toBeLessThan(1);
    expect(Math.abs(p1.dy - p0.dy)).toBeLessThan(1);
  });
});

describe('MindMap 全局编辑器覆盖层', () => {
  it('非编辑状态下覆盖层应为 0 尺寸且不响应事件', async () => {
    const container = document.createElement('div');
    container.id = `mm-editor-hidden-${Math.random().toString(36).slice(2)}`;
    document.body.appendChild(container);
    const runtime = await Runtime.create(container.id, { backgroundAlpha: 0 });

    await runtime.renderFromJSX((<MindmapDemo width={800} height={600} />) as any);
    const demo = runtime.getRootWidget() as unknown as MindmapDemo;
    demo.setGraphData({
      nodes: [
        { key: 'root', title: '主题' },
        { key: 'n1', title: '分支 1', parent: 'root' },
      ],
      edges: [{ from: 'root', to: 'n1' }],
      activeKey: 'n1',
    });
    await waitNextFrame();

    const p0 = findWidget(runtime.getRootWidget()!, '#mindmap-editor-pos') as any;
    expect(p0.props.width).toBe(0);
    expect(p0.props.height).toBe(0);

    const box = p0.children[0] as any;
    expect(box.pointerEvent).toBe('none');
  });

  it('缩放时覆盖层应随节点同步更新', async () => {
    const container = document.createElement('div');
    container.id = `mm-editor-scale-${Math.random().toString(36).slice(2)}`;
    document.body.appendChild(container);
    const runtime = await Runtime.create(container.id, { backgroundAlpha: 0 });

    await runtime.renderFromJSX((<MindmapDemo width={800} height={600} />) as any);
    const demo = runtime.getRootWidget() as unknown as MindmapDemo;
    demo.setGraphData({
      nodes: [
        { key: 'root', title: '主题' },
        { key: 'n1', title: '分支 1', parent: 'root' },
      ],
      edges: [{ from: 'root', to: 'n1' }],
      activeKey: 'n1',
    });
    await waitNextFrame();

    const root = runtime.getRootWidget()!;
    const n1 = findWidget(root, `${CustomComponentType.MindMapNode}#n1`) as any;
    n1.onDblClick();
    await waitNextFrame();

    const p0 = findWidget(runtime.getRootWidget()!, '#mindmap-editor-pos') as any;
    expect(p0.props.width).toBeGreaterThan(0);
    expect(p0.props.height).toBeGreaterThan(0);
    const w0 = p0.props.width;
    const demo2 = runtime.getRootWidget() as unknown as MindmapDemo;
    const rect0 = (demo2 as any).state.editorRect;
    expect(Math.abs(p0.props.left - rect0.left)).toBeLessThan(0.5);
    expect(Math.abs(p0.props.top - rect0.top)).toBeLessThan(0.5);
    expect(Math.abs(p0.props.width - rect0.width)).toBeLessThan(0.5);
    expect(Math.abs(p0.props.height - rect0.height)).toBeLessThan(0.5);

    const vp = findWidget(
      runtime.getRootWidget(),
      `#${CustomComponentType.MindMapViewport}`,
    ) as any;
    for (const nextScale of [0.5, 2]) {
      vp.setTransform(nextScale, vp.tx, vp.ty);
      await waitNextFrame();

      const p1 = findWidget(runtime.getRootWidget()!, '#mindmap-editor-pos') as any;
      const demo3 = runtime.getRootWidget() as unknown as MindmapDemo;
      const rect1 = (demo3 as any).state.editorRect;
      expect(Math.abs(p1.props.left - rect1.left)).toBeLessThan(0.5);
      expect(Math.abs(p1.props.top - rect1.top)).toBeLessThan(0.5);
      expect(Math.abs(p1.props.width - rect1.width)).toBeLessThan(0.5);
      expect(Math.abs(p1.props.height - rect1.height)).toBeLessThan(0.5);
    }

    const p2 = findWidget(runtime.getRootWidget()!, '#mindmap-editor-pos') as any;
    expect(p2.props.width).toBeGreaterThan(w0);

    const box = p2.children[0] as any;
    const expectedPadV = nodePaddingVertical * vp.scale;
    const expectedPadH = nodePaddingHorizontal * vp.scale;
    expect(Math.abs(box.padding.top - expectedPadV)).toBeLessThan(0.5);
    expect(Math.abs(box.padding.bottom - expectedPadV)).toBeLessThan(0.5);
    expect(Math.abs(box.padding.left - expectedPadH)).toBeLessThan(0.5);
    expect(Math.abs(box.padding.right - expectedPadH)).toBeLessThan(0.5);

    const expectedRadius = nodeBorderRadius * vp.scale;
    expect(Math.abs(box.borderRadius.topLeft - expectedRadius)).toBeLessThan(0.5);
    expect(Math.abs(box.borderRadius.topRight - expectedRadius)).toBeLessThan(0.5);
    expect(Math.abs(box.borderRadius.bottomRight - expectedRadius)).toBeLessThan(0.5);
    expect(Math.abs(box.borderRadius.bottomLeft - expectedRadius)).toBeLessThan(0.5);
  });

  it('快速切换编辑节点时应更新目标与回写内容', async () => {
    const container = document.createElement('div');
    container.id = `mm-editor-switch-${Math.random().toString(36).slice(2)}`;
    document.body.appendChild(container);
    const runtime = await Runtime.create(container.id, { backgroundAlpha: 0 });

    await runtime.renderFromJSX((<MindmapDemo width={800} height={600} />) as any);
    const demo = runtime.getRootWidget() as unknown as MindmapDemo;
    demo.setGraphData({
      nodes: [
        { key: 'root', title: '主题' },
        { key: 'n1', title: '分支 1', parent: 'root' },
        { key: 'n2', title: '分支 2', parent: 'root' },
      ],
      edges: [
        { from: 'root', to: 'n1' },
        { from: 'root', to: 'n2' },
      ],
      activeKey: 'n1',
    });
    await waitNextFrame();

    const root = runtime.getRootWidget()!;
    const n1 = findWidget(root, `${CustomComponentType.MindMapNode}#n1`) as any;
    const n2 = findWidget(root, `${CustomComponentType.MindMapNode}#n2`) as any;

    n1.onDblClick();
    await waitNextFrame();
    n2.onDblClick();
    await waitNextFrame();

    const overlay = findWidget(runtime.getRootWidget()!, '#mindmap-editor-overlay') as any;
    expect(overlay.props.targetKey).toBe('n2');
    expect(overlay.props.value).toBe('分支 2');

    const p0 = findWidget(runtime.getRootWidget()!, '#mindmap-editor-pos') as any;
    expect(p0.props.width).toBeGreaterThan(0);
    expect(p0.props.height).toBeGreaterThan(0);

    overlay.props.onCommit('新标题 2');
    await waitNextFrame();

    const demo2 = runtime.getRootWidget() as unknown as MindmapDemo;
    expect((demo2 as any).state.graph.nodes.get('n2').title).toBe('新标题 2');

    const overlay2 = findWidget(runtime.getRootWidget()!, '#mindmap-editor-overlay') as any;
    expect(overlay2.props.targetKey).toBe('n2');
    expect(overlay2.props.value).toBe('新标题 2');

    overlay2.props.onCancel();
    await waitNextFrame();

    const overlay3 = findWidget(runtime.getRootWidget()!, '#mindmap-editor-overlay') as any;
    expect(overlay3.props.targetKey).toBe(null);
    expect(overlay3.props.rect).toBe(null);
  });

  it('编辑中节点尺寸变化时覆盖层应与节点严格匹配', async () => {
    const container = document.createElement('div');
    container.id = `mm-editor-size-sync-${Math.random().toString(36).slice(2)}`;
    document.body.appendChild(container);
    const runtime = await Runtime.create(container.id, { backgroundAlpha: 0 });

    await runtime.renderFromJSX((<MindmapDemo width={800} height={600} />) as any);
    const demo = runtime.getRootWidget() as unknown as MindmapDemo;
    demo.setGraphData({
      nodes: [
        { key: 'root', title: '主题' },
        { key: 'n1', title: '分支 1', parent: 'root' },
      ],
      edges: [{ from: 'root', to: 'n1' }],
      activeKey: 'n1',
    });
    await waitNextFrame();

    const root = runtime.getRootWidget()!;
    const n1 = findWidget(root, `${CustomComponentType.MindMapNode}#n1`) as any;
    n1.onDblClick();
    await waitNextFrame();

    const overlay = findWidget(runtime.getRootWidget()!, '#mindmap-editor-overlay') as any;
    overlay.props.onCommit('这是一个更长的标题用于触发尺寸变化');
    await waitNextFrame();
    await waitNextFrame();

    const p1 = findWidget(runtime.getRootWidget()!, '#mindmap-editor-pos') as any;
    const n1After = findWidget(
      runtime.getRootWidget()!,
      `${CustomComponentType.MindMapNode}#n1`,
    ) as any;
    expect(Math.abs(p1.props.width - n1After.renderObject.size.width)).toBeLessThan(0.5);
    expect(Math.abs(p1.props.height - n1After.renderObject.size.height)).toBeLessThan(0.5);
  });

  it('编辑中删除文本导致尺寸变小时节点也应同步变小', async () => {
    const container = document.createElement('div');
    container.id = `mm-editor-shrink-sync-${Math.random().toString(36).slice(2)}`;
    document.body.appendChild(container);
    const runtime = await Runtime.create(container.id, { backgroundAlpha: 0 });

    await runtime.renderFromJSX((<MindmapDemo width={800} height={600} />) as any);
    const demo = runtime.getRootWidget() as unknown as MindmapDemo;
    demo.setGraphData({
      nodes: [
        { key: 'root', title: '主题' },
        { key: 'n1', title: '分支 1', parent: 'root' },
      ],
      edges: [{ from: 'root', to: 'n1' }],
      activeKey: 'n1',
    });
    await waitNextFrame();

    const root = runtime.getRootWidget()!;
    const n1 = findWidget(root, `${CustomComponentType.MindMapNode}#n1`) as any;
    n1.onDblClick();
    await waitNextFrame();

    const overlay = findWidget(runtime.getRootWidget()!, '#mindmap-editor-overlay') as any;
    overlay.props.onCommit('这是一个更长的标题用于触发尺寸变化');
    await waitNextFrame();
    await waitNextFrame();

    const n1Long = findWidget(
      runtime.getRootWidget()!,
      `${CustomComponentType.MindMapNode}#n1`,
    ) as any;
    const wLong = n1Long.renderObject.size.width;
    const hLong = n1Long.renderObject.size.height;

    overlay.props.onCommit('短');
    await waitNextFrame();
    await waitNextFrame();

    const n1Short = findWidget(
      runtime.getRootWidget()!,
      `${CustomComponentType.MindMapNode}#n1`,
    ) as any;
    expect(n1Short.renderObject.size.width).toBeLessThan(wLong);
    expect(n1Short.renderObject.size.height).toBeLessThanOrEqual(hLong);
  });
});
