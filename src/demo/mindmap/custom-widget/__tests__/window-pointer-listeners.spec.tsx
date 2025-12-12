/** @jsxImportSource @/utils/compiler */
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { ConnectorElement as Connector } from '../connector';
import { MindMapLayoutElement as MindMapLayout } from '../mindmap-layout';
import { MindMapNodeElement as MindMapNode } from '../mindmap-node';
import { ViewportElement as Viewport } from '../viewport';

import type { Widget } from '@/core/base';

import { dispatchToTree, hitTest } from '@/core/events';
import Runtime from '@/runtime';

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

beforeEach(() => {
  if (!(HTMLCanvasElement.prototype as any)._inkwellCtxPatched) {
    (HTMLCanvasElement.prototype as any)._inkwellCtxPatched = true;
    HTMLCanvasElement.prototype.getContext = function (this: HTMLCanvasElement, type: string) {
      if (type !== '2d') {
        return null as any;
      }
      const domMatrixCtor = (globalThis as any).DOMMatrix;
      const ctx: any = {
        canvas: this as HTMLCanvasElement,
        save() {},
        restore() {},
        scale() {},
        translate() {},
        rotate() {},
        getTransform() {
          return domMatrixCtor ? new domMatrixCtor() : { a: 1, b: 0, c: 0, d: 1, e: 0, f: 0 };
        },
        clearRect() {},
        fillStyle: '#000000',
        globalAlpha: 1,
        fillRect() {},
        fill() {},
        font: '',
        textAlign: 'left',
        textBaseline: 'top',
        fillText() {},
        beginPath() {},
        moveTo() {},
        lineTo() {},
        closePath() {},
        quadraticCurveTo() {},
        strokeStyle: '#000000',
        lineWidth: 1,
        setLineDash() {},
        stroke() {},
        drawImage() {},
        imageSmoothingEnabled: true,
        imageSmoothingQuality: 'high',
      };
      return ctx;
    } as any;
  }
});

