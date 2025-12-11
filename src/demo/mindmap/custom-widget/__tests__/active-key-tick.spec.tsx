/** @jsxImportSource @/utils/compiler */
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { MindMapLayoutElement as MindMapLayout } from '../mindmap-layout';
import { MindMapNodeElement as MindMapNode } from '../mindmap-node';
import { MindMapNodeToolbarElement as MindMapNodeToolbar } from '../mindmap-node-toolbar';
import { ViewportElement as Viewport } from '../viewport';

import type { Widget } from '@/core/base';

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

describe('activeKey tick order and propagation', async () => {
  beforeEach(() => {
    if (!(HTMLCanvasElement.prototype as any)._inkwellCtxPatched) {
      (HTMLCanvasElement.prototype as any)._inkwellCtxPatched = true;
      HTMLCanvasElement.prototype.getContext = function (this: HTMLCanvasElement, type: string) {
        if (type !== '2d') {
          return null as any;
        }
        const ctx: any = {
          canvas: this as HTMLCanvasElement,
          save() {},
          restore() {},
          translate() {},
          scale() {},
          rotate() {},
          clearRect() {},
          fillRect() {},
          strokeRect() {},
          beginPath() {},
          closePath() {},
          moveTo() {},
          lineTo() {},
          quadraticCurveTo() {},
          fill() {},
          stroke() {},
          setLineDash() {},
          fillText() {},
          drawImage() {},
          getTransform() {
            return { a: 1, b: 0, c: 0, d: 1, e: 0, f: 0 } as any;
          },
          imageSmoothingEnabled: true,
          imageSmoothingQuality: 'high',
        };
        return ctx;
      } as any;
    }
  });

  it('rebuilds with build/layout/paint when activeKey changes', async () => {
    const container = document.createElement('div');
    container.id = `mm-tick-${Math.random().toString(36).slice(2)}`;
    document.body.appendChild(container);
    const runtime = await Runtime.create(container.id, { backgroundAlpha: 0 });

    const scene = (
      <Viewport key="v" scale={1} tx={0} ty={0} width={800} height={600}>
        <MindMapLayout key="layout-root" layout="treeBalanced" spacingX={48} spacingY={48}>
          <MindMapNode key="n1" title="节点 1" />
          <MindMapNode key="n2" title="节点 2" />
          <MindMapNodeToolbar key="toolbar" />
        </MindMapLayout>
      </Viewport>
    );
    await runtime.renderFromJSX(scene as any);

    const root = runtime.getRootWidget();
    const vp = findByKey(root, 'v')!;

    const spyRebuild = vi.spyOn(runtime as any, 'rebuild');
    const spyCalc = vi.spyOn(runtime as any, 'calculateLayout');
    const spyPerf = vi.spyOn(runtime as any, 'performRender');
    const spyClear = vi.spyOn(runtime as any, 'clearCanvas');

    (vp as any).setActiveKey('n1');

    await new Promise((r) => setTimeout(r, 5));

    expect(spyRebuild).toHaveBeenCalled();
    expect(spyCalc).toHaveBeenCalled();
    expect(spyClear).toHaveBeenCalled();
    expect(spyPerf).toHaveBeenCalled();

    const orders = [
      spyCalc.mock.invocationCallOrder[0],
      spyClear.mock.invocationCallOrder[0],
      spyPerf.mock.invocationCallOrder[0],
    ];
    expect(Math.min(...orders)).toBe(orders[0]);
    expect(orders[1]).toBeGreaterThan(orders[0]);
    expect(orders[2]).toBeGreaterThan(orders[1]);

    const n1 = findByKey(root, 'n1')!;
    const toolbar = findByKey(root, 'toolbar')!;
    expect((n1 as any).active).toBe(true);
    const activeNode = (toolbar as any).getActiveNode();
    expect(activeNode?.key).toBe('n1');
  });
});
