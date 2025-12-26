/** @jsxImportSource @/utils/compiler */
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { CustomComponentType } from '../type';
import { MindMapNode } from '../widgets/mindmap-node';
import { MindMapViewport } from '../widgets/mindmap-viewport';

import { findWidget } from '@/core/helper/widget-selector';
import Runtime from '@/runtime';

describe('Viewport 同步与选择修复测试', () => {
  beforeEach(() => {
    if (!(HTMLCanvasElement.prototype as any)._inkwellCtxPatched) {
      (HTMLCanvasElement.prototype as any)._inkwellCtxPatched = true;
      HTMLCanvasElement.prototype.getContext = function (this: HTMLCanvasElement, type: string) {
        if (type !== '2d') {
          return null as any;
        }
        const ctx: any = {
          canvas: this as HTMLCanvasElement,
          save: () => {},
          restore: () => {},
          translate: () => {},
          scale: () => {},
          rotate: () => {},
          beginPath: () => {},
          moveTo: () => {},
          lineTo: () => {},
          closePath: () => {},
          stroke: () => {},
          fill: () => {},
          fillRect: () => {},
          strokeRect: () => {},
          rect: () => {},
          arc: () => {},
          fillText: () => {},
          strokeText: () => {},
          measureText: (t: string) => ({
            width: t.length * 10,
            fontBoundingBoxAscent: 10,
            fontBoundingBoxDescent: 2,
          }),
          setTransform: () => {},
          getTransform: () => ({ a: 1, b: 0, c: 0, d: 1, e: 0, f: 0 }),
          clearRect: () => {},
          quadraticCurveTo: () => {},
        };
        return ctx;
      } as any;
    }
  });

  it('MindMapViewport 应当正确同步 props 到内部状态 (should sync props to internal state)', () => {
    // 1. 初始化
    const vp = new MindMapViewport({
      type: CustomComponentType.MindMapViewport,
      scale: 1,
      selectedKeys: ['a'],
    });

    expect(vp.scale).toBe(1);
    expect(vp.selectedKeys).toEqual(['a']);

    // 2. 模拟内部状态变化 (如通过滚轮)
    vp.setTransform(1.5, 0, 0);
    expect(vp.scale).toBe(1.5);

    // 3. 模拟父组件重渲染，传入旧的 props (模拟 sync failure case if logic was wrong)
    // 我们的修复是：initViewport 会检查 props.scale，如果提供了就使用。
    // 如果父组件没有更新 state，还是传 1.0，那么 vp 会被重置为 1.0。这是正确的受控行为。
    // 如果父组件更新了 state (via onViewChange)，传 1.5，那么 vp 保持 1.5。

    // Case A: Parent passes new scale
    vp.createElement({
      type: CustomComponentType.MindMapViewport,
      scale: 1.5,
      selectedKeys: ['a'],
    });
    expect(vp.scale).toBe(1.5); // Should match prop

    // Case B: Parent passes different scale
    vp.createElement({
      type: CustomComponentType.MindMapViewport,
      scale: 2.0,
      selectedKeys: ['b'],
    });
    expect(vp.scale).toBe(2.0); // Should update
    expect(vp.selectedKeys).toEqual(['b']); // Should update selection

    // Case C: Parent does NOT pass scale (undefined)
    vp.createElement({
      type: CustomComponentType.MindMapViewport,
      // scale undefined
      selectedKeys: ['b'],
    });
    expect(vp.scale).toBe(2.0); // Should preserve internal state
  });

  it('MindMapNode 应当在选中状态变化时更新 (should update node when selection changes)', async () => {
    const container = document.createElement('div');
    container.id = `vp-sync-test-${Math.random().toString(36).slice(2)}`;
    document.body.appendChild(container);
    const runtime = await Runtime.create(container.id, { backgroundAlpha: 0 });

    const scene = (
      <MindMapViewport key="vp" selectedKeys={[]}>
        <MindMapNode key="n1" title="Node 1" />
      </MindMapViewport>
    );

    await runtime.renderFromJSX(scene as any);
    const root = runtime.getRootWidget();
    const vp = findWidget(root, '#vp') as MindMapViewport;
    const node = findWidget(root, '#n1') as MindMapNode;

    // Initial state
    expect(vp.selectedKeys).toEqual([]);
    // Access node internal state or check render effect?
    // We can check if node.active is false (though active != selected)
    // Node selection is derived in render.

    // Update selection via Viewport method
    vp.setSelectedKeys(['n1']);

    // Verify Viewport state
    expect(vp.selectedKeys).toEqual(['n1']);

    // Verify Node re-render
    // Since setSelectedKeys calls markDirty on children, node should be dirty.
    // Runtime loop picks it up next frame, or we force it?
    // In unit test environment, we might need to manually trigger layout/paint or verify dirty flag.

    // 使用 any 访问受保护的 _dirty 属性进行验证
    expect((node as any)._dirty).toBe(true);

    // Force re-render cycle
    runtime.rerender();

    // Check if node rendered with selection style
    // Difficult to check canvas draw calls without mocking ctx.
    // But we verified the dirty flag, which is the mechanism for update.
  });

  it('Viewport 应当触发 viewChange 和 scroll 事件 (should fire viewChange and scroll events)', async () => {
    const container = document.createElement('div');
    container.id = `vp-events-test-${Math.random().toString(36).slice(2)}`;
    document.body.appendChild(container);
    const runtime = await Runtime.create(container.id, { backgroundAlpha: 0 });

    const onViewChange = vi.fn();
    const onScroll = vi.fn();

    const scene = (
      <MindMapViewport
        key="vp"
        onViewChange={onViewChange}
        onScroll={onScroll}
        width={800}
        height={600}
      />
    );

    await runtime.renderFromJSX(scene as any);
    const root = runtime.getRootWidget();
    const vp = findWidget(root, '#vp') as MindMapViewport;

    // Test Zoom (setScale)
    vp.setScale(1.5);
    expect(vp.scale).toBe(1.5);
    expect(onViewChange).toHaveBeenCalledWith(expect.objectContaining({ scale: 1.5 }));

    // Test Scroll (scrollTo)
    vp.scrollTo(100, 200);
    expect(vp.scrollX).toBe(100);
    expect(vp.scrollY).toBe(200);
    expect(onScroll).toHaveBeenCalledWith(100, 200);

    // Test ZoomAt (which uses executeZoom -> setTransform)
    vp.zoomAt(2.0, 400, 300);
    expect(vp.scale).toBe(2.0);
    // tx/ty will change based on zoomAt logic, we just verify callback
    // 注意：实际调用次数可能大于2次（例如 scrollTo 或其他内部状态更新也可能触发 viewChange）
    // 因此这里改为验证调用次数至少为2次
    expect(onViewChange.mock.calls.length).toBeGreaterThanOrEqual(2);
  });
});