describe('window级指针事件监听与清理', () => {
  it('快速移动鼠标时拖拽事件持续触发（跨越节点边界）', async () => {
    const container = document.createElement('div');
    container.id = `mm-window-${Math.random().toString(36).slice(2)}`;
    document.body.appendChild(container);
    const runtime = await Runtime.create(container.id, { backgroundAlpha: 0 });

    const scene = (
      <Viewport key="v" scale={1} tx={0} ty={0} width={800} height={600}>
        <MindMapLayout key="layout-root" layout="treeBalanced" spacingX={48} spacingY={48}>
          <MindMapNode key="root" title="主题" />
          <MindMapNode key="n1" title="分支 1" />
          <Connector key="e-root-n1" fromKey="root" toKey="n1" style="elbow" />
        </MindMapLayout>
      </Viewport>
    );
    await runtime.renderFromJSX(scene as any);
    const root = runtime.getRootWidget();
    const vp = findByKey(root, 'v')! as any;
    const node1 = findByKey(root, 'n1')! as any;

    const p = node1.getAbsolutePosition();
    const toCanvas = (wx: number, wy: number) => ({
      x: vp.tx + wx * vp.scale,
      y: vp.ty + wy * vp.scale,
    });
    const cStart = toCanvas(p.dx + 2, p.dy + 2);
    const cEnd = toCanvas(p.dx + 160, p.dy + 120);
    const tStart = hitTest(root!, cStart.x, cStart.y)!;
    const tEnd = hitTest(root!, cEnd.x, cEnd.y)!;
    dispatchToTree(root!, tStart, 'pointerdown', cStart.x, cStart.y);
    window.dispatchEvent(
      new PointerEvent('pointermove', { clientX: cEnd.x, clientY: cEnd.y, pointerId: 1 }),
    );
    dispatchToTree(root!, tEnd, 'pointerup', cEnd.x, cEnd.y);

    const moved = node1.renderObject.offset as { dx: number; dy: number };
    expect(Math.round(moved.dx)).toBeGreaterThan(0);
    expect(Math.round(moved.dy)).toBeGreaterThan(0);
  });

  it('连续 window 指针移动事件持续更新拖拽偏移', async () => {
    const container = document.createElement('div');
    container.id = `mm-window-${Math.random().toString(36).slice(2)}`;
    document.body.appendChild(container);
    const runtime = await Runtime.create(container.id, { backgroundAlpha: 0 });

    const scene = (
      <Viewport key="v" scale={1} tx={0} ty={0} width={800} height={600}>
        <MindMapLayout key="layout-root" layout="treeBalanced" spacingX={48} spacingY={48}>
          <MindMapNode key="root" title="主题" />
          <MindMapNode key="n1" title="分支 1" />
          <Connector key="e-root-n1" fromKey="root" toKey="n1" style="elbow" />
        </MindMapLayout>
      </Viewport>
    );
    await runtime.renderFromJSX(scene as any);
    const root = runtime.getRootWidget();
    const vp = findByKey(root, 'v')! as any;
    const node1 = findByKey(root, 'n1')! as any;

    const p = node1.getAbsolutePosition();
    const toCanvas = (wx: number, wy: number) => ({
      x: vp.tx + wx * vp.scale,
      y: vp.ty + wy * vp.scale,
    });
    const cStart = toCanvas(p.dx + 2, p.dy + 2);
    const cEnd1 = toCanvas(p.dx + 40, p.dy + 30);
    const cEnd2 = toCanvas(p.dx + 80, p.dy + 60);
    const tStart = hitTest(root!, cStart.x, cStart.y)!;
    dispatchToTree(root!, tStart, 'pointerdown', cStart.x, cStart.y);
    window.dispatchEvent(
      new PointerEvent('pointermove', { clientX: cEnd1.x, clientY: cEnd1.y, pointerId: 2 }),
    );
    const mid = node1.renderObject.offset as { dx: number; dy: number };
    window.dispatchEvent(
      new PointerEvent('pointermove', { clientX: cEnd2.x, clientY: cEnd2.y, pointerId: 2 }),
    );
    const moved = node1.renderObject.offset as { dx: number; dy: number };
    expect(Math.round(moved.dx)).toBeGreaterThanOrEqual(Math.round(mid.dx));
    expect(Math.round(moved.dy)).toBeGreaterThanOrEqual(Math.round(mid.dy));
    window.dispatchEvent(
      new PointerEvent('pointerup', { clientX: cEnd2.x, clientY: cEnd2.y, pointerId: 2 }),
    );
  });

  it('多次点击不会造成 window 事件监听器堆积（每次点击添加/移除成对出现）', async () => {
    const container = document.createElement('div');
    container.id = `mm-window-${Math.random().toString(36).slice(2)}`;
    document.body.appendChild(container);
    const runtime = await Runtime.create(container.id, { backgroundAlpha: 0 });

    const scene = (
      <Viewport key="v" scale={1} tx={0} ty={0} width={800} height={600}>
        <MindMapLayout key="layout-root" layout="treeBalanced" spacingX={48} spacingY={48}>
          <MindMapNode key="root" title="主题" />
          <MindMapNode key="n1" title="分支 1" />
          <Connector key="e-root-n1" fromKey="root" toKey="n1" style="elbow" />
        </MindMapLayout>
      </Viewport>
    );
    await runtime.renderFromJSX(scene as any);
    const root = runtime.getRootWidget();
    const vp = findByKey(root, 'v')! as any;
    const node1 = findByKey(root, 'n1')! as any;

    const p = node1.getAbsolutePosition();
    const toCanvas = (wx: number, wy: number) => ({
      x: vp.tx + wx * vp.scale,
      y: vp.ty + wy * vp.scale,
    });
    const cStart = toCanvas(p.dx + 2, p.dy + 2);
    const cEnd = toCanvas(p.dx + 12, p.dy + 10);
    const tStart = hitTest(root!, cStart.x, cStart.y)!;

    const addSpy = vi.spyOn(window, 'addEventListener');
    const rmSpy = vi.spyOn(window, 'removeEventListener');
    for (let i = 0; i < 3; i++) {
      dispatchToTree(root!, tStart, 'pointerdown', cStart.x, cStart.y);
      const hMove = (node1 as any).windowMoveHandler;
      const hUp = (node1 as any).windowUpHandler;
      expect(typeof hMove).toBe('function');
      expect(typeof hUp).toBe('function');
      window.dispatchEvent(
        new PointerEvent('pointerup', { clientX: cEnd.x, clientY: cEnd.y, pointerId: i + 10 }),
      );
      const addMoveForH = addSpy.mock.calls.filter(
        (c) => c[0] === 'pointermove' && c[1] === hMove,
      ).length;
      const addUpForH = addSpy.mock.calls.filter(
        (c) => c[0] === 'pointerup' && c[1] === hUp,
      ).length;
      const rmMoveForH = rmSpy.mock.calls.filter(
        (c) => c[0] === 'pointermove' && c[1] === hMove,
      ).length;
      const rmUpForH = rmSpy.mock.calls.filter((c) => c[0] === 'pointerup' && c[1] === hUp).length;
      expect(addMoveForH).toBe(1);
      expect(addUpForH).toBe(1);
      expect(rmMoveForH).toBe(1);
      expect(rmUpForH).toBe(1);
    }
    addSpy.mockRestore();
    rmSpy.mockRestore();
  });

  it('在 pointerup 后清理 window 级监听器，不产生泄漏', async () => {
    const container = document.createElement('div');
    container.id = `mm-window-${Math.random().toString(36).slice(2)}`;
    document.body.appendChild(container);
    const runtime = await Runtime.create(container.id, { backgroundAlpha: 0 });

    const scene = (
      <Viewport key="v" scale={1} tx={0} ty={0} width={800} height={600}>
        <MindMapLayout key="layout-root" layout="treeBalanced" spacingX={48} spacingY={48}>
          <MindMapNode key="root" title="主题" />
          <MindMapNode key="n1" title="分支 1" />
          <Connector key="e-root-n1" fromKey="root" toKey="n1" style="elbow" />
        </MindMapLayout>
      </Viewport>
    );
    await runtime.renderFromJSX(scene as any);
    const root = runtime.getRootWidget();
    const vp = findByKey(root, 'v')! as any;
    const node1 = findByKey(root, 'n1')! as any;

    const p = node1.getAbsolutePosition();
    const toCanvas = (wx: number, wy: number) => ({
      x: vp.tx + wx * vp.scale,
      y: vp.ty + wy * vp.scale,
    });
    const cStart = toCanvas(p.dx + 2, p.dy + 2);
    const cEnd = toCanvas(p.dx + 12, p.dy + 10);
    const tStart = hitTest(root!, cStart.x, cStart.y)!;
    dispatchToTree(root!, tStart, 'pointerdown', cStart.x, cStart.y);
    window.dispatchEvent(
      new PointerEvent('pointerup', { clientX: cEnd.x, clientY: cEnd.y, pointerId: 99 }),
    );
    expect((node1 as any).windowMoveHandler).toBeNull();
    expect((node1 as any).windowUpHandler).toBeNull();
    expect((node1 as any).activePointerId).toBeNull();
  });
});
