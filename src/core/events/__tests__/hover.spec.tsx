/** @jsxImportSource @/utils/compiler */
import { describe, expect, it } from 'vitest';

import { Container } from '@/core';
import { createBoxConstraints } from '@/core/base';
import { dispatchAt } from '@/core/events/dispatcher';
import { WidgetRegistry } from '@/core/registry';
import Runtime from '@/runtime';
import { compileElement } from '@/utils/compiler/jsx-compiler';

// Mock Runtime minimal interface
const createMockRuntime = (root: any) => {
  const canvas = document.createElement('canvas');
  return {
    container: document.createElement('div'),
    getRootWidget: () => root,
    getRenderer: () => ({
      getRawInstance: () => ({
        canvas,
        getBoundingClientRect: () => ({ left: 0, top: 0, width: 800, height: 600 }),
      }),
    }),
    scheduleUpdate: () => {},
  } as unknown as Runtime;
};

describe('Hover Events System', () => {
  it('should dispatch pointerenter/leave when moving between siblings', () => {
    const calls: string[] = [];

    const el = (
      <Container key="root" width={200} height={200} alignment="topLeft">
        <Container
          key="child1"
          width={50}
          height={50}
          pointerEvent="auto"
          onPointerEnter={() => {
            calls.push('enter:child1');
          }}
          onPointerLeave={() => {
            calls.push('leave:child1');
          }}
        />
        <Container
          key="child2"
          width={50}
          height={50}
          left={60}
          top={0}
          pointerEvent="auto"
          onPointerEnter={() => {
            calls.push('enter:child2');
          }}
          onPointerLeave={() => {
            calls.push('leave:child2');
          }}
        />
      </Container>
    );

    const data = compileElement(el);
    const root = WidgetRegistry.createWidget(data)!;
    const runtime = createMockRuntime(root);
    root.runtime = runtime;

    root.createElement(data);
    root.layout(createBoxConstraints());

    // Position children manually since we don't have a full layout engine with Positioned in this test
    // But Container layoutChildren does layout children.
    // We need to make sure hitTest works.
    // Container.visitHitTest checks children.
    // We used 'left' prop but Container doesn't handle 'left' for positioning unless inside Stack/Positioned?
    // Actually Container just renders children.
    // Let's use Positioned or just rely on the fact that we can mock hitTest or structure.
    // Wait, Container doesn't support 'left' prop directly for layout unless parent is Stack?
    // Let's wrap in a simple structure or just trust that `layout` sets sizes.
    // And `visitHitTest` checks children.
    // But without Positioned, children might be at (0,0)?
    // Let's check Container implementation.
    // Actually, let's use a simpler approach: Mock hitTest on root or children.

    // However, to integration test `dispatchAt`, we need `hitTest` to work.
    // Let's manually set offsets on children after layout.
    const child1 = root.children[0];
    const child2 = root.children[1];

    // Mock getAbsolutePosition or ensure RenderObject has offset.
    // In Inkwell, hitTest uses renderObject.visitHitTest.
    // renderObject.offset is set by parent.
    // Let's manually set them for the test.
    child1.renderObject.offset = { dx: 0, dy: 0 };
    child2.renderObject.offset = { dx: 60, dy: 0 }; // Manually move child2

    // 1. Enter child1
    dispatchAt(runtime, 'pointermove', { clientX: 10, clientY: 10 } as any);
    expect(calls).toContain('enter:child1');
    calls.length = 0;

    // 2. Move to child2
    dispatchAt(runtime, 'pointermove', { clientX: 70, clientY: 10 } as any);
    expect(calls).toEqual(['leave:child1', 'enter:child2']);

    calls.length = 0;

    // 3. Move out of both (to root)
    dispatchAt(runtime, 'pointermove', { clientX: 150, clientY: 150 } as any);
    expect(calls).toEqual(['leave:child2']);
  });
});
