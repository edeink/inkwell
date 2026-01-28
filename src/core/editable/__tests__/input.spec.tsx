/** @jsxImportSource @/utils/compiler */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { Input } from '../input';

import { Widget } from '@/core/base';
import { StatefulWidget } from '@/core/state/stateful';
import { getCurrentThemeMode, Themes } from '@/styles/theme';

vi.mock('@/core', async () => {
  return {
    Container: (props: any) => ({ type: 'Container', props }),
    Stack: (props: any) => ({ type: 'Stack', props }),
    Text: (props: any) => ({ type: 'Text', props }),
    ScrollView: (props: any) => ({ type: 'ScrollView', props }),
    StatefulWidget,
    Widget,
  };
});

vi.mock('@/core/positioned', () => ({
  Positioned: (props: any) => ({ type: 'Positioned', props }),
}));

function findFirstContainerColor(
  node: any,
  predicate: (props: any) => boolean,
): string | undefined {
  if (!node || typeof node !== 'object') {
    return undefined;
  }
  const typeName = typeof node.type === 'string' ? node.type : node.type?.name;
  if (typeName === 'Container' && node.props && predicate(node.props)) {
    return node.props.color;
  }
  const children = node.props?.children;
  if (Array.isArray(children)) {
    for (const child of children) {
      const found = findFirstContainerColor(child, predicate);
      if (found) {
        return found;
      }
    }
    return undefined;
  }
  return findFirstContainerColor(children, predicate);
}

function findFirstNode(node: any, predicate: (node: any) => boolean): any | null {
  if (!node || typeof node !== 'object') {
    return null;
  }
  if (predicate(node)) {
    return node;
  }
  const children = node.props?.children;
  if (Array.isArray(children)) {
    for (const child of children) {
      const found = findFirstNode(child, predicate);
      if (found) {
        return found;
      }
    }
    return null;
  }
  return findFirstNode(children, predicate);
}

function findFirstText(node: any): string | undefined {
  const found = findFirstNode(node, (n) => {
    const typeName = typeof n.type === 'string' ? n.type : n.type?.name;
    return typeName === 'Text' && typeof n.props?.text === 'string';
  });
  return found?.props?.text;
}

function findFirstIconSvg(node: any): string | undefined {
  const found = findFirstNode(node, (n) => {
    const typeName = typeof n.type === 'string' ? n.type : n.type?.name;
    return typeName === 'Icon' && typeof n.props?.svg === 'string';
  });
  return found?.props?.svg;
}

