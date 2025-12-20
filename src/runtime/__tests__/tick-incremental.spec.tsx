/** @jsxImportSource @/utils/compiler */
import { describe, expect, it } from 'vitest';

import type { IRenderer, RendererOptions } from '@/renderer/IRenderer';

import { Container } from '@/core';
import { Widget } from '@/core/base';
import Runtime from '@/runtime';
import { compileElement } from '@/utils/compiler/jsx-compiler';

class StubRenderer implements IRenderer {
  initializeCalls = 0;
  updateCalls = 0;
  resizeCalls = 0;
  raw: {
    canvas: HTMLCanvasElement;
    clearRect: (x: number, y: number, w: number, h: number) => void;
  };

  constructor() {
    const canvas = document.createElement('canvas');
    this.raw = {
      canvas,
      clearRect: () => {},
    };
  }
  initialize(_container: HTMLElement, options: RendererOptions): void {
    this.raw.canvas.width = options.width;
    this.raw.canvas.height = options.height;
    this.initializeCalls++;
  }
  update(options: Partial<RendererOptions>): void {
    if (options.width) {
      this.raw.canvas.width = options.width;
    }
    if (options.height) {
      this.raw.canvas.height = options.height;
    }
    this.updateCalls++;
  }
  resize(width: number, height: number): void {
    this.raw.canvas.width = width;
    this.raw.canvas.height = height;
    this.resizeCalls++;
  }
  render(): void {}
  destroy(): void {}
  getRawInstance(): unknown {
    return this.raw as unknown;
  }
  save(): void {}
  restore(): void {}
  translate(): void {}
  scale(): void {}
  rotate(): void {}
  drawText(): void {}
  drawRect(): void {}
  drawLine(): void {}
  drawPath(): void {}
  drawImage(): void {}
}

describe('运行时 tick 增量重建', () => {
  it('重建时避免重新初始化并调用 update', async () => {
    const container = document.createElement('div');
    container.id = 'stage-stub';
    container.style.width = '400px';
    container.style.height = '300px';
    document.body.appendChild(container);

    const rt = await Runtime.create('stage-stub', { renderer: 'canvas2d' });
    // 注入 stub 渲染器
    (rt as unknown as { renderer: IRenderer | null }).renderer = new StubRenderer();

    const el = <Container key="root" width={200} height={100} />;
    const json = compileElement(el);
    await rt.renderFromJSON(json);

    const rr = rt.getRenderer() as StubRenderer;
    const initBefore = rr.initializeCalls;
    const updateBefore = rr.updateCalls;

    const root = rt.getRootWidget() as Widget;
    root.markNeedsLayout();
    rt.tick([root]);

    expect(rr.initializeCalls).toBe(initBefore);
    expect(rr.updateCalls).toBeGreaterThan(updateBefore);
    document.body.removeChild(container);
  });
});
