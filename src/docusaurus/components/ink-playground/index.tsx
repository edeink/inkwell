import { CopyOutlined } from '@ant-design/icons';
import React, { useCallback, useEffect } from 'react';

import ControlPanel from '../control-panel';
import EditorPane from '../editor-pane';
import Inkwell from '../inkwell';

import styles from './index.module.less';

import type { InkPlaygroundProps } from './types';

import { DevTools } from '@/devtools';
import { stripJsxImportSource } from '@/docusaurus/utils/strip-jsx';

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
      <div className={styles.readOnly} data-mode="render">
        <Inkwell
          instanceId={uniqId}
          data={initial}
          width={width}
          height={height}
          readonly
          onError={(e) => {
            setError(e);
            setRunning(false);
          }}
          onSuccess={() => {
            setError(null);
            setRunning(false);
          }}
        />
      </div>
    );
  }

  if (effectiveMode === 'code') {
    return (
      <div className={styles.readOnly} data-mode="code">
        <button
          className={styles.copyBtn}
          onClick={() => {
            navigator.clipboard.writeText(stripJsxImportSource(localCode)).catch(() => {});
          }}
          aria-label="复制代码"
        >
          <CopyOutlined /> 复制
        </button>
        <EditorPane readOnly value={localCode} />
      </div>
    );
  }

  if (effectiveMode === 'readonly') {
    return (
      <div className={styles.rootHorital}>
        <div className={styles.codePane}>
          <EditorPane readOnly value={localCode} collapsedHeight={280} />
        </div>
        <div className={styles.previewPane}>
          <Inkwell
            instanceId={uniqId}
            data={committedCode}
            width={width}
            height={height}
            readonly={true}
            onError={(e) => {
              setError(e);
              setRunning(false);
            }}
            onSuccess={() => {
              setError(null);
              setRunning(false);
            }}
          />
        </div>
      </div>
    );
  }

  return (
    <>
      <div className={styles.rootVertical}>
        <Inkwell
          instanceId={uniqId}
          data={committedCode}
          width={width}
          height={height}
          readonly={false}
          onError={(e) => {
            setError(e);
            setRunning(false);
          }}
          onSuccess={() => {
            setError(null);
            setRunning(false);
          }}
        />
        <EditorPane value={localCode} onChange={setLocalCode} collapsedHeight={280} />
        <ControlPanel
          instanceId={uniqId}
          running={running}
          error={error}
          onRun={onRun}
          onClear={onClear}
        />
      </div>
      <DevTools />
    </>
  );
}
