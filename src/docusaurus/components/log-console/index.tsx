import {
  ClearOutlined,
  CloseCircleOutlined,
  CopyOutlined,
  FileTextOutlined,
  InfoCircleOutlined,
  WarningOutlined,
} from '@ant-design/icons';
import { Divider, Tooltip } from 'antd';
import classNames from 'classnames';
import { useEffect, useReducer, useRef, useState } from 'react';

import styles from './index.module.less';

type Level = 'log' | 'info' | 'warn' | 'error';

type Entry = {
  id: string;
  level: Level;
  time: number;
  text: string;
  instanceId: string;
};

const ids: Set<string> = new Set();
const registry: { logsByInstance: Map<string, Entry[]>; listeners: Set<() => void> } = {
  logsByInstance: new Map(),
  listeners: new Set(),
};

const currentInstanceId: string | null = null;

function notify() {
  for (const fn of registry.listeners) {
    fn();
  }
}

function getList(id: string): Entry[] {
  let list = registry.logsByInstance.get(id);
  if (!list) {
    list = [];
    registry.logsByInstance.set(id, list);
  }
  return list;
}

function toText(args: unknown[]): string {
  return args
    .map((a) => {
      try {
        if (typeof a === 'string') {
          return a;
        }
        if (a instanceof Error) {
          return a.stack || a.message || String(a);
        }
        return JSON.stringify(a);
      } catch {
        return String(a);
      }
    })
    .join(' ');
}

function add(level: Level, args: unknown[], instanceId: string) {
  ids.add(instanceId);
  const list = getList(instanceId);
  list.push({
    id: Math.random().toString(36).slice(2),
    level,
    time: Date.now(),
    text: toText(args),
    instanceId,
  });
  notify();
}

function clear(instanceId?: string) {
  if (instanceId) {
    registry.logsByInstance.delete(instanceId);
  } else {
    registry.logsByInstance.clear();
  }
  notify();
}

function copy(instanceId?: string) {
  const lists = instanceId ? [getList(instanceId)] : Array.from(registry.logsByInstance.values());
  const txt = lists
    .flat()
    .map((l) => `[${new Date(l.time).toLocaleTimeString()}][${l.level}] ${l.text}`)
    .join('\n');
  return navigator.clipboard.writeText(txt);
}

function getLogs(instanceId?: string): Entry[] {
  if (instanceId) {
    return getList(instanceId).slice();
  }
  return Array.from(registry.logsByInstance.values()).flat().slice();
}

declare global {
  interface Window {
    InkConsole: {
      log: (...args: unknown[]) => void;
      info: (...args: unknown[]) => void;
      warn: (...args: unknown[]) => void;
      error: (...args: unknown[]) => void;
      clear: (...args: unknown[]) => void;
      copy: (...args: unknown[]) => Promise<void>;
      getLogs: (...args: unknown[]) => Entry[];
      getIds: () => string[];
      subscribe: (fn: () => void) => void;
      unsubscribe: (fn: () => void) => void;
    };
  }
}

if (typeof window !== 'undefined') {
  if (!window.InkConsole) {
    window.InkConsole = {
      log: (...args: unknown[]) => {
        const [first, ...rest] = args;
        const treatAsId = typeof first === 'string' && args.length > 1;
        const id = treatAsId ? (first as string) : (currentInstanceId ?? '__global__');
        const payload = treatAsId ? rest : args;
        add('log', payload, id);
      },
      info: (...args: unknown[]) => {
        const [first, ...rest] = args;
        const treatAsId = typeof first === 'string' && args.length > 1;
        const id = treatAsId ? (first as string) : (currentInstanceId ?? '__global__');
        const payload = treatAsId ? rest : args;
        add('info', payload, id);
      },
      warn: (...args: unknown[]) => {
        const [first, ...rest] = args;
        const treatAsId = typeof first === 'string' && args.length > 1;
        const id = treatAsId ? (first as string) : (currentInstanceId ?? '__global__');
        const payload = treatAsId ? rest : args;
        add('warn', payload, id);
      },
      error: (...args: unknown[]) => {
        const [first, ...rest] = args;
        const treatAsId = typeof first === 'string' && args.length > 1;
        const id = treatAsId ? (first as string) : (currentInstanceId ?? '__global__');
        const payload = treatAsId ? rest : args;
        add('error', payload, id);
      },
      clear: (...args: unknown[]) => {
        const [first] = args;
        clear(typeof first === 'string' ? (first as string) : undefined);
      },
      copy: (...args: unknown[]) => {
        const [first] = args;
        return copy(typeof first === 'string' ? (first as string) : undefined);
      },
      getLogs: (...args: unknown[]) => {
        const [first] = args;
        return getLogs(typeof first === 'string' ? (first as string) : undefined);
      },
      getIds: () => Array.from(ids),
      subscribe: (fn: () => void) => {
        registry.listeners.add(fn);
      },
      unsubscribe: (fn: () => void) => {
        registry.listeners.delete(fn);
      },
    };
  }
}

