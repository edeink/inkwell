import { describe, expect, it } from 'vitest';

import { DISPATCH_PHASE_CAPTURE } from '@/core/events/constants';

function bench(label: string, fn: () => number): { label: string; ms: number; value: number } {
  const start = performance.now();
  const value = fn();
  const end = performance.now();
  return { label, ms: end - start, value };
}

describe('字符串比较性能基准', () => {
  it('字面量与常量的比较耗时对比（不做强断言）', () => {
    const iterations = 5_000_000;
    const literalA = 'capture';
    const literalB = 'capture';
    const constant = DISPATCH_PHASE_CAPTURE;
    const constant2 = DISPATCH_PHASE_CAPTURE;

    for (let i = 0; i < 200_000; i++) {
      void (literalA === literalB);
      void (constant === literalA);
      void (constant === constant2);
    }

    const r1 = bench('字面量 === 字面量', () => {
      let hits = 0;
      for (let i = 0; i < iterations; i++) {
        if (literalA === literalB) {
          hits++;
        }
      }
      return hits;
    });

    const r2 = bench('常量 === 字面量', () => {
      let hits = 0;
      for (let i = 0; i < iterations; i++) {
        if (constant === literalA) {
          hits++;
        }
      }
      return hits;
    });

    const r3 = bench('常量 === 常量', () => {
      let hits = 0;
      for (let i = 0; i < iterations; i++) {
        if (constant === constant2) {
          hits++;
        }
      }
      return hits;
    });

    expect(r1.value).toBe(iterations);
    expect(r2.value).toBe(iterations);
    expect(r3.value).toBe(iterations);

    console.log('[基准] 字符串比较耗时（ms）', {
      [r1.label]: Number(r1.ms.toFixed(2)),
      [r2.label]: Number(r2.ms.toFixed(2)),
      [r3.label]: Number(r3.ms.toFixed(2)),
    });
  });
});
