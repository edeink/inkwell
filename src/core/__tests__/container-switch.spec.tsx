/** @jsxImportSource @/utils/compiler */
import { describe, expect, it } from 'vitest';

import { Container } from '../container';
import { WidgetRegistry } from '../registry';
import { Text } from '../text';

import { compileElement } from '@/utils/compiler/jsx-compiler';

describe('Container 子组件切换布局', () => {
  it('当子组件被替换时应将内边距应用到新子组件', () => {
    const padding = { left: 10, top: 10, right: 10, bottom: 10 };

    // 1. 设置带有子组件 A 的 Container
    let container: Container | null = null;
    let childA: Text | null = null;
    const el = (
      <Container
        ref={(w) => {
          container = w as unknown as Container;
        }}
        padding={padding}
        width={100}
        height={100}
      >
        <Text
          ref={(w) => {
            childA = w as unknown as Text;
          }}
          text="A"
        />
      </Container>
    );
    const data = compileElement(el);
    const root = WidgetRegistry.createWidget(data) as Container;
    root.createElement(data);
    container = container ?? root;
    childA = childA ?? (container.children[0] as Text);

    // 2. 布局
    const constraints = { minWidth: 0, maxWidth: 200, minHeight: 0, maxHeight: 200 };
    container.layout(constraints);

    // 验证子组件 A 的位置
    expect(childA.renderObject.offset.dx).toBe(10);
    expect(childA.renderObject.offset.dy).toBe(10);

    // 3. 切换到子组件 B
    // 模拟 rebuild 操作：调用 buildChildren
    const childBData = compileElement(<Text key="child-b" text="B" />);

    // 手动调用 buildChildren 以触发修复的逻辑
    // 注意：buildChildren 是受保护的，所以我们转换为 any
    (container as any).buildChildren([childBData]);

    // 获取新的子组件实例
    const childB = container.children[0];

    // 验证 Container 被标记为需要布局
    expect((container as any)._needsLayout).toBe(true);

    container.layout(constraints);

    // 验证子组件 B 的位置
    expect(childB.renderObject.offset.dx).toBe(10);
    expect(childB.renderObject.offset.dy).toBe(10);
  });
});
