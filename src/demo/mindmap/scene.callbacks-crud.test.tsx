import { beforeEach, describe, expect, it } from 'vitest';

import { MindmapController } from './controller';
import { Viewport } from './custom-widget/viewport';
import { createScene } from './scene';

import type { Widget } from '@/core/base';

import Runtime from '@/runtime';

function findViewport(w: Widget | null): Viewport | null {
  if (!w) {
    return null;
  }
  const dfs = (node: Widget): Viewport | null => {
    if (node instanceof Viewport) {
      return node as Viewport;
    }
    for (const c of node.children) {
      const r = dfs(c);
      if (r) {
        return r;
      }
    }
    return null;
  };
  return dfs(w);
}

function findByKey(w: Widget | null, key: string): Widget | null {
  if (!w) {
    return null;
  }
  if (w.key === key) {
    return w;
  }
  for (const c of w.children) {
    const r = findByKey(c, key);
    if (r) {
      return r;
    }
  }
  return null;
}

describe('scene callbacks integration with CRUD', () => {
  let container: HTMLDivElement;
  let runtime: Runtime;
  beforeEach(async () => {
    // 提供 Canvas 2D 上下文的测试桩，适配 jsdom 环境
    // 避免 Canvas2DRenderer 初始化失败
    if (!(HTMLCanvasElement.prototype as any)._inkwellCtxPatched) {
      (HTMLCanvasElement.prototype as any)._inkwellCtxPatched = true;
      HTMLCanvasElement.prototype.getContext = function (type: string) {
        if (type !== '2d') {
          return null as any;
        }
        const domMatrixCtor = (globalThis as any).DOMMatrix;
        const ctx: any = {
          canvas: this as HTMLCanvasElement,
          // 状态栈相关
          save() {},
          restore() {},
          // 变换
          scale() {},
          translate() {},
          rotate() {},
          getTransform() {
            return domMatrixCtor ? new domMatrixCtor() : { a: 1, b: 0, c: 0, d: 1, e: 0, f: 0 };
          },
          // 画布清理与背景
          clearRect() {},
          fillStyle: '#000000',
          globalAlpha: 1,
          fillRect() {},
          fill() {},
          // 文本
          font: '',
          textAlign: 'left',
          textBaseline: 'top',
          fillText() {},
          // 路径与线段
          beginPath() {},
          moveTo() {},
          lineTo() {},
          closePath() {},
          quadraticCurveTo() {},
          strokeStyle: '#000000',
          lineWidth: 1,
          setLineDash() {},
          stroke() {},
          // 图片
          drawImage() {},
          // 平滑
          imageSmoothingEnabled: true,
          imageSmoothingQuality: 'high',
        };
        return ctx;
      } as any;
    }
    container = document.createElement('div');
    container.id = `mindmap-test-${Math.random().toString(36).slice(2)}`;
    document.body.appendChild(container);
    runtime = await Runtime.create(container.id, { backgroundAlpha: 0 });
  });

  it('addSibling via MindMapNode toolbar triggers CrudModule.addSibling', async () => {
    const scene = createScene(800, 600, runtime);
    await runtime.renderFromJSX(scene);
    const root = runtime.getRootWidget();
    const vp = findViewport(root)!;
    const controller = new MindmapController(runtime, vp);
    controller.setActiveKey('n1');

    const node = findByKey(root, 'n1')!;
    const pos = node.getAbsolutePosition();
    const size = node.renderObject.size;
    const hitTop = { x: pos.dx + size.width / 2, y: pos.dy - 24 };
    (node as any).onPointerDown({ x: hitTop.x, y: hitTop.y });

    const layout = findByKey(root, 'layout-root')!;
    const titles = (layout as any).children
      .filter((c: any) => c.type === 'MindMapNode')
      .map((c: any) => c.title);
    expect(titles.some((t) => t === '新节点')).toBe(true);
  });

  it('addChildSide via MindMapNode toolbar triggers CrudModule.addChildSide', async () => {
    const scene = createScene(800, 600, runtime);
    await runtime.renderFromJSX(scene);
    const root = runtime.getRootWidget();
    const vp = findViewport(root)!;
    const controller = new MindmapController(runtime, vp);
    controller.setActiveKey('root');

    const node = findByKey(root, 'root')!;
    const pos = node.getAbsolutePosition();
    const size = node.renderObject.size;
    const hitRight = { x: pos.dx + size.width + 6 + 10, y: pos.dy + size.height / 2 };
    (node as any).onPointerDown({ x: hitRight.x, y: hitRight.y });

    const layout = findByKey(root, 'layout-root')!;
    const titles = (layout as any).children
      .filter((c: any) => c.type === 'MindMapNode')
      .map((c: any) => c.title);
    expect(titles.some((t) => t === '新节点')).toBe(true);
  });

  it('Delete selection callback triggers deletion with undo', async () => {
    const scene = createScene(800, 600, runtime);
    await runtime.renderFromJSX(scene);
    const root = runtime.getRootWidget();
    const vp = findViewport(root)!;
    const controller = new MindmapController(runtime, vp);
    vp.setSelectedKeys(['n3']);
    (vp as any).onKeyDown({ nativeEvent: { key: 'Delete' } });

    const node3 = findByKey(root, 'n3');
    expect(node3).toBeNull();
  });

  it('moveNode via MindMapNode drag triggers CrudModule.moveNode and updates position', async () => {
    const scene = createScene(800, 600, runtime);
    await runtime.renderFromJSX(scene);
    const root = runtime.getRootWidget();
    const vp = findViewport(root)!;
    const node = findByKey(root, 'n1')!;
    const pos0 = node.getAbsolutePosition();
    const size = node.renderObject.size;
    const center = { x: pos0.dx + size.width / 2, y: pos0.dy + size.height / 2 };
    (node as any).onPointerDown({ x: center.x, y: center.y });
    (node as any).onPointerMove({ x: center.x + 40, y: center.y });
    (node as any).onPointerUp({ x: center.x + 40, y: center.y });
    const pos1 = node.getAbsolutePosition();
    expect(Math.round(pos1.dx - pos0.dx)).toBeGreaterThanOrEqual(39);
  });
});
