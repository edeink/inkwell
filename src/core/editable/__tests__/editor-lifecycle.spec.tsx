/** @jsxImportSource @/utils/compiler */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { Input } from '../input';

// Mock core 依赖，避免渲染相关实现影响当前测试
vi.mock('@/core/base', async (importOriginal) => {
  const actual = (await importOriginal()) as any;
  class MockWidget {
    props: any;
    state: any;
    renderObject: any = { offset: { dx: 0, dy: 0 }, size: { width: 100, height: 100 } };
    constructor(props: any) {
      this.props = props;
    }
    dispose(): void {
      return;
    }
    markDirty(): void {
      return;
    }
    createElement(data: any) {
      this.props = data;
      return this;
    }
    setState(newState: any) {
      this.state = { ...this.state, ...newState };
    }
  }
  return { ...actual, Widget: MockWidget };
});

describe('可编辑组件生命周期', () => {
  let container: HTMLElement;

  beforeEach(() => {
    vi.useFakeTimers();
    container = document.createElement('div');
    document.body.appendChild(container);
  });

  afterEach(() => {
    document.body.innerHTML = '';
    vi.useRealTimers();
  });

  it('初始化时应创建隐藏 input 元素', () => {
    const input = new Input({ type: 'Input', value: 'init' });
    try {
      vi.advanceTimersByTime(100);

      const hiddenInput = document.querySelector('input');
      expect(hiddenInput, '应创建隐藏的 input 元素').not.toBeNull();
      expect(hiddenInput?.value, '隐藏 input 的 value 应与初始值一致').toBe('init');
    } finally {
      input.dispose();
    }
  });

  it('销毁时应清理资源并移除监听', () => {
    const input = new Input({ type: 'Input', value: 'init' });
    vi.advanceTimersByTime(100);

    const removeListenerSpy = vi.spyOn(window, 'removeEventListener');
    (input as any).attachGlobalDragListeners();
    input.dispose();

    expect(removeListenerSpy, '销毁时应尝试移除全局拖拽监听').toHaveBeenCalled();
    expect(document.querySelector('input'), '销毁后不应残留隐藏 input').toBeNull();
  });

  it('当 props.value 变化时应同步到隐藏 input', () => {
    const input = new Input({ type: 'Input', value: 'old' });
    try {
      vi.advanceTimersByTime(100);

      const hiddenInput = document.querySelector('input');
      expect(hiddenInput?.value, '初始时隐藏 input 的 value 应为 old').toBe('old');

      // 模拟框架层的 props 更新：通过 createElement 触发对受控 value 的同步逻辑
      input.createElement({ ...(input.props as any), value: 'new' } as any);

      expect(hiddenInput?.value, '更新后隐藏 input 的 value 应同步为 new').toBe('new');
    } finally {
      input.dispose();
    }
  });

  it('聚焦与失焦时应正确更新 focused 状态', () => {
    const input = new Input({ type: 'Input', value: '' });
    try {
      vi.advanceTimersByTime(100);
      const hiddenInput = (input as any).input as HTMLInputElement;

      hiddenInput.focus();
      expect((input as any).state.focused, '聚焦后 focused 应为 true').toBe(true);

      hiddenInput.blur();
      expect((input as any).state.focused, '失焦后 focused 应为 false').toBe(false);
    } finally {
      input.dispose();
    }
  });
});
