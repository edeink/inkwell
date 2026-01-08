import { beforeEach, describe, expect, it, vi } from 'vitest';

import { SizedBox, Stack } from '../../../core';

import { createPipelineDomNodes } from './dom';
import { buildPipelineWidgetScene } from './widget';

// Mock Runtime
const mockRender = vi.fn();
vi.mock('../../../runtime', () => {
  return {
    default: class Runtime {
      render(element: any) {
        mockRender(element);
      }
    },
  };
});

// Mock measureNextPaint
vi.mock('../../metrics/collector', () => ({
  measureNextPaint: vi.fn().mockResolvedValue(10),
}));

describe('Pipeline Benchmark', () => {
  let stage: HTMLElement;

  beforeEach(() => {
    document.body.innerHTML = '';
    stage = document.createElement('div');
    stage.style.width = '800px';
    stage.style.height = '600px';
    document.body.appendChild(stage);
    mockRender.mockClear();
  });

  describe('DOM Implementation', () => {
    it('should use replaceChild to update nodes', async () => {
      const replaceChildSpy = vi.spyOn(HTMLElement.prototype, 'replaceChild');

      await createPipelineDomNodes(stage, 10);

      // Verify replaceChild was called count times
      expect(replaceChildSpy).toHaveBeenCalledTimes(10);

      // Verify structure
      const root = stage.firstElementChild as HTMLElement;
      expect(root).toBeTruthy();
      expect(root.children.length).toBe(10);

      // Verify second div visibility (it should be attached)
      const secondDiv = root.children[1] as HTMLElement;
      expect(secondDiv).toBeTruthy();
      expect(secondDiv.tagName).toBe('DIV');
      expect(secondDiv.style.display).not.toBe('none');

      replaceChildSpy.mockRestore();
    });

    it('should not accumulate nodes during multiple calls', async () => {
      // First call
      await createPipelineDomNodes(stage, 10);
      expect(stage.children.length).toBe(1);
      expect((stage.firstElementChild as HTMLElement).children.length).toBe(10);

      // Second call
      await createPipelineDomNodes(stage, 5);
      expect(stage.children.length).toBe(1); // Should still be 1, not 2
      expect((stage.firstElementChild as HTMLElement).children.length).toBe(5);
    });
  });

  describe('Widget Implementation', () => {
    it('should wrap Stack in SizedBox for fixed layout', async () => {
      // Mock Runtime instance
      const runtimeMock = {
        render: vi.fn(),
      } as any;

      await buildPipelineWidgetScene(stage, runtimeMock, 5);

      // Check what was rendered
      expect(runtimeMock.render).toHaveBeenCalled();
      const renderedTree = runtimeMock.render.mock.calls[0][0]; // The root widget

      // Verify it is SizedBox
      expect(renderedTree.type).toBe(SizedBox);
      expect(renderedTree.props.width).toBe(800); // stage width
      expect(renderedTree.props.height).toBe(600);

      // Verify child is Stack
      const stack = renderedTree.props.children;
      expect(stack.type).toBe(Stack);
    });
  });
});
