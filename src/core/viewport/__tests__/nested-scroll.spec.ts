import { describe, expect, it, vi } from 'vitest';

import { ScrollView } from '../scroll-view';

import type { InkwellEvent } from '@/core';

// 模拟 InkwellEvent
function createMockEvent(type: string, props: any = {}): InkwellEvent {
  const e = {
    type,
    target: null,
    currentTarget: null,
    bubbles: true,
    cancelable: true,
    propagationStopped: false,
    stopPropagation: () => {
      e.propagationStopped = true;
    },
    nativeEvent: {
      pointerType: 'mouse',
      ...props,
    },
    ...props,
  } as unknown as InkwellEvent;
  return e;
}

// 辅助函数：创建测试视图层级
// 外部 ScrollView -> 内部 ScrollView -> 内容
describe('嵌套 ScrollView', () => {
  it('当内部 ScrollView 未开启回弹且到达边界时，应允许事件冒泡触发外部滚动', () => {
    // 模拟场景：
    // 外部：高度 100，内容 200
    // 内部：高度 50，内容 100

    // 我们直接测试 processScroll 的返回值和 stopPropagation 的调用

    // 1. 创建 Inner ScrollView
    const innerScrollView = new ScrollView({
      type: 'ScrollView',
      enableBounce: false,
      width: 100,
      height: 50,
    });

    // 模拟 layout，设置 contentSize
    // @ts-expect-error 访问私有属性用于测试设置
    innerScrollView._contentSize = { width: 100, height: 100 };
    // @ts-expect-error 访问私有属性用于测试设置
    innerScrollView._width = 100;
    // @ts-expect-error 访问私有属性用于测试设置
    innerScrollView._height = 50;

    // 2. 模拟滚轮事件
    const mockEvent = createMockEvent('wheel', { deltaX: 0, deltaY: 10 });
    const stopPropagationSpy = vi.spyOn(mockEvent, 'stopPropagation');

    // 场景 1：正常滚动（未到底）
    // 初始 scrollY = 0
    innerScrollView.onWheel(mockEvent);

    // 期望：消费事件，停止冒泡
    expect(stopPropagationSpy).toHaveBeenCalled();
    // @ts-expect-error 访问私有属性验证状态
    expect(innerScrollView._scrollY).toBe(10);

    // 场景 2：滚动到底部边界
    // 最大纵向滚动距离 = 100 - 50 = 50
    innerScrollView.scrollTo(0, 50);
    stopPropagationSpy.mockClear();

    // 再次向下滚动
    innerScrollView.onWheel(mockEvent);

    // 期望：不消费事件（processScroll 返回 false），不停止冒泡
    // 因为 enableBounce = false，且已达边界，无法继续滚动
    expect(stopPropagationSpy).not.toHaveBeenCalled();
    // @ts-expect-error 访问私有属性验证状态
    expect(innerScrollView._scrollY).toBe(50); // 保持在 50
  });

  it('当内部 ScrollView 开启回弹时，总是消费事件，阻止冒泡', () => {
    const innerScrollView = new ScrollView({
      type: 'ScrollView',
      enableBounce: true,
      width: 100,
      height: 50,
    });

    // @ts-expect-error 访问私有属性用于测试设置
    innerScrollView._contentSize = { width: 100, height: 100 };
    // @ts-expect-error 访问私有属性用于测试设置
    innerScrollView._width = 100;
    // @ts-expect-error 访问私有属性用于测试设置
    innerScrollView._height = 50;

    const mockEvent = createMockEvent('wheel', { deltaX: 0, deltaY: 10 });
    const stopPropagationSpy = vi.spyOn(mockEvent, 'stopPropagation');

    // 滚动到底部
    innerScrollView.scrollTo(0, 50);
    stopPropagationSpy.mockClear();

    // 再次向下滚动
    innerScrollView.onWheel(mockEvent);

    // 期望：消费事件（触发回弹逻辑），停止冒泡
    expect(stopPropagationSpy).toHaveBeenCalled();
    // @ts-expect-error 访问私有属性验证状态
    // 纵向滚动位置应增加（应用了阻尼）
    expect(innerScrollView._scrollY).toBeGreaterThan(50);
  });
});
