/** @jsxImportSource @/utils/compiler */
import { describe, expect, it } from 'vitest';

import { Column, Container, Row, Stack } from '@/core';
import { WidgetRegistry } from '@/core/registry';
import { compileElement } from '@/utils/compiler/jsx-compiler';
import { testLogger } from '@/utils/test-logger';

describe('事件控制属性测试', () => {
  // 辅助函数：更新变换矩阵
  const updateMatrices = (root: any) => {
    const ctx = {
      save: () => {},
      restore: () => {},
      translate: () => {},
      scale: () => {},
      rotate: () => {},
      transform: () => {},
      beginPath: () => {},
      rect: () => {},
      fill: () => {},
      stroke: () => {},
      setLineDash: () => {},
    } as any;

    const renderer = {
      ctx,
      translate: () => {},
      scale: () => {},
      rotate: () => {},
      transform: () => {},
      drawRect: () => {},
    } as any;

    root.paint({ renderer } as any);
  };

  it('pointerEvent: "none" 应跳过自身命中测试但允许命中子元素', () => {
    const el = (
      <Container key="parent" width={200} height={200} pointerEvent="none" alignment="center">
        <Container key="child" width={100} height={100} pointerEvent="auto" />
      </Container>
    );
    const data = compileElement(el);
    const root = WidgetRegistry.createWidget(data)!;
    root.createElement(data);
    root.layout({ minWidth: 200, maxWidth: 200, minHeight: 200, maxHeight: 200 });
    updateMatrices(root);

    const child = root.children[0];
    testLogger.log('Child info:', {
      offset: child.renderObject.offset,
      size: child.renderObject.size,
      pointerEvent: child.pointerEvent,
      worldMatrix: (child as unknown as { _worldMatrix: unknown })._worldMatrix,
    });

    // 点击子元素区域 (100, 100) -> 位于中心 (50-150, 50-150)
    const hitChild = root.visitHitTest(100, 100);
    expect(hitChild).not.toBeNull();
    expect(hitChild?.key).toBe('child');

    // 点击父元素空白区域 (10, 10) -> 应不命中 (返回 null)
    const hitParent = root.visitHitTest(10, 10);
    expect(hitParent).toBeNull();
  });

  it('pointerEvent: "auto" 应允许命中自身', () => {
    const el = <Container key="parent" width={200} height={200} pointerEvent="auto" />;
    const data = compileElement(el);
    const root = WidgetRegistry.createWidget(data)!;
    root.createElement(data);
    root.layout({ minWidth: 200, maxWidth: 200, minHeight: 200, maxHeight: 200 });
    updateMatrices(root);

    const hit = root.visitHitTest(100, 100);
    expect(hit).not.toBeNull();
    expect(hit?.key).toBe('parent');
  });

  it('布局组件默认开启 pointerEvent="none" (点击穿透)', () => {
    const el = (
      <Stack key="stack">
        <Column key="column">
          <Row key="row">
            <Container key="child" width={50} height={50} pointerEvent="auto" />
          </Row>
        </Column>
      </Stack>
    );
    const data = compileElement(el);
    const root = WidgetRegistry.createWidget(data)!;
    root.createElement(data);
    root.layout({ minWidth: 200, maxWidth: 200, minHeight: 200, maxHeight: 200 });
    updateMatrices(root);

    // 验证默认属性
    expect(root.pointerEvent).toBe('none');
    const column = root.children[0];
    expect(column.pointerEvent).toBe('none');
    const row = column.children[0];
    expect(row.pointerEvent).toBe('none');

    // 点击空白区域 (150, 150) -> 所有容器都穿透，返回 null
    const hitEmpty = root.visitHitTest(150, 150);
    expect(hitEmpty).toBeNull();

    // 点击子元素 (25, 25) -> 穿透容器命中 child
    const hitChild = root.visitHitTest(25, 25);
    expect(hitChild?.key).toBe('child');
  });

  it('显式设置 pointerEvent="auto" 应覆盖默认行为', () => {
    const el = <Stack key="stack" pointerEvent="auto" />;
    const data = compileElement(el);
    const root = WidgetRegistry.createWidget(data)!;
    root.createElement(data);
    root.layout({ minWidth: 200, maxWidth: 200, minHeight: 200, maxHeight: 200 });
    updateMatrices(root);

    expect(root.pointerEvent).toBe('auto');
    const hit = root.visitHitTest(100, 100);
    expect(hit?.key).toBe('stack');
  });
});
