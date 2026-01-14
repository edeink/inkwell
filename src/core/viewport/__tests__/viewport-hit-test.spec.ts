import { describe, expect, it, vi } from 'vitest';

import { Container } from '../../container';
import { WidgetRegistry } from '../../registry';
import { ScrollView } from '../scroll-view';

import type { BuildContext } from '../../type';

// 注册组件
WidgetRegistry.registerType('ScrollView', ScrollView);
WidgetRegistry.registerType('Container', Container);

const mockContext: BuildContext = {
  renderer: {
    save: vi.fn(),
    restore: vi.fn(),
    transform: vi.fn(),
    translate: vi.fn(),
    scale: vi.fn(),
    drawRect: vi.fn(), // 添加 drawRect
    fillRect: vi.fn(), // 可能需要
    strokeRect: vi.fn(), // 可能需要
    clipRect: vi.fn(), // 添加 clipRect
    getRawInstance: vi.fn(() => ({
      beginPath: vi.fn(),
      rect: vi.fn(),
      clip: vi.fn(),
    })),
  } as any,
  worldMatrix: [1, 0, 0, 1, 0, 0],
};

describe('ScrollView 坐标与命中测试', () => {
  it('滚动时子组件应具有正确的绝对位置', () => {
    const child = new Container({
      type: 'Container',
      width: 100,
      height: 300, // 增加高度以允许滚动
      pointerEvent: 'auto', // 重要：Container 默认为 'none'
    });

    const scrollView = new ScrollView({
      type: 'ScrollView',
      width: 200,
      height: 200,
    });

    // 为测试环境手动链接父子关系
    // 使用 any 转换以绕过测试中潜在的 readonly/protected 问题
    (scrollView as any).children = [child];
    child.parent = scrollView;
    (scrollView as any).owner = {
      scheduleLayoutFor: vi.fn(),
      requestVisualUpdate: vi.fn(),
    };

    // 初始布局
    scrollView.layout({ minWidth: 0, maxWidth: 200, minHeight: 0, maxHeight: 200 });
    // 初始绘制以更新矩阵
    scrollView.paint(mockContext);

    // 验证子组件布局已发生
    expect(child.renderObject.size).toEqual({ width: 100, height: 300 });

    // 检查初始位置
    // 视口在 (0,0)（相对于未知父级，但偏移默认为 0,0）
    expect(scrollView.renderObject.offset).toEqual({ dx: 0, dy: 0 });
    expect(child.renderObject.offset).toEqual({ dx: -0, dy: -0 });

    const initialPos = child.getAbsolutePosition();
    expect(initialPos).toEqual({ dx: 0, dy: 0 });

    // 滚动
    scrollView.scrollBy(0, 50); // 向下滚动 50px (内容向上移动)

    // 重新布局 (通常由框架触发，此处手动触发)
    scrollView.layout({ minWidth: 0, maxWidth: 200, minHeight: 0, maxHeight: 200 });
    // 重新绘制以更新矩阵
    scrollView.paint(mockContext);

    const scrolledPos = child.getAbsolutePosition();
    // 子组件偏移应为 (0, -50)
    expect(child.renderObject.offset.dy).toBe(-50);
    // 绝对位置应为 (0, -50) + (0, 0) = (0, -50)
    expect(scrolledPos).toEqual({ dx: 0, dy: -50 });
  });

  it('滚动时命中测试应正确工作', () => {
    const child = new Container({
      type: 'Container',
      width: 100,
      height: 100,
      // 添加已知属性或 key 以验证命中
      key: 'target-child',
      pointerEvent: 'auto', // 重要：Container 默认为 'none'
    });

    const scrollView = new ScrollView({
      type: 'ScrollView',
      width: 200,
      height: 200,
      child,
    });

    // 为测试环境手动链接父子关系
    // 使用 any 转换以绕过测试中潜在的 readonly/protected 问题
    (scrollView as any).children = [child];
    child.parent = scrollView;
    (scrollView as any).owner = {
      scheduleLayoutFor: vi.fn(),
      requestVisualUpdate: vi.fn(),
    };

    scrollView.layout({ minWidth: 0, maxWidth: 200, minHeight: 0, maxHeight: 200 });
    scrollView.paint(mockContext);

    // 1. 在 (10, 10) 处进行命中测试 -> 应命中子组件
    let hit = scrollView.visitHitTest(10, 10);
    expect(hit).toBe(child);

    // 2. 滚动
    scrollView.scrollBy(0, 50); // 内容上移 50。子组件在 (0, -50)。
    scrollView.layout({ minWidth: 0, maxWidth: 200, minHeight: 0, maxHeight: 200 });
    scrollView.paint(mockContext);

    // 3. 在 (10, 10) 处进行命中测试 -> 应仍然命中子组件 (10 >= -50 && 10 <= 50)
    hit = scrollView.visitHitTest(10, 10);
    expect(hit).toBe(child);

    // 4. 在 (150, 60) 处进行命中测试 -> 不应命中子组件 (子组件宽 100)
    // 子组件 x 范围: [0, 100]. 点 x=150 在子组件外。
    // 在 Viewport (200x200) 内。
    hit = scrollView.visitHitTest(150, 60);
    // 应命中 ScrollView 本身
    expect(hit).toBe(scrollView);
  });
});
