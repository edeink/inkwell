/** @jsxImportSource @/utils/compiler */
import { afterEach, describe, expect, it } from 'vitest';

import { Container } from '@/core';
import { Widget, createBoxConstraints, type BoxConstraints, type BuildContext } from '@/core/base';
import { EventRegistry, dispatchToTree } from '@/core/events';
import '@/core/registry';
import { compileElement } from '@/utils/compiler/jsx-compiler';

class CustomWidget extends Widget<{ key?: string; type: string; width?: number; height?: number }> {
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

  // 类方法事件处理（用于测试优先级与传播阶段）
  onClick?(_e: any): boolean | void;
  onClickCapture?(_e: any): boolean | void;
  onMouseOver?(_e: any): boolean | void;
  onMouseOverCapture?(_e: any): boolean | void;
}

// 在静态注册表中注册类型以便 JSX 编译识别
Widget.registerType('CustomWidget', CustomWidget);

function CustomWidgetElement(props: {
  key: string;
  width?: number;
  height?: number;
  [k: string]: any;
}) {
  return props as any;
}

function buildTree(
  props: {
    root?: Record<string, unknown>;
    inner?: Record<string, unknown>;
    leaf?: Record<string, unknown>;
  } = {},
) {
  const el = (
    <Container key="root" width={200} height={200} {...(props.root || {})}>
      <Container key="inner" width={120} height={120} {...(props.inner || {})}>
        {/* 通过 JSX 使用自定义组件，支持属性事件注册与类方法并存 */}
        <CustomWidgetElement key="leaf" width={80} height={40} {...(props.leaf || {})} />
      </Container>
    </Container>
  );
  const data = compileElement(el);
  const root = Widget.createWidget(data)!;
  root.layout(createBoxConstraints());
  const inner = root.children[0];
  const leaf = inner.children[0] as CustomWidget;
  return { root, inner, leaf };
}

afterEach(() => {
  EventRegistry.clearAll();
});

describe('事件系统（类方法）', () => {
  it('基本触发：类方法 onClick 被调用', () => {
    const calls: string[] = [];
    const { root, leaf } = buildTree();
    // 为实例挂载类方法
    (leaf as any).onClick = () => calls.push('method:leaf');
    const pos = leaf.getAbsolutePosition();
    dispatchToTree(root, leaf, 'click', pos.dx + 1, pos.dy + 1);
    expect(calls).toEqual(['method:leaf']);
  });

  it('类方法优先于 JSX 属性：onClick 方法先于属性处理器', () => {
    const calls: string[] = [];
    const { root, leaf } = buildTree({ leaf: { onClick: () => calls.push('attr:leaf') } });
    (leaf as any).onClick = () => calls.push('method:leaf');
    const pos = leaf.getAbsolutePosition();
    dispatchToTree(root, leaf, 'click', pos.dx + 1, pos.dy + 1);
    expect(calls).toEqual(['method:leaf', 'attr:leaf']);
  });

  it('跨组件传播顺序一致：捕获→目标→冒泡（MouseOver）', () => {
    const calls: string[] = [];
    const { root, inner, leaf } = buildTree();
    (root as any).onMouseOverCapture = () => calls.push('capture:root');
    (root as any).onMouseOver = () => calls.push('bubble:root');
    (leaf as any).onMouseOverCapture = () => calls.push('target-capture:leaf');
    (leaf as any).onMouseOver = () => calls.push('target-bubble:leaf');
    const pos = leaf.getAbsolutePosition();
    dispatchToTree(root, leaf, 'mouseover', pos.dx + 1, pos.dy + 1);
    expect(calls).toEqual([
      'capture:root',
      'target-capture:leaf',
      'target-bubble:leaf',
      'bubble:root',
    ]);
  });

  it('性能对比：类方法与 JSX 属性在 3000 次派发内同量级', () => {
    const { root, leaf } = buildTree({ leaf: { key: 'leafB' } });
    const posMeth = leaf.getAbsolutePosition();
    const N = 3000;

    // 纯属性处理器
    const callsAttr: number[] = [];
    (leaf as any).onClick = undefined;
    EventRegistry.clearKey(leaf.key);
    const dataAttr = compileElement(
      (
        <Container key="rootA" width={200} height={200}>
          <CustomWidgetElement
            key="leafA"
            width={80}
            height={40}
            onClick={() => callsAttr.push(1)}
          />
        </Container>
      ) as any,
    );
    const rootAttr = Widget.createWidget(dataAttr)!;
    rootAttr.layout(createBoxConstraints());
    const leafAttr = rootAttr.children[0] as CustomWidget;
    const posAttr = leafAttr.getAbsolutePosition();

    // 纯类方法处理器
    const callsMeth: number[] = [];
    (leaf as any).onClick = () => callsMeth.push(1);

    const t0 = performance.now();
    for (let i = 0; i < N; i++) {
      dispatchToTree(rootAttr, leafAttr, 'click', posAttr.dx + 1, posAttr.dy + 1);
    }
    const t1 = performance.now();
    for (let i = 0; i < N; i++) {
      dispatchToTree(root, leaf, 'click', posMeth.dx + 1, posMeth.dy + 1);
    }
    const t2 = performance.now();

    const dAttr = t1 - t0;
    const dMeth = t2 - t1;
    const ratio = dMeth / Math.max(1, dAttr);
    expect(ratio).toBeLessThan(10);
    expect(callsAttr.length).toBe(N);
    expect(callsMeth.length).toBe(N);
  });
});
