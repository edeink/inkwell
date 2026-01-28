/** @jsxImportSource @/utils/compiler */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { StatelessWidget } from '@/core';
import { Widget } from '@/core/base';
import { EventManager } from '@/core/events/manager';
import { findWidget } from '@/core/helper/widget-selector';
import { WidgetRegistry } from '@/core/registry';
import { CustomComponentType } from '@/demo/mindmap/type';
import Runtime from '@/runtime';
import { testLogger } from '@/utils/test-logger';

class MockWidget extends Widget {
  constructor(data: any = {}) {
    super({ ...data });
  }
  mount() {}
  paint() {}
}
WidgetRegistry.registerType('MockWidget', MockWidget);

// 模拟 Canvas2DRenderer
const mockRenderer = {
  initialize: vi.fn().mockResolvedValue(undefined),
  destroy: vi.fn(),
  render: vi.fn(),
  drawRect: vi.fn(),
  save: vi.fn(),
  restore: vi.fn(),
  transform: vi.fn(),
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
      }),
      focus: vi.fn(),
      tabIndex: -1,
    },
  }),
  update: vi.fn(),
};

// 模拟 Runtime 以使用我们的 renderer
vi.mock('@/runtime', async (importOriginal) => {
  const actual = (await importOriginal()) as any;
  return {
    default: class MockRuntime extends actual.default {
      createRenderer() {
        return mockRenderer;
      }
    },
  };
});

class TestViewport extends StatelessWidget {
  constructor(data: any = {}) {
    super({ ...data });
  }

  onKeyDown = vi.fn((e) => {
    testLogger.log('TestViewport received keydown');
    return true;
  });

  protected render() {
    return new MockWidget();
  }
}

class TestRoot extends StatelessWidget {
  constructor() {
    super({});
  }

  private getViewport() {
    return findWidget(this, `#${CustomComponentType.MindMapViewport}`) as TestViewport | null;
  }

  onKeyDown(e: any) {
    const vp = this.getViewport();
    if (vp) {
      return vp.onKeyDown(e);
    }
  }

  protected render() {
    return <TestViewport key={CustomComponentType.MindMapViewport} />;
  }
}

describe('键盘事件派发集成测试', () => {
  let container: HTMLElement;
  let canvas: HTMLCanvasElement;
  let runtime: Runtime;

  beforeEach(async () => {
    container = document.createElement('div');
    container.id = 'test-container';
    document.body.appendChild(container);

    // 手动创建 canvas 并追加，确保其存在以供绑定
    canvas = document.createElement('canvas');
    container.appendChild(canvas);

    // 覆盖模拟 renderer 以返回此特定 canvas
    mockRenderer.getRawInstance = () => ({ canvas }) as any;

    runtime = await Runtime.create('test-container', { renderer: 'canvas2d' });
    (runtime as any).canvasId = 'test-canvas-id';
    Runtime.canvasRegistry.set('test-canvas-id', {
      canvas,
      runtime,
      container,
    });
  });

  afterEach(() => {
    if (runtime) {
      runtime.destroy();
    }
    document.body.innerHTML = '';
    vi.clearAllMocks();
  });

  it('应通过 Root 将 keydown 事件从 DOM 派发到 Viewport', async () => {
    // 1. 渲染树
    const root = new TestRoot();
    (runtime as any).rootWidget = root;
    root.runtime = runtime;
    root.createElement({});

    // 强制绑定 (通常在 initRenderer 中发生)
    EventManager.bind(runtime);

    // 2. 验证绑定
    expect(canvas.tabIndex).toBe(0);

    // 3. 在 Canvas 上派发事件 (模拟聚焦 + 按键)
    // 注意: 在 jsdom 中，我们在元素上派发。
    const event = new KeyboardEvent('keydown', {
      key: 'Delete',
      code: 'Delete',
      bubbles: true,
      cancelable: true,
    });

    // 我们必须在 CANVAS 或 CONTAINER 上派发。
    // Manager 绑定到 CONTAINER。
    // 假设用户聚焦 canvas (点击) 然后输入。
    // 事件冒泡: Canvas -> Container。

    testLogger.log('Dispatching event on canvas...');
    canvas.dispatchEvent(event);

    // 4. 检查结果
    const vp = findWidget(root, `#${CustomComponentType.MindMapViewport}`) as TestViewport;
    expect(vp).toBeDefined();
    expect(vp.onKeyDown).toHaveBeenCalled();
  });

  it('如果目标是可编辑输入框，则不应派发 keydown 事件', async () => {
    // 1. 渲染树
    const root = new TestRoot();
    (runtime as any).rootWidget = root;
    root.runtime = runtime;
    root.createElement({});

    // 强制绑定
    EventManager.bind(runtime);

    // 2. 在容器内创建一个 input 元素
    const input = document.createElement('input');
    container.appendChild(input);

    // 3. 在 input 上派发事件
    const event = new KeyboardEvent('keydown', {
      key: 'Delete',
      code: 'Delete',
      bubbles: true,
      cancelable: true,
    });

    input.dispatchEvent(event);

    // 4. 检查结果
    const vp = findWidget(root, `#${CustomComponentType.MindMapViewport}`) as TestViewport;
    expect(vp).toBeDefined();
    expect(vp.onKeyDown).not.toHaveBeenCalled();
  });
});
