/** @jsxImportSource @/utils/compiler */
import { describe, expect, it } from 'vitest';

import { createBoxConstraints } from '../base';
import { Container } from '../container';
import { WidgetRegistry } from '../registry';
import { Stack } from '../stack';

import '@/core/registry';
import { compileElement } from '@/utils/compiler/jsx-compiler';

describe('命中测试逻辑', () => {
  it('当 zIndex 相同时，应优先命中视觉上最顶层的元素（最后一个子元素）', () => {
    const data = compileElement(
      <Stack>
        <Container key="background" width={100} height={100} color="red" />
        <Container key="button" width={20} height={20} color="blue" />
      </Stack>,
    );
    const stack = WidgetRegistry.createWidget(data) as Stack;
    stack.createElement(data);

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
    const data = compileElement(
      <Stack>
        <Container key="top" width={100} height={100} zIndex={20} />
        <Container key="bottom" width={100} height={100} zIndex={10} />
      </Stack>,
    );
    const stack = WidgetRegistry.createWidget(data) as Stack;
    stack.createElement(data);

    stack.layout(createBoxConstraints({ maxWidth: 100, maxHeight: 100 }));

    // 命中测试
    const result = stack.visitHitTest(50, 50);
    expect(result).not.toBeNull();
    expect(result?.key).toBe('top');
  });
});
