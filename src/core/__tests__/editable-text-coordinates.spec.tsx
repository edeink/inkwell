import { beforeAll, describe, expect, it, vi } from 'vitest';

import { EditableText } from '../editable-text';

// 模拟 Canvas
beforeAll(() => {
  if (typeof HTMLCanvasElement !== 'undefined' && !HTMLCanvasElement.prototype.getContext) {
    HTMLCanvasElement.prototype.getContext = vi.fn(() => ({
      measureText: (text: string) => ({ width: text.length * 10 }), // 模拟宽度：每个字符 10px
      font: '',
    })) as any;
  }
});

describe('EditableText 坐标与视觉修复', () => {
  it('应正确调整带有空格的 rgba 选择颜色的不透明度', () => {
    const editable = new EditableText({
      type: 'EditableText',
      value: 'test',
      selectionColor: 'rgba(22, 119, 255, 0.2)', // 包含空格
    });

    // 通过 any 访问私有方法
    const result = (editable as any).adjustColorOpacity('rgba(22, 119, 255, 0.2)', 0.5);
    expect(result).toBe('rgba(22, 119, 255, 0.1)');
  });

  it('在没有 getViewState 的情况下应正确计算局部坐标点', () => {
    const editable = new EditableText({
      type: 'EditableText',
      value: 'test',
    });

    // 模拟父级结构以进行 getLocalPoint 遍历
    (editable as any).renderObject = {
      offset: { dx: 10, dy: 10 }, // 相对父级的偏移
      size: { width: 100, height: 20 },
    };

    // 模拟父级以立即停止遍历或返回 null
    (editable as any).parent = null;

    const event = { x: 50, y: 50, stopPropagation: vi.fn() } as any;

    // 调用 getLocalPoint
    const pt = (editable as any).getLocalPoint(event);

    // 如果没有 viewState，应默认为缩放 1，tx 0，ty 0
    // worldX = 50, worldY = 50
    // absX = 10, absY = 10 (来自 renderObject)
    // 结果 = 40, 40
    expect(pt).not.toBeNull();
    expect(pt?.x).toBe(40);
    expect(pt?.y).toBe(40);
  });

  it('在没有 getViewState 的情况下应正确计算屏幕矩形', () => {
    const editable = new EditableText({
      type: 'EditableText',
      value: 'test',
    });

    // 模拟 Runtime 容器
    const mockContainer = {
      getBoundingClientRect: () => ({ left: 100, top: 100 }),
    };
    (editable as any).runtime = { container: mockContainer };

    (editable as any).renderObject = {
      offset: { dx: 10, dy: 10 },
      size: { width: 100, height: 20 },
    };
    // 模拟父级以确保检查通过
    (editable as any).parent = { parent: null };

    const rect = (editable as any).getWidgetScreenRect();

    expect(rect).not.toBeNull();
    // left: container(100) + offset(10) = 110
    expect(rect?.left).toBe(110);
    // top: container(100) + offset(10) = 110
    expect(rect?.top).toBe(110);
    // width: 100 * scale(1) = 100
    expect(rect?.width).toBe(100);
  });

  it('应正确更新输入框位置', () => {
    const editable = new EditableText({
      type: 'EditableText',
      value: 'test',
    });

    // 模拟内部方法
    const mockRect = { left: 110, top: 110, width: 100, height: 20, inputTop: 130 };
    (editable as any).getWidgetScreenRect = () => mockRect;

    // 确保 input 存在
    if (!(editable as any).input) {
      (editable as any).createHiddenInput();
    }
    const input = (editable as any).input;

    (editable as any).updateInputPosition();

    expect(input.style.left).toBe('110px');
    expect(input.style.top).toBe('130px');
    expect(input.style.width).toBe('100px');
  });
});
