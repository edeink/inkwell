/** @jsxImportSource @/utils/compiler */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { Input } from '../input';
import { TextArea } from '../textarea';

describe('光标可见性与滚动联动', () => {
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

  it('Input：光标超出右侧可视范围时应向右滚动', () => {
    const input = new Input({ value: '01234567890123456789' } as any);
    try {
      const scrollTo = vi.fn(function (this: any, x: number, y: number) {
        this.scrollX = x;
        this.scrollY = y;
      });

      (input as any).scrollViewRef = {
        width: 100,
        height: 20,
        scrollX: 0,
        scrollY: 0,
        scrollTo,
      };

      input.setState({ selectionStart: 11, selectionEnd: 11 });
      (input as any).ensureCursorVisible();

      expect(scrollTo, '光标在右侧溢出时应触发滚动').toHaveBeenCalled();
      expect((input as any).scrollViewRef.scrollX, '滚动后 scrollX 应大于 0').toBeGreaterThan(0);
    } finally {
      input.dispose();
    }
  });

  it('Input：光标在左侧不可见时应向左滚动', () => {
    const input = new Input({ value: '01234567890123456789' } as any);
    try {
      const scrollTo = vi.fn(function (this: any, x: number, y: number) {
        this.scrollX = x;
        this.scrollY = y;
      });

      (input as any).scrollViewRef = {
        width: 100,
        height: 20,
        scrollX: 50,
        scrollY: 0,
        scrollTo,
      };

      input.setState({ selectionStart: 1, selectionEnd: 1 });
      (input as any).ensureCursorVisible();

      expect(scrollTo, '光标在左侧不可见时应触发滚动').toHaveBeenCalled();
      expect((input as any).scrollViewRef.scrollX, '滚动后 scrollX 应小于原始值').toBeLessThan(50);
    } finally {
      input.dispose();
    }
  });

  it('Input：光标已在可视范围内时不应滚动', () => {
    const input = new Input({ value: '0123456789' } as any);
    try {
      const scrollTo = vi.fn();
      (input as any).scrollViewRef = {
        width: 200,
        height: 20,
        scrollX: 0,
        scrollY: 0,
        scrollTo,
      };

      input.setState({ selectionStart: 5, selectionEnd: 5 });
      (input as any).ensureCursorVisible();

      expect(scrollTo, '光标可见时不应触发滚动').not.toHaveBeenCalled();
    } finally {
      input.dispose();
    }
  });

  it('TextArea：光标超出下方可视范围时应向下滚动', () => {
    const textarea = new TextArea({ value: '第一行\n第二行\n第三行' } as any);
    try {
      const scrollTo = vi.fn(function (this: any, x: number, y: number) {
        this.scrollX = x;
        this.scrollY = y;
      });

      (textarea as any).scrollViewRef = {
        width: 100,
        height: 20,
        scrollX: 0,
        scrollY: 0,
        scrollTo,
      };

      (textarea as any).textWidgetRef = {
        lines: [
          { text: '第一行', startIndex: 0, endIndex: 3, x: 0, y: 0, height: 14, width: 50 },
          { text: '第二行', startIndex: 4, endIndex: 7, x: 0, y: 14, height: 14, width: 50 },
          { text: '第三行', startIndex: 8, endIndex: 11, x: 0, y: 28, height: 14, width: 50 },
        ],
      };

      textarea.setState({ selectionStart: 8, selectionEnd: 8 });
      (textarea as any).ensureCursorVisible();

      expect(scrollTo, '光标在下方溢出时应触发滚动').toHaveBeenCalled();
      expect((textarea as any).scrollViewRef.scrollY, '滚动后 scrollY 应大于 0').toBeGreaterThan(0);
    } finally {
      textarea.dispose();
    }
  });
});
