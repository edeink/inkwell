import { afterEach, describe, expect, it, vi } from 'vitest';

import { createLocalStorage } from '../local-storage';

type MockLocalStorage = {
  getItem: (key: string) => string | null;
  setItem: (key: string, value: string) => void;
  removeItem: (key: string) => void;
};

function setMockLocalStorage(mock: MockLocalStorage): void {
  Object.defineProperty(globalThis, 'localStorage', {
    value: mock,
    configurable: true,
    enumerable: true,
    writable: true,
  });
}

afterEach(() => {
  vi.restoreAllMocks();
  delete (globalThis as any).localStorage;
});

let keySeq = 0;
function nextKey(prefix: string): string {
  keySeq += 1;
  return `__test__/${prefix}/${keySeq}`;
}

describe('local-storage createLocalStorage', () => {
  it('读取字符串：codec=string 时命中 key 返回字符串', () => {
    const key = nextKey('string-hit');
    const getItem = vi.fn((k: string) => (k === key ? 'v1' : null));
    setMockLocalStorage({ getItem, setItem: vi.fn(), removeItem: vi.fn() });

    const storage = createLocalStorage<string>(key, undefined, { codec: 'string' });
    expect(storage.get()).toBe('v1');
  });

  it('读取字符串：codec=string 时缺省返回默认值并写入', () => {
    const key = nextKey('string-miss-default');
    const getItem = vi.fn(() => null);
    const setItem = vi.fn();
    setMockLocalStorage({ getItem, setItem, removeItem: vi.fn() });

    const storage = createLocalStorage<string>(key, 'd', { codec: 'string' });
    expect(storage.get()).toBe('d');
    expect(setItem).toHaveBeenCalledWith(key, 'd');
  });

  it('读取对象：codec=json 时命中 key 返回解析结果', () => {
    const key = nextKey('json-hit');
    const getItem = vi.fn((k: string) => (k === key ? '{"a":1}' : null));
    setMockLocalStorage({ getItem, setItem: vi.fn(), removeItem: vi.fn() });

    const storage = createLocalStorage<{ a: number }>(key, undefined, { codec: 'json' });
    expect(storage.get()).toEqual({ a: 1 });
  });

  it('读取对象：codec=json 时缺省返回默认值并写入', () => {
    const key = nextKey('json-miss-default');
    const getItem = vi.fn(() => null);
    const setItem = vi.fn();
    setMockLocalStorage({ getItem, setItem, removeItem: vi.fn() });

    const storage = createLocalStorage<{ a: number }>(key, { a: 2 }, { codec: 'json' });
    expect(storage.get()).toEqual({ a: 2 });
    expect(setItem).toHaveBeenCalledWith(key, '{"a":2}');
  });

  it('读取异常：JSON 解析失败时返回默认值并输出 warn', () => {
    const key = nextKey('json-parse-fail');
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    const removeItem = vi.fn();
    const getItem = vi.fn((k: string) => (k === key ? '{' : null));
    setMockLocalStorage({ getItem, setItem: vi.fn(), removeItem });

    const storage = createLocalStorage<{ a: number }>(key, { a: 1 }, { codec: 'json' });
    expect(storage.get()).toEqual({ a: 1 });
    expect(warn).toHaveBeenCalledTimes(1);
    expect(removeItem).toHaveBeenCalledWith(key);
  });

  it('读取异常：getItem 抛错时返回默认值并输出 warn', () => {
    const key = nextKey('getItem-throw');
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    setMockLocalStorage({
      getItem: vi.fn(() => {
        throw new Error('boom');
      }),
      setItem: vi.fn(),
      removeItem: vi.fn(),
    });

    const storage = createLocalStorage<string>(key, 'd', { codec: 'string' });
    expect(storage.get()).toBe('d');
    expect(warn).toHaveBeenCalledTimes(1);
  });

  it('写入对象：codec=json 时按 JSON 序列化写入', () => {
    const key = nextKey('json-set');
    const setItem = vi.fn();
    setMockLocalStorage({ getItem: vi.fn(), setItem, removeItem: vi.fn() });

    const storage = createLocalStorage<{ a: number; b: string }>(key, undefined, { codec: 'json' });
    storage.set({ a: 1, b: 'x' });
    expect(setItem).toHaveBeenCalledWith(key, '{"a":1,"b":"x"}');
  });

  it('写入字符串：codec=string 时写入字符串；clear 时删除', () => {
    const key = nextKey('string-set-clear');
    const setItem = vi.fn();
    const removeItem = vi.fn();
    setMockLocalStorage({ getItem: vi.fn(), setItem, removeItem });

    const storage = createLocalStorage<string>(key, undefined, { codec: 'string' });
    storage.set('v');
    expect(setItem).toHaveBeenCalledWith(key, 'v');
    storage.clear();
    expect(removeItem).toHaveBeenCalledWith(key);
  });

  it('写入异常：setItem 抛错时输出 warn 且不抛出', () => {
    const key = nextKey('setItem-throw');
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    setMockLocalStorage({
      getItem: vi.fn(),
      setItem: vi.fn(() => {
        throw new Error('boom');
      }),
      removeItem: vi.fn(),
    });

    const storage = createLocalStorage<string>(key, undefined, { codec: 'string' });
    expect(() => storage.set('v')).not.toThrow();
    expect(warn).toHaveBeenCalledTimes(1);
  });

  it('无 localStorage：读返回默认值；写入不报错', () => {
    const key = nextKey('no-localStorage');
    delete (globalThis as any).localStorage;

    const storage = createLocalStorage(key, { a: 1 }, { codec: 'json' });
    expect(storage.get()).toEqual({ a: 1 });
    expect(() => storage.set({ a: 2 })).not.toThrow();
  });
});
