/** @jsxImportSource @/utils/compiler */
import { beforeEach, describe, expect, it } from 'vitest';

import { ConnectorStyle } from '../../helpers/connection-drawer';
import { Connector } from '../connector';
import { MindMapLayout } from '../mindmap-layout';
import { MindMapNode } from '../mindmap-node';
import { MindMapNodeToolbar } from '../mindmap-node-toolbar';
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

// toolbar 不再包裹节点，改为同级存在

async function createSceneWithToolbar(width: number, height: number, runtime: Runtime) {
  const scene = (
    <Viewport key="v" scale={1} tx={0} ty={0} width={width} height={height}>
      <MindMapLayout key="layout-root" layout="treeBalanced" spacingX={48} spacingY={48}>
        <MindMapNode key="root" title="主题" />
        <MindMapNode key="n1" title="分支 1" />
        <MindMapNodeToolbar key="toolbar" />
        <Connector key="e-root-n1" fromKey="root" toKey="n1" style={ConnectorStyle.Elbow} />
      </MindMapLayout>
    </Viewport>
  );
  await runtime.renderFromJSX(scene as any);
}

async function createSceneWithoutToolbar(width: number, height: number, runtime: Runtime) {
  const scene = (
    <Viewport key="v" scale={1} tx={0} ty={0} width={width} height={height}>
      <MindMapLayout key="layout-root" layout="treeBalanced" spacingX={48} spacingY={48}>
        <MindMapNode key="root" title="主题" />
        <MindMapNode key="n1" title="分支 1" />
        <Connector key="e-root-n1" fromKey="root" toKey="n1" style={ConnectorStyle.Elbow} />
      </MindMapLayout>
    </Viewport>
  );
  await runtime.renderFromJSX(scene);
}

describe('MindMapNode layout stability and active position', () => {
  let containerA: HTMLDivElement;
  let containerB: HTMLDivElement;
  let runtimeA: Runtime;
  let runtimeB: Runtime;

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
    containerA = document.createElement('div');
    containerB = document.createElement('div');
    containerA.id = `mm-a-${Math.random().toString(36).slice(2)}`;
    containerB.id = `mm-b-${Math.random().toString(36).slice(2)}`;
    document.body.appendChild(containerA);
    document.body.appendChild(containerB);
    runtimeA = await Runtime.create(containerA.id, { backgroundAlpha: 0 });
    runtimeB = await Runtime.create(containerB.id, { backgroundAlpha: 0 });
  });

  it('node position is consistent with and without toolbar', async () => {
    await createSceneWithToolbar(800, 600, runtimeA);
    await createSceneWithoutToolbar(800, 600, runtimeB);
    const rootA = runtimeA.getRootWidget();
    const rootB = runtimeB.getRootWidget();
    const nodeA = findByKey(rootA, 'n1')!;
    const nodeB = findByKey(rootB, 'n1')!;
    const pa = nodeA.getAbsolutePosition();
    const pb = nodeB.getAbsolutePosition();
    expect(Math.abs(pa.dx - pb.dx)).toBeLessThan(1);
    expect(Math.abs(pa.dy - pb.dy)).toBeLessThan(1);
  });

  it('node absolute position stable on active state', async () => {
    await createSceneWithToolbar(800, 600, runtimeA);
    const rootA = runtimeA.getRootWidget();
    const vp = findByKey(rootA, 'v')!;
    const nodeA = findByKey(rootA, 'n1')!;
    const p0 = nodeA.getAbsolutePosition();
    (vp as any).setActiveKey?.('n1');
    const p1 = nodeA.getAbsolutePosition();
    expect(Math.abs(p1.dx - p0.dx)).toBeLessThan(1);
    expect(Math.abs(p1.dy - p0.dy)).toBeLessThan(1);
  });
});
