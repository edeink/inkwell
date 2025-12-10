import { beforeEach, describe, expect, it, vi } from 'vitest';

import { MindMapNode } from './custom-widget/mindmap-node';
import { Viewport } from './custom-widget/viewport';
import { createScene } from './scene';

import type { Widget } from '@/core/base';

import Runtime from '@/runtime';

function findViewport(w: Widget | null): Viewport | null {
  if (!w) {
    return null;
  }
  const dfs = (node: Widget): Viewport | null => {
    if (node instanceof Viewport) {
      return node as Viewport;
    }
    for (const c of node.children) {
      const r = dfs(c);
      if (r) {
        return r;
      }
    }
    return null;
  };
  return dfs(w);
}

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

describe('MindMapNode hover', () => {
  let container: HTMLDivElement;
  let runtime: Runtime;
  beforeEach(async () => {
    if (!(globalThis as any).requestAnimationFrame) {
      vi.stubGlobal('requestAnimationFrame', (cb: FrameRequestCallback) => {
        return setTimeout(() => cb(performance.now()), 16) as any;
      });
      vi.stubGlobal('cancelAnimationFrame', (id: any) => clearTimeout(id));
    }
    if (!(HTMLCanvasElement.prototype as any)._inkwellCtxPatched) {
      (HTMLCanvasElement.prototype as any)._inkwellCtxPatched = true;
      HTMLCanvasElement.prototype.getContext = function (type: string) {
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
    container.id = `mindmap-test-${Math.random().toString(36).slice(2)}`;
    document.body.appendChild(container);
    runtime = await Runtime.create(container.id, { backgroundAlpha: 0 });
  });

  it('hover highlights when setHoveredKey called and cancels when cleared', async () => {
    const scene = createScene(800, 600, runtime);
    await runtime.renderFromJSX(scene);
    MindMapNode.setHoveredKey('root', null);
    expect(MindMapNode.getHoverProgress('root')).toBeGreaterThanOrEqual(0);
    await new Promise((r) => setTimeout(r, 360));
    expect(MindMapNode.getHoverProgress('root')).toBe(1);
    MindMapNode.setHoveredKey(null, null);
    await new Promise((r) => setTimeout(r, 360));
    expect(MindMapNode.getHoverProgress('root')).toBe(0);
  });

  it('switching hover between nodes updates highlight smoothly', async () => {
    const scene = createScene(800, 600, runtime);
    await runtime.renderFromJSX(scene);
    MindMapNode.setHoveredKey('root', null);
    await new Promise((r) => setTimeout(r, 360));
    expect(MindMapNode.getHoverProgress('root')).toBe(1);
    MindMapNode.setHoveredKey('n1', null);
    await new Promise((r) => setTimeout(r, 360));
    expect(MindMapNode.getHoverProgress('n1')).toBe(1);
  });
});
