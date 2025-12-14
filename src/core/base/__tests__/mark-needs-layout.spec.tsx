/** @jsxImportSource @/utils/compiler */
import { describe, expect, it, vi } from 'vitest';

import type Runtime from '@/runtime';

import { Container } from '@/core';
import { Widget, createBoxConstraints } from '@/core/base';
import { WidgetRegistry } from '@/core/registry';
import { compileElement } from '@/utils/compiler/jsx-compiler';

function buildSimpleTree(): { root: Widget; inner: Widget } {
  const el = (
    <Container key="root" width={200} height={200}>
      <Container key="inner" width={120} height={120} />
    </Container>
  );
  const data = compileElement(el);
  const root = WidgetRegistry.createWidget(data)!;
  root.layout(createBoxConstraints());
  const inner = root.children[0];
  return { root, inner };
}

function attachFakeRuntime(root: Widget, onRebuild: () => void): { runtime: Runtime } {
  let scheduled = false;
  const runtime = {
    rebuild: vi.fn(() => onRebuild()),
    scheduleUpdate: vi.fn((_w: Widget) => {
      if (scheduled) {
        return;
      }
      scheduled = true;
      requestAnimationFrame(() => {
        scheduled = false;
        runtime.rebuild();
      });
    }),
  } as unknown as Runtime;
  root.__runtime = runtime;
  return { runtime };
}

describe('markNeedsLayout 基本与传播', () => {
  it('单节点标记后在下一帧触发布局', async () => {
    const { root, inner } = buildSimpleTree();
    const calls: { rebuild: number } = { rebuild: 0 };
    const { runtime } = attachFakeRuntime(root, () => {
      calls.rebuild++;
    });
    inner.markNeedsLayout();
    await new Promise((r) => requestAnimationFrame(() => r(null)));
    await new Promise((r) => setTimeout(r, 1));
    expect(runtime.rebuild.mock.calls.length).toBe(1);
    expect(calls.rebuild).toBe(1);
  });

  it('向上递归标记父节点', () => {
    const { root, inner } = buildSimpleTree();
    root.__runtime = { scheduleUpdate: () => void 0 } as unknown as Runtime;
    inner.markNeedsLayout();
    expect((inner as unknown as { _needsLayout: boolean })._needsLayout).toBe(true);
    expect((root as unknown as { _needsLayout: boolean })._needsLayout).toBe(true);
  });

  it('并发多次调用仅调度一次', async () => {
    const { root, inner } = buildSimpleTree();
    const { runtime } = attachFakeRuntime(root, () => void 0);
    inner.markNeedsLayout();
    inner.markNeedsLayout();
    inner.markNeedsLayout();
    await new Promise((r) => requestAnimationFrame(() => r(null)));
    await new Promise((r) => setTimeout(r, 1));
    expect(runtime.rebuild.mock.calls.length).toBe(1);
  });

  it('markDirty 自动调度 scheduleUpdate 下一帧重建', async () => {
    const { root, inner } = buildSimpleTree();
    const calls: { rebuild: number } = { rebuild: 0 };
    const runtime = {
      rebuild: vi.fn(() => calls.rebuild++),
      scheduleUpdate: vi.fn((_w: Widget) => {
        requestAnimationFrame(() => runtime.rebuild());
      }),
    } as unknown as Runtime;
    root.__runtime = runtime;
    inner.markDirty();
    await new Promise((r) => requestAnimationFrame(() => r(null)));
    await new Promise((r) => requestAnimationFrame(() => r(null)));
    expect(runtime.rebuild.mock.calls.length).toBe(1);
    expect(calls.rebuild).toBe(1);
  });
});
