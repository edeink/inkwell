import { describe, expect, it, vi } from 'vitest';

import { ScrollView } from '../scroll-view';

import { dispatchToTree } from '@/core/events';

// 模拟 InkwellEvent
function createMockEvent(type: string, props: any = {}) {
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
      preventDefault: vi.fn(),
      ...props,
    },
    ...props,
  } as any;
  return e as any;
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

  it('当内部 ScrollView 开启回弹且到达边界时，不应消费事件', () => {
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

    const mockEvent = createMockEvent('wheel', {
      deltaX: 0,
      deltaY: 10,
      preventDefault: vi.fn(),
    });
    const stopPropagationSpy = vi.spyOn(mockEvent, 'stopPropagation');

    // 滚动到底部
    innerScrollView.scrollTo(0, 50);
    stopPropagationSpy.mockClear();

    // 再次向下滚动
    innerScrollView.onWheel(mockEvent);

    expect(stopPropagationSpy).not.toHaveBeenCalled();
    // @ts-expect-error 访问私有属性验证状态
    expect(innerScrollView._scrollY).toBe(50);
    expect((mockEvent.nativeEvent as any).preventDefault).not.toHaveBeenCalled();
  });

  it('嵌套场景：内层到底后应让外层消费并阻止默认滚动', () => {
    const outer = new ScrollView({
      type: 'ScrollView',
      enableBounce: false,
      width: 100,
      height: 100,
    });
    const inner = new ScrollView({
      type: 'ScrollView',
      enableBounce: true,
      width: 100,
      height: 50,
    });

    (outer as any).children = [inner];
    inner.parent = outer;

    (outer as any)._contentSize = { width: 100, height: 300 };
    (outer as any)._width = 100;
    (outer as any)._height = 100;

    (inner as any)._contentSize = { width: 100, height: 200 };
    (inner as any)._width = 100;
    (inner as any)._height = 50;

    inner.scrollTo(0, 150);
    outer.scrollTo(0, 0);

    const native = { deltaX: 0, deltaY: 20, preventDefault: vi.fn() } as any;
    dispatchToTree(outer as any, inner as any, 'wheel' as any, 0, 0, native);
    expect(native.preventDefault).toHaveBeenCalled();
    expect(outer.scrollY).toBeGreaterThan(0);
    expect(inner.scrollY).toBe(150);
  });

  it('DOM 互操作：所有 ScrollView 都无法继续滚动时不应阻止默认滚动', () => {
    const outer = new ScrollView({
      type: 'ScrollView',
      enableBounce: true,
      width: 100,
      height: 100,
    });
    const inner = new ScrollView({
      type: 'ScrollView',
      enableBounce: true,
      width: 100,
      height: 50,
    });

    (outer as any).children = [inner];
    inner.parent = outer;

    (outer as any)._contentSize = { width: 100, height: 300 };
    (outer as any)._width = 100;
    (outer as any)._height = 100;

    (inner as any)._contentSize = { width: 100, height: 200 };
    (inner as any)._width = 100;
    (inner as any)._height = 50;

    inner.scrollTo(0, 150);
    outer.scrollTo(0, 200);

    const native = { deltaX: 0, deltaY: 20, preventDefault: vi.fn() } as any;
    dispatchToTree(outer as any, inner as any, 'wheel' as any, 0, 0, native);
    expect(native.preventDefault).not.toHaveBeenCalled();
    expect(outer.scrollY).toBe(200);
    expect(inner.scrollY).toBe(150);
  });

  it('DOM 互操作：自下而上滚动到顶后应允许交给 DOM 默认滚动', () => {
    const outer = new ScrollView({
      type: 'ScrollView',
      enableBounce: true,
      width: 100,
      height: 100,
    });
    const inner = new ScrollView({
      type: 'ScrollView',
      enableBounce: true,
      width: 100,
      height: 50,
    });

    (outer as any).children = [inner];
    inner.parent = outer;

    (outer as any)._contentSize = { width: 100, height: 300 };
    (outer as any)._width = 100;
    (outer as any)._height = 100;

    (inner as any)._contentSize = { width: 100, height: 200 };
    (inner as any)._width = 100;
    (inner as any)._height = 50;

    inner.scrollTo(0, 0);
    outer.scrollTo(0, 0);

    const native = { deltaX: 0, deltaY: -20, preventDefault: vi.fn() } as any;
    dispatchToTree(outer as any, inner as any, 'wheel' as any, 0, 0, native);
    expect(native.preventDefault).not.toHaveBeenCalled();
    expect(outer.scrollY).toBe(0);
    expect(inner.scrollY).toBe(0);
  });

  it('不同方向嵌套：内层可滚动时外层不应收到滚动', () => {
    const outer = new ScrollView({
      type: 'ScrollView',
      enableBounce: false,
      width: 100,
      height: 100,
    });
    const inner = new ScrollView({
      type: 'ScrollView',
      enableBounce: false,
      width: 100,
      height: 50,
    });

    (outer as any).children = [inner];
    inner.parent = outer;

    (outer as any)._contentSize = { width: 100, height: 300 };
    (outer as any)._width = 100;
    (outer as any)._height = 100;

    (inner as any)._contentSize = { width: 300, height: 50 };
    (inner as any)._width = 100;
    (inner as any)._height = 50;

    inner.scrollTo(0, 0);
    outer.scrollTo(0, 0);

    const native = { deltaX: 20, deltaY: 10, preventDefault: vi.fn() } as any;
    dispatchToTree(outer as any, inner as any, 'wheel' as any, 0, 0, native);
    expect(inner.scrollX).toBeGreaterThan(0);
    expect(outer.scrollY).toBe(0);
    expect(native.preventDefault).toHaveBeenCalled();
  });
});
