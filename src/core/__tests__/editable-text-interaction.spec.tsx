/** @jsxImportSource @/utils/compiler */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { EditableText } from '../editable-text';
import { WidgetRegistry } from '../registry';

import { Text } from '@/core/text';
import { type AnyElement, compileElement } from '@/utils/compiler/jsx-compiler';

// Define a testing interface to access private/protected members
interface TestingEditableText {
  input: HTMLInputElement | HTMLTextAreaElement | null;
  textWidgetRef:
    | {
        lines: Array<{
          startIndex: number;
          endIndex: number;
          x: number;
          y: number;
          width: number;
          height: number;
          text: string;
        }>;
      }
    | Text
    | null;
  measureTextWidth: () => number;
  createHiddenInput(): void;
  render(): AnyElement;
  build(): AnyElement;
  handleInputKeyDown(e: KeyboardEvent): void;
  getIndexAtPoint(x: number, y: number): number;
  adjustColorOpacity(color: string, opacity: number): string;
  setState(
    state: Partial<{
      focused: boolean;
      cursorVisible: boolean;
      selectionStart: number;
      selectionEnd: number;
      text: string;
      [key: string]: unknown;
    }>,
  ): void;
  state: {
    focused: boolean;
    cursorVisible: boolean;
    selectionStart: number;
    selectionEnd: number;
    text: string;
    [key: string]: unknown;
  };
}

// 模拟定时器
vi.useFakeTimers();

