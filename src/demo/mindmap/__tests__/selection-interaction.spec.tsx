/** @jsxImportSource @/utils/compiler */
import { beforeEach, describe, expect, it } from 'vitest';

import { CustomComponentType } from '../type';
import { MindMapLayout } from '../widgets/mindmap-layout';
import { MindMapNode } from '../widgets/mindmap-node';
import { MindMapViewport } from '../widgets/mindmap-viewport';

import { findWidget } from '@/core/helper/widget-selector';
import Runtime from '@/runtime';

describe('MindMap 选择与交互', async () => {
  beforeEach(() => {
    if (!(HTMLCanvasElement.prototype as any)._inkwellCtxPatched) {
      (HTMLCanvasElement.prototype as any)._inkwellCtxPatched = true;
      HTMLCanvasElement.prototype.getContext = function (this: HTMLCanvasElement, type: string) {
        if (type !== '2d') {
          return null as any;
        }
        const domMatrixCtor = (globalThis as any).DOMMatrix;
        const ctx: any = {
          canvas: this as HTMLCanvasElement,
          save() {},
          restore() {},
          scale() {},
          translate() {},
          rotate() {},
          getTransform() {
            return domMatrixCtor ? new domMatrixCtor() : { a: 1, b: 0, c: 0, d: 1, e: 0, f: 0 };
          },
          clearRect() {},
          fillStyle: '#000000',
          globalAlpha: 1,
          fillRect() {},
          strokeRect() {},
          fill() {},
          font: '',
          textAlign: 'left',
          textBaseline: 'top',
          fillText() {},
          measureText(text: string) {
            return {
              width: text.length * 10,
              actualBoundingBoxAscent: 10,
              actualBoundingBoxDescent: 2,
            };
          },
          beginPath() {},
          moveTo() {},
          lineTo() {},
          closePath() {},
          quadraticCurveTo() {},
          strokeStyle: '#000000',
          lineWidth: 1,
          setLineDash() {},
          stroke() {},
          drawImage() {},
          imageSmoothingEnabled: true,
          imageSmoothingQuality: 'high',
        };
        return ctx;
      } as any;
    }
  });

  it('点击空白区域时应取消 activeKey', async () => {
    const container = document.createElement('div');
    container.id = `mm-test-1-${Math.random().toString(36).slice(2)}`;
    document.body.appendChild(container);
    const runtime = await Runtime.create(container.id, { backgroundAlpha: 0 });

    const scene = (
      <MindMapViewport
        key={CustomComponentType.MindMapViewport}
        scale={1}
        tx={0}
        ty={0}
        width={800}
        height={600}
        activeKey="n1"
      >
        <MindMapLayout key="layout-root" layout="treeBalanced">
          <MindMapNode key="n1" title="Node 1" />
        </MindMapLayout>
      </MindMapViewport>
    );
    await runtime.renderFromJSX(scene as any);

    const root = runtime.getRootWidget();
    const vp = findWidget(root, `#${CustomComponentType.MindMapViewport}`) as MindMapViewport;

    expect(vp.activeKey).toBe('n1');

    // 模拟空白处点击（按下并抬起，无移动）
    // 坐标：0,0（假设节点居中或在其他位置，此处为空白区域）
    const eDown = {
      x: 0,
      y: 0,
      nativeEvent: new MouseEvent('pointerdown', { clientX: 0, clientY: 0, buttons: 1 }),
    } as any;
    vp.onPointerDown(eDown);

    const eUp = {
      x: 0,
      y: 0,
      nativeEvent: new MouseEvent('pointerup', { clientX: 0, clientY: 0 }),
      stopPropagation: () => {},
    } as any;
    vp.onPointerUp(eUp);

    expect(vp.activeKey).toBeNull();
  });

  it('updates selectedKeys during drag selection', async () => {
    const container = document.createElement('div');
    container.id = `mm-test-2-${Math.random().toString(36).slice(2)}`;
    document.body.appendChild(container);
    const runtime = await Runtime.create(container.id, { backgroundAlpha: 0 });

    // Node at some position.
    // MindMapLayout positions nodes.
    // We can just rely on layout engine or mocking positions,
    // but easier to check if logic calls collectKeysInRect.
    // For this test, we assume layout happens and node has a size/pos.
    // We'll force a layout first.

    const scene = (
      <MindMapViewport
        key={CustomComponentType.MindMapViewport}
        scale={1}
        tx={0}
        ty={0}
        width={800}
        height={600}
      >
        <MindMapLayout key="layout-root" layout="treeBalanced">
          <MindMapNode key="n1" title="Node 1" />
        </MindMapLayout>
      </MindMapViewport>
    );
    await runtime.renderFromJSX(scene as any);

    // Force layout to ensure node has size/pos
    runtime.rerender();

    const root = runtime.getRootWidget();
    const vp = findWidget(root, `#${CustomComponentType.MindMapViewport}`) as MindMapViewport;

    expect(vp.selectedKeys).toEqual([]);

    // Start drag
    vp.onPointerDown({
      x: 0,
      y: 0,
      nativeEvent: new MouseEvent('pointerdown', { clientX: 0, clientY: 0, buttons: 1 }),
    } as any);

    // Move to cover area
    vp.onPointerMove({
      x: 800,
      y: 600,
      nativeEvent: new MouseEvent('pointermove', { clientX: 800, clientY: 600, buttons: 1 }),
    } as any);

    // Should be selected during move
    expect(vp.selectedKeys).toContain('n1');
  });

  it('applies distinct styles for active/selected/hover', async () => {
    const container = document.createElement('div');
    container.id = `mm-test-3-${Math.random().toString(36).slice(2)}`;
    document.body.appendChild(container);
    const runtime = await Runtime.create(container.id, { backgroundAlpha: 0 });

    const scene = (
      <MindMapViewport key="v" scale={1} tx={0} ty={0} width={800} height={600} activeKey="n1">
        <MindMapLayout key="layout-root" layout="treeBalanced">
          <MindMapNode key="n1" title="Node 1" />
          <MindMapNode key="n2" title="Node 2" />
        </MindMapLayout>
      </MindMapViewport>
    );
    await runtime.renderFromJSX(scene as any);

    const root = runtime.getRootWidget();
    const node1 = findWidget(root, '#n1') as MindMapNode;

    // Check render output for active node
    const rendered1 = node1.render();
    const container1 = rendered1 as any;
    // Active style: border width 2, color #69b1ff, bg rgba(22, 119, 255, 0.10)
    expect(container1.props.border.width).toBe(2);
    expect(container1.props.border.color).toBe('#69b1ff');
    expect(container1.props.color).toBe('rgba(22, 119, 255, 0.10)');

    // Make n2 selected via Viewport
    const vp = findWidget(root, '#v') as MindMapViewport;
    vp.setSelectedKeys(['n2']);
    // Viewport setSelectedKeys marks dirty, need to re-render to see effect in node's render()
    // but here we can just call node.render() again to check logic since it reads vp properties directly.

    const node2 = findWidget(root, '#n2') as MindMapNode;
    const rendered2 = node2.render();
    const container2 = rendered2 as any;

    // Selected style: dashed border #c9c9c9, bg rgba(22, 119, 255, 0.05)
    expect(container2.props.border.style).toBe('dashed');
    expect(container2.props.border.color).toBe('#c9c9c9');
    expect(container2.props.color).toBe('rgba(22, 119, 255, 0.05)');
  });
});
