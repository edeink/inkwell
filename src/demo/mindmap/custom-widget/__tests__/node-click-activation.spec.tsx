/** @jsxImportSource @/utils/compiler */
import { beforeEach, describe, expect, it } from 'vitest';

import { MindMapLayout } from '../mindmap-layout';
import { MindMapNode } from '../mindmap-node';
import { Viewport } from '../viewport';

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

describe('MindMapNode click activation without move', async () => {
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
  it('triggers onActive when no pointer move occurred', async () => {
    const container = document.createElement('div');
    container.id = `mm-node-${Math.random().toString(36).slice(2)}`;
    document.body.appendChild(container);
    const runtime = await Runtime.create(container.id, { backgroundAlpha: 0 });

    let activeKey: string | null = null;
    let moveCalled = 0;
    let vpRef: any = null;
    const scene = (
      <Viewport key="v" scale={1} tx={0} ty={0} width={800} height={600}>
        <MindMapLayout key="layout-root" layout="treeBalanced" spacingX={48} spacingY={48}>
          <MindMapNode
            key="n1"
            title="节点"
            onActive={(key: string | null) => {
              activeKey = key;
              if (vpRef && typeof (vpRef as any).setActiveKey === 'function') {
                (vpRef as any).setActiveKey(key);
              }
            }}
            onMoveNode={() => {
              moveCalled += 1;
            }}
          />
        </MindMapLayout>
      </Viewport>
    );
    await runtime.renderFromJSX(scene as any);

    const root = runtime.getRootWidget();
    const node = findByKey(root, 'n1')!;
    const vp = findByKey(root, 'v')!;
    vpRef = vp;

    const e = {
      x: 200,
      y: 150,
      nativeEvent: new MouseEvent('pointerdown', { clientX: 200, clientY: 150 }),
    } as any;
    (node as any).onPointerDown(e);
    const eUp = {
      x: 200,
      y: 150,
      nativeEvent: new MouseEvent('pointerup', { clientX: 200, clientY: 150 }),
    } as any;
    (node as any).onPointerUp(eUp);

    expect(activeKey).toBe('n1');
    expect((vp as any).activeKey).toBe('n1');
    expect(moveCalled).toBe(0);
  });
});
