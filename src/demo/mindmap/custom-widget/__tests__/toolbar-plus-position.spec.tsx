/** @jsxImportSource @/utils/compiler */
import { beforeEach, describe, expect, it } from 'vitest';

import { ConnectorElement as Connector } from '../connector';
import { MindMapLayoutElement as MindMapLayout } from '../mindmap-layout';
import { MindMapNodeElement as MindMapNode } from '../mindmap-node';
import { MindMapNodeToolbarElement as MindMapNodeToolbar } from '../mindmap-node-toolbar';
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

describe('MindMapNodeToolbar plus button positioning and hit logic', () => {
  it('top/bottom/side buttons trigger expected actions', async () => {
    const container = document.createElement('div');
    container.id = `mm-toolbar-${Math.random().toString(36).slice(2)}`;
    document.body.appendChild(container);
    const runtime = await Runtime.create(container.id, { backgroundAlpha: 0 });

    let addAbove = 0;
    let addBelow = 0;
    let addRight = 0;
    let addLeft = 0;

    const scene = (
      <Viewport key="v" scale={1} tx={0} ty={0} width={800} height={600}>
        <MindMapLayout key="layout-root" layout="treeBalanced" spacingX={48} spacingY={48}>
          <MindMapNode key="root" title="主题" />
          <MindMapNode key="n1" title="分支 1" />
          <Connector key="e-root-n1" fromKey="root" toKey="n1" style="elbow" />
          <MindMapNodeToolbar
            key="toolbar"
            onAddSibling={(refKey: string, dir: -1 | 1) => {
              if (dir === -1) {
                addAbove++;
              } else {
                addBelow++;
              }
            }}
            onAddChildSide={(refKey: string, side: any) => {
              if (side === 'right') {
                addRight++;
              }
              if (side === 'left') {
                addLeft++;
              }
            }}
          />
        </MindMapLayout>
      </Viewport>
    );
    await runtime.renderFromJSX(scene as any);
    const root = runtime.getRootWidget();
    const vp = findByKey(root, 'v')! as any;
    vp.setActiveKey('n1');
    const node = findByKey(root, 'n1')!;
    const toolbar = findByKey(root, 'toolbar')!;

    const p = node.getAbsolutePosition();
    const sz = node.renderObject.size as { width: number; height: number };
    const btnSize = { width: 20, height: 20 };
    const margin = 6;

    const top = {
      x: p.dx + sz.width / 2 - btnSize.width / 2,
      y: p.dy - margin - btnSize.height,
    };
    const bottom = {
      x: p.dx + sz.width / 2 - btnSize.width / 2,
      y: p.dy + sz.height + margin,
    };
    const right = { x: p.dx + sz.width + margin, y: p.dy + sz.height / 2 - btnSize.height / 2 };
    const left = { x: p.dx - margin - btnSize.width, y: p.dy + sz.height / 2 - btnSize.height / 2 };

    const toCanvas = (wx: number, wy: number) => ({
      x: vp.tx + wx * vp.scale,
      y: vp.ty + wy * vp.scale,
    });
    const cTop = toCanvas(top.x + 1, top.y + 1);
    const cBottom = toCanvas(bottom.x + 1, bottom.y + 1);
    const cRight = toCanvas(right.x + 1, right.y + 1);
    const cLeft = toCanvas(left.x + 1, left.y + 1);

    const tTop = hitTest(root!, cTop.x, cTop.y)!;
    const tBottom = hitTest(root!, cBottom.x, cBottom.y)!;
    const tRight = hitTest(root!, cRight.x, cRight.y)!;
    const tLeft = hitTest(root!, cLeft.x, cLeft.y)!;

    dispatchToTree(root!, tTop, 'pointerdown', cTop.x, cTop.y);
    dispatchToTree(root!, tBottom, 'pointerdown', cBottom.x, cBottom.y);
    dispatchToTree(root!, tRight, 'pointerdown', cRight.x, cRight.y);
    dispatchToTree(root!, tLeft, 'pointerdown', cLeft.x, cLeft.y);

    expect(addAbove).toBe(1);
    expect(addBelow).toBe(1);
    expect(addLeft + addRight).toBe(1);

    const center = { x: p.dx + sz.width / 2, y: p.dy + sz.height / 2 };
    const cCenter = toCanvas(center.x, center.y);
    const tCenter = hitTest(root!, cCenter.x, cCenter.y)!;
    expect(tCenter.key).toBe('n1');
  });
});
