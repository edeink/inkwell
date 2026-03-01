import React, { useCallback, useEffect } from 'react';

import ControlPanel from '../control-panel';
import EditorPane from '../editor-pane';
import Inkwell from '../inkwell';

import styles from './index.module.less';

import type { InkPlaygroundProps } from './types';

import { stripJsxImportSource } from '@/site/utils/strip-jsx';

/**
 * InkPlayground 组件，用于展示和编辑代码
 *
 * @property code 传入的源代码字符串（ESX/TSX/JSX）
 * @property width 画布宽度，默认 600
 * @property height 画布高度，默认 300
 * @property mode 渲染模式：
 *   - edit：完整交互模式（默认），包含编辑器、预览与运行按钮
 *   - readonly: 包含编辑器、预览，左右布局
 *   - render：仅渲染画布，不显示编辑器
 *   - code：纯代码展示模式，显示可复制的代码，不渲染画布
 */
export default function InkPlayground({
  code,
  width = 600,
  height = 300,
  mode = 'code',
}: InkPlaygroundProps) {
  const uniqId = React.useMemo(() => `${Math.random().toString(36).slice(2)}`, []);
  const initial = React.useMemo(() => stripJsxImportSource(code), [code]);
  const [localCode, setLocalCode] = React.useState(initial);
  const [committedCode, setCommittedCode] = React.useState(initial);
  const [error, setError] = React.useState<string | null>(null);
  const [running, setRunning] = React.useState(false);
  const autoRunTimerRef = React.useRef<number | null>(null);
  const effectiveMode = mode;

  const onRun = useCallback(() => {
    setRunning(true);
    setCommittedCode(localCode);
  }, [localCode]);

  const onClear = useCallback(() => {
    setCommittedCode('');
    setError(null);
  }, []);

  const handleSuccess = useCallback(() => {
    setError(null);
    setRunning(false);
  }, []);

  const handleError = useCallback((e: string) => {
    setError(e);
    setRunning(false);
  }, []);

  useEffect(() => {
    if (autoRunTimerRef.current) {
      window.clearTimeout(autoRunTimerRef.current);
      autoRunTimerRef.current = null;
    }
    autoRunTimerRef.current = window.setTimeout(() => {
      setRunning(true);
      setCommittedCode(localCode);
    }, 500);
    return () => {
      if (autoRunTimerRef.current) {
        window.clearTimeout(autoRunTimerRef.current);
        autoRunTimerRef.current = null;
      }
    };
  }, [localCode]);

  if (effectiveMode === 'render') {
    return (
      <>
        <div className={styles.scope} data-mode="render">
          <div className={styles.card}>
            <div className={styles.cardInner}>
              <Inkwell
                instanceId={uniqId}
                data={initial}
                width={width}
                height={height}
                readonly
                onError={handleError}
                onSuccess={handleSuccess}
              />
            </div>
          </div>
        </div>
      </>
    );
  }

  if (effectiveMode === 'code') {
    return (
      <div className={styles.scope} data-mode="code">
        <div className={styles.card}>
          <div className={styles.cardInner}>
            <EditorPane value={localCode} readOnly />
          </div>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className={styles.scope} data-mode={effectiveMode}>
        <div className={styles.card}>
          <div className={styles.cardInner}>
            <div className={styles.pane}>
              <EditorPane value={localCode} onChange={setLocalCode} />
            </div>
            <div className={styles.pane}>
              <Inkwell
                instanceId={uniqId}
                data={committedCode}
                width={width}
                height={height}
                readonly={effectiveMode === 'readonly'}
                onError={handleError}
                onSuccess={handleSuccess}
              />
            </div>
          </div>
        </div>
        {effectiveMode !== 'readonly' && (
          <div className={styles.toolbar}>
            <ControlPanel running={running} error={error} onRun={onRun} onClear={onClear} />
          </div>
        )}
        {error && <div className={styles.error}>{error}</div>}
      </div>
    </>
  );
}
