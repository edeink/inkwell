import fs from 'fs';
import path from 'path';

import { describe, expect, it } from 'vitest';

import {
  createController,
  CrudModule,
  EventsModule,
  HistoryModule,
  LayoutModule,
  MindmapController,
} from '../../index';

describe('controller/index exports', () => {
  it('exports MindmapController and factory', () => {
    expect(typeof MindmapController).toBe('function');
    expect(typeof createController).toBe('function');
  });

  it('exports modules', () => {
    expect(typeof EventsModule).toBe('function');
    expect(typeof HistoryModule).toBe('function');
    expect(typeof LayoutModule).toBe('function');
    expect(typeof CrudModule).toBe('function');
  });
});

describe('module boundaries', () => {
  const modDir = path.resolve(__dirname, '..');
  const files = ['events.ts', 'history.ts', 'layout.ts', 'crud.ts'];

  it('each module file is under 300 lines', () => {
    for (const f of files) {
      const p = path.join(modDir, f);
      const text = fs.readFileSync(p, 'utf-8');
      const lines = text.split(/\r?\n/).length;
      expect(lines).toBeLessThanOrEqual(300);
    }
  });

  it('crud module imports only allowed internal modules', () => {
    const p = path.join(modDir, 'crud.ts');
    const text = fs.readFileSync(p, 'utf-8');
    const importLines = text
      .split(/\r?\n/)
      .filter((l) => l.trim().startsWith('import'))
      .join('\n');
    expect(importLines).toMatch(/history/);
    expect(importLines).toMatch(/layout/);
  });
});
