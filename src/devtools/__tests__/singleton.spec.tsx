/**
 * Devtools 单例管理测试
 *
 * 验证单例初始化、并发初始化与销毁重建流程。
 * 注意事项：测试过程中会操作 DOM。
 * 潜在副作用：创建并销毁 Devtools 实例。
 */
import { act } from 'react';
import { afterEach, describe, expect, it } from 'vitest';

import { Devtools } from '@/devtools';

describe('DevTools 单例管理', () => {
  afterEach(() => {
    act(() => {
      Devtools.reset();
    });
  });

  it('多次初始化返回相同实例', () => {
    let a: Devtools;
    let b: Devtools;
    act(() => {
      a = Devtools.getInstance();
      b = Devtools.getInstance();
    });
    expect(a!).toBe(b!);
    expect(a!.isMounted()).toBe(false);
    act(() => {
      a!.show();
    });
    expect(a!.isMounted()).toBe(true);
  });

  it('并发初始化（DCL）返回相同实例', async () => {
    let tasks: Promise<Devtools>[];
    await act(async () => {
      tasks = Array.from({ length: 16 }, () => Devtools.getInstanceAsync());
    });
    const results = await Promise.all(tasks!);
    const unique = new Set(results);
    expect(unique.size).toBe(1);
    expect(results[0].isMounted()).toBe(false);
    act(() => {
      results[0].show();
    });
    expect(results[0].isMounted()).toBe(true);
  });

  it('销毁后可重新初始化并得到新实例', () => {
    let first: Devtools;
    act(() => {
      first = Devtools.getInstance();
    });
    expect(first!.isMounted()).toBe(false);
    act(() => {
      first!.show();
    });
    expect(first!.isMounted()).toBe(true);
    act(() => {
      first!.dispose();
    });
    expect(first!.isMounted()).toBe(false);
    let second: Devtools;
    act(() => {
      second = Devtools.getInstance();
    });
    expect(second!).not.toBe(first!);
    expect(second!.isMounted()).toBe(false);
    act(() => {
      second!.show();
    });
    expect(second!.isMounted()).toBe(true);
  });
});
