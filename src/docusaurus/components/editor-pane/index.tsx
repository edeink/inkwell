import { DownOutlined, CopyOutlined } from '@ant-design/icons';
import React from 'react';
import { LiveEditor, LiveProvider } from 'react-live';

import styles from './index.module.less';

import * as Core from '@/core';
import Editor from '@/editors/graphics-editor';

export interface EditorPaneProps {
  value: string;
  onChange: (next: string) => void;
  collapsedHeight?: number;
}

export default function EditorPane({ value, onChange, collapsedHeight = 260 }: EditorPaneProps) {
  const scope = React.useMemo(() => ({ React, Editor, ...Core }), []);
  const [expanded, setExpanded] = React.useState(false);
  const contentRef = React.useRef<HTMLDivElement | null>(null);
  const [overflowing, setOverflowing] = React.useState(false);
  const [copying, setCopying] = React.useState(false);
  const [copyResult, setCopyResult] = React.useState<null | 'success' | 'error'>(null);
  const copyTimerRef = React.useRef<number | null>(null);

  const checkOverflow = React.useCallback(() => {
    const el = contentRef.current;
    if (!el) {
      return;
    }
    const fits = el.scrollHeight <= (collapsedHeight || 0);
    setOverflowing(!fits);
  }, [collapsedHeight]);

  React.useEffect(() => {
    checkOverflow();
  }, [value, checkOverflow]);

  React.useEffect(() => {
    const onResize = () => checkOverflow();
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, [checkOverflow]);

  const onCopy = React.useCallback(() => {
    if (copying) {
      return;
    }
    setCopying(true);
    navigator.clipboard
      .writeText(value)
      .then(() => {
        setCopyResult('success');
        if (copyTimerRef.current) {
          window.clearTimeout(copyTimerRef.current);
        }
        copyTimerRef.current = window.setTimeout(() => {
          setCopyResult(null);
          copyTimerRef.current = null;
        }, 1800);
      })
      .catch(() => {
        setCopyResult('error');
        if (copyTimerRef.current) {
          window.clearTimeout(copyTimerRef.current);
        }
        copyTimerRef.current = window.setTimeout(() => {
          setCopyResult(null);
          copyTimerRef.current = null;
        }, 2000);
      })
      .finally(() => {
        setCopying(false);
      });
  }, [value, copying]);

  React.useEffect(() => {
    return () => {
      if (copyTimerRef.current) {
        window.clearTimeout(copyTimerRef.current);
      }
    };
  }, []);
  return (
    <div
      className={`${styles.editorPane} ${expanded ? styles.editorPaneExpanded : styles.editorPaneCollapsed}`}
      style={{ ['--collapsed-h' as any]: `${collapsedHeight}px` }}
    >
      <button
        type="button"
        aria-label="复制代码"
        title="复制代码"
        className={styles.copyBtn}
        onClick={onCopy}
        disabled={copying}
      >
        <CopyOutlined />
      </button>
      {copyResult && (
        <div
          role="status"
          aria-live="polite"
          className={`${styles.copyToast} ${copyResult === 'success' ? styles.copyToastSuccess : styles.copyToastError}`}
        >
          {copyResult === 'success' ? '复制成功' : '复制失败，请重试'}
        </div>
      )}
      <div
        ref={contentRef}
        className={styles.editorContent}
        onCopyCapture={(e) => {
          e.preventDefault();
        }}
        onCutCapture={(e) => {
          e.preventDefault();
        }}
        aria-live="off"
      >
        <LiveProvider code={value} scope={scope} noInline>
          <LiveEditor onChange={onChange} className={styles.prismWithLines} />
        </LiveProvider>
      </div>
      {!expanded && overflowing && (
        <div className={styles.overlayBottom} onClick={() => setExpanded(true)}>
          <button className={styles.overlayButton} onClick={() => setExpanded(true)}>
            <span className={styles.icon}>
              <DownOutlined />
            </span>
            显示完整代码
          </button>
        </div>
      )}
    </div>
  );
}
