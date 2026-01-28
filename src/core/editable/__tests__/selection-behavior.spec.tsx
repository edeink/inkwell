/** @jsxImportSource @/utils/compiler */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { Input } from '../input';
import { TextArea } from '../textarea';

describe('选区行为', () => {
  let measureTextMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vi.useFakeTimers();
    document.body.innerHTML = '';
    measureTextMock = vi.fn((text: string) => ({ width: text.length * 10 }));
    if (typeof HTMLCanvasElement !== 'undefined') {
      HTMLCanvasElement.prototype.getContext = vi.fn(() => ({
        measureText: measureTextMock,
        font: '',
      })) as any;
    }
  });

  afterEach(() => {
    vi.useRealTimers();
    document.body.innerHTML = '';
  });

  it('Input：拖拽应更新选区终点', () => {
    const input = new Input({ value: '一二三四五六七八九十' } as any);
    try {
      const stopPropagation = vi.fn();
      const currentTarget = {};

      (input as any).handlePointerDown({ x: 0, y: 0, currentTarget, stopPropagation } as any);
      expect((input as any).isDragging, '按下后应进入拖拽状态').toBe(true);
      expect((input as any).state.selectionStart, '按下时选区起点应为 0').toBe(0);

      (input as any).handlePointerMove({ x: 50, y: 0, currentTarget, stopPropagation } as any);
      expect((input as any).state.selectionEnd, '拖拽到 x=50 时选区终点应接近 5').toBe(5);

      (input as any).handlePointerUp({ x: 50, y: 0, currentTarget, stopPropagation } as any);
      expect((input as any).isDragging, '抬起后应退出拖拽状态').toBe(false);
    } finally {
      input.dispose();
    }
  });

  it('TextArea：Shift+ArrowUp 应向上扩展选区', () => {
    const textarea = new TextArea({ value: '第一行\n第二行' } as any);
    try {
      (textarea as any).textWidgetRef = {
        lines: [
          { text: '第一行', startIndex: 0, endIndex: 3, x: 0, y: 0, height: 14, width: 50 },
          { text: '第二行', startIndex: 4, endIndex: 7, x: 0, y: 14, height: 14, width: 50 },
        ],
      };

      textarea.setState({ selectionStart: 7, selectionEnd: 7 });
      (textarea as any).handleKeyDown(
        new KeyboardEvent('keydown', { key: 'ArrowUp', shiftKey: true }),
      );

      expect((textarea as any).state.selectionStart, 'Anchor 应保持不变').toBe(7);
      expect((textarea as any).state.selectionEnd, 'Focus 应移动到上一行').toBe(3);
    } finally {
      textarea.dispose();
    }
  });

  it('TextArea：Shift+ArrowDown 应向下扩展选区', () => {
    const textarea = new TextArea({ value: '第一行\n第二行' } as any);
    try {
      (textarea as any).textWidgetRef = {
        lines: [
          { text: '第一行', startIndex: 0, endIndex: 3, x: 0, y: 0, height: 14, width: 50 },
          { text: '第二行', startIndex: 4, endIndex: 7, x: 0, y: 14, height: 14, width: 50 },
        ],
      };

      textarea.setState({ selectionStart: 0, selectionEnd: 0 });
      (textarea as any).handleKeyDown(
        new KeyboardEvent('keydown', { key: 'ArrowDown', shiftKey: true }),
      );

      expect((textarea as any).state.selectionStart, 'Anchor 应保持不变').toBe(0);
      expect((textarea as any).state.selectionEnd, 'Focus 应移动到下一行').toBe(4);
    } finally {
      textarea.dispose();
    }
  });
});
