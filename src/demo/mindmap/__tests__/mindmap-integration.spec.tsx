/** @jsxImportSource @/utils/compiler */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { MindmapDemo } from '../widgets/mindmap-demo';

import { EventManager } from '@/core/events/manager';
import Runtime from '@/runtime';

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

// Mock Runtime
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

describe('Mindmap Integration Event Flow', () => {
  let container: HTMLElement;
  let canvas: HTMLCanvasElement;
  let runtime: Runtime;

  beforeEach(async () => {
    container = document.createElement('div');
    container.id = 'integration-container';
    document.body.appendChild(container);

    canvas = document.createElement('canvas');
    container.appendChild(canvas);

    mockRenderer.getRawInstance = () => ({ canvas }) as any;

    runtime = await Runtime.create('integration-container', { renderer: 'canvas2d' });
    (runtime as any).canvasId = 'integration-canvas-id';
    Runtime.canvasRegistry.set('integration-canvas-id', {
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

  it('should propagate Delete key from Canvas to MindMapViewport', async () => {
    // 1. Setup MindmapDemo
    const demo = new MindmapDemo({ type: 'MindmapDemo', width: 800, height: 600 });
    (runtime as any).rootWidget = demo;
    demo.runtime = runtime;

    // Mock getViewport to return a mock Viewport
    const mockViewport = {
      onKeyDown: vi.fn(),
    };
    (demo as any).getViewport = vi.fn().mockReturnValue(mockViewport);

    const onKeyDownSpy = vi.spyOn(demo, 'onKeyDown');

    // Force binding
    EventManager.bind(runtime);
    expect(canvas.tabIndex).toBe(0);

    // 2. Dispatch Event
    const event = new KeyboardEvent('keydown', {
      key: 'Delete',
      code: 'Delete',
      bubbles: true,
      cancelable: true,
    });
    canvas.dispatchEvent(event);

    // 3. Verify Demo received it
    expect(onKeyDownSpy).toHaveBeenCalled();

    // 4. Verify Viewport received it
    expect(mockViewport.onKeyDown).toHaveBeenCalled();
  });
});
