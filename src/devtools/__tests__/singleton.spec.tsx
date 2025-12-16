import { afterEach, describe, expect, it } from 'vitest';

import { Devtools } from '@/devtools';

describe('DevTools 单例管理', () => {
  afterEach(() => {
    Devtools.reset();
  });

  it('多次初始化返回相同实例', () => {
    const a = Devtools.getInstance();
    const b = Devtools.getInstance();
    expect(a).toBe(b);
    expect(a.isMounted()).toBe(true);
  });

  it('并发初始化（DCL）返回相同实例', async () => {
    const tasks = Array.from({ length: 16 }, () => Devtools.getInstanceAsync());
    const results = await Promise.all(tasks);
    const unique = new Set(results);
    expect(unique.size).toBe(1);
    expect(results[0].isMounted()).toBe(true);
  });

  it('销毁后可重新初始化并得到新实例', () => {
    const first = Devtools.getInstance();
    expect(first.isMounted()).toBe(true);
    first.dispose();
    expect(first.isMounted()).toBe(false);
    const second = Devtools.getInstance();
    expect(second).not.toBe(first);
    expect(second.isMounted()).toBe(true);
  });
});
