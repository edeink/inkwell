import { afterEach, describe, expect, it } from 'vitest';

import type { BoxConstraints, BuildContext, Size } from '@/core/base';
import type { WidgetProps } from '@/core/type';

import { Column, Container, Widget } from '@/core';
import Runtime from '@/runtime';

interface FixedPaintProps extends WidgetProps {
  width: number;
  height: number;
  onPaint: () => void;
  isRepaintBoundary?: boolean;
}

class FixedPaintWidget extends Widget<FixedPaintProps> {
  private w: number;
  private h: number;
  private onPaintCb: () => void;

  constructor(data: FixedPaintProps) {
    super(data);
    this.w = data.width;
    this.h = data.height;
    this.onPaintCb = data.onPaint;
    this.isRepaintBoundary = !!data.isRepaintBoundary;
  }

  createElement(data: FixedPaintProps): Widget {
    super.createElement(data);
    this.w = typeof data.width === 'number' ? data.width : this.w;
    this.h = typeof data.height === 'number' ? data.height : this.h;
    this.onPaintCb = typeof data.onPaint === 'function' ? data.onPaint : this.onPaintCb;
    this.isRepaintBoundary = !!data.isRepaintBoundary;
    return this;
  }

  protected performLayout(_constraints: BoxConstraints, _childrenSizes: Size[]): Size {
    return { width: this.w, height: this.h };
  }

  protected paintSelf(_context: BuildContext): void {
    this.onPaintCb();
  }
}

class InternalBoundaryPaintWidget extends Widget<FixedPaintProps> {
  private w: number;
  private h: number;
  private onPaintCb: () => void;

  constructor(data: FixedPaintProps) {
    super(data);
    this.w = data.width;
    this.h = data.height;
    this.onPaintCb = data.onPaint;
    this.isRepaintBoundary = true;
  }

  createElement(data: FixedPaintProps): Widget {
    super.createElement(data);
    this.w = typeof data.width === 'number' ? data.width : this.w;
    this.h = typeof data.height === 'number' ? data.height : this.h;
    this.onPaintCb = typeof data.onPaint === 'function' ? data.onPaint : this.onPaintCb;
    return this;
  }

  protected performLayout(_constraints: BoxConstraints, _childrenSizes: Size[]): Size {
    return { width: this.w, height: this.h };
  }

  protected paintSelf(_context: BuildContext): void {
    this.onPaintCb();
  }
}

function attachTree(root: Widget, runtime: Runtime) {
  const owner = runtime.pipelineOwner;
  const stack: Array<{ node: Widget; depth: number }> = [{ node: root, depth: 0 }];
  while (stack.length > 0) {
    const cur = stack.pop()!;
    cur.node.runtime = runtime;
    cur.node.owner = owner;
    cur.node.depth = cur.depth;
    const children = cur.node.children;
    for (let i = 0; i < children.length; i++) {
      const c = children[i];
      c.parent = cur.node;
      stack.push({ node: c, depth: cur.depth + 1 });
    }
  }
}

describe('RepaintBoundary 动画更新应隔离兄弟组件 paint', () => {
  let runtime: Runtime | null = null;
  let container: HTMLDivElement | null = null;

  afterEach(() => {
    runtime?.destroy();
    runtime = null;
    container?.remove();
    container = null;
  });

  it('仅有 PipelineOwner 的 paint 调度时，也应基于脏矩形裁剪与剔除', async () => {
    container = document.createElement('div');
    container.id = 'repaint-boundary-isolation-container';
    document.body.appendChild(container);
    Object.defineProperty(container, 'clientWidth', { value: 500, configurable: true });
    Object.defineProperty(container, 'clientHeight', { value: 500, configurable: true });

    runtime = await Runtime.create(container.id, { enableOffscreenRendering: true, resolution: 1 });

    let aPaintSelfCount = 0;
    let bPaintSelfCount = 0;

    const a = new FixedPaintWidget({
      width: 200,
      height: 80,
      isRepaintBoundary: true,
      onPaint: () => {
        aPaintSelfCount++;
      },
    });
    const b = new FixedPaintWidget({
      width: 200,
      height: 80,
      isRepaintBoundary: true,
      onPaint: () => {
        bPaintSelfCount++;
      },
    });

    const root = new Column({ spacing: 220 } as any);
    root.children = [a, b];
    a.parent = root;
    b.parent = root;

    attachTree(root, runtime);
    (runtime as any).rootWidget = root;

    runtime.setOverlayEntry('overlay', {
      type: Container,
      key: 'overlay',
      props: { width: 1, height: 1, color: 'transparent' },
    } as any);

    runtime.scheduleUpdate(root);
    await runtime.rebuild();

    const bPaintAfterFirstRender = bPaintSelfCount;

    a.markNeedsPaint();
    await runtime.rebuild();

    expect(aPaintSelfCount).toBeGreaterThan(0);
    expect(bPaintSelfCount).toBe(bPaintAfterFirstRender);
  });

  it('组件构造器内置 RepaintBoundary 不应被 createElement 覆盖', async () => {
    container = document.createElement('div');
    container.id = 'repaint-boundary-isolation-container-2';
    document.body.appendChild(container);
    Object.defineProperty(container, 'clientWidth', { value: 500, configurable: true });
    Object.defineProperty(container, 'clientHeight', { value: 500, configurable: true });

    runtime = await Runtime.create(container.id, { enableOffscreenRendering: true, resolution: 1 });

    let aPaintSelfCount = 0;
    let bPaintSelfCount = 0;

    const a = new InternalBoundaryPaintWidget({
      width: 200,
      height: 80,
      onPaint: () => {
        aPaintSelfCount++;
      },
    });
    const b = new InternalBoundaryPaintWidget({
      width: 200,
      height: 80,
      onPaint: () => {
        bPaintSelfCount++;
      },
    });

    const root = new Column({ spacing: 220 } as any);
    root.children = [a, b];
    a.parent = root;
    b.parent = root;

    attachTree(root, runtime);
    (runtime as any).rootWidget = root;

    runtime.setOverlayEntry('overlay', {
      type: Container,
      key: 'overlay',
      props: { width: 1, height: 1, color: 'transparent' },
    } as any);

    runtime.scheduleUpdate(root);
    await runtime.rebuild();

    expect(a.isRepaintBoundary).toBe(true);
    expect(b.isRepaintBoundary).toBe(true);

    const bPaintAfterFirstRender = bPaintSelfCount;

    a.markNeedsPaint();
    await runtime.rebuild();

    expect(aPaintSelfCount).toBeGreaterThan(0);
    expect(bPaintSelfCount).toBe(bPaintAfterFirstRender);
  });
});
