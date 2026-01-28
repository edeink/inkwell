import { describe, expect, it, vi } from 'vitest';

import { Spreadsheet } from '../spreadsheet';
import { SpreadsheetModel } from '../spreadsheet-model';

import { Stack } from '@/core';
import { Themes } from '@/styles/theme';

// Mock dependencies if needed, but we can use real ones for logic testing
// We might need to mock canvas or other browser APIs if they crash in node environment
// The custom framework seems to handle non-browser env gracefully or we mock things.

describe('Spreadsheet Edit Race Condition', () => {
  // Mock window.matchMedia
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: vi.fn().mockImplementation((query: string) => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    })),
  });

  it('should save data to the correct cell when onFinish is delayed and editingCell has changed', () => {
    // Setup model size
    const model = new SpreadsheetModel({
      defaultRowHeight: 30,
      defaultColWidth: 100,
      headerWidth: 50,
      headerHeight: 30,
      rowCount: 10,
      colCount: 10,
    });

    const spreadsheet = new Spreadsheet({
      width: 800,
      height: 600,
      theme: Themes.light,
      model: model,
    });

    // 1. Start editing cell (0, 0)
    // @ts-ignore - Accessing private method for simulation
    spreadsheet.handleCellDoubleClick(0, 0);

    // Check state
    // @ts-ignore
    expect(spreadsheet.state.editingCell).toEqual({ row: 0, col: 0 });

    // 2. Render to get the onFinish callback for (0, 0)
    const tree = spreadsheet.render();
    // Tree structure: Container -> Stack -> [Positioned(ScrollView), Positioned(ColHeaders), Positioned(RowHeaders), Positioned(Corner), SpreadsheetEditableText]
    // We need to find SpreadsheetEditableText

    // Helper to find component in tree
    function findEditableText(node: any): any {
      if (node.type === Stack) {
        const children = node.props.children;
        // The last child in the stack is likely the editor (based on Z-order/code)
        // In code: {editor} is the last element in Stack
        return children[children.length - 1];
      }
      return null;
    }

    // Since tree is Container -> Stack
    // @ts-ignore
    const stack = tree.props.child || tree.props.children;
    // Wait, Container usually has `child` or `children`. In Inkwell `Container` might be different.
    // Let's assume we can traverse or just look at `spreadsheet.render()` output structure from previous read.
    // Container -> Stack

    // Actually, let's look at the render code:
    // return <Container ...><Stack> ... {editor} </Stack></Container>

    const container = tree as any;
    const stackNode = container.props.child || container.props.children;
    // Stack children array
    const stackChildren = stackNode.props.children;

    // The editor is the last child if it exists
    const editorWidget00 = stackChildren[stackChildren.length - 1];

    // Verify it is the editor
    expect(editorWidget00).not.toBeNull();
    // Depending on implementation, it might be the component instance or descriptor
    // In this framework, render returns Element/Widget descriptor.
    // We check props.

    const onFinish00 = editorWidget00.props.onFinish;
    expect(typeof onFinish00).toBe('function');

    // 3. Simulate Double Click on (1, 1) - changing the active cell
    // @ts-ignore
    spreadsheet.handleCellDoubleClick(1, 1);

    // Check state
    // @ts-ignore
    expect(spreadsheet.state.editingCell).toEqual({ row: 1, col: 1 });

    // 4. Trigger the delayed onFinish from the FIRST editor (0, 0)
    // This simulates the race condition where blur fires after state change
    onFinish00('Value for 0,0');

    // 5. Assertions

    // Cell (0, 0) should have the value
    const cell00 = model.getCell(0, 0);
    expect(cell00?.value).toBe('Value for 0,0');

    // Cell (1, 1) should NOT have the value
    const cell11 = model.getCell(1, 1);
    expect(cell11?.value).not.toBe('Value for 0,0');

    // editingCell should still be (1, 1) because we are editing it
    // @ts-ignore
    expect(spreadsheet.state.editingCell).toEqual({ row: 1, col: 1 });
  });
});
