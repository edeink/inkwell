/** @jsxImportSource @/utils/compiler */
import { describe, expect, it } from 'vitest';

import { createBoxConstraints } from '../../base';
import { Container } from '../../container';
import { WidgetRegistry } from '../../registry';
import { Stack } from '../../stack';
import { hitTest } from '../hit-test';

import '@/core/registry';
import { compileElement } from '@/utils/compiler/jsx-compiler';

describe('helper hitTest', () => {
  it('pointerEvent 为 none 时仍可命中节点', () => {
    const data = compileElement(
      <Stack>
        <Container key="child" width={20} height={20} pointerEvent="none" />
      </Stack>,
    );
    const root = WidgetRegistry.createWidget(data) as Stack;
    root.createElement(data);

    root.layout(createBoxConstraints({ maxWidth: 100, maxHeight: 100 }));

    const res = hitTest(root, 10, 10);
    expect(res?.key).toBe('child');
  });
});
