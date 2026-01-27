import { beforeEach, describe, expect, it, vi } from 'vitest';

import { CustomComponentType } from '../type';
import { MindMapNode } from '../widgets/mindmap-node';
import { MindMapViewport } from '../widgets/mindmap-viewport';

import Runtime from '@/runtime';
import { Themes } from '@/styles/theme';
// 模拟 Canvas2DRenderer
const mockDrawRect = vi.fn();
const mockSave = vi.fn();
const mockRestore = vi.fn();
const mockTransform = vi.fn();

const mockRenderer = {
  initialize: vi.fn().mockResolvedValue(undefined),
  destroy: vi.fn(),
  render: vi.fn(),
  drawRect: mockDrawRect,
  save: mockSave,
  restore: mockRestore,
  transform: mockTransform,
  translate: vi.fn(),
  scale: vi.fn(),
  getRawInstance: () => ({
    canvas: {
      width: 800,
      height: 600,
      dataset: {},
      getContext: () => ({
        clearRect: vi.fn(),
        save: vi.fn(),
        restore: vi.fn(),
        scale: vi.fn(),
        translate: vi.fn(),
        fillRect: vi.fn(),
        strokeRect: vi.fn(),
        measureText: () => ({ width: 0 }),
      }),
    },
  }),
  update: vi.fn(),
};

// 模拟 Runtime
vi.mock('@/runtime', async (importOriginal) => {
  const actual = await importOriginal();
  return {
    default: class MockRuntime {
      dirtyWidgets = new Set();
      renderer = mockRenderer;
      container = document.createElement('div');
      rootWidget = null;

      static create() {
        return new MockRuntime();
      }

      scheduleUpdate(w: any) {
        this.dirtyWidgets.add(w);
      }

      tick(dirty: any) {
        if (dirty) {
          dirty.forEach((w: any) => this.dirtyWidgets.add(w));
        }
        // 模拟重建
        const list = Array.from(this.dirtyWidgets);
        this.dirtyWidgets.clear();
        for (const w of list) {
          (w as any).rebuild();
          (w as any).clearDirty();
          // 在实际 runtime 中，我们会检查 isLayoutDirty
          if ((w as any).isLayoutDirty()) {
            (w as any).layout({ minWidth: 0, maxWidth: 800, minHeight: 0, maxHeight: 600 });
          }
        }
        // 模拟绘制
        if (this.rootWidget) {
          const context = { renderer: this.renderer };
          (this.rootWidget as any).paint(context);
        }
      }
    },
  };
});

describe('Viewport 选区矩形测试', () => {
  let runtime: any;
  let viewport: any;

  beforeEach(async () => {
    runtime = await Runtime.create('test-container');
    viewport = new MindMapViewport({
      key: CustomComponentType.MindMapViewport,
      type: CustomComponentType.MindMapViewport,
      width: 800,
      height: 600,
    });
    viewport.runtime = runtime;
    runtime.rootWidget = viewport;

    // 初始布局
    viewport.layout({ minWidth: 0, maxWidth: 800, minHeight: 0, maxHeight: 600 });
  });

  it('拖拽时应显示选区矩形，松开后应隐藏', () => {
    // 1. 按下鼠标
    viewport.onPointerDown({
      nativeEvent: { buttons: 1, pointerId: 1 },
      x: 100,
      y: 100,
    });

    expect(viewport.selectionRect).toEqual({ x: 100, y: 100, width: 0, height: 0 });

    // 2. 移动鼠标
    viewport.onPointerMove({
      nativeEvent: { pointerId: 1 },
      x: 200,
      y: 200,
    });

    expect(viewport.selectionRect).toEqual({ x: 100, y: 100, width: 100, height: 100 });

    // 验证已调度布局
    expect(runtime.dirtyWidgets.has(viewport)).toBe(true);

    // 运行 tick 进行绘制
    runtime.tick();

    // 验证 drawRect 被调用 (绘制选区矩形)
    expect(mockDrawRect).toHaveBeenCalledWith(
      expect.objectContaining({
        x: 100,
        y: 100,
        width: 100,
        height: 100,
        fill: Themes.light.state.focus,
        stroke: Themes.light.primary,
        strokeWidth: 1,
      }),
    );

    mockDrawRect.mockClear();

    // 3. 松开鼠标
    viewport.onPointerUp({
      nativeEvent: { pointerId: 1 },
      stopPropagation: vi.fn(),
    });

    expect(viewport.selectionRect).toBeNull();

    // 验证已调度布局 (关键修复验证)
    expect(runtime.dirtyWidgets.has(viewport)).toBe(true);

    // 运行 tick 进行绘制
    runtime.tick();

    // 验证 drawRect 未被调用 (选区矩形不应绘制)
    expect(mockDrawRect).not.toHaveBeenCalled();
  });

  it('应选中矩形内的项目', () => {
    // 设置子节点
    const child = new MindMapNode({
      key: 'node-1',
      title: 'Node 1',
      type: CustomComponentType.MindMapNode,
    });
    child.renderObject = {
      offset: { dx: 150, dy: 150 }, // 在 100,100 -> 200,200 矩形内
      size: { width: 50, height: 50 },
    } as any;

    // 我们需要将 child 附加到 viewport
    viewport.children = [child];
    child.parent = viewport;

    // 1. 拖拽选择
    viewport.onPointerDown({ nativeEvent: { buttons: 1, pointerId: 1 }, x: 100, y: 100 });
    viewport.onPointerMove({ nativeEvent: { pointerId: 1 }, x: 250, y: 250 }); // 矩形: 100,100 -> 250,250 (150x150)

    // 验证拖拽过程中选区更新
    expect(viewport.selectedKeys).toContain('node-1');

    // 2. 松开鼠标
    viewport.onPointerUp({ nativeEvent: { pointerId: 1 }, stopPropagation: vi.fn() });

    // 验证最终选择
    expect(viewport.selectedKeys).toContain('node-1');
    expect(viewport.selectionRect).toBeNull();
  });
});
