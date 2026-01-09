import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { ScrollBar, type ScrollBarProps } from '../scroll-bar';

describe('ScrollBar', () => {
  // Helper class to expose protected methods and properties
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

    // Helper to simulate layout size since renderObject is public but usually set by parent
    public setSize(width: number, height: number) {
      this.renderObject.size = { width, height };
    }
  }

  beforeEach(() => {
    // Mock window methods
    vi.spyOn(window, 'addEventListener');
    vi.spyOn(window, 'removeEventListener');
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('应当正确初始化 (should initialize correctly)', () => {
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

  it('应当正确计算滑块位置和尺寸 (should calculate thumb rect correctly)', () => {
    const props: ScrollBarProps = {
      type: 'ScrollBar',
      orientation: 'vertical',
      viewportSize: 100,
      contentSize: 400, // 4x content
      scrollPosition: 0,
    };
    const sb = new TestScrollBar(props);
    sb.setSize(10, 100); // Track height 100

    // Ratio = 100 / 400 = 0.25. Thumb length = 100 * 0.25 = 25.
    let rect = sb.callGetThumbRect();
    expect(rect).toEqual({
      x: 0,
      y: 0,
      width: 10,
      height: 25,
    });

    // Scroll to middle
    // Max Scroll = 300.
    // Scroll 150 (50%)
    sb.data.scrollPosition = 150;
    rect = sb.callGetThumbRect();
    // Track scrollable = 100 - 25 = 75.
    // Pos = 0.5 * 75 = 37.5
    expect(rect?.y).toBeCloseTo(37.5);

    // Scroll to end
    sb.data.scrollPosition = 300;
    rect = sb.callGetThumbRect();
    expect(rect?.y).toBeCloseTo(75);
  });

  it('内容不足时不应显示滑块 (should not return rect if content fits)', () => {
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

  it('应当响应指针事件并更新状态 (should handle pointer events)', () => {
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

    // Mock event
    const mockEvent = {
      nativeEvent: { clientX: 0, clientY: 0 } as PointerEvent,
      stopPropagation: vi.fn(),
    } as any;

    // Pointer Move (Hover)
    sb.onPointerMove(mockEvent);
    expect(sb.isHovering).toBe(true);
    expect(mockEvent.stopPropagation).toHaveBeenCalled();

    // Pointer Leave
    sb.onPointerLeave(mockEvent);
    expect(sb.isHovering).toBe(false);

    // Pointer Down (Drag Start)
    sb.onPointerDown(mockEvent);
    expect(sb.isDragging).toBe(true);
    expect(props.onDragStart).toHaveBeenCalled();
    expect(window.addEventListener).toHaveBeenCalledWith('pointermove', expect.any(Function));
    expect(window.addEventListener).toHaveBeenCalledWith('pointerup', expect.any(Function));
  });

  it('应当通过 window 事件处理拖拽滚动 (should handle drag scroll via window events)', () => {
    const onScroll = vi.fn();
    const props: ScrollBarProps = {
      type: 'ScrollBar',
      orientation: 'vertical',
      viewportSize: 100,
      contentSize: 200, // Ratio 0.5
      scrollPosition: 0,
      onScroll,
    };
    const sb = new TestScrollBar(props);
    sb.setSize(10, 100); // Track 100. Thumb 50. Scrollable Track 50.
    // Content Scrollable 100.
    // Ratio: 1px track = 2px content.

    // Start Drag at Y=10
    const downEvent = {
      nativeEvent: { clientX: 0, clientY: 10 } as PointerEvent,
      stopPropagation: vi.fn(),
    } as any;
    sb.onPointerDown(downEvent);

    // Move Y to 20 (Delta +10)
    // Should scroll +20
    const moveEvent = { clientX: 0, clientY: 20 } as PointerEvent;
    sb.callHandleWindowMove(moveEvent);

    expect(onScroll).toHaveBeenCalledWith(20);

    // Move Y to 0 (Delta -10 from start)
    // Should scroll -20
    const moveEvent2 = { clientX: 0, clientY: 0 } as PointerEvent;
    sb.callHandleWindowMove(moveEvent2);

    expect(onScroll).toHaveBeenCalledWith(-20);
  });

  it('拖拽结束应当清理监听器 (should cleanup listeners on drag end)', () => {
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

  it('dispose 应当清理监听器 (should cleanup listeners on dispose)', () => {
    const sb = new TestScrollBar({
      type: 'ScrollBar',
      orientation: 'vertical',
      viewportSize: 100,
      contentSize: 200,
      scrollPosition: 0,
    });

    // Attach listeners manually or via interaction
    // Note: implementation removes specific bound functions.
    // dispose calls removeEventListener with the bound functions created in constructor.

    sb.dispose();
    expect(window.removeEventListener).toHaveBeenCalled();
  });
});
