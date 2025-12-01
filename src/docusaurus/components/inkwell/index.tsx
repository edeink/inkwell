import * as Babel from '@babel/standalone';
import classnames from 'classnames';
import React from 'react';

import styles from './index.module.less';

import type { JSXElement } from '@/utils/compiler/jsx-runtime';

import * as Core from '@/core';
import { DevTools } from '@/devtools';
import Runtime from '@/runtime';
import { Fragment, createElement } from '@/utils/compiler/jsx-runtime';

export interface InkwellProps {
  data: string;
  width?: number;
  height?: number;
  onError?: (err: string) => void;
  onSuccess?: () => void;
  readonly?: boolean;
}

export default function Inkwell({
  data,
  width = 600,
  height = 300,
  onError,
  onSuccess,
  readonly = false,
}: InkwellProps) {
  const canvasId = React.useMemo(() => `ink-canvas-${Math.random().toString(36).slice(2)}`, []);
  const editorRef = React.useRef<Runtime | null>(null);
  const previewRef = React.useRef<HTMLDivElement | null>(null);
  const debounceTimerRef = React.useRef<number | null>(null);
  const lastSizeRef = React.useRef<{ w: number; h: number } | null>(null);

  const cleanup = React.useCallback(() => {
    if (debounceTimerRef.current) {
      window.clearTimeout(debounceTimerRef.current);
      debounceTimerRef.current = null;
    }
    if (editorRef.current) {
      try {
        editorRef.current.destroy();
      } catch {}
      editorRef.current = null;
    }
    const el = document.getElementById(canvasId);
    if (el) {
      el.innerHTML = '';
    }
  }, [canvasId]);

  const compile = React.useCallback((src: string) => {
    const cleaned = src
      .replace(/\/\*+\s*@jsxImportSource[\s\S]*?\*\//g, '')
      .replace(/\/\/\s*@jsxImportSource[^\n]*/g, '')
      .trim();
    const wrapped = `const Template = () => (${cleaned});`;
    const out = Babel.transform(wrapped, {
      plugins: [
        ['transform-typescript', { isTSX: true, allExtensions: true }],
        [
          'transform-react-jsx',
          { runtime: 'classic', pragma: 'createElement', pragmaFrag: 'Fragment' },
        ],
      ],
    });
    return out.code || wrapped;
  }, []);

  const renderData = React.useCallback(
    async (src: string) => {
      try {
        cleanup();
        if (!src || !src.trim()) {
          return;
        }
        const editor = await Runtime.create(canvasId, { backgroundAlpha: 0 });
        editorRef.current = editor;
        const compiled = compile(src);
        const fn = new Function(
          'createElement',
          'Fragment',
          'Editor',
          'DevTools',
          ...Object.keys(Core),
          `${compiled}; return Template;`,
        );
        const tplFn = fn(createElement, Fragment, Runtime, DevTools, ...Object.values(Core));
        await editor.renderTemplate(tplFn as () => JSXElement);
        onSuccess?.();
      } catch (e: any) {
        onError?.(e?.stack ?? String(e));
      }
    },
    [canvasId, cleanup, compile, width, height, onError, onSuccess],
  );

  React.useEffect(() => {
    void renderData(data);
  }, [data, renderData]);

  React.useEffect(() => {
    const el = previewRef.current;
    if (!el) {
      return;
    }
    const ro = new ResizeObserver((entries) => {
      const entry = entries[0];
      if (!entry) {
        return;
      }
      const cr = entry.contentRect;
      const w = Math.round(cr.width);
      const h = Math.round(cr.height);
      const last = lastSizeRef.current;
      if (last && Math.abs(last.w - w) < 2 && Math.abs(last.h - h) < 2) {
        return;
      }
      lastSizeRef.current = { w, h };
      if (debounceTimerRef.current) {
        window.clearTimeout(debounceTimerRef.current);
      }
      debounceTimerRef.current = window.setTimeout(() => {
        if (!editorRef.current) {
          return;
        }
        try {
          editorRef.current.rebuild();
        } catch {}
      }, 300);
    });
    ro.observe(el);
    return () => {
      ro.disconnect();
      cleanup();
    };
  }, [cleanup]);

  return (
    <div className={classnames(styles.display)} ref={previewRef}>
      <div
        id={canvasId}
        className={classnames(styles.canvasWrapper, { [styles.readonly]: readonly })}
      />
    </div>
  );
}
