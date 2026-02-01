import classNames from 'classnames';
import React from 'react';
import { LiveEditor, LiveProvider } from 'react-live';

import styles from './index.module.less';

import * as Core from '@/core';
import Runtime from '@/runtime';
import { CopyOutlined, DownOutlined } from '@/ui/icons';

export interface EditorPaneProps {
  value: string;
  onChange?: (next: string) => void;
  collapsedHeight?: number;
  readOnly?: boolean;
}

export default function EditorPane({
  value,
  onChange,
  collapsedHeight = 260,
  readOnly = false,
}: EditorPaneProps) {
  const scope = React.useMemo(() => ({ React, Editor: Runtime, ...Core }), []);
  const [expanded, setExpanded] = React.useState(readOnly);
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

  const showFeedback = React.useCallback((result: 'success' | 'error') => {
    setCopyResult(result);
    if (copyTimerRef.current) {
      window.clearTimeout(copyTimerRef.current);
    }
    copyTimerRef.current = window.setTimeout(() => {
      setCopyResult(null);
      copyTimerRef.current = null;
    }, 2000);
  }, []);

  const onCopy = React.useCallback(() => {
    if (copying) {
      return;
    }
    setCopying(true);

    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard
        .writeText(value)
        .then(() => {
          showFeedback('success');
        })
        .catch(() => {
          showFeedback('error');
        })
        .finally(() => {
          setCopying(false);
        });
    } else {
      // Fallback for older browsers
      try {
        const textarea = document.createElement('textarea');
        textarea.value = value;
        // Ensure it's not visible but part of DOM
        textarea.style.position = 'fixed';
        textarea.style.opacity = '0';
        document.body.appendChild(textarea);
        textarea.select();
        document.execCommand('copy');
        document.body.removeChild(textarea);
        showFeedback('success');
      } catch (e) {
        showFeedback('error');
      }
      setCopying(false);
    }
  }, [value, copying, showFeedback]);

  const onEditorCopy = React.useCallback(() => {
    // When user presses Ctrl+C or uses context menu, the browser handles the copy.
    // We just show the feedback.
    showFeedback('success');
  }, [showFeedback]);

  React.useEffect(() => {
    return () => {
      if (copyTimerRef.current) {
        window.clearTimeout(copyTimerRef.current);
      }
    };
  }, []);
  const rootClass = classNames(
    styles.editorPane,
    expanded ? styles.editorPaneExpanded : styles.editorPaneCollapsed,
    { [styles.showcase]: readOnly },
  );

  return (
    <div
      className={rootClass}
      style={{ '--collapsed-h': `${collapsedHeight}px` } as React.CSSProperties}
    >
      <div className={styles.copyDock}>
        {copyResult && (
          <div
            role="status"
            aria-live="polite"
            className={classNames(styles.copyToast, {
              [styles.copyToastSuccess]: copyResult === 'success',
              [styles.copyToastError]: copyResult === 'error',
            })}
          >
            {copyResult === 'success' ? '复制成功' : '复制失败，请重试'}
          </div>
        )}
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
      </div>
      <div ref={contentRef} className={styles.editorContent} onCopy={onEditorCopy} aria-live="off">
        <LiveProvider code={value} scope={scope} noInline>
          <LiveEditor
            onChange={readOnly ? () => {} : onChange}
            className={styles.prismWithLines}
            disabled={readOnly}
          />
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
