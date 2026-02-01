import { useCallback, useEffect, useRef, useState } from 'react';

import LogConsole from '../log-console';

import styles from './index.module.less';

import { Tooltip } from '@/ui';
import { ConsoleOutlined, DeleteOutlined, PlayCircleOutlined } from '@/ui/icons';

export interface ControlPanelProps {
  running: boolean;
  error: string | null;
  onRun: () => void;
  onClear: () => void;
  isConsoleVisible?: boolean;
  onToggleConsole?: (visible: boolean) => void;
  instanceId?: string;
}

export default function ControlPanel({
  running,
  error,
  onRun,
  onClear,
  isConsoleVisible,
  onToggleConsole,
  instanceId,
}: ControlPanelProps) {
  const [localVisible, setLocalVisible] = useState(false);
  const visible = isConsoleVisible ?? localVisible;
  const [hasUserHidden, setHasUserHidden] = useState(false);
  const setVisible = useCallback(
    (v: boolean) => {
      if (!v) {
        setHasUserHidden(true);
      }
      if (onToggleConsole) {
        onToggleConsole(v);
      } else {
        setLocalVisible(v);
      }
    },
    [onToggleConsole],
  );
  const [logCount, setLogCount] = useState(0);
  const lastLenRef = useRef<number>(0);
  useEffect(() => {
    if (error) {
      try {
        window.InkConsole?.error(error);
      } catch {}
    }
  }, [error]);
  useEffect(() => {
    const initial = window.InkConsole?.getLogs?.(instanceId).length || 0;
    lastLenRef.current = initial;
    setLogCount(initial);
    const cb = () => {
      const len = window.InkConsole?.getLogs?.(instanceId).length || 0;
      const prev = lastLenRef.current;
      lastLenRef.current = len;
      setLogCount(len);
      if (!visible && !hasUserHidden && prev === 0 && len > 0) {
        setVisible(true);
      }
    };
    window.InkConsole?.subscribe?.(cb);
    return () => {
      window.InkConsole?.unsubscribe?.(cb);
    };
  }, [visible, hasUserHidden, setVisible, instanceId]);
  return (
    <div className={styles.controlPanel}>
      <div className={styles.controlBar}>
        <Tooltip title={visible ? '隐藏控制台' : '显示控制台'} placement="top">
          <span className={styles.iconWrapper}>
            <button
              type="button"
              aria-label="切换控制台"
              className={styles.iconBtn}
              data-active={String(visible)}
              onClick={() => setVisible(!visible)}
            >
              <ConsoleOutlined />
            </button>
            {logCount > 1 && (
              <span className={styles.count}>{logCount > 999 ? '999+' : logCount}</span>
            )}
          </span>
        </Tooltip>
        <Tooltip title="运行" placement="top">
          <button
            type="button"
            aria-label="运行"
            className={styles.iconBtn}
            onClick={onRun}
            disabled={running}
          >
            <PlayCircleOutlined />
          </button>
        </Tooltip>
        <Tooltip title="清空" placement="top">
          <button type="button" aria-label="清空" className={styles.iconBtn} onClick={onClear}>
            <DeleteOutlined />
          </button>
        </Tooltip>
        <span
          className={styles.status}
          data-status={running ? 'loading' : error ? 'error' : 'idle'}
        >
          {running ? '运行中' : error ? '错误' : '就绪'}
        </span>
      </div>
      {visible && <LogConsole instanceId={instanceId} />}
    </div>
  );
}
