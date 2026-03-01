import * as Babel from '@babel/standalone';
// import { Scene } from '@mindmap/scene';
import classnames from 'classnames';
import React from 'react';

import styles from './index.module.less';

import type { JSXElement } from '@/utils/compiler/jsx-runtime';

import * as Comp from '@/comp';
import * as Core from '@/core';
import { InteractiveCounterDemo } from '@/demo/interactive-counter/app';
import { MindmapDemo } from '@/demo/mindmap/app';
import { SpreadsheetDemoApp } from '@/demo/spreadsheet/app';
import { Swiper } from '@/demo/swiper/widgets/swiper';
import { WidgetGalleryDemo } from '@/demo/widget-gallery/app';
import Runtime from '@/runtime';
import * as Theme from '@/styles/theme';
import { Fragment, createElement } from '@/utils/compiler/jsx-runtime';

// Mock Scene if not available
const Scene = {};

/**
 * Inkwell 组件：在画布上渲染 TSX/JSX 示例，并将示例中的日志输出收敛到组件实例范围。
 *
 * 使用说明：
 * - 不拦截全局 `window.console`；仅将示例中的 `console.*` 与 `window.InkConsole` 调用在编译期替换为局部 `InkConsole`。
 * - 每个组件实例拥有独立的日志通道，互不干扰，可通过控制台统一查看。
 *
 * Props：
 * - `data` 示例源码字符串（支持 TSX/JSX）
 * - `width` 画布宽度，默认 600
 * - `height` 画布高度，默认 300
 * - `onError` 编译或运行错误回调，参数为错误信息字符串
 * - `onSuccess` 渲染成功回调
 * - `readonly` 是否以只读方式渲染（禁用交互编辑）
 *
 * 用法示例：
 * ```tsx
 * <Inkwell data={code} width={600} height={300} onSuccess={() => {}} onError={(e) => {}} />
 * ```
 */
export interface InkwellProps {
  data: string;
  width?: number;
  height?: number;
  onError?: (err: string) => void;
  onSuccess?: () => void;
  readonly?: boolean;
  instanceId?: string;
}

/**
 * 渲染 Inkwell 组件实例：创建运行时、编译示例代码并注入实例级 `InkConsole`。
 */
export default function Inkwell({
  data,
  width = 600,
  height = 300,
  onError,
  onSuccess,
  readonly = false,
  instanceId,
}: InkwellProps) {
  void width;
  const canvasId = React.useMemo(
    () => instanceId ?? `ink-canvas-${Math.random().toString(36).slice(2)}`,
    [instanceId],
  );
  const runtimeRef = React.useRef<Runtime | null>(null);
  const previewRef = React.useRef<HTMLDivElement | null>(null);
  const debounceTimerRef = React.useRef<number | null>(null);
  const lastSizeRef = React.useRef<{ w: number; h: number } | null>(null);
  const lastThemeRef = React.useRef<string | null>(null);

  const cleanup = React.useCallback(() => {
    if (debounceTimerRef.current) {
      window.clearTimeout(debounceTimerRef.current);
      debounceTimerRef.current = null;
    }
    if (runtimeRef.current) {
      try {
        runtimeRef.current.destroy();
      } catch {}
      runtimeRef.current = null;
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
    const replaced = cleaned
      .replace(/\bconsole\.log\s*\(/g, 'InkConsole.log(canvasId,')
      .replace(/\bconsole\.info\s*\(/g, 'InkConsole.info(canvasId,')
      .replace(/\bconsole\.warn\s*\(/g, 'InkConsole.warn(canvasId,')
      .replace(/\bconsole\.error\s*\(/g, 'InkConsole.error(canvasId,')
      .replace(/\bwindow\.InkConsole\b/g, 'InkConsole')
      .replace(/\bInkConsole\.log\s*\(/g, 'InkConsole.log(canvasId,')
      .replace(/\bInkConsole\.info\s*\(/g, 'InkConsole.info(canvasId,')
      .replace(/\bInkConsole\.warn\s*\(/g, 'InkConsole.warn(canvasId,')
      .replace(/\bInkConsole\.error\s*\(/g, 'InkConsole.error(canvasId,')
      .replace(/InkConsole\?\.log\?\.\(/g, 'InkConsole.log(canvasId,')
      .replace(/InkConsole\?\.info\?\.\(/g, 'InkConsole.info(canvasId,')
      .replace(/InkConsole\?\.warn\?\.\(/g, 'InkConsole.warn(canvasId,')
      .replace(/InkConsole\?\.error\?\.\(/g, 'InkConsole.error(canvasId,');
    const wrapped = `const Template = () => (${replaced});`;
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
        const runtime = await Runtime.create(canvasId, { backgroundAlpha: 0 });
        runtimeRef.current = runtime;
        const compiled = compile(src);
        const fn = new Function(
          'createElement',
          'Fragment',
          'Editor',
          'InkConsole',
          'Scene',
          'canvasId',
          'MindmapDemo',
          'InteractiveCounterDemo',
          'WidgetGalleryDemo',
          'SpreadsheetDemoApp',
          'SwiperDemoApp',
          ...Object.keys(Comp),
          ...Object.keys(Core),
          ...Object.keys(Theme),
          `${compiled}; return Template;`,
        );
        const ink = window.InkConsole;
        const tplFn = fn(
          createElement,
          Fragment,
          Runtime,
          ink,
          Scene,
          canvasId,
          MindmapDemo,
          InteractiveCounterDemo,
          WidgetGalleryDemo,
          SpreadsheetDemoApp,
          Swiper,
          ...Object.values(Comp),
          ...Object.values(Core),
          ...Object.values(Theme),
        );
        await runtime.renderTemplate(tplFn as () => JSXElement);
        onSuccess?.();
      } catch (e: unknown) {
        onError?.((e as Error)?.stack ?? String(e));
      }
    },
    [canvasId, cleanup, compile, onError, onSuccess],
  );

  React.useEffect(() => {
    void renderData(data);
  }, [data, renderData]);

  React.useEffect(() => {
    const root = document.documentElement;
    const getThemeKey = () => {
      const mode = root.getAttribute('data-theme') ?? '';
      const className = root.className ?? '';
      const preset = root.getAttribute('data-ink-preset') ?? '';
      return `${mode}|${className}|${preset}`;
    };
    lastThemeRef.current = getThemeKey();
    const mo = new MutationObserver(() => {
      const next = getThemeKey();
      if (next === lastThemeRef.current) {
        return;
      }
      lastThemeRef.current = next;
      void renderData(data);
    });
    mo.observe(root, {
      attributes: true,
      attributeFilter: ['data-theme', 'class', 'data-ink-preset'],
    });
    return () => {
      mo.disconnect();
    };
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
        if (!runtimeRef.current) {
          return;
        }
        try {
          runtimeRef.current.rebuild();
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
    <div
      className={classnames(styles.display)}
      ref={previewRef}
      style={{ height, minHeight: height }}
    >
      <div
        id={canvasId}
        className={classnames(styles.canvasWrapper, { [styles.readonly]: readonly })}
      />
    </div>
  );
}
