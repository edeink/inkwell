/** @jsxImportSource @/utils/compiler */
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { MindMapNode } from '../index';

import Runtime from '@/runtime';

describe('MindMapNode Update Mechanism', () => {
  beforeEach(() => {
    // Mock Canvas context
    if (!(HTMLCanvasElement.prototype as any)._inkwellCtxPatched) {
      (HTMLCanvasElement.prototype as any)._inkwellCtxPatched = true;
      HTMLCanvasElement.prototype.getContext = function (this: HTMLCanvasElement, type: string) {
        if (type !== '2d') {
          return null;
        }
        return {
          canvas: this,
          save: vi.fn(),
          restore: vi.fn(),
          translate: vi.fn(),
          scale: vi.fn(),
          rotate: vi.fn(),
          clearRect: vi.fn(),
          fillRect: vi.fn(),
          strokeRect: vi.fn(),
          beginPath: vi.fn(),
          closePath: vi.fn(),
          moveTo: vi.fn(),
          lineTo: vi.fn(),
          quadraticCurveTo: vi.fn(),
          bezierCurveTo: vi.fn(),
          fill: vi.fn(),
          stroke: vi.fn(),
          fillText: vi.fn(),
          measureText: () => ({
            width: 10,
            actualBoundingBoxAscent: 10,
            actualBoundingBoxDescent: 2,
          }),
          setLineDash: vi.fn(),
          getTransform: () => ({ a: 1, b: 0, c: 0, d: 1, e: 0, f: 0 }),
        } as unknown as CanvasRenderingContext2D;
      } as any;
    }
  });

  it('应在属性变化时更新内部状态', async () => {
    const container = document.createElement('div');
    container.id = `node-test-${Math.random().toString(36).slice(2)}`;
    document.body.appendChild(container);
    const runtime = await Runtime.create(container.id);

    // 1. 初始渲染
    const node = <MindMapNode key="node1" title="初始标题" />;
    await runtime.renderFromJSX(node as any);

    const widget = runtime.getRootWidget() as unknown as MindMapNode;
    expect(widget).toBeDefined();
    expect((widget as any).state.title).toBe('初始标题');

    // 2. 更新属性（保持 key 不变）
    const node2 = <MindMapNode key="node1" title="更新后的标题" />;
    await runtime.renderFromJSX(node2 as any);

    // 3. 验证状态是否同步更新
    // 重新获取根组件，因为可能会创建新实例
    const updatedWidget = runtime.getRootWidget() as unknown as MindMapNode;
    expect(updatedWidget).toBeDefined();
    expect((updatedWidget as any).state.title).toBe('更新后的标题');
  });

  it('应在不相关属性变化时保持标题不变', async () => {
    const container = document.createElement('div');
    container.id = `node-test-2-${Math.random().toString(36).slice(2)}`;
    document.body.appendChild(container);
    const runtime = await Runtime.create(container.id);

    const node = <MindMapNode key="node1" title="固定标题" active={false} />;
    await runtime.renderFromJSX(node as any);

    let widget = runtime.getRootWidget() as unknown as MindMapNode;
    expect((widget as any).state.title).toBe('固定标题');

    // 更新 active 属性，但 title 不变
    const node2 = <MindMapNode key="node1" title="固定标题" active={true} />;
    await runtime.renderFromJSX(node2 as any);

    widget = runtime.getRootWidget() as unknown as MindMapNode;
    expect((widget as any).state.title).toBe('固定标题');
    expect(widget.active).toBe(true);
  });
});
