/** @jsxImportSource @/utils/compiler */
import { beforeEach, describe, expect, it } from 'vitest';

import { ConnectorElement as Connector } from '../connector';
import { MindMapLayoutElement as MindMapLayout } from '../mindmap-layout';
import { MindMapNodeElement as MindMapNode } from '../mindmap-node';
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

async function createScene(width: number, height: number, runtime: Runtime) {
  const scene = (
    <Viewport key="v" scale={1} tx={0} ty={0} width={width} height={height}>
      <MindMapLayout key="layout-root" layout="treeBalanced" spacingX={40} spacingY={24}>
        <MindMapNode key="root" title="主题" width={100} height={40} />
        <MindMapNode key="a" title="A" width={90} height={30} />
        <MindMapNode key="b" title="B" width={90} height={30} />
        <MindMapNode key="a1" title="A1" width={80} height={24} />
        <MindMapNode key="a2" title="A2" width={80} height={24} />
        <Connector key="e-root-a" fromKey="root" toKey="a" style="elbow" />
        <Connector key="e-root-b" fromKey="root" toKey="b" style="elbow" />
        <Connector key="e-a-a1" fromKey="a" toKey="a1" style="elbow" />
        <Connector key="e-a-a2" fromKey="a" toKey="a2" style="elbow" />
      </MindMapLayout>
    </Viewport>
  );
  await runtime.renderFromJSX(scene as any);
}

describe('MindMapNewLayout depth-aware spacing', () => {
  let container: HTMLDivElement;
  let runtime: Runtime;

  beforeEach(async () => {
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
    container = document.createElement('div');
    container.id = `mm-${Math.random().toString(36).slice(2)}`;
    document.body.appendChild(container);
    runtime = await Runtime.create(container.id, { backgroundAlpha: 0 });
  });

  it('increases Y-gap with depth and X-gap with depth', async () => {
    await createScene(800, 600, runtime);
    const root = runtime.getRootWidget();
    const nodeRoot = findByKey(root, 'root')!;
    const nodeA = findByKey(root, 'a')!;
    const nodeB = findByKey(root, 'b')!;
    const nodeA1 = findByKey(root, 'a1')!;
    const nodeA2 = findByKey(root, 'a2')!;

    const pRoot = (nodeRoot as any).getAbsolutePosition();
    const pA = (nodeA as any).getAbsolutePosition();
    const pB = (nodeB as any).getAbsolutePosition();
    const pA1 = (nodeA1 as any).getAbsolutePosition();
    const pA2 = (nodeA2 as any).getAbsolutePosition();

    const szA = (nodeA as any).renderObject.size as { width: number; height: number };
    const szA1 = (nodeA1 as any).renderObject.size as { width: number; height: number };

    const yGapLevel1 = Math.abs(pB.dy - pA.dy) - szA.height;
    const yGapLevel2 = Math.abs(pA2.dy - pA1.dy) - szA1.height;

    expect(yGapLevel2).toBeGreaterThanOrEqual(yGapLevel1);

    const xGapLevel1 = Math.abs(pA.dx - pRoot.dx) - (nodeRoot as any).renderObject.size.width;
    const xGapLevel2 = Math.abs(pA1.dx - pA.dx) - szA.width;
    expect(xGapLevel2).toBeGreaterThanOrEqual(xGapLevel1);
  });
});
