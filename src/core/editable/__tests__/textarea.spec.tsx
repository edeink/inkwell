/** @jsxImportSource @/utils/compiler */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { TextArea } from '../textarea';

import { Widget } from '@/core/base';
import { StatefulWidget } from '@/core/state/stateful';
import { getCurrentThemeMode, Themes } from '@/styles/theme';
import { compileElement } from '@/utils/compiler/jsx-compiler';

// Mock core 组件，避免渲染实现影响当前测试
vi.mock('@/core', async () => {
  return {
    Container: (props: any) => ({ type: 'Container', props }),
    Stack: (props: any) => ({ type: 'Stack', props }),
    Text: (props: any) => ({ type: 'Text', props }),
    Padding: (props: any) => ({ type: 'Padding', props }),
    ScrollView: (props: any) => ({ type: 'ScrollView', props }),
    StatefulWidget,
    Widget,
  };
});

vi.mock('@/core/positioned', () => ({
  Positioned: (props: any) => ({ type: 'Positioned', props }),
}));

// Mock TextLayout，固定文本布局结果以便验证选区与光标逻辑
vi.mock('@/core/text/layout', () => ({
  TextLayout: {
    layout: vi.fn().mockReturnValue({
      width: 100,
      height: 40,
      lines: [
        { text: '第一行', width: 50, startIndex: 0, endIndex: 3, height: 20, x: 0, y: 0 },
        { text: '第二行', width: 50, startIndex: 4, endIndex: 7, height: 20, x: 0, y: 20 },
      ],
      lineHeight: 20,
    }),
    getIndexForOffset: vi.fn().mockReturnValue(0),
    getOffsetForIndex: vi.fn().mockReturnValue({ dx: 0, dy: 0, height: 20 }),
  },
}));

function findFirstCompiledContainerColor(
  node: any,
  predicate: (n: any) => boolean,
): string | undefined {
  if (!node || typeof node !== 'object') {
    return undefined;
  }
  if (node.type === 'Container' && typeof node.color === 'string' && predicate(node)) {
    return node.color;
  }
  const children = node.children;
  if (Array.isArray(children)) {
    for (const child of children) {
      const found = findFirstCompiledContainerColor(child, predicate);
      if (found) {
        return found;
      }
    }
  }
  return undefined;
}

