import { beforeEach, describe, expect, it } from 'vitest';

import '../../log-console/index.tsx';

beforeEach(() => {
  window.InkConsole?.clear();
});

describe('InkConsole API（带实例ID）', () => {
  it('InkConsole.log(id, ...) 写入到指定实例', () => {
    window.InkConsole.log('X', 'x1');
    window.InkConsole.info('Y', 'y1');

    const x = window.InkConsole!.getLogs('X');
    const y = window.InkConsole!.getLogs('Y');
    const all = window.InkConsole!.getLogs();

    expect(x.length).toBe(1);
    expect(x[0].text).toContain('x1');
    expect(y.length).toBe(1);
    expect(y[0].text).toContain('y1');
    expect(all.length).toBe(2);
  });

  it('省略实例ID时写入到全局分组', () => {
    window.InkConsole.warn('g1');
    const all = window.InkConsole!.getLogs();
    expect(all.length).toBe(1);
    expect(all[0].text).toContain('g1');
  });

  it('clear(id) 仅清理指定实例', () => {
    window.InkConsole.log('A', 'a');
    window.InkConsole.log('B', 'b');
    window.InkConsole.clear('A');
    expect(window.InkConsole!.getLogs('A')).toEqual([]);
    expect(window.InkConsole!.getLogs('B').length).toBe(1);
  });
});
