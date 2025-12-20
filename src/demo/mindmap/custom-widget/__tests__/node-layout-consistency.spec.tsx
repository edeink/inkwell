/** @jsxImportSource @/utils/compiler */
import { beforeEach, describe, expect, it } from 'vitest';

import { ConnectorStyle } from '../../helpers/connection-drawer';
import { Connector } from '../connector';
import { MindMapLayout } from '../mindmap-layout';
import { MindMapNode } from '../mindmap-node';
import { MindMapNodeToolbar } from '../mindmap-node-toolbar';
import { Viewport } from '../viewport';

import type { Widget } from '@/core/base';

import { findWidget } from '@/core/helper/widget-selector';
import Runtime from '@/runtime';

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

describe('MindMapNode 布局稳定性与激活位置', () => {
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

  it('节点位置在有无工具栏时应保持一致', async () => {
    await createSceneWithToolbar(800, 600, runtimeA);
    await createSceneWithoutToolbar(800, 600, runtimeB);
    const rootA = runtimeA.getRootWidget();
    const rootB = runtimeB.getRootWidget();
    const nodeA = findWidget(rootA, '#n1') as Widget;
    const nodeB = findWidget(rootB, '#n1') as Widget;
    const pa = nodeA.getAbsolutePosition();
    const pb = nodeB.getAbsolutePosition();
    expect(Math.abs(pa.dx - pb.dx)).toBeLessThan(1);
    expect(Math.abs(pa.dy - pb.dy)).toBeLessThan(1);
  });

  it('激活状态下节点绝对位置应保持稳定', async () => {
    await createSceneWithToolbar(800, 600, runtimeA);
    const rootA = runtimeA.getRootWidget();
    const vp = findWidget(rootA, 'Viewport') as Widget;
    const nodeA = findWidget(rootA, '#n1') as Widget;
    const p0 = nodeA.getAbsolutePosition();
    (vp as any).setActiveKey?.('n1');
    const p1 = nodeA.getAbsolutePosition();
    expect(Math.abs(p1.dx - p0.dx)).toBeLessThan(1);
    expect(Math.abs(p1.dy - p0.dy)).toBeLessThan(1);
  });
});
