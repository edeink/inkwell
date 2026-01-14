import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { ScrollBar, type ScrollBarProps } from '../scroll-bar';

describe('ScrollBar', () => {
  // 辅助类，暴露受保护的方法和属性
  class TestScrollBar extends ScrollBar {
    public get currentThickness() {
      // @ts-ignore
      return this._currentThickness;
    }

    public get currentColor() {
      // @ts-ignore
      return this._currentColor;
    }

    public get isHovering() {
      // @ts-ignore
      return this._isHovering;
    }

    public get isDragging() {
      // @ts-ignore
      return this._isDragging;
    }

    public callGetThumbRect() {
      // @ts-ignore
      return this.getThumbRect();
    }

    public callGetTargetColor() {
      // @ts-ignore
      return this.getTargetColor();
    }

    public callHandleWindowMove(e: PointerEvent) {
      // @ts-ignore
      this._handleWindowMove(e);
    }

    public callHandleWindowUp(e: PointerEvent) {
      // @ts-ignore
      this._handleWindowUp(e);
    }

    // 辅助方法，用于模拟布局尺寸，因为 renderObject 是公开的但通常由父级设置
    public setSize(width: number, height: number) {
      this.renderObject.size = { width, height };
    }
  }

  beforeEach(() => {
    // 模拟 window 方法
    vi.spyOn(window, 'addEventListener');
    vi.spyOn(window, 'removeEventListener');
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('应当正确初始化', () => {
    const props: ScrollBarProps = {
      type: 'ScrollBar',
      orientation: 'vertical',
      viewportSize: 100,
      contentSize: 200,
      scrollPosition: 0,
      thickness: 8,
    };
    const sb = new TestScrollBar(props);

    expect(sb.currentThickness).toBe(8);
    expect(sb.isHovering).toBe(false);
    expect(sb.isDragging).toBe(false);
  });

  it('应当正确计算滑块位置和尺寸', () => {
    const props: ScrollBarProps = {
      type: 'ScrollBar',
      orientation: 'vertical',
      viewportSize: 100,
      contentSize: 400, // 4倍内容
      scrollPosition: 0,
    };
    const sb = new TestScrollBar(props);
    sb.setSize(10, 100); // 轨道高度 100

    // 比例 = 100 / 400 = 0.25. 滑块长度 = 100 * 0.25 = 25.
    let rect = sb.callGetThumbRect();
    expect(rect).toEqual({
      x: 0,
      y: 0,
      width: 10,
      height: 25,
    });

    // 滚动到中间
    // 最大滚动 = 300.
    // 滚动 150 (50%)
    sb.data.scrollPosition = 150;
    rect = sb.callGetThumbRect();
    // 轨道可滚动区域 = 100 - 25 = 75.
    // 位置 = 0.5 * 75 = 37.5
    expect(rect?.y).toBeCloseTo(37.5);

    // 滚动到底部
    sb.data.scrollPosition = 300;
    rect = sb.callGetThumbRect();
    expect(rect?.y).toBeCloseTo(75);
  });

  it('内容不足时不应显示滑块', () => {
    const props: ScrollBarProps = {
      type: 'ScrollBar',
      orientation: 'vertical',
      viewportSize: 100,
      contentSize: 50,
      scrollPosition: 0,
    };
    const sb = new TestScrollBar(props);
    sb.setSize(10, 100);

    const rect = sb.callGetThumbRect();
    expect(rect).toBeNull();
  });

  it('应当响应指针事件并更新状态', () => {
    const props: ScrollBarProps = {
      type: 'ScrollBar',
      orientation: 'vertical',
      viewportSize: 100,
      contentSize: 200,
      scrollPosition: 0,
      onDragStart: vi.fn(),
      onDragEnd: vi.fn(),
    };
    const sb = new TestScrollBar(props);
    sb.setSize(10, 100);

    // 模拟事件
    const mockEvent = {
      nativeEvent: { clientX: 0, clientY: 0 } as PointerEvent,
      stopPropagation: vi.fn(),
    } as any;

    // 指针移动 (悬停)
    sb.onPointerMove(mockEvent);
    expect(sb.isHovering).toBe(true);
    expect(mockEvent.stopPropagation).toHaveBeenCalled();

    // 指针离开
    sb.onPointerLeave(mockEvent);
    expect(sb.isHovering).toBe(false);

    // 指针按下 (开始拖拽)
    sb.onPointerDown(mockEvent);
    expect(sb.isDragging).toBe(true);
    expect(props.onDragStart).toHaveBeenCalled();
    expect(window.addEventListener).toHaveBeenCalledWith('pointermove', expect.any(Function));
    expect(window.addEventListener).toHaveBeenCalledWith('pointerup', expect.any(Function));
  });

  it('应当通过 window 事件处理拖拽滚动', () => {
    const onScroll = vi.fn();
    const props: ScrollBarProps = {
      type: 'ScrollBar',
      orientation: 'vertical',
      viewportSize: 100,
      contentSize: 200, // 比例 0.5
      scrollPosition: 0,
      onScroll,
    };
    const sb = new TestScrollBar(props);
    sb.setSize(10, 100); // 轨道 100. 滑块 50. 可滚动轨道 50.
    // 内容可滚动 100.
    // 比例: 1px 轨道 = 2px 内容.

    // 在 Y=10 处开始拖拽
    const downEvent = {
      nativeEvent: { clientX: 0, clientY: 10 } as PointerEvent,
      stopPropagation: vi.fn(),
    } as any;
    sb.onPointerDown(downEvent);

    // 移动 Y 到 20 (增量 +10)
    // 应当滚动 +20
    const moveEvent = { clientX: 0, clientY: 20 } as PointerEvent;
    sb.callHandleWindowMove(moveEvent);

    expect(onScroll).toHaveBeenCalledWith(20);

    // 移动 Y 到 0 (从开始处增量 -10)
    // 应当滚动 -20
    const moveEvent2 = { clientX: 0, clientY: 0 } as PointerEvent;
    sb.callHandleWindowMove(moveEvent2);

    expect(onScroll).toHaveBeenCalledWith(-20);
  });

  it('拖拽结束应当清理监听器', () => {
    const props: ScrollBarProps = {
      type: 'ScrollBar',
      orientation: 'vertical',
      viewportSize: 100,
      contentSize: 200,
      scrollPosition: 0,
      onDragEnd: vi.fn(),
    };
    const sb = new TestScrollBar(props);
    sb.setSize(10, 100);

    const downEvent = {
      nativeEvent: { clientX: 0, clientY: 10 } as PointerEvent,
      stopPropagation: vi.fn(),
    } as any;
    sb.onPointerDown(downEvent);
    expect(sb.isDragging).toBe(true);

    const upEvent = { clientX: 0, clientY: 10 } as PointerEvent;
    sb.callHandleWindowUp(upEvent);

    expect(sb.isDragging).toBe(false);
    expect(props.onDragEnd).toHaveBeenCalled();
    expect(window.removeEventListener).toHaveBeenCalledWith('pointermove', expect.any(Function));
    expect(window.removeEventListener).toHaveBeenCalledWith('pointerup', expect.any(Function));
  });

  it('dispose 应当清理监听器', () => {
    const sb = new TestScrollBar({
      type: 'ScrollBar',
      orientation: 'vertical',
      viewportSize: 100,
      contentSize: 200,
      scrollPosition: 0,
    });

    // 手动或通过交互附加监听器
    // 注意：实现会移除特定的绑定函数。
    // 释放时应移除监听器，并传入构造时创建的绑定函数。

    sb.dispose();
    expect(window.removeEventListener).toHaveBeenCalled();
  });
});
