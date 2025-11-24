import * as Babel from '@babel/standalone';
import React from 'react';
import { LiveEditor, LiveProvider } from 'react-live';
import styles from './InkPlayground.module.less';

import type { JSXElement } from '@/utils/compiler/jsx-runtime';
import { Fragment, createElement } from '@/utils/compiler/jsx-runtime';
import * as Core from '../../../src/core';
import Editor from '../../../src/editors/graphics-editor';
import SvgIcon from './SvgIcon';

interface InkPlaygroundProps {
  code: string;
  width?: number;
  height?: number;
}

export default function InkPlayground({ code, width = 600, height = 300 }: InkPlaygroundProps) {
  const canvasId = React.useMemo(() => `ink-canvas-${Math.random().toString(36).slice(2)}`, []);
  const [error, setError] = React.useState<string | null>(null);
  const [running, setRunning] = React.useState(false);
  const [localCode, setLocalCode] = React.useState(code);
  const editorRef = React.useRef<Editor | null>(null);
  const previewRef = React.useRef<HTMLDivElement | null>(null);
  const debounceTimerRef = React.useRef<number | null>(null);
  const codeTimerRef = React.useRef<number | null>(null);
  const lastSizeRef = React.useRef<{ w: number; h: number } | null>(null);

  const cleanup = React.useCallback(() => {
    if (debounceTimerRef.current) {
      window.clearTimeout(debounceTimerRef.current);
      debounceTimerRef.current = null;
    }
    if (editorRef.current) {
      try {
        editorRef.current.destroy();
      } catch { }
      editorRef.current = null;
    }
    const el = document.getElementById(canvasId);
    if (el) el.innerHTML = '';
  }, [canvasId]);

  const run = React.useCallback(async (tpl: () => JSXElement) => {
    if (running) return;
    setRunning(true);
    setError(null);
    cleanup();
    console.log('[InkPlayground] run start');
    try {
      const editor = await Editor.create(canvasId, { backgroundAlpha: 0 });
      editorRef.current = editor;
      await editor.renderTemplate(tpl);
      console.log('[InkPlayground] renderTemplate done');
    } catch (e: any) {
      console.error('[InkPlayground] run error', e);
      setError(e?.stack ?? String(e));
    } finally {
      setRunning(false);
    }
  }, [canvasId, cleanup, running]);

  const scope = React.useMemo(() => ({ React, Editor, ...Core }), []);

  const compile = React.useCallback((src: string) => {
    const cleaned = src
      .replace(/\/\*+\s*@jsxImportSource[\s\S]*?\*\//, '')
      .replace(/\/\/\s*@jsxImportSource[^\n]*/g, '');
    const wrapped = `function Template(){ return (${cleaned}); }`;
    const out = Babel.transform(wrapped, {
      plugins: [
        ['transform-typescript', { isTSX: true, allExtensions: true }],
        [
          'transform-react-jsx',
          {
            runtime: 'classic',
            pragma: 'createElement',
            pragmaFrag: 'Fragment',
          },
        ],
      ],
      parserOpts: { allowReturnOutsideFunction: true },
    });
    return out.code || wrapped;
  }, []);

  React.useEffect(() => {
    const el = previewRef.current;
    if (!el) return;
    const ro = new ResizeObserver((entries) => {
      const entry = entries[0];
      if (!entry) return;
      const cr = entry.contentRect;
      const w = Math.round(cr.width);
      const h = Math.round(cr.height);
      const last = lastSizeRef.current;
      if (last && Math.abs(last.w - w) < 2 && Math.abs(last.h - h) < 2) return;
      lastSizeRef.current = { w, h };
      if (debounceTimerRef.current) window.clearTimeout(debounceTimerRef.current);
      debounceTimerRef.current = window.setTimeout(() => {
        if (!editorRef.current) return;
        console.log('[InkPlayground] resize', w, h);
        try {
          editorRef.current.rebuild();
        } catch (e) {
          console.error('[InkPlayground] rebuild error', e);
        }
      }, 300);
    });
    ro.observe(el);
    return () => {
      ro.disconnect();
      cleanup();
    };
  }, [cleanup]);

  React.useEffect(() => {
    if (codeTimerRef.current) {
      window.clearTimeout(codeTimerRef.current);
      codeTimerRef.current = null;
    }
    codeTimerRef.current = window.setTimeout(() => {
      try {
        const compiled = compile(localCode);
        // eslint-disable-next-line no-new-func
        const fn = new Function('createElement', 'Fragment', 'Editor', ...Object.keys(Core), `${compiled}; return Template;`);
        const tplFn = fn(createElement, Fragment, Editor, ...Object.values(Core));
        run(tplFn as () => JSXElement);
      } catch (e: any) {
        setError(e?.stack ?? String(e));
      }
    }, 300);
    return () => {
      if (codeTimerRef.current) {
        window.clearTimeout(codeTimerRef.current);
        codeTimerRef.current = null;
      }
    };
  }, [localCode, compile, run]);

  return (
    <div className={styles.root}>
      <div className={styles.left}>
        <LiveProvider code={localCode} scope={scope} noInline>
          <LiveEditor onChange={setLocalCode} />
        </LiveProvider>
        <div className={styles.toolbar}>
          <button className="button button--primary" disabled={running} onClick={() => {
            try {
              const compiled = compile(localCode);
              // eslint-disable-next-line no-new-func
              const fn = new Function('createElement', 'Fragment', 'Editor', ...Object.keys(Core), `${compiled}; return Template;`);
              const tplFn = fn(createElement, Fragment, Editor, ...Object.values(Core));
              run(tplFn as () => JSXElement);
            } catch (e: any) {
              setError(e?.stack ?? String(e));
            }
          }}>运行</button>
          <button className="button button--secondary" onClick={() => {
            cleanup();
            setError(null);
          }}>清空</button>
        </div>
        {error && (
          <div id="ink_error" className={styles.error}>
            <div className={styles.errorHeader}>
              <span>运行出错</span>
              <button className="button button--sm button--secondary" onClick={() => {
                navigator.clipboard.writeText(error).catch(() => { });
              }}>
                <SvgIcon name="copy" size={18} ariaLabel="复制错误" /> 复制
              </button>
            </div>
            <pre>{error}</pre>
          </div>
        )}
      </div>
      <div className={styles.preview} ref={previewRef}>
        <div id={canvasId} className={styles.canvas} />
      </div>
    </div>
  );
}