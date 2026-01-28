/** @jsxImportSource @/utils/compiler */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { Input } from '../input';

import { createBoxConstraints } from '@/core/base';
import '@/core/registry';

describe('Input 布局', () => {
  beforeEach(() => {
    const mockContext = {
      font: '',
      measureText: vi.fn().mockImplementation((text: string) => ({ width: text.length * 10 })),
    };
    HTMLCanvasElement.prototype.getContext = vi.fn().mockReturnValue(mockContext as any);
  });

  afterEach(() => {
    document.body.innerHTML = '';
  });

  it('password 模式高度自适应且 Stack 宽度应撑满', () => {
    const input = new Input({ type: 'Input', value: 'Hello', inputType: 'password' } as any);
    try {
      input.createElement({ type: 'Input', value: 'Hello', inputType: 'password' } as any);
      input.layout(
        createBoxConstraints({ minWidth: 384, maxWidth: 384, minHeight: 0, maxHeight: 716 }),
      );

      expect(input.renderObject.size.height).toBe(21);
      expect(input.renderObject.size.width).toBe(384);

      const root = input.children[0] as any;
      const stack = root?.children?.[0] as any;
      const padded = stack?.children?.[0] as any;
      const scrollView = padded?.children?.[0] as any;

      expect(stack?.renderObject?.size?.height).toBe(21);
      expect(stack?.renderObject?.size?.width).toBe(384);
      expect(scrollView?.renderObject?.size?.width).toBe(356);
    } finally {
      input.dispose();
    }
  });
});
