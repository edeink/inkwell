/** @jsxImportSource @/utils/compiler */
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { CustomComponentType } from '../type';
import { MindMapLayout } from '../widgets/mindmap-layout';
import { MindMapNode } from '../widgets/mindmap-node';
import { MindMapNodeToolbar } from '../widgets/mindmap-node-toolbar';
import { MindMapViewport } from '../widgets/mindmap-viewport';

import type { Widget } from '@/core/base';

import { findWidget } from '@/core/helper/widget-selector';
import Runtime from '@/runtime';
describe('activeKey tick 顺序和传播', async () => {
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

  it('activeKey 变更时应触发 build/layout/paint 重建', async () => {
    const container = document.createElement('div');
    container.id = `mm-tick-${Math.random().toString(36).slice(2)}`;
    document.body.appendChild(container);
    const runtime = await Runtime.create(container.id, { backgroundAlpha: 0 });

    const scene = (
      <MindMapViewport
        key={CustomComponentType.MindMapViewport}
        scale={1}
        tx={0}
        ty={0}
        width={800}
        height={600}
      >
        <MindMapLayout key="layout-root" layout="treeBalanced" spacingX={48} spacingY={48}>
          <MindMapNode key="n1" title="节点 1" />
          <MindMapNode key="n2" title="节点 2" />
          <MindMapNodeToolbar key="toolbar" />
        </MindMapLayout>
      </MindMapViewport>
    );
    await runtime.renderFromJSX(scene as any);

    const root = runtime.getRootWidget();
    const vp = findWidget(root, `#${CustomComponentType.MindMapViewport}`) as Widget;

    const spyRebuild = vi.spyOn(runtime as any, 'rebuild');
    const spyCalc = vi.spyOn(runtime as any, 'calculateLayout');
    const spyPerf = vi.spyOn(runtime as any, 'performRender');
    const spyClear = vi.spyOn(runtime as any, 'clearCanvas');

    (vp as any).setActiveKey('n1');

    await new Promise((r) => requestAnimationFrame(() => r(null)));
    await new Promise((r) => requestAnimationFrame(() => r(null)));

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

    const n1 = findWidget(root, `${CustomComponentType.MindMapNode}#n1`) as Widget;
    expect((n1 as any).active).toBe(true);
    const activeNode = findWidget(root, ':active') as Widget | null;
    expect(activeNode?.key).toBe('n1');
  });
});
