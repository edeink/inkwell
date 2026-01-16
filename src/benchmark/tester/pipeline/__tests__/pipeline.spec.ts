import { beforeEach, describe, expect, it, vi } from 'vitest';

import { SizedBox, Stack } from '../../../../core';
import { createPipelineDomNodes } from '../dom';
import { buildPipelineWidgetScene } from '../widget';

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

describe('Pipeline 基准测试', () => {
  let stage: HTMLElement;

  beforeEach(() => {
    document.body.innerHTML = '';
    stage = document.createElement('div');
    stage.style.width = '800px';
    stage.style.height = '600px';
    document.body.appendChild(stage);
    mockRender.mockClear();
  });

  describe('DOM 实现', () => {
    it('应正确创建节点', async () => {
      // 这里的 DOM 实现已简化为直接 appendChild，不再使用 replaceChild
      // const replaceChildSpy = vi.spyOn(HTMLElement.prototype, 'replaceChild');

      await createPipelineDomNodes(stage, 10, 1);

      // 验证 replaceChild 被调用了 count 次
      // expect(replaceChildSpy).toHaveBeenCalledTimes(10);

      // 验证结构
      const root = stage.firstElementChild as HTMLElement;
      expect(root).toBeTruthy();
      expect(root.children.length).toBe(10);

      // 验证第二个 div 的可见性 (应该已附加)
      const secondDiv = root.children[1] as HTMLElement;
      expect(secondDiv).toBeTruthy();
      expect(secondDiv.tagName).toBe('DIV');
      expect(secondDiv.style.display).not.toBe('none');

      // replaceChildSpy.mockRestore();
    });

    it('不应在多次调用中累积节点', async () => {
      // 第一次调用
      await createPipelineDomNodes(stage, 10, 1);
      expect(stage.children.length).toBe(1);
      expect((stage.firstElementChild as HTMLElement).children.length).toBe(10);

      // 第二次调用
      await createPipelineDomNodes(stage, 5, 1);
      expect(stage.children.length).toBe(1); // 应该仍然是 1，而不是 2
      expect((stage.firstElementChild as HTMLElement).children.length).toBe(5);
    });

    it('每一帧都应重建节点树', async () => {
      const raf = vi
        .spyOn(globalThis, 'requestAnimationFrame')
        .mockImplementation((cb: FrameRequestCallback) => {
          cb(performance.now());
          return 0;
        });
      const replace = vi.spyOn(stage, 'replaceChildren');

      await createPipelineDomNodes(stage, 10, 3);

      expect(replace).toHaveBeenCalledTimes(3);
      expect(stage.children.length).toBe(1);
      expect((stage.firstElementChild as HTMLElement).children.length).toBe(10);

      replace.mockRestore();
      raf.mockRestore();
    });
  });

  describe('Widget 实现', () => {
    it('应将 Stack 包裹在 SizedBox 中以进行固定布局', async () => {
      // 模拟 Runtime 实例
      const runtimeMock = {
        render: vi.fn(),
      } as any;

      await buildPipelineWidgetScene(stage, runtimeMock, 5, 1);

      // 检查渲染内容
      expect(runtimeMock.render).toHaveBeenCalled();
      const renderedTree = runtimeMock.render.mock.calls[0][0]; // 根组件

      // 验证它是 SizedBox
      expect(renderedTree.type).toBe(SizedBox);
      expect(renderedTree.props.width).toBe(800); // 舞台宽度
      expect(renderedTree.props.height).toBe(600);

      // 验证子组件是 Stack
      const stack = renderedTree.props.children;
      expect(stack.type).toBe(Stack);
    });
  });
});
