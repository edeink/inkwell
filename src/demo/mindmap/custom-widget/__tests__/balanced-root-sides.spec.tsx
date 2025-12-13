/** @jsxImportSource @/utils/compiler */
import { beforeEach, describe, expect, it } from 'vitest';

import { ConnectorStyle } from '../../helpers/connection-drawer';
import { Connector } from '../connector';
import { MindMapLayout } from '../mindmap-layout';
import { MindMapNode } from '../mindmap-node';
import { Viewport } from '../viewport';

import type { Widget } from '@/core/base';

import Runtime from '@/runtime';

function findByKey(w: Widget | null, key: string): Widget | null {
  if (!w) {
    return null;
  }
  if ((w as any).key === key) {
    return w;
  }
  for (const c of (w as any).children as Widget[]) {
    const r = findByKey(c, key);
    if (r) {
      return r;
    }
  }
  return null;
}

async function makeScene(runtime: Runtime, count: number) {
  const nodes = [];
  nodes.push((<MindMapNode key="root" title="root" />) as any);
  for (let i = 0; i < count; i++) {
    nodes.push((<MindMapNode key={`c${i}`} title={`c${i}`} />) as any);
    nodes.push(
      (
        <Connector
          key={`e-root-c${i}`}
          fromKey="root"
          toKey={`c${i}`}
          style={ConnectorStyle.Elbow}
        />
      ) as any,
    );
  }
  const scene = (
    <Viewport key="v" scale={1} tx={0} ty={0} width={800} height={600}>
      <MindMapLayout key="layout-root" layout="treeBalanced" spacingX={48} spacingY={48}>
        {nodes}
      </MindMapLayout>
    </Viewport>
  );
  await runtime.renderFromJSX(scene as any);
}

describe('Balanced root sides distribution', () => {
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

  it('even number children split equally', async () => {
    await makeScene(runtime, 4);
    const root = runtime.getRootWidget();
    const rootNode = findByKey(root, 'root')!;
    const pr = (rootNode as any).getAbsolutePosition();
    let left = 0,
      right = 0;
    for (let i = 0; i < 4; i++) {
      const n = findByKey(root, `c${i}`)!;
      const p = (n as any).getAbsolutePosition();
      if (p.dx < pr.dx) {
        left++;
      } else {
        right++;
      }
    }
    expect(left).toBe(right);
  });

  it('odd number children differ by at most 1', async () => {
    await makeScene(runtime, 5);
    const root = runtime.getRootWidget();
    const rootNode = findByKey(root, 'root')!;
    const pr = (rootNode as any).getAbsolutePosition();
    let left = 0,
      right = 0;
    for (let i = 0; i < 5; i++) {
      const n = findByKey(root, `c${i}`)!;
      const p = (n as any).getAbsolutePosition();
      if (p.dx < pr.dx) {
        left++;
      } else {
        right++;
      }
    }
    expect(Math.abs(left - right)).toBeLessThanOrEqual(1);
  });

  it('three children split 2-1', async () => {
    await makeScene(runtime, 3);
    const root = runtime.getRootWidget();
    const rootNode = findByKey(root, 'root')!;
    const pr = (rootNode as any).getAbsolutePosition();
    let left = 0,
      right = 0;
    for (let i = 0; i < 3; i++) {
      const n = findByKey(root, `c${i}`)!;
      const p = (n as any).getAbsolutePosition();
      if (p.dx < pr.dx) {
        left++;
      } else {
        right++;
      }
    }
    expect(Math.abs(left - right)).toBe(1);
  });
});
