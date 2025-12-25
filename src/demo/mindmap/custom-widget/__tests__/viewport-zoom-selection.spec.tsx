/** @jsxImportSource @/utils/compiler */
import { beforeEach, describe, expect, it } from 'vitest';

import { MindMapLayout } from '../mindmap-layout';
import { MindMapNode } from '../mindmap-node';
import { MindMapViewport } from '../mindmap-viewport';
import { CustomComponentType } from '../type';

import { findWidget } from '@/core/helper/widget-selector';
import Runtime from '@/runtime';

describe('Viewport 缩放选择测试', async () => {
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
          drawImage: () => {},
          createPattern: () => {},
          clearRect: () => {},
          clip: () => {},
          getTransform: () => ({ a: 1, b: 0, c: 0, d: 1, e: 0, f: 0 }),
          setTransform: () => {},
          quadraticCurveTo: () => {},
          bezierCurveTo: () => {},
        };
        return ctx;
      } as any;
    }
  });

  it('放大时（scale=2）应能正确选中节点', async () => {
    const container = document.createElement('div');
    container.id = `vp-zoom-test-${Math.random().toString(36).slice(2)}`;
    document.body.appendChild(container);
    const runtime = await Runtime.create(container.id, { backgroundAlpha: 0 });

    // 设置：视口缩放2倍。MindMapLayout 负责布局节点。
    // 我们假设 Node1 会位于某个偏移位置。
    const scene = (
      <MindMapViewport
        key={CustomComponentType.MindMapViewport}
        scale={2}
        tx={100}
        ty={100}
        width={800}
        height={600}
      >
        <MindMapLayout key={CustomComponentType.MindMapLayout}>
          <MindMapNode key="n1" title="Node 1" />
        </MindMapLayout>
      </MindMapViewport>
    );
    await runtime.renderFromJSX(scene as any);

    // 强制重排
    runtime.rerender();

    const root = runtime.getRootWidget();
    const vp = findWidget(root, `#${CustomComponentType.MindMapViewport}`) as MindMapViewport;
    const node = findWidget(root, '#n1') as MindMapNode;

    // 获取节点的计算位置（布局偏移）
    const nodeOffset = node.renderObject.offset; // 相对于 MindMapLayout
    const layout = findWidget(root, CustomComponentType.MindMapLayout) as MindMapLayout;
    // layoutOffset 相对于 Viewport (contentTx, contentTy)

    // 节点在“内容空间”中的预期位置是 nodeOffset。
    // 下面计算节点在“绝对”坐标系下的位置
    const nodeAbs = node.getAbsolutePosition();
    const vpPos = vp.getAbsolutePosition();

    // 模拟覆盖该节点的框选操作。
    // 用户在屏幕坐标系点击。
    // 我们需要计算对应于该节点的屏幕坐标。

    // 屏幕 X = Viewport.x + tx + scale * (contentTx + NodeX)
    const screenX = vpPos.dx + vp.tx + vp.scale * (nodeOffset.dx - vp.scrollX);
    const screenY = vpPos.dy + vp.ty + vp.scale * (nodeOffset.dy - vp.scrollY);
    console.log(`[Test Debug] Calculated screenX=${screenX}, screenY=${screenY}`);

    const nodeW = node.renderObject.size.width;
    const nodeH = node.renderObject.size.height;

    // 从节点左上角外围开始，到右下角外围结束（屏幕空间）
    const startX = screenX - 10;
    const startY = screenY - 10;
    const endX = screenX + nodeW * vp.scale + 10;
    const endY = screenY + nodeH * vp.scale + 10;

    // 指针按下
    vp.onPointerDown({
      x: startX,
      y: startY,
      nativeEvent: new MouseEvent('pointerdown', { clientX: startX, clientY: startY, buttons: 1 }),
    } as any);

    // 指针移动
    vp.onPointerMove({
      x: endX,
      y: endY,
      nativeEvent: new MouseEvent('pointermove', { clientX: endX, clientY: endY, buttons: 1 }),
    } as any);

    // 检查选中状态
    expect(vp.selectedKeys).toContain('n1');
  });

  it('缩小时（scale=0.5）应能正确选中节点', async () => {
    const container = document.createElement('div');
    container.id = `vp-zoom-test-${Math.random().toString(36).slice(2)}`;
    document.body.appendChild(container);
    const runtime = await Runtime.create(container.id, { backgroundAlpha: 0 });

    const scene = (
      <MindMapViewport key="v" scale={0.5} tx={50} ty={50} width={800} height={600}>
        <MindMapLayout key="layout">
          <MindMapNode key="n1" title="Node 1" />
        </MindMapLayout>
      </MindMapViewport>
    );
    await runtime.renderFromJSX(scene as any);
    runtime.rerender();

    const root = runtime.getRootWidget();
    const vp = findWidget(root, '#v') as MindMapViewport;
    const node = findWidget(root, '#n1') as MindMapNode;

    const nodeOffset = node.renderObject.offset;
    // 计算预期的屏幕位置
    const vpPos = vp.getAbsolutePosition();
    const screenX = vpPos.dx + vp.tx + vp.scale * (nodeOffset.dx - vp.scrollX);
    const screenY = vpPos.dy + vp.ty + vp.scale * (nodeOffset.dy - vp.scrollY);
    const nodeW = node.renderObject.size.width;
    const nodeH = node.renderObject.size.height;

    // 模拟覆盖节点的拖拽框选
    const startX = screenX - 10;
    const startY = screenY - 10;
    const endX = screenX + nodeW * vp.scale + 10;
    const endY = screenY + nodeH * vp.scale + 10;

    vp.onPointerDown({
      x: startX,
      y: startY,
      nativeEvent: new MouseEvent('pointerdown', { clientX: startX, clientY: startY, buttons: 1 }),
    } as any);

    vp.onPointerMove({
      x: endX,
      y: endY,
      nativeEvent: new MouseEvent('pointermove', { clientX: endX, clientY: endY, buttons: 1 }),
    } as any);

    expect(vp.selectedKeys).toContain('n1');
  });

  it('非整数缩放（scale=1.5）时应能正确选中节点', async () => {
    const container = document.createElement('div');
    container.id = `vp-zoom-test-${Math.random().toString(36).slice(2)}`;
    document.body.appendChild(container);
    const runtime = await Runtime.create(container.id, { backgroundAlpha: 0 });

    const scene = (
      <MindMapViewport key="v" scale={1.5} tx={0} ty={0} width={800} height={600}>
        <MindMapLayout key="layout">
          <MindMapNode key="n1" title="Node 1" />
        </MindMapLayout>
      </MindMapViewport>
    );
    await runtime.renderFromJSX(scene as any);
    runtime.rerender();

    const root = runtime.getRootWidget();
    const vp = findWidget(root, '#v') as MindMapViewport;
    const node = findWidget(root, '#n1') as MindMapNode;

    const nodeOffset = node.renderObject.offset;
    const vpPos = vp.getAbsolutePosition();
    const screenX = vpPos.dx + vp.tx + vp.scale * (nodeOffset.dx - vp.scrollX);
    const screenY = vpPos.dy + vp.ty + vp.scale * (nodeOffset.dy - vp.scrollY);
    const nodeW = node.renderObject.size.width;
    const nodeH = node.renderObject.size.height;

    const startX = screenX - 5;
    const startY = screenY - 5;
    const endX = screenX + nodeW * vp.scale + 5;
    const endY = screenY + nodeH * vp.scale + 5;

    vp.onPointerDown({
      x: startX,
      y: startY,
      nativeEvent: new MouseEvent('pointerdown', { clientX: startX, clientY: startY, buttons: 1 }),
    } as any);

    vp.onPointerMove({
      x: endX,
      y: endY,
      nativeEvent: new MouseEvent('pointermove', { clientX: endX, clientY: endY, buttons: 1 }),
    } as any);

    expect(vp.selectedKeys).toContain('n1');
  });
});