describe('Input 组件', () => {
  let inputComponent: Input;
  let props: any;

  beforeEach(() => {
    const mockContext = {
      font: '',
      measureText: vi.fn().mockImplementation((text: string) => ({ width: text.length * 10 })),
    };
    HTMLCanvasElement.prototype.getContext = vi.fn().mockReturnValue(mockContext);

    document.body.innerHTML = '';

    props = {
      value: 'Hello',
      onChange: vi.fn(),
    };

    inputComponent = new Input(props);
  });

  afterEach(() => {
    inputComponent.dispose();
  });

  it('拖拽选区时应阻止事件冒泡并更新选区', () => {
    const element = inputComponent.render() as any;
    const typeName = typeof element.type === 'string' ? element.type : element.type?.name;
    expect(typeName).toBe('Container');

    const stopPropagation = vi.fn();

    element.props.onPointerDown({ x: 0, y: 0, stopPropagation } as any);
    expect(stopPropagation).toHaveBeenCalled();

    stopPropagation.mockClear();
    element.props.onPointerMove({ x: 30, y: 0, stopPropagation } as any);
    expect(stopPropagation).toHaveBeenCalled();

    stopPropagation.mockClear();
    element.props.onPointerUp({ x: 30, y: 0, stopPropagation } as any);
    expect(stopPropagation).toHaveBeenCalled();

    // @ts-expect-error 测试用访问内部状态
    expect(inputComponent.state.selectionEnd).toBeGreaterThanOrEqual(0);
  });

  it('拖拽时应使用全局监听继续更新选区', () => {
    const addSpy = vi.spyOn(window, 'addEventListener');
    const removeSpy = vi.spyOn(window, 'removeEventListener');

    const element = inputComponent.render() as any;
    element.props.onPointerDown({ x: 0, y: 0, target: {}, stopPropagation: vi.fn() } as any);

    expect(addSpy).toHaveBeenCalledWith('pointermove', expect.any(Function));
    expect(addSpy).toHaveBeenCalledWith('pointerup', expect.any(Function));

    const MoveEvent = (window as any).PointerEvent ?? MouseEvent;
    window.dispatchEvent(new MoveEvent('pointermove', { clientX: 30, clientY: 0 }) as any);

    // @ts-expect-error 测试用访问内部状态
    expect(inputComponent.state.selectionEnd).toBeGreaterThan(0);

    window.dispatchEvent(new MoveEvent('pointerup', { clientX: 30, clientY: 0 }) as any);
    expect(removeSpy).toHaveBeenCalledWith('pointermove', expect.any(Function));
    expect(removeSpy).toHaveBeenCalledWith('pointerup', expect.any(Function));
  });

  it('聚焦与失焦时选区颜色应不同', () => {
    const element = inputComponent.render() as any;
    element.props.onPointerDown({ x: 0, y: 0, target: {}, stopPropagation: vi.fn() } as any);
    element.props.onPointerMove({ x: 30, y: 0, stopPropagation: vi.fn() } as any);
    element.props.onPointerUp({ x: 30, y: 0, stopPropagation: vi.fn() } as any);

    const theme = Themes[getCurrentThemeMode()];

    const inputEl = document.querySelector('input');
    expect(inputEl).not.toBeNull();

    const focusedTree = inputComponent.render() as any;
    const focusedColor = findFirstContainerColor(
      focusedTree,
      (p) => typeof p.color === 'string' && p.width !== 2,
    );
    expect(focusedColor).toBe(theme.state.focus);

    inputEl?.dispatchEvent(new Event('blur'));
    const blurredTree2 = inputComponent.render() as any;
    const blurredColor2 = findFirstContainerColor(
      blurredTree2,
      (p) => typeof p.color === 'string' && p.width !== 2,
    );
    expect(blurredColor2).toBe(theme.state.selected);
  });

  it('区选时不应显示光标', () => {
    const element = inputComponent.render() as any;
    element.props.onPointerDown({ x: 0, y: 0, target: {}, stopPropagation: vi.fn() } as any);
    element.props.onPointerMove({ x: 30, y: 0, stopPropagation: vi.fn() } as any);
    element.props.onPointerUp({ x: 30, y: 0, stopPropagation: vi.fn() } as any);

    (inputComponent as any).setState({ focused: true, cursorVisible: true });
    const tree = inputComponent.render() as any;
    const cursorColor = findFirstContainerColor(tree, (p) => p.width === 2);
    expect(cursorColor).toBeUndefined();
  });

  it('password 模式默认应使用 ※ 进行遮罩', () => {
    const passwordInput = new Input({
      value: 'Hello',
      inputType: 'password',
    } as any);
    try {
      const tree = passwordInput.render() as any;
      expect(findFirstText(tree)).toBe('※※※※※');
    } finally {
      passwordInput.dispose();
    }
  });

  it('password 模式点击眼睛图标应切换明文显示', () => {
    const passwordInput = new Input({
      value: 'Hello',
      inputType: 'password',
    } as any);
    try {
      const tree1 = passwordInput.render() as any;
      expect(findFirstText(tree1)).toBe('※※※※※');
      const iconSvg1 = findFirstIconSvg(tree1);
      expect(iconSvg1).toBeTruthy();
      expect(iconSvg1).toContain('M4 20 20 4');

      const iconBtn = findFirstNode(tree1, (n) => {
        const typeName = typeof n.type === 'string' ? n.type : n.type?.name;
        return (
          typeName === 'Container' &&
          typeof n.props?.onPointerDown === 'function' &&
          n.props?.cursor === 'pointer'
        );
      });
      expect(iconBtn).not.toBeNull();
      iconBtn.props.onPointerDown({ stopPropagation: vi.fn() } as any);

      const tree2 = passwordInput.render() as any;
      expect(findFirstText(tree2)).toBe('Hello');
      const iconSvg2 = findFirstIconSvg(tree2);
      expect(iconSvg2).toBeTruthy();
      expect(iconSvg2).not.toBe(iconSvg1);
      expect(iconSvg2).not.toContain('M4 20 20 4');

      const iconBtn2 = findFirstNode(tree2, (n) => {
        const typeName = typeof n.type === 'string' ? n.type : n.type?.name;
        return (
          typeName === 'Container' &&
          typeof n.props?.onPointerDown === 'function' &&
          n.props?.cursor === 'pointer'
        );
      });
      iconBtn2.props.onPointerDown({ stopPropagation: vi.fn() } as any);

      const tree3 = passwordInput.render() as any;
      expect(findFirstText(tree3)).toBe('※※※※※');
      const iconSvg3 = findFirstIconSvg(tree3);
      expect(iconSvg3).toBeTruthy();
      expect(iconSvg3).toBe(iconSvg1);
    } finally {
      passwordInput.dispose();
    }
  });

  it('password 模式空值时应优先显示 placeholder', () => {
    const passwordInput = new Input({
      value: '',
      inputType: 'password',
      placeholder: '密码',
    } as any);
    try {
      const tree = passwordInput.render() as any;
      expect(findFirstText(tree)).toBe('密码');
    } finally {
      passwordInput.dispose();
    }
  });
});
