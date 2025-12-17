/** @jsxImportSource @/utils/compiler */
import { describe, expect, it } from 'vitest';

import { Container, Positioned, Stack } from '@/core';
import '@/core/registry';
import { createBoxConstraints } from '@/core/base';
import { WidgetRegistry } from '@/core/registry';
import { compileElement } from '@/utils/compiler/jsx-compiler';

describe('Stack 尺寸计算（忽略 Positioned 子项）', () => {
  it('非 Positioned 子项决定 Stack 尺寸；Positioned 不参与尺寸', () => {
    const jsx = (
      <Stack>
        <Container width={80} height={80} />
        <Positioned left={40} right={40} height={40}>
          <Container />
        </Positioned>
      </Stack>
    );
    const json = compileElement(jsx);
    const root = WidgetRegistry.createWidget(json)!;
    root.createElement(json);

    const constraints = createBoxConstraints({
      minWidth: 0,
      maxWidth: Infinity,
      minHeight: 0,
      maxHeight: Infinity,
    });
    const size = root.layout(constraints);

    expect(size.width).toBe(80);
    expect(size.height).toBe(80);

    // 验证 Positioned 子项尺寸受 Stack 尺寸约束（left+right => 宽度为 0）
    const positioned = root.children[1];
    expect(positioned.renderObject.size.width).toBe(0);
    expect(positioned.renderObject.size.height).toBe(40);
  });
});
