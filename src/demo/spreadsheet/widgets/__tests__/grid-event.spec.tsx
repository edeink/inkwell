import { describe, expect, it, vi } from 'vitest';

import { Container } from '../../../../core/container';
import { dispatchToTree } from '../../../../core/events/dispatcher';
import { Stack } from '../../../../core/stack';

describe('Grid 事件触发', () => {
  it('当容器为 auto 且子文本为 none 时，应该命中容器', () => {
    const onDoubleClickSpy = vi.fn();

    // Text (子组件) - 使用 Container 模拟 Text 组件行为
    const text = new Container({
      width: 50,
      height: 20,
      pointerEvent: 'none',
    });
    text.createElement(text.data);

    // Cell Container (单元格容器)
    const cell = new Container({
      width: 100,
      height: 50,
      color: 'red',
      pointerEvent: 'auto',
    });
    // @ts-ignore
    cell.onDoubleClick = onDoubleClickSpy;
    cell.createElement(cell.data);

    // 链接父子关系
    cell.children = [text];
    text.parent = cell;

    // Stack (堆叠布局)
    const stack = new Stack({});
    stack.createElement(stack.data);
    stack.children = [cell];
    cell.parent = stack;

    // Root (根节点)
    const root = new Container({
      width: 800,
      height: 600,
    });
    root.createElement(root.data);
    root.children = [stack];
    stack.parent = root;

    root.layout({ minWidth: 0, maxWidth: 800, minHeight: 0, maxHeight: 600 });

    // 在文本区域 (25, 10) 进行命中测试
    // Root -> Stack -> Cell -> Text(none) -> 返回 null
    // Cell 命中自身 -> 返回 Cell
    const hit = root.visitHitTest(25, 10);

    // 期望命中 cell (因为 text 是 none)
    expect(hit).toBe(cell);

    if (hit) {
      dispatchToTree(root, hit, 'dblclick', 25, 10, {} as any);
    }
    expect(onDoubleClickSpy).toHaveBeenCalled();
  });

  it('应该通过 props 绑定触发 onDoubleClick (DOMEventManager)', () => {
    const onDoubleClickSpy = vi.fn();

    // 在 createElement 之前注入 EventRegistry 所需的 runtime
    const mockRuntime = {} as any;

    // 带有 props 绑定的 Cell
    const cell = new Container({
      width: 100,
      height: 50,
      color: 'blue',
      pointerEvent: 'auto',
      onDoubleClick: onDoubleClickSpy, // Props 绑定
    });
    (cell as any)._runtime = mockRuntime;

    // 模拟编译/创建过程，该过程会调用 DOMEventManager.bindEvents
    // 手动调用 createElement 以触发绑定
    cell.createElement(cell.data);

    // Root 设置
    const root = new Container({
      width: 800,
      height: 600,
    });
    (root as any)._runtime = mockRuntime;

    root.createElement(root.data);
    root.children = [cell];
    cell.parent = root;

    root.layout({ minWidth: 0, maxWidth: 800, minHeight: 0, maxHeight: 600 });

    const hit = root.visitHitTest(10, 10);
    expect(hit).toBe(cell);

    if (hit) {
      dispatchToTree(root, hit, 'dblclick', 10, 10, {} as any);
    }

    expect(onDoubleClickSpy).toHaveBeenCalled();
  });
});
