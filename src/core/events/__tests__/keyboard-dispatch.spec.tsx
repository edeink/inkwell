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
    super({ ...data, type: 'MockWidget' });
  }
  mount() {}
  paint() {}
}
WidgetRegistry.registerType('MockWidget', MockWidget);

// Mock Canvas2DRenderer
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

// Mock Runtime to use our renderer
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
    super({ ...data, type: 'TestViewport' });
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
    super({ type: 'TestRoot' });
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

describe('Keyboard Event Dispatch Integration', () => {
  let container: HTMLElement;
  let canvas: HTMLCanvasElement;
  let runtime: Runtime;

  beforeEach(async () => {
    container = document.createElement('div');
    container.id = 'test-container';
    document.body.appendChild(container);

    // Manually create canvas and append to ensure it exists for binding
    canvas = document.createElement('canvas');
    container.appendChild(canvas);

    // Override mock renderer to return this specific canvas
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

  it('should dispatch keydown event from DOM to Viewport via Root', async () => {
    // 1. Render the tree
    const root = new TestRoot();
    (runtime as any).rootWidget = root;
    root.runtime = runtime;
    root.createElement({});

    // Force binding (usually happens in initRenderer)
    EventManager.bind(runtime);

    // 2. Verify binding
    expect(canvas.tabIndex).toBe(0);

    // 3. Dispatch event on Canvas (simulating focus + key press)
    // Note: In jsdom, we dispatch on the element.
    const event = new KeyboardEvent('keydown', {
      key: 'Delete',
      code: 'Delete',
      bubbles: true,
      cancelable: true,
    });

    // We must dispatch on the CANVAS or CONTAINER.
    // Manager binds to CONTAINER.
    // Let's assume user focuses canvas (click) then types.
    // Event bubbles: Canvas -> Container.

    testLogger.log('Dispatching event on canvas...');
    canvas.dispatchEvent(event);

    // 4. Check results
    const vp = findWidget(root, `#${CustomComponentType.MindMapViewport}`) as TestViewport;
    expect(vp).toBeDefined();
    expect(vp.onKeyDown).toHaveBeenCalled();
  });

  it('should NOT dispatch keydown event if target is an editable input', async () => {
    // 1. Render the tree
    const root = new TestRoot();
    (runtime as any).rootWidget = root;
    root.runtime = runtime;
    root.createElement({});

    // Force binding
    EventManager.bind(runtime);

    // 2. Create an input element inside container
    const input = document.createElement('input');
    container.appendChild(input);

    // 3. Dispatch event on input
    const event = new KeyboardEvent('keydown', {
      key: 'Delete',
      code: 'Delete',
      bubbles: true,
      cancelable: true,
    });

    input.dispatchEvent(event);

    // 4. Check results
    const vp = findWidget(root, `#${CustomComponentType.MindMapViewport}`) as TestViewport;
    expect(vp).toBeDefined();
    expect(vp.onKeyDown).not.toHaveBeenCalled();
  });
});
