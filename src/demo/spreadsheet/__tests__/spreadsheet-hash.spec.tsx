import { describe, expect, it, vi } from 'vitest';

import { Spreadsheet } from '../spreadsheet';
import { SpreadsheetModel } from '../spreadsheet-model';
import { SpreadsheetGrid } from '../widgets/grid';

import { Themes } from '@/styles/theme';

describe('Spreadsheet Model Hash & Grid Binding', () => {
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

  it('should generate initial hash', () => {
    const model = new SpreadsheetModel();
    expect(model.hash).toBeDefined();
    expect(model.hash.length).toBeGreaterThan(0);
  });

  it('should update hash when cell data changes', () => {
    const model = new SpreadsheetModel();
    const initialHash = model.hash;

    model.setCell(0, 0, { value: 'test' });
    const newHash = model.hash;

    expect(newHash).not.toBe(initialHash);

    // Set back to empty/undefined should change hash (or revert if implementation matches)
    // My implementation depends on key/value string.
    model.setCell(0, 0, undefined);
    expect(model.hash).not.toBe(newHash);
    // It might be different from initialHash if "undefined" delete logic is different from empty init
    // But it should change.
  });

  it('should update hash when column width changes', () => {
    const model = new SpreadsheetModel();
    const initialHash = model.hash;

    model.setColWidth(0, 200);
    expect(model.hash).not.toBe(initialHash);
  });

  it('should update hash when row height changes', () => {
    const model = new SpreadsheetModel();
    const initialHash = model.hash;

    model.setRowHeight(0, 100);
    expect(model.hash).not.toBe(initialHash);
  });

  it('should pass hash to SpreadsheetGrid', () => {
    const model = new SpreadsheetModel();
    const spreadsheet = new Spreadsheet({
      width: 800,
      height: 600,
      theme: Themes.light,
      model: model,
    });

    let tree = spreadsheet.render();

    // Helper to find SpreadsheetGrid
    function findSpreadsheetGrid(node: any): any {
      if (!node) {
        return null;
      }
      if (node.type === SpreadsheetGrid) {
        return node;
      }

      let children = node.props.children || node.props.child;
      if (!children) {
        return null;
      }

      if (!Array.isArray(children)) {
        children = [children];
      }

      for (const child of children) {
        const found = findSpreadsheetGrid(child);
        if (found) {
          return found;
        }
      }
      return null;
    }

    const grid = findSpreadsheetGrid(tree);
    expect(grid).not.toBeNull();
    expect(grid.props.modelHash).toBe(model.hash);

    // Update model
    model.setCell(1, 1, { value: 'New Value' });
    const newHash = model.hash;

    // Re-render spreadsheet (simulating update)
    // Note: Spreadsheet usually updates via setState.
    // Here we manually call render to check what it WOULD render.
    tree = spreadsheet.render();
    const grid2 = findSpreadsheetGrid(tree);
    expect(grid2.props.modelHash).toBe(newHash);
  });
});
