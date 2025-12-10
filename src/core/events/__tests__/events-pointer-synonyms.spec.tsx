/** @jsxImportSource @/utils/compiler */
import { describe, it, expect, afterEach } from 'vitest';

import { Container } from '@/core';
import { Widget, createBoxConstraints, type BoxConstraints, type BuildContext } from '@/core/base';
import { EventRegistry, dispatchToTree } from '@/core/events';
import '@/core/registry';
import { compileElement } from '@/utils/compiler/jsx-compiler';

class SynWidget extends Widget<{ key?: string; type: string; width?: number; height?: number }> {
  width = 40;
  height = 30;

  protected createChildWidget(childData: any): Widget | null {
    return Widget.createWidget(childData);
  }

  protected performLayout(constraints: BoxConstraints): { width: number; height: number } {
    const w = (this.data.width ?? this.width) as number;
    const h = (this.data.height ?? this.height) as number;
    return { width: Math.min(w, constraints.maxWidth), height: Math.min(h, constraints.maxHeight) };
  }

  protected paintSelf(_context: BuildContext): void {}

  onPointerDown?(_e: any): boolean | void;
  onPointerMove?(_e: any): boolean | void;
  onPointerUp?(_e: any): boolean | void;
}

Widget.registerType('SynWidget', SynWidget);

function SynWidgetElement(props: {
  key: string;
  width?: number;
  height?: number;
  [k: string]: any;
}) {
  return props as any;
}

function buildTree() {
  const el = (
    <Container key="root" width={200} height={200}>
      <Container key="inner" width={120} height={120}>
        <SynWidgetElement key="leaf" width={80} height={40} />
      </Container>
    </Container>
  );
  const data = compileElement(el);
  const root = Widget.createWidget(data)!;
  root.layout(createBoxConstraints());
  const inner = root.children[0];
  const leaf = inner.children[0] as SynWidget;
  return { root, leaf };
}

afterEach(() => {
  EventRegistry.clearAll();
});

describe('事件系统：鼠标/触摸到指针方法的桥接', () => {
  it('mousedown 触发 onPointerDown（无 onMouseDown 时）', () => {
    const { root, leaf } = buildTree();
    const calls: string[] = [];
    (leaf as any).onPointerDown = () => calls.push('pd');
    const pos = leaf.getAbsolutePosition();
    dispatchToTree(root, leaf, 'mousedown', pos.dx + 1, pos.dy + 1);
    expect(calls).toEqual(['pd']);
  });

  it('mousemove 触发 onPointerMove（无 onMouseMove 时）', () => {
    const { root, leaf } = buildTree();
    const calls: string[] = [];
    (leaf as any).onPointerMove = () => calls.push('pm');
    const pos = leaf.getAbsolutePosition();
    dispatchToTree(root, leaf, 'mousemove', pos.dx + 1, pos.dy + 1);
    expect(calls).toEqual(['pm']);
  });

  it('mouseup 触发 onPointerUp（无 onMouseUp 时）', () => {
    const { root, leaf } = buildTree();
    const calls: string[] = [];
    (leaf as any).onPointerUp = () => calls.push('pu');
    const pos = leaf.getAbsolutePosition();
    dispatchToTree(root, leaf, 'mouseup', pos.dx + 1, pos.dy + 1);
    expect(calls).toEqual(['pu']);
  });

  it('touchstart/move/end 触发 onPointer*（无 onTouch* 时）', () => {
    const { root, leaf } = buildTree();
    const calls: string[] = [];
    (leaf as any).onPointerDown = () => calls.push('pd');
    (leaf as any).onPointerMove = () => calls.push('pm');
    (leaf as any).onPointerUp = () => calls.push('pu');
    const pos = leaf.getAbsolutePosition();
    dispatchToTree(root, leaf, 'touchstart', pos.dx + 1, pos.dy + 1);
    dispatchToTree(root, leaf, 'touchmove', pos.dx + 1, pos.dy + 1);
    dispatchToTree(root, leaf, 'touchend', pos.dx + 1, pos.dy + 1);
    expect(calls).toEqual(['pd', 'pm', 'pu']);
  });
});
