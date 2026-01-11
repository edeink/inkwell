/** @jsxImportSource @/utils/compiler */
import { describe, expect, it, vi } from 'vitest';

import { SpreadsheetModel } from '../../spreadsheet-model';
import { SpreadsheetGrid } from '../grid';

import { Container } from '@/core/container';
import { Themes } from '@/styles/theme';

describe('SpreadsheetGrid Interaction', () => {
  it('should prevent scroll propagation on cell pointer down', () => {
    const model = new SpreadsheetModel();
    const onCellDown = vi.fn();

    const grid = new SpreadsheetGrid({
      type: 'SpreadsheetGrid',
      model,
      theme: Themes.light,
      scrollX: 0,
      scrollY: 0,
      viewportWidth: 800,
      viewportHeight: 600,
      selection: null,
      showGridLines: true,
      onCellDown,
      onCellDoubleClick: vi.fn(),
    });

    // Render the grid
    const rootElement = grid.render();

    // Structure: Container -> Stack -> [Positioned -> Container(cell), ...]
    // Helper to find the first cell container
    function findFirstCell(el: any): any {
      // Check if type matches Container class
      if (el.type === Container && el.props.onPointerDown) {
        return el;
      }
      const children = el.props?.children;
      if (Array.isArray(children)) {
        for (const child of children) {
          const found = findFirstCell(child);
          if (found) {
            return found;
          }
        }
      } else if (children) {
        return findFirstCell(children);
      }
      return null;
    }

    const cell = findFirstCell(rootElement);
    expect(cell).toBeTruthy();

    // Verify cursor style
    expect(cell.props.cursor).toBe('cell');

    // Verify stopPropagation
    const stopPropagation = vi.fn();
    const event = { stopPropagation } as any;

    cell.props.onPointerDown(event);

    expect(stopPropagation).toHaveBeenCalled();
    expect(onCellDown).toHaveBeenCalled();
  });
});