describe('TextArea 组件', () => {
  let textareaComponent: TextArea;
  let props: any;

  beforeEach(() => {
    const mockContext = {
      font: '',
      measureText: vi.fn().mockImplementation((text: string) => ({ width: text.length * 10 })),
    };
    // @ts-ignore
    HTMLCanvasElement.prototype.getContext = vi.fn().mockReturnValue(mockContext);

    document.body.innerHTML = '';

    props = {
      type: 'TextArea',
      value: '第一行\n第二行',
      onChange: vi.fn(),
    };

    textareaComponent = new TextArea(props);
  });

  afterEach(() => {
    if (textareaComponent) {
      textareaComponent.dispose();
    }
  });

  it('应该创建隐藏的 textarea 元素', () => {
    const textarea = document.querySelector('textarea');
    expect(textarea, '应创建隐藏的 textarea 元素').not.toBeNull();
    expect(textarea?.value, '隐藏 textarea 的 value 应与初始值一致').toBe('第一行\n第二行');
  });

  it('当 props.value 改变时应该更新 textarea 值', () => {
    const newProps = { ...props, value: '新值' };
    textareaComponent.createElement(newProps);
    const textarea = document.querySelector('textarea');
    expect(textarea?.value, '受控 value 更新后应同步到隐藏 textarea').toBe('新值');
  });

  it('应该响应 input 事件并调用 onChange', () => {
    const textarea = document.querySelector('textarea');
    if (!textarea) {
      throw new Error('未找到 textarea 元素');
    }

    textarea.value = '已修改';
    textarea.dispatchEvent(new Event('input'));

    expect(props.onChange, '触发 input 事件后应回调 onChange').toHaveBeenCalledWith('已修改');
  });

  it('拖拽选区时应阻止事件冒泡并更新选区', () => {
    const element = compileElement(textareaComponent.render()) as any;
    expect(element.type, '根节点应为 Container').toBe('Container');

    const stopPropagation = vi.fn();

    const downEvent = {
      x: 10,
      y: 10,
      stopPropagation,
    } as any;
    element.onPointerDown(downEvent);
    expect(stopPropagation, 'PointerDown 应阻止事件冒泡').toHaveBeenCalled();

    stopPropagation.mockClear();
    const moveEvent = {
      x: 20,
      y: 10,
      stopPropagation,
    } as any;
    element.onPointerMove(moveEvent);
    expect(stopPropagation, 'PointerMove 应阻止事件冒泡').toHaveBeenCalled();

    stopPropagation.mockClear();
    const upEvent = {
      x: 20,
      y: 10,
      stopPropagation,
    } as any;
    element.onPointerUp(upEvent);
    expect(stopPropagation, 'PointerUp 应阻止事件冒泡').toHaveBeenCalled();

    expect(
      (textareaComponent as any).state.selectionStart,
      '拖拽后选区起点应为有效索引',
    ).toBeGreaterThanOrEqual(0);
    expect(
      (textareaComponent as any).state.selectionEnd,
      '拖拽后选区终点应为有效索引',
    ).toBeGreaterThanOrEqual(0);
  });

  it('拖拽时应使用全局监听继续更新选区', () => {
    (textareaComponent as any).textWidgetRef = {
      lines: [
        { text: '第一行', width: 50, startIndex: 0, endIndex: 3, height: 20, x: 0, y: 0 },
        { text: '第二行', width: 50, startIndex: 4, endIndex: 7, height: 20, x: 0, y: 20 },
      ],
    };

    const addSpy = vi.spyOn(window, 'addEventListener');
    const removeSpy = vi.spyOn(window, 'removeEventListener');

    const element = compileElement(textareaComponent.render()) as any;
    element.onPointerDown({ x: 10, y: 10, target: {}, stopPropagation: vi.fn() } as any);

    expect(addSpy, '开始拖拽后应注册全局 pointermove 监听').toHaveBeenCalledWith(
      'pointermove',
      expect.any(Function),
    );
    expect(addSpy, '开始拖拽后应注册全局 pointerup 监听').toHaveBeenCalledWith(
      'pointerup',
      expect.any(Function),
    );

    const MoveEvent = (window as any).PointerEvent ?? MouseEvent;
    window.dispatchEvent(new MoveEvent('pointermove', { clientX: 30, clientY: 25 }) as any);

    expect(
      (textareaComponent as any).state.selectionEnd,
      '全局 pointermove 应继续更新选区',
    ).toBeGreaterThan(0);

    window.dispatchEvent(new MoveEvent('pointerup', { clientX: 30, clientY: 25 }) as any);
    expect(removeSpy, '结束拖拽后应移除全局 pointermove 监听').toHaveBeenCalledWith(
      'pointermove',
      expect.any(Function),
    );
    expect(removeSpy, '结束拖拽后应移除全局 pointerup 监听').toHaveBeenCalledWith(
      'pointerup',
      expect.any(Function),
    );
  });

  it('聚焦与失焦时选区颜色应不同', () => {
    (textareaComponent as any).textWidgetRef = {
      lines: [
        { text: '第一行', width: 50, startIndex: 0, endIndex: 3, height: 20, x: 0, y: 0 },
        { text: '第二行', width: 50, startIndex: 4, endIndex: 7, height: 20, x: 0, y: 20 },
      ],
    };

    const element = compileElement(textareaComponent.render()) as any;
    element.onPointerDown({ x: 0, y: 0, target: {}, stopPropagation: vi.fn() } as any);
    element.onPointerMove({ x: 30, y: 25, stopPropagation: vi.fn() } as any);
    element.onPointerUp({ x: 30, y: 25, stopPropagation: vi.fn() } as any);

    const theme = Themes[getCurrentThemeMode()];

    const textarea = document.querySelector('textarea');
    expect(textarea, '应存在隐藏 textarea 元素').not.toBeNull();

    const focusedTree = compileElement(textareaComponent.render()) as any;
    const focusedColor = findFirstCompiledContainerColor(
      focusedTree,
      (n) => typeof n.color === 'string' && n.width !== 2,
    );
    expect(focusedColor, '聚焦时应使用聚焦选区颜色').toBe(theme.state.focus);

    textarea?.dispatchEvent(new Event('blur'));
    const blurredTree2 = compileElement(textareaComponent.render()) as any;
    const blurredColor2 = findFirstCompiledContainerColor(
      blurredTree2,
      (n) => typeof n.color === 'string' && n.width !== 2,
    );
    expect(blurredColor2, '失焦时应使用非聚焦选区颜色').toBe(theme.state.selected);
  });

  it('区选时不应显示光标', () => {
    (textareaComponent as any).textWidgetRef = {
      lines: [
        { text: '第一行', width: 50, startIndex: 0, endIndex: 3, height: 20, x: 0, y: 0 },
        { text: '第二行', width: 50, startIndex: 4, endIndex: 7, height: 20, x: 0, y: 20 },
      ],
    };

    const element = compileElement(textareaComponent.render()) as any;
    element.onPointerDown({ x: 0, y: 0, target: {}, stopPropagation: vi.fn() } as any);
    element.onPointerMove({ x: 30, y: 25, stopPropagation: vi.fn() } as any);
    element.onPointerUp({ x: 30, y: 25, stopPropagation: vi.fn() } as any);

    (textareaComponent as any).setState({ focused: true, cursorVisible: true });
    const tree = compileElement(textareaComponent.render()) as any;
    const cursorColor = findFirstCompiledContainerColor(
      tree,
      (n) => typeof n.color === 'string' && n.width === 2,
    );
    expect(cursorColor, '存在选区时不应渲染光标').toBeUndefined();
  });

  it('光标在行首按下键应保持行首并携带标记位', () => {
    (textareaComponent as any).textWidgetRef = {
      lines: [
        { text: '甲乙丙丁', width: 40, startIndex: 0, endIndex: 4, height: 20, x: 0, y: 0 },
        { text: '戊己', width: 20, startIndex: 4, endIndex: 6, height: 20, x: 0, y: 20 },
        { text: '庚辛壬癸', width: 40, startIndex: 6, endIndex: 10, height: 20, x: 0, y: 40 },
      ],
    };

    (textareaComponent as any).setState({
      text: '甲乙丙丁戊己庚辛壬癸',
      selectionStart: 4,
      selectionEnd: 4,
      caretAffinity: 'start',
    });

    (textareaComponent as any).handleKeyDown({
      key: 'ArrowDown',
      shiftKey: false,
      preventDefault: vi.fn(),
    } as any);

    // @ts-expect-error 测试用访问内部状态
    expect(textareaComponent.state.selectionStart, '向下移动后 selectionStart 应更新').toBe(6);
    // @ts-expect-error 测试用访问内部状态
    expect(textareaComponent.state.selectionEnd, '向下移动后 selectionEnd 应更新').toBe(6);
    // @ts-expect-error 测试用访问内部状态
    expect((textareaComponent.state as any).caretAffinity, '应保留 caretAffinity 标记').toBe(
      'start',
    );
  });
});
