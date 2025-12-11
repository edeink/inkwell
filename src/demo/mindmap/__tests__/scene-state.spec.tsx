/** @jsxImportSource @/utils/compiler */
import { beforeEach, describe, expect, it } from 'vitest';

import { createScene } from '../scene';

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

describe('scene state updates', async () => {
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

  it('adds sibling and child side with state-first updates', async () => {
    const container = document.createElement('div');
    container.id = `mm-scene-${Math.random().toString(36).slice(2)}`;
    document.body.appendChild(container);
    const runtime = await Runtime.create(container.id, { backgroundAlpha: 0 });

    const scene = createScene(800, 600, runtime);
    await runtime.renderFromJSX(scene as any);

    const root = runtime.getRootWidget();
    const vp = findByKey(root, 'v')! as any;
    const layout = findByKey(root, 'layout-root')! as any;
    const toolbar = findByKey(root, 'toolbar')! as any;

    const listNodeKeys = (): string[] =>
      (layout.children as Widget[])
        .filter((c) => (c as any).type === 'MindMapNode')
        .map((c) => (c as any).key);
    const countNodes = (): number =>
      (layout.children as Widget[]).filter((c) => (c as any).type === 'MindMapNode').length;
    const countEdges = (): number =>
      (layout.children as Widget[]).filter((c) => (c as any).type === 'Connector').length;

    vp.setActiveKey('n1');

    const nodesBefore = countNodes();
    const edgesBefore = countEdges();
    const keysBefore = new Set(listNodeKeys());

    toolbar._onAddSibling('n1', 1);
    await new Promise((r) => setTimeout(r, 5));

    const nodesAfter1 = countNodes();
    const edgesAfter1 = countEdges();
    expect(nodesAfter1).toBe(nodesBefore + 1);
    expect(edgesAfter1).toBe(edgesBefore + 1);

    const keysAfter1 = new Set(listNodeKeys());
    const diff1 = Array.from(keysAfter1).filter((k) => !keysBefore.has(k));
    expect(diff1.length).toBe(1);

    toolbar._onAddChildSide('n1', 'left');
    await new Promise((r) => setTimeout(r, 5));

    const nodesAfter2 = countNodes();
    const edgesAfter2 = countEdges();
    expect(nodesAfter2).toBe(nodesAfter1 + 1);
    expect(edgesAfter2).toBe(edgesAfter1 + 1);

    const keysAfter2 = new Set(listNodeKeys());
    const diff2 = Array.from(keysAfter2).filter((k) => !keysAfter1.has(k));
    expect(diff2.length).toBe(1);
    const newNode = findByKey(root, diff2[0])! as any;
    expect(newNode.prefSide).toBe('left');
  });
});
