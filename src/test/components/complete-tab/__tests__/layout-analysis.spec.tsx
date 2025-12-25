import { describe, expect, it } from 'vitest';

import { getTestTemplate } from '../data';

import { createBoxConstraints, Widget } from '@/core/base';
import { WidgetRegistry } from '@/core/registry';
import { ScrollView } from '@/core/viewport/scroll-view';
import { compileElement } from '@/utils/compiler/jsx-compiler';

// Helper to find widget by key
function findWidgetByKey(root: Widget, key: string): Widget | null {
  if (root.key === key) {
    return root;
  }

  // Handle children
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

describe('Complete Demo Tab Layout Analysis', () => {
  it('Scenario 1: Standard Desktop (800x600) - Should Center', () => {
    const viewportWidth = 800;
    const viewportHeight = 600;
    const template = getTestTemplate(viewportWidth, viewportHeight);
    const root = buildTree(template) as ScrollView;

    // Perform layout
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

    // Expect Centered
    const expectedX = (viewportWidth - columnWidth) / 2;

    expect(columnWidth).toBeLessThan(viewportWidth); // Content fits
    expect(Math.abs(x - expectedX)).toBeLessThan(1); // Centered
    expect(x).toBeGreaterThan(0);

    console.log(`[Desktop] Viewport: ${viewportWidth}, Content: ${columnWidth}, Offset: ${x}`);
  });

  it('Scenario 2: Large Screen (1200x800) - Should Center', () => {
    const viewportWidth = 1200;
    const viewportHeight = 800;
    const template = getTestTemplate(viewportWidth, viewportHeight);
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

    console.log(`[Large] Viewport: ${viewportWidth}, Content: ${columnWidth}, Offset: ${x}`);
  });

  it('Scenario 3: Mobile Portrait (350x800) - Should Scroll (Not Center, Start at 0)', () => {
    const viewportWidth = 350;
    const viewportHeight = 800;
    const template = getTestTemplate(viewportWidth, viewportHeight);
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

    // Content (432) > Viewport (350)
    // Should start at 0 (or close to 0 if centered logic applies to larger content?)
    // If Container minWidth=350. Child=432.
    // Container width = max(350, 432) = 432.
    // Container alignment center. Child is 432. (432-432)/2 = 0.
    // So offset should be 0.

    expect(columnWidth).toBeGreaterThan(viewportWidth);
    expect(x).toBe(0);

    // Verify ScrollView content size
    // Access protected _contentSize via type assertion or renderObject
    // ScrollView updates _contentSize in performLayout
    // But we can check root.renderObject.size? No that's viewport size.
    // We can infer scrolling if content size > viewport size.
    // We can check if Container size is 432.
    const container = root.children[0]; // The Container we added
    expect(container.renderObject.size.width).toBe(columnWidth);
    expect(container.renderObject.size.width).toBeGreaterThan(viewportWidth);

    console.log(`[Mobile] Viewport: ${viewportWidth}, Content: ${columnWidth}, Offset: ${x}`);
  });

  it('Scenario 4: Verify Vertical Scroll Functionality', () => {
    // Ensure height allows scrolling
    const viewportWidth = 800;
    const viewportHeight = 600;
    const template = getTestTemplate(viewportWidth, viewportHeight);
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

    // Verify Container height expands to child height
    const container = root.children[0];
    expect(container.renderObject.size.height).toBe(columnHeight);

    console.log(`[Scroll] Viewport Height: ${viewportHeight}, Content Height: ${columnHeight}`);
  });
});
