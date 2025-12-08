import { beforeEach, describe, expect, it } from 'vitest';

import '../../log-console/index.tsx';

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace NodeJS {}
}

beforeEach(() => {
  if (!(navigator as any).clipboard) {
    (navigator as any).clipboard = { writeText: async () => {} };
  }
  window.InkConsole?.clear();
});

describe('InkConsole 实例隔离', () => {
  it('不同实例的日志互不干扰', () => {
    window.InkConsole!.log('A', 'hello A');
    window.InkConsole!.info('B', 'hello B');

    const aLogs = window.InkConsole!.getLogs('A');
    const bLogs = window.InkConsole!.getLogs('B');
    const all = window.InkConsole!.getLogs();

    expect(aLogs.length).toBe(1);
    expect(aLogs[0].text).toMatch('hello A');
    expect(bLogs.length).toBe(1);
    expect(bLogs[0].text).toMatch('hello B');
    expect(all.length).toBe(2);
  });

  it('清理指定实例仅影响该实例', () => {
    window.InkConsole!.warn('A', 'warn A');
    window.InkConsole!.error('B', 'error B');

    window.InkConsole!.clear('A');

    expect(window.InkConsole!.getLogs('A')).toEqual([]);
    expect(window.InkConsole!.getLogs('B').length).toBe(1);
  });
});
