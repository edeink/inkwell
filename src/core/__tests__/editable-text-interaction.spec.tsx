/** @jsxImportSource @/utils/compiler */
import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';

import { EditableText } from '../editable-text';

import { Container, Stack } from '@/core';
import { WidgetRegistry } from '@/core/registry';
import { compileElement } from '@/utils/compiler/jsx-compiler';

// Mock timer
vi.useFakeTimers();

describe('EditableText Interaction', () => {
  let container: HTMLElement;

  beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);
  });

  afterEach(() => {
    document.body.removeChild(container);
    vi.clearAllMocks();
  });

  it('应该在渲染时设置 cursor="text"', () => {
    const el = <EditableText value="Hello" />;
    const data = compileElement(el);
    const widget = WidgetRegistry.createWidget(data) as EditableText;

    // 模拟渲染
    widget.build();
    const rendered = (widget as any).render();
    expect(rendered.props.cursor).toBe('text');
  });

  it('应该正确处理焦点状态 (Focus/Blur)', () => {
    const onFocus = vi.fn();
    const onBlur = vi.fn();

    const el = <EditableText value="Hello" onFocus={onFocus} onBlur={onBlur} />;
    const widget = WidgetRegistry.createWidget(compileElement(el)) as EditableText;

    // 初始化
    // @ts-ignore - access private
    widget.createHiddenInput();
    const input = (widget as any).input as HTMLInputElement;

    expect(input).not.toBeNull();

    // 模拟 focus
    input.focus();

    // 验证状态更新
    expect((widget as any).state.focused).toBe(true);
    expect((widget as any).state.cursorVisible).toBe(true);
    expect(onFocus).toHaveBeenCalled();

    // 模拟 blur
    input.blur();
    expect((widget as any).state.focused).toBe(false);
    expect(onBlur).toHaveBeenCalled();
  });

  it('聚焦时应该闪烁光标', () => {
    const el = <EditableText value="Hello" />;
    const widget = WidgetRegistry.createWidget(compileElement(el)) as EditableText;
    (widget as any).createHiddenInput();
    const input = (widget as any).input as HTMLInputElement;

    input.focus();
    expect((widget as any).state.cursorVisible).toBe(true);

    // 前进 500ms
    vi.advanceTimersByTime(500);
    expect((widget as any).state.cursorVisible).toBe(false);

    vi.advanceTimersByTime(500);
    expect((widget as any).state.cursorVisible).toBe(true);

    input.blur();
    expect((widget as any).state.cursorVisible).toBe(false);

    // 失焦后不应继续闪烁
    vi.advanceTimersByTime(500);
    expect((widget as any).state.cursorVisible).toBe(false);
  });

  it('失焦时应该降低选区透明度', () => {
    const el = <EditableText value="Hello" selectionColor="rgba(0,0,255,0.2)" />;
    const widget = WidgetRegistry.createWidget(compileElement(el)) as EditableText;
    (widget as any).createHiddenInput();

    // Mock textWidgetRef for selection calculation
    (widget as any).textWidgetRef = {
      lines: [{ startIndex: 0, endIndex: 5, x: 0, y: 0, width: 50, height: 14, text: 'Hello' }],
    };
    // Mock measureTextWidth to return non-zero
    (widget as any).measureTextWidth = () => 10;

    // 默认未聚焦
    expect((widget as any).state.focused).toBe(false);

    // 检查 render 结果中的 Container 颜色
    const rendered = (widget as any).render();

    // 模拟选区
    (widget as any).setState({ selectionStart: 0, selectionEnd: 2 });

    // 检查 adjustColorOpacity 调用
    const spy = vi.spyOn(widget as any, 'adjustColorOpacity');

    (widget as any).render();
    expect(spy).toHaveBeenCalledWith('rgba(0,0,255,0.2)', 0.5);

    // 聚焦时不应降低透明度
    (widget as any).setState({ focused: true });
    spy.mockClear();
    (widget as any).render();
    expect(spy).not.toHaveBeenCalled();
  });

  it('应该支持方向性选区更新', () => {
    const el = <EditableText value="Hello World" />;
    const widget = WidgetRegistry.createWidget(compileElement(el)) as EditableText;
    (widget as any).createHiddenInput();
    const input = (widget as any).input as HTMLInputElement;

    input.focus();

    // 模拟从右向左选择 (Direction: backward)
    Object.defineProperty(input, 'selectionStart', { value: 2, writable: true });
    Object.defineProperty(input, 'selectionEnd', { value: 5, writable: true });
    Object.defineProperty(input, 'selectionDirection', { value: 'backward', writable: true });

    // 触发 selectionchange
    const event = new Event('selectionchange');
    document.dispatchEvent(event);

    // 验证 state: anchor (start) 应该是 5, focus (end) 应该是 2
    expect((widget as any).state.selectionStart).toBe(5);
    expect((widget as any).state.selectionEnd).toBe(2);

    // 模拟从左向右选择 (Direction: forward)
    Object.defineProperty(input, 'selectionDirection', { value: 'forward', writable: true });
    document.dispatchEvent(event);

    expect((widget as any).state.selectionStart).toBe(2);
    expect((widget as any).state.selectionEnd).toBe(5);
  });

  it('Shift+方向键应扩展选区', () => {
    const el = <EditableText value="Line 1\nLine 2" multiline={true} />;
    const widget = WidgetRegistry.createWidget(compileElement(el)) as EditableText;
    (widget as any).createHiddenInput();

    // Mock 布局信息
    (widget as any).textWidgetRef = {
      lines: [
        { startIndex: 0, endIndex: 6, x: 0, y: 0, width: 50, height: 14, text: 'Line 1' },
        { startIndex: 7, endIndex: 13, x: 0, y: 14, width: 50, height: 14, text: 'Line 2' },
      ],
    };
    (widget as any).measureTextWidth = () => 10;
    (widget as any).getIndexAtPoint = () => 0; // 简化 mock

    // 初始光标在第二行末尾 (Line 2 结束处)
    // "Line 1\nLine 2".length = 13
    (widget as any).setState({ selectionStart: 13, selectionEnd: 13 });

    // 模拟 Shift+Up
    const keyEvent = new KeyboardEvent('keydown', { key: 'ArrowUp', shiftKey: true });
    vi.spyOn(keyEvent, 'preventDefault');

    // Mock getIndexAtPoint for specific logic in handleVerticalCursorMove
    // ArrowUp logic: getIndexAtPoint(currInfo.x, prevLine.y + height/2)
    // prevLine is line 0. y=0, height=14. targetY = 7.
    // getIndexAtPoint will be called. Let's make it return 6 (end of line 1).
    (widget as any).getIndexAtPoint = vi.fn().mockReturnValue(6);

    (widget as any).handleInputKeyDown(keyEvent);

    // 验证状态：Anchor (start) 保持 13，Focus (end) 变为 6
    // 这是一个从下往上的选区
    expect((widget as any).state.selectionStart).toBe(13);
    expect((widget as any).state.selectionEnd).toBe(6);
  });
});
