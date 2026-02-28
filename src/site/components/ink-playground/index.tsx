import React, { useCallback, useEffect } from 'react';

import ControlPanel from '../control-panel';
import EditorPane from '../editor-pane';
import Inkwell from '../inkwell';

import styles from './index.module.less';

import type { InkPlaygroundProps } from './types';

import { DevTools } from '@/devtools';
import { stripJsxImportSource } from '@/site/utils/strip-jsx';
import { CopyOutlined } from '@/ui/icons';

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
        <DevTools />
      </>
    );
  }

  if (effectiveMode === 'code') {
    return (
      <div className={styles.scope} data-mode="code">
        <div className={styles.card}>
          <div className={styles.cardInner}>
            <div className={styles.section}>
              <button
                className={styles.copyBtn}
                onClick={() => {
                  navigator.clipboard
                    .writeText(stripJsxImportSource(localCode))
                    .catch(() => undefined);
                }}
                aria-label="复制代码"
              >
                <CopyOutlined /> 复制
              </button>
              <EditorPane readOnly value={localCode} />
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (effectiveMode === 'readonly') {
    return (
      <>
        <div className={styles.scope} data-mode="readonly">
          <div className={styles.card}>
            <div className={`${styles.cardInner} ${styles.split}`}>
              <div className={`${styles.section} ${styles.splitLeft}`}>
                <EditorPane readOnly value={localCode} collapsedHeight={280} />
              </div>
              <div className={`${styles.section} ${styles.splitRight}`}>
                <Inkwell
                  instanceId={uniqId}
                  data={committedCode}
                  width={width}
                  height={height}
                  readonly={true}
                  onError={handleError}
                  onSuccess={handleSuccess}
                />
              </div>
            </div>
          </div>
        </div>
        <DevTools />
      </>
    );
  }

  return (
    <>
      <div className={styles.scope} data-mode="edit">
        <div className={styles.card}>
          <div className={styles.cardInner}>
            <div className={`${styles.section} ${styles.previewSection}`}>
              <Inkwell
                instanceId={uniqId}
                data={committedCode}
                width={width}
                height={height}
                readonly={false}
                onError={handleError}
                onSuccess={handleSuccess}
              />
            </div>
            <div className={`${styles.section} ${styles.codeSection}`}>
              <EditorPane value={localCode} onChange={setLocalCode} collapsedHeight={280} />
            </div>
            <div className={`${styles.section} ${styles.controlSection}`}>
              <ControlPanel
                instanceId={uniqId}
                running={running}
                error={error}
                onRun={onRun}
                onClear={onClear}
              />
            </div>
          </div>
        </div>
      </div>
      <DevTools />
    </>
  );
}
