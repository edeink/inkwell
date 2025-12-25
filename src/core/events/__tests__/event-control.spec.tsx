/** @jsxImportSource @/utils/compiler */
import { describe, expect, it } from 'vitest';

import { Column, Container, Row, Stack } from '@/core';
import { WidgetRegistry } from '@/core/registry';
import { compileElement } from '@/utils/compiler/jsx-compiler';

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

  it('skipEvent: true 应跳过自身命中测试但允许命中子元素', () => {
    const el = (
      <Container key="parent" width={200} height={200} skipEvent={true} alignment="center">
        <Container key="child" width={100} height={100} skipEvent={false} />
      </Container>
    );
    const data = compileElement(el);
    const root = WidgetRegistry.createWidget(data)!;
    root.createElement(data);
    root.layout({ minWidth: 0, maxWidth: 200, minHeight: 0, maxHeight: 200 });
    updateMatrices(root);

    const child = root.children[0];
    console.log('Child info:', {
      offset: child.renderObject.offset,
      size: child.renderObject.size,
      skipEvent: (child as any).skipEvent,
      worldMatrix: (child as any)._worldMatrix,
    });

    // 点击子元素区域 (100, 100) -> 位于中心 (50-150, 50-150)
    const hitChild = root.visitHitTest(100, 100);
    expect(hitChild).not.toBeNull();
    expect(hitChild?.key).toBe('child');

    // 点击父元素空白区域 (10, 10) -> 应不命中 (返回 null)
    const hitParent = root.visitHitTest(10, 10);
    expect(hitParent).toBeNull();
  });

  it('pointerEvent: "none" 应具有与 skipEvent: true 相同的行为', () => {
    const el = (
      <Container
        key="parent"
        width={200}
        height={200}
        pointerEvent="none"
        skipEvent={false}
        alignment="center"
      >
        <Container key="child" width={100} height={100} pointerEvent="auto" skipEvent={false} />
      </Container>
    );
    const data = compileElement(el);
    const root = WidgetRegistry.createWidget(data)!;
    root.createElement(data);
    root.layout({ minWidth: 0, maxWidth: 200, minHeight: 0, maxHeight: 200 });
    updateMatrices(root);

    // 点击子元素 (100, 100) -> 命中 child
    const hitChild = root.visitHitTest(100, 100);
    expect(hitChild?.key).toBe('child');

    // 点击父元素 (10, 10) -> 不命中
    const hitParent = root.visitHitTest(10, 10);
    expect(hitParent).toBeNull();
  });

  it('pointerEvent: "auto" 应允许命中自身', () => {
    const el = (
      <Container key="parent" width={200} height={200} pointerEvent="auto" skipEvent={false} />
    );
    const data = compileElement(el);
    const root = WidgetRegistry.createWidget(data)!;
    root.createElement(data);
    root.layout({ minWidth: 0, maxWidth: 200, minHeight: 0, maxHeight: 200 });
    updateMatrices(root);

    const hit = root.visitHitTest(100, 100);
    expect(hit).not.toBeNull();
    expect(hit?.key).toBe('parent');
  });

  it('布局组件默认开启 skipEvent (点击穿透)', () => {
    const el = (
      <Stack key="stack" width={200} height={200}>
        <Column key="column" width={200} height={200}>
          <Row key="row" width={200} height={200}>
            <Container key="child" width={50} height={50} pointerEvent="auto" skipEvent={false} />
          </Row>
        </Column>
      </Stack>
    );
    const data = compileElement(el);
    const root = WidgetRegistry.createWidget(data)!;
    root.createElement(data);
    root.layout({ minWidth: 0, maxWidth: 200, minHeight: 0, maxHeight: 200 });
    updateMatrices(root);

    // 验证默认属性
    expect((root as any).skipEvent).toBe(true);
    const column = root.children[0];
    expect((column as any).skipEvent).toBe(true);
    const row = column.children[0];
    expect((row as any).skipEvent).toBe(true);

    // 点击空白区域 (150, 150) -> 所有容器都穿透，返回 null
    const hitEmpty = root.visitHitTest(150, 150);
    expect(hitEmpty).toBeNull();

    // 点击子元素 (25, 25) -> 穿透容器命中 child
    const hitChild = root.visitHitTest(25, 25);
    expect(hitChild?.key).toBe('child');
  });

  it('显式设置 skipEvent={false} 应覆盖默认行为', () => {
    const el = (
      <Container key="parent" width={200} height={200} skipEvent={false} pointerEvent="auto" />
    );
    const data = compileElement(el);
    const root = WidgetRegistry.createWidget(data)!;
    root.createElement(data);
    root.layout({ minWidth: 0, maxWidth: 200, minHeight: 0, maxHeight: 200 });
    updateMatrices(root);

    expect((root as any).skipEvent).toBe(false);
    const hit = root.visitHitTest(100, 100);
    expect(hit?.key).toBe('parent');
  });
});
