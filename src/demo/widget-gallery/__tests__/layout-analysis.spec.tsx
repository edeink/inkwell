import { describe, expect, it } from 'vitest';

import { WidgetGalleryDemo } from '../app';

import { createBoxConstraints, Widget } from '@/core/base';
import { WidgetRegistry } from '@/core/registry';
import { ScrollView } from '@/core/viewport/scroll-view';
import { Themes } from '@/styles/theme';
import { compileElement } from '@/utils/compiler/jsx-compiler';
import { testLogger } from '@/utils/test-logger';

// 按 key 查找 Widget 的辅助函数
function findWidgetByKey(root: Widget, key: string): Widget | null {
  if (root.key === key) {
    return root;
  }

  // 处理子节点
  // @ts-ignore
  const children = root.children || (root.child ? [root.child] : []);

  for (const child of children) {
    const res = findWidgetByKey(child, key);
    if (res) {
      return res;
    }
  }
  return null;
}

function buildTree(element: any): Widget {
  const data = compileElement(element);
  const root = WidgetRegistry.createWidget(data)!;
  // @ts-ignore
  root.createElement(data);
  return root;
}

function getOffsetRelativeToRoot(node: Widget, root: Widget): { x: number; y: number } {
  let current = node;
  let totalX = 0;
  let totalY = 0;
  while (current && current !== root) {
    totalX += current.renderObject.offset.dx;
    totalY += current.renderObject.offset.dy;
    current = current.parent!;
  }
  return { x: totalX, y: totalY };
}

describe('完整 Demo 标签页布局分析', () => {
  it('场景 1：标准桌面 (800x600) - 应居中', () => {
    const viewportWidth = 800;
    const viewportHeight = 600;
    const template = (
      <WidgetGalleryDemo width={viewportWidth} height={viewportHeight} theme={Themes.light} />
    );
    const root = buildTree(template) as ScrollView;

    // 执行布局
    root.layout(
      createBoxConstraints({
        minWidth: viewportWidth,
        maxWidth: viewportWidth,
        minHeight: viewportHeight,
        maxHeight: viewportHeight,
      }),
    );

    const column = findWidgetByKey(root, 'complete-demo-root')!;
    const { x } = getOffsetRelativeToRoot(column, root);
    const columnWidth = column.renderObject.size.width;

    // 预期居中
    const expectedX = (viewportWidth - columnWidth) / 2;

    expect(columnWidth).toBeLessThan(viewportWidth); // 内容适应
    expect(Math.abs(x - expectedX)).toBeLessThan(1); // 居中
    expect(x).toBeGreaterThan(0);
  });

  it('场景 2：大屏幕 (1200x800) - 应居中', () => {
    const viewportWidth = 1200;
    const viewportHeight = 800;
    const template = (
      <WidgetGalleryDemo width={viewportWidth} height={viewportHeight} theme={Themes.light} />
    );
    const root = buildTree(template) as ScrollView;

    root.layout(
      createBoxConstraints({
        minWidth: viewportWidth,
        maxWidth: viewportWidth,
        minHeight: viewportHeight,
        maxHeight: viewportHeight,
      }),
    );

    const column = findWidgetByKey(root, 'complete-demo-root')!;
    const { x } = getOffsetRelativeToRoot(column, root);
    const columnWidth = column.renderObject.size.width;

    const expectedX = (viewportWidth - columnWidth) / 2;

    expect(columnWidth).toBeLessThan(viewportWidth);
    expect(Math.abs(x - expectedX)).toBeLessThan(1);
  });

  it('场景 3：小屏幕 (400x800) - 应左对齐 (如果 ScrollView 行为正确)', () => {
    // 内容 (432) > 视口 (350)
    // 应该从 0 开始（或者如果居中逻辑适用于较大内容则接近 0？）
    // 如果 Container minWidth=350. Child=432.
    // Container width = max(350, 432) = 432.
    // Container alignment center. Child is 432. (432-432)/2 = 0.
    // 所以偏移应该是 0.

    const viewportWidth = 350; // < 432 (卡片宽度 200 * 2 + spacing 16 + padding 16 = 432?)
    const viewportHeight = 800;
    const template = (
      <WidgetGalleryDemo width={viewportWidth} height={viewportHeight} theme={Themes.light} />
    );
    const root = buildTree(template) as ScrollView;

    root.layout(
      createBoxConstraints({
        minWidth: viewportWidth,
        maxWidth: viewportWidth,
        minHeight: viewportHeight,
        maxHeight: viewportHeight,
      }),
    );

    // 验证 ScrollView 内容尺寸
    // 通过类型断言或 renderObject 访问受保护的 _contentSize
    // ScrollView 在 performLayout 中更新 _contentSize
    // 但我们可以检查 root.renderObject.size 吗？不，那是视口尺寸。
    // 如果内容尺寸 > 视口尺寸，我们可以推断出滚动。
    // 我们可以检查 Container 尺寸是否为 432。

    const column = findWidgetByKey(root, 'complete-demo-root')!;
    const { x } = getOffsetRelativeToRoot(column, root);
    const columnWidth = column.renderObject.size.width;

    // 内容应该比 600 高
    // 验证 Container 高度扩展到子元素高度

    testLogger.log(`[移动端] 视口: ${viewportWidth}, 内容: ${columnWidth}, 偏移: ${x}`);

    expect(columnWidth).toBeGreaterThan(viewportWidth);
    expect(x).toBe(24);
  });

  it('Scenario 4: Short Screen (800x400) - Should Scroll Vertical', () => {
    const viewportWidth = 800;
    const viewportHeight = 400;
    const template = (
      <WidgetGalleryDemo width={viewportWidth} height={viewportHeight} theme={Themes.light} />
    );
    const root = buildTree(template) as ScrollView;

    root.layout(
      createBoxConstraints({
        minWidth: viewportWidth,
        maxWidth: viewportWidth,
        minHeight: viewportHeight,
        maxHeight: viewportHeight,
      }),
    );

    const column = findWidgetByKey(root, 'complete-demo-root')!;
    const columnHeight = column.renderObject.size.height;

    // Content should be taller than 600
    expect(columnHeight).toBeGreaterThan(viewportHeight);

    // 验证 Container 高度扩展到子元素高度
    const container = root.children[0];
    const padding = container.children[0];
    expect(container.renderObject.size.height).toBe(padding.renderObject.size.height);
    expect(padding.renderObject.size.height).toBe(columnHeight + 48);

    testLogger.log(`[Scroll] Viewport Height: ${viewportHeight}, Content Height: ${columnHeight}`);
  });
});
