import { describe, expect, it } from 'vitest';

import { createBoxConstraints } from '../base';
import { Container } from '../container';
import { Stack } from '../stack';

describe('命中测试逻辑', () => {
  it('当 zIndex 相同时，应优先命中视觉上最顶层的元素（最后一个子元素）', () => {
    const background = new Container({
      type: 'Container',
      key: 'background',
      width: 100,
      height: 100,
      color: 'red',
    });

    const button = new Container({
      type: 'Container',
      key: 'button',
      width: 20,
      height: 20,
      color: 'blue',
    });

    const stack = new Stack({
      type: 'Stack',
      // 我们在此测试中手动构建子元素
      children: [],
    });

    stack.children = [background, button];
    background.parent = stack;
    button.parent = stack;

    // 布局以设置尺寸和偏移
    stack.layout(createBoxConstraints({ maxWidth: 100, maxHeight: 100 }));

    // 在 (10, 10) 处进行命中测试
    // background (100x100) 和 button (20x20) 都覆盖 (10, 10)。
    // Button 是子元素列表中的最后一个，因此最后绘制（在顶部）。
    // 命中测试应返回 button。
    const result = stack.visitHitTest(10, 10);
    expect(result).not.toBeNull();
    expect(result?.key).toBe('button');
  });

  it('应命中具有更高 zIndex 的元素', () => {
    const bottom = new Container({
      type: 'Container',
      key: 'bottom',
      width: 100,
      height: 100,
      zIndex: 10,
    });

    const top = new Container({
      type: 'Container',
      key: 'top',
      width: 100,
      height: 100,
      zIndex: 20,
    });

    const stack = new Stack({ type: 'Stack' });
    // 将 top 放在数组前面，但它有更高的 zIndex
    stack.children = [top, bottom];
    top.parent = stack;
    bottom.parent = stack;

    stack.layout(createBoxConstraints({ maxWidth: 100, maxHeight: 100 }));

    // 命中测试
    const result = stack.visitHitTest(50, 50);
    expect(result).not.toBeNull();
    expect(result?.key).toBe('top');
  });
});
