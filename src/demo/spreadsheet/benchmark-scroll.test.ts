import { describe, expect, it } from 'vitest';

import { SpreadsheetModel } from './spreadsheet-model';
import { SpreadsheetGrid } from './widgets/grid';

// Mock Theme if not easily importable
const MockTheme = {
  text: { primary: '#000000' },
  background: { base: '#ffffff' },
  line: '#e5e5e5',
  primary: '#1890ff',
  component: { gridLine: '#e5e5e5' },
} as any;

describe('SpreadsheetGrid Scroll Performance', () => {
  it('should measure build time during scrolling', () => {
    // 1. Setup Model (1000x1000)
    const model = new SpreadsheetModel({
      rowCount: 1000,
      colCount: 1000,
      defaultRowHeight: 24,
      defaultColWidth: 100,
      headerHeight: 24,
      headerWidth: 40,
    });

    // Fill some data to ensure cells are not empty if that matters (though grid renders empty cells too)
    for (let i = 0; i < 100; i++) {
      model.getCell(i, i); // Just access or set
    }

    // 2. Initial Props
    // Increase viewport to stress test (e.g. 5000x4000 -> ~8300 cells)
    const viewportWidth = 5000;
    const viewportHeight = 4000;

    const props = {
      type: 'SpreadsheetGrid',
      model,
      theme: MockTheme,
      scrollX: 0,
      scrollY: 0,
      viewportWidth,
      viewportHeight,
      showGridLines: true,
      onCellDown: () => {},
      onCellDoubleClick: () => {},
    };

    // 3. Create Component
    const grid = new SpreadsheetGrid(props);

    // Initial Build
    const startInit = performance.now();
    grid.createElement(props);
    const endInit = performance.now();
    console.log(`Initial Build Time: ${(endInit - startInit).toFixed(2)}ms`);

    // Run benchmark multiple times for statistical significance
    const ITERATIONS = 5;
    const results: number[] = [];

    console.log(`Running benchmark ${ITERATIONS} times...`);

    for (let run = 0; run < ITERATIONS; run++) {
      let totalTime = 0;
      // Scroll simulation
      const frames = 50;
      for (let i = 0; i < frames; i++) {
        const newScrollY = i * 10;
        const newProps = {
          ...props,
          scrollY: newScrollY,
        };

        const start = performance.now();
        grid.createElement(newProps);
        const end = performance.now();
        totalTime += end - start;
      }
      const avgTime = totalTime / frames;
      results.push(avgTime);
      console.log(`Run ${run + 1}: Average Frame Time = ${avgTime.toFixed(2)}ms`);

      // Reset for next run if needed, though we are creating new elements
      // Force garbage collection if possible (not in JS/TS directly)
    }

    const average = results.reduce((a, b) => a + b, 0) / results.length;
    const min = Math.min(...results);
    const max = Math.max(...results);

    console.log('--------------------------------------------------');
    console.log(`Benchmark Results (${ITERATIONS} runs):`);
    console.log(`Average: ${average.toFixed(2)}ms`);
    console.log(`Min: ${min.toFixed(2)}ms`);
    console.log(`Max: ${max.toFixed(2)}ms`);
    console.log('--------------------------------------------------');

    expect(average).toBeLessThan(60); // Performance budget
  });
});
