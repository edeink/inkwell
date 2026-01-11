/** @jsxImportSource @/utils/compiler */
import { describe, expect, it } from 'vitest';

import { Container } from '@/core';
import { createBoxConstraints } from '@/core/base';
import { dispatchAt } from '@/core/events/dispatcher';
import { WidgetRegistry } from '@/core/registry';
import Runtime from '@/runtime';
import { compileElement } from '@/utils/compiler/jsx-compiler';

// 模拟 Runtime 最小接口
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

describe('悬停事件系统 (Hover Events System)', () => {
  it('应当在兄弟节点间移动时正确分发 pointerenter/leave 事件', () => {
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

    // 手动定位子节点，因为本测试环境中没有完整的布局引擎（Stack/Positioned）
    // 但 Container 的 layoutChildren 会触发布局。
    // 我们需要确保 hitTest 能够工作。
    // Container.visitHitTest 会检查子节点。
    // 我们使用了 'left' 属性，但 Container 不会处理 'left' 进行定位，除非父级是 Stack。
    // 实际上 Container 只是渲染子节点。
    // 让我们使用 Positioned 或直接模拟 hitTest 或结构。
    // 不过，为了集成测试 `dispatchAt`，我们需要 `hitTest` 正常工作。
    // 让我们在布局后手动设置子节点的偏移量。
    const child1 = root.children[0];
    const child2 = root.children[1];

    // 模拟 getAbsolutePosition 或确保 RenderObject 具有偏移量。
    // 在 Inkwell 中，hitTest 使用 renderObject.visitHitTest。
    // renderObject.offset 由父级设置。
    // 我们在此处手动设置它们以进行测试。
    child1.renderObject.offset = { dx: 0, dy: 0 };
    child2.renderObject.offset = { dx: 60, dy: 0 }; // 手动移动 child2

    // 1. 进入 child1
    dispatchAt(runtime, 'pointermove', { clientX: 10, clientY: 10 } as any);
    expect(calls).toContain('enter:child1');
    calls.length = 0;

    // 2. 移动到 child2
    dispatchAt(runtime, 'pointermove', { clientX: 70, clientY: 10 } as any);
    expect(calls).toEqual(['leave:child1', 'enter:child2']);

    calls.length = 0;

    // 3. 移出两者（回到 root）
    dispatchAt(runtime, 'pointermove', { clientX: 150, clientY: 150 } as any);
    expect(calls).toEqual(['leave:child2']);
  });
});