/**
 * LogConsole 组件：全局日志面板。
 *
 * 功能特性：
 * - 垂直级别筛选按钮（log/info/warn/error）与关键字过滤。
 * - 图标化操作（清空、复制全部），每条日志支持单独复制。
 * - 后台持续收集日志：通过 `InkConsole` 聚合所有 Inkwell 实例的日志。
 * - 不拦截 `window.console`，仅收录 `inkwell.log/info/warn/error` 或经编译替换后的 `InkConsole.*`。
 */
export default function LogConsole({ instanceId }: { instanceId?: string }) {
  const [filter, setFilter] = useState('');
  const [show, setShow] = useState<{ log: boolean; info: boolean; warn: boolean; error: boolean }>({
    log: true,
    info: true,
    warn: true,
    error: true,
  });
  const [, force] = useReducer((x) => x + 1, 0);
  const [copyAllTip, setCopyAllTip] = useState<string | null>(null);
  const copyAllTimerRef = useRef<number | null>(null);
  const [entryCopyTips, setEntryCopyTips] = useState<Record<string, string>>({});
  const entryCopyTimerRef = useRef<Record<string, number>>({});
  const [selectedId, setSelectedId] = useState<string>(instanceId ?? '');

  useEffect(() => {
    window.InkConsole?.subscribe(force as () => void);
    return () => {
      window.InkConsole?.unsubscribe(force as () => void);
      if (copyAllTimerRef.current) {
        window.clearTimeout(copyAllTimerRef.current);
        copyAllTimerRef.current = null;
      }
      Object.values(entryCopyTimerRef.current).forEach((t) => window.clearTimeout(t));
      entryCopyTimerRef.current = {};
    };
  }, []);

  const idList = [''].concat(window.InkConsole?.getIds?.() ?? []);
  const entries =
    window.InkConsole?.getLogs().filter(
      (l) =>
        show[l.level] &&
        (!selectedId || l.instanceId === selectedId) &&
        (!filter || l.text.toLowerCase().includes(filter.toLowerCase())),
    ) ?? [];

  return (
    <div className={styles.consoleWrapper}>
      <div className={styles.sidebar}>
        <button
          type="button"
          aria-label="log"
          className={styles.levelBtn}
          data-active={String(show.log)}
          onClick={() => setShow((s) => ({ ...s, log: !s.log }))}
        >
          <FileTextOutlined />
        </button>
        <button
          type="button"
          aria-label="info"
          className={styles.levelBtn}
          data-active={String(show.info)}
          onClick={() => setShow((s) => ({ ...s, info: !s.info }))}
        >
          <InfoCircleOutlined style={{ color: '#1677ff' }} />
        </button>
        <button
          type="button"
          aria-label="warn"
          className={styles.levelBtn}
          data-active={String(show.warn)}
          onClick={() => setShow((s) => ({ ...s, warn: !s.warn }))}
        >
          <WarningOutlined style={{ color: '#faad14' }} />
        </button>
        <button
          type="button"
          aria-label="error"
          className={styles.levelBtn}
          data-active={String(show.error)}
          onClick={() => setShow((s) => ({ ...s, error: !s.error }))}
        >
          <CloseCircleOutlined style={{ color: '#ff4d4f' }} />
        </button>
      </div>
      <div className={styles.main}>
        <div className={styles.toolbar}>
          <select
            className={styles.filterId}
            value={selectedId}
            onChange={(e) => setSelectedId(e.target.value)}
            aria-label="选择实例"
          >
            <option value="">全部实例</option>
            {idList.map((id) =>
              id ? (
                <option key={id} value={id}>
                  {id}
                </option>
              ) : null,
            )}
          </select>
          <Divider type="vertical" />
          <input
            className={styles.filterInput}
            placeholder="过滤关键字"
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
          />
          <Tooltip title="清空" placement="top" mouseEnterDelay={0.15}>
            <button
              type="button"
              aria-label="清空"
              className={styles.iconOnly}
              onClick={() => window.InkConsole?.clear()}
            >
              <ClearOutlined />
            </button>
          </Tooltip>
          <Tooltip title={copyAllTip ?? '复制全部'} placement="top" mouseEnterDelay={0.15}>
            <button
              type="button"
              aria-label="复制全部"
              className={styles.iconOnly}
              onClick={() => {
                window.InkConsole?.copy?.()
                  .then(() => {
                    setCopyAllTip(`复制成功`);
                    if (copyAllTimerRef.current) {
                      window.clearTimeout(copyAllTimerRef.current);
                    }
                    copyAllTimerRef.current = window.setTimeout(() => {
                      setCopyAllTip(null);
                      copyAllTimerRef.current = null;
                    }, 1800);
                  })
                  .catch(() => {
                    setCopyAllTip('复制失败，请重试');
                    if (copyAllTimerRef.current) {
                      window.clearTimeout(copyAllTimerRef.current);
                    }
                    copyAllTimerRef.current = window.setTimeout(() => {
                      setCopyAllTip(null);
                      copyAllTimerRef.current = null;
                    }, 1800);
                  });
              }}
            >
              <CopyOutlined />
            </button>
          </Tooltip>
        </div>
        <div className={styles.logList}>
          {entries.map((l) => (
            <div key={l.id} className={styles.entry}>
              <span className={classNames(styles.level, styles[l.level])} data-level={l.level}>
                {l.level === 'log' && <FileTextOutlined />}
                {l.level === 'info' && <InfoCircleOutlined style={{ color: '#1677ff' }} />}
                {l.level === 'warn' && <WarningOutlined style={{ color: '#faad14' }} />}
                {l.level === 'error' && <CloseCircleOutlined style={{ color: '#ff4d4f' }} />}
              </span>
              <span className={classNames(styles.msg, styles[l.level])}>{l.text}</span>
              <span className={styles.time}>{new Date(l.time).toLocaleTimeString()}</span>
              <span className={styles.tail}>
                <Tooltip
                  title={entryCopyTips[l.id] ?? '复制'}
                  placement="top"
                  mouseEnterDelay={0.15}
                >
                  <button
                    type="button"
                    aria-label="复制"
                    className={styles.entryBtn}
                    onClick={() => {
                      navigator.clipboard
                        .writeText(l.text)
                        .then(() => {
                          setEntryCopyTips((prev) => ({ ...prev, [l.id]: `复制成功` }));
                          const t = entryCopyTimerRef.current[l.id];
                          if (t) {
                            window.clearTimeout(t);
                          }
                          entryCopyTimerRef.current[l.id] = window.setTimeout(() => {
                            setEntryCopyTips((prev) => {
                              const n = { ...prev };
                              delete n[l.id];
                              return n;
                            });
                            delete entryCopyTimerRef.current[l.id];
                          }, 1800);
                        })
                        .catch(() => {
                          setEntryCopyTips((prev) => ({ ...prev, [l.id]: '复制失败，请重试' }));
                          const t = entryCopyTimerRef.current[l.id];
                          if (t) {
                            window.clearTimeout(t);
                          }
                          entryCopyTimerRef.current[l.id] = window.setTimeout(() => {
                            setEntryCopyTips((prev) => {
                              const n = { ...prev };
                              delete n[l.id];
                              return n;
                            });
                            delete entryCopyTimerRef.current[l.id];
                          }, 1800);
                        });
                    }}
                  >
                    <CopyOutlined />
                  </button>
                </Tooltip>
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