describe('EditableText 交互', () => {
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
    const widget = WidgetRegistry.createWidget(data) as unknown as TestingEditableText;

    // 模拟渲染
    const rendered = widget.render();
    expect((rendered.props as { cursor: string }).cursor).toBe('text');
  });

  it('应该正确处理焦点状态 (Focus/Blur)', () => {
    const onFocus = vi.fn();
    const onBlur = vi.fn();

    const el = <EditableText value="Hello" onFocus={onFocus} onBlur={onBlur} />;
    const widget = WidgetRegistry.createWidget(
      compileElement(el),
    ) as unknown as TestingEditableText;

    // 初始化
    // @ts-ignore - 访问私有属性
    widget.createHiddenInput();
    const input = widget.input as HTMLInputElement;

    expect(input).not.toBeNull();

    // 模拟 focus
    input.focus();

    // 验证状态更新
    expect(widget.state.focused).toBe(true);
    expect(widget.state.cursorVisible).toBe(true);
    expect(onFocus).toHaveBeenCalled();

    // 模拟 blur
    input.blur();
    expect(widget.state.focused).toBe(false);
    expect(onBlur).toHaveBeenCalled();
  });

  it('聚焦时应该闪烁光标', () => {
    const el = <EditableText value="Hello" />;
    const widget = WidgetRegistry.createWidget(
      compileElement(el),
    ) as unknown as TestingEditableText;
    widget.createHiddenInput();
    const input = widget.input as HTMLInputElement;

    input.focus();
    expect(widget.state.cursorVisible).toBe(true);

    // 前进 500ms
    vi.advanceTimersByTime(500);
    expect(widget.state.cursorVisible).toBe(false);

    vi.advanceTimersByTime(500);
    expect(widget.state.cursorVisible).toBe(true);

    input.blur();
    expect(widget.state.cursorVisible).toBe(false);

    // 失焦后不应继续闪烁
    vi.advanceTimersByTime(500);
    expect(widget.state.cursorVisible).toBe(false);
  });

  it('失焦时应该降低选区透明度', () => {
    const el = <EditableText value="Hello" selectionColor="rgba(0,0,255,0.2)" />;
    const widget = WidgetRegistry.createWidget(
      compileElement(el),
    ) as unknown as TestingEditableText;
    widget.createHiddenInput();

    // 模拟 textWidgetRef 用于选区计算
    widget.textWidgetRef = {
      lines: [{ startIndex: 0, endIndex: 5, x: 0, y: 0, width: 50, height: 14, text: 'Hello' }],
    } as any; // Cast to any because we are mocking a subset of Text
    // 模拟 measureTextWidth 返回非零值
    widget.measureTextWidth = () => 10;

    // 默认未聚焦
    expect(widget.state.focused).toBe(false);

    // 模拟选区
    widget.setState({ selectionStart: 0, selectionEnd: 2 });

    // 检查 adjustColorOpacity 调用
    const spy = vi.spyOn(widget, 'adjustColorOpacity');

    widget.render();
    expect(spy).toHaveBeenCalledWith('rgba(0,0,255,0.2)', 0.5);

    // 聚焦时不应降低透明度
    widget.setState({ focused: true });
    spy.mockClear();
    widget.render();
    expect(spy).not.toHaveBeenCalled();
  });

  it('应该支持方向性选区更新', () => {
    const el = <EditableText value="Hello World" />;
    const widget = WidgetRegistry.createWidget(
      compileElement(el),
    ) as unknown as TestingEditableText;
    widget.createHiddenInput();
    const input = widget.input as HTMLInputElement;

    input.focus();

    // 模拟从右向左选择 (Direction: backward)
    Object.defineProperty(input, 'selectionStart', { value: 2, writable: true });
    Object.defineProperty(input, 'selectionEnd', { value: 5, writable: true });
    Object.defineProperty(input, 'selectionDirection', { value: 'backward', writable: true });

    // 触发 selectionchange
    const event = new Event('selectionchange');
    document.dispatchEvent(event);

    // 验证 state: anchor (start) 应该是 5, focus (end) 应该是 2
    expect(widget.state.selectionStart).toBe(5);
    expect(widget.state.selectionEnd).toBe(2);

    // 模拟从左向右选择 (Direction: forward)
    Object.defineProperty(input, 'selectionDirection', { value: 'forward', writable: true });
    document.dispatchEvent(event);

    expect(widget.state.selectionStart).toBe(2);
    expect(widget.state.selectionEnd).toBe(5);
  });

  it('Shift+方向键应扩展选区', () => {
    const el = <EditableText value="Line 1\nLine 2" multiline={true} />;
    const widget = WidgetRegistry.createWidget(
      compileElement(el),
    ) as unknown as TestingEditableText;
    widget.createHiddenInput();

    // Mock 布局信息
    widget.textWidgetRef = {
      lines: [
        { startIndex: 0, endIndex: 6, x: 0, y: 0, width: 50, height: 14, text: 'Line 1' },
        { startIndex: 7, endIndex: 13, x: 0, y: 14, width: 50, height: 14, text: 'Line 2' },
      ],
    } as any;
    // 模拟 measureTextWidth 返回非零值
    widget.measureTextWidth = () => 10;
    widget.getIndexAtPoint = () => 0; // 简化 mock

    // 初始光标在第二行末尾 (Line 2 结束处)
    // "Line 1\nLine 2".length = 13
    widget.setState({ selectionStart: 13, selectionEnd: 13 });

    // 模拟 Shift+Up
    const keyEvent = new KeyboardEvent('keydown', { key: 'ArrowUp', shiftKey: true });
    vi.spyOn(keyEvent, 'preventDefault');

    // 模拟 handleVerticalCursorMove 中的 getIndexAtPoint 逻辑
    // ArrowUp 逻辑: getIndexAtPoint(currInfo.x, prevLine.y + height/2)
    // prevLine 是第 0 行。y=0, height=14. targetY = 7。
    // getIndexAtPoint 将被调用。让我们让它返回 6（第 1 行末尾）。
    widget.getIndexAtPoint = vi.fn().mockReturnValue(6);

    widget.handleInputKeyDown(keyEvent);

    // 验证状态：Anchor (start) 保持 13，Focus (end) 变为 6
    // 这是一个从下往上的选区
    expect(widget.state.selectionStart).toBe(13);
    expect(widget.state.selectionEnd).toBe(6);
  });
});
