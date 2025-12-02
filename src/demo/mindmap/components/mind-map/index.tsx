import React, { useEffect, useMemo, useRef, useState } from 'react';

import { MindmapController } from '../../controller';
import { Viewport } from '../../custom-widget/viewport';
import ErrorBoundary from '../error-boundary';
import ZoomBar from '../zoom-bar';

import { createScene } from './scene';

import type { Widget } from '@/core/base';

import { DevTools } from '@/devtools/components/devtools';
import Runtime from '@/runtime';

import './index.modules.less';

type Size = { width: number; height: number };

export type MindmapComponentProps = {
  className?: string;
  style?: React.CSSProperties;
  background?: string;
  backgroundAlpha?: number;
};

/**
 * 错误边界：捕获子树渲染错误并展示提示
 * @example
 * <ErrorBoundary>
 *   <MindmapComponent />
 * </ErrorBoundary>
 */

/**
 * 模块：Mindmap React 组件
 * 提供标准 React 组件 `MindmapComponent`，负责初始化 Runtime、渲染场景、
 * 挂载 DevTools，并在容器尺寸变化时实时重建。该组件保持与 Viewport 的交互
 * 能力（拖拽/缩放），同时支持错误边界以提升容错能力。
 */

export default function MindmapComponent({
  className,
  style,
  background = '#ffffff',
  backgroundAlpha = 1,
}: MindmapComponentProps) {
  const hostRef = useRef<HTMLDivElement>(null);
  const canvasContainerId = useMemo(
    () => `mindmap-canvas-${Math.random().toString(36).slice(2)}`,
    [],
  );
  const [size, setSize] = useState<Size>({ width: 0, height: 0 });
  const runtimeRef = useRef<Runtime | null>(null);
  const controllerRef = useRef<MindmapController | null>(null);
  const [zoom, setZoom] = useState(1);
  const viewportCacheRef = useRef<WeakMap<Widget, Viewport>>(new WeakMap());

  const findViewport = (widget: Widget | null): Viewport | null => {
    if (!widget) {
      return null;
    }
    const cached = viewportCacheRef.current.get(widget as Widget);
    if (cached) {
      return cached;
    }
    const dfs = (w: Widget): Viewport | null => {
      if (w instanceof Viewport) {
        return w as Viewport;
      }
      for (const c of w.children) {
        const r = dfs(c);
        if (r) {
          return r;
        }
      }
      return null;
    };
    const v = dfs(widget as Widget);
    if (v) {
      viewportCacheRef.current.set(widget as Widget, v);
    }
    return v;
  };

  useEffect(() => {
    // 初始化并监听容器尺寸变化，确保 canvas 非零尺寸
    const host = hostRef.current;
    if (!host) {
      return;
    }
    const ro = new ResizeObserver((entries) => {
      const entry = entries[0];
      const rect = entry?.contentRect || host.getBoundingClientRect();
      const w = Math.max(1, Math.floor(rect.width));
      const h = Math.max(1, Math.floor(rect.height));
      setSize((prev) => (prev.width !== w || prev.height !== h ? { width: w, height: h } : prev));
    });
    ro.observe(host);
    return () => ro.disconnect();
  }, []);

  useEffect(() => {
    // 容器尺寸就绪后，初始化 Runtime 并渲染场景
    const host = hostRef.current;
    if (!host || size.width === 0 || size.height === 0) {
      return;
    }
    const inner = document.getElementById(canvasContainerId);
    if (!inner) {
      return;
    }
    (async () => {
      if (!runtimeRef.current) {
        runtimeRef.current = await Runtime.create(canvasContainerId, {
          background,
          backgroundAlpha,
        });
      }
      const runtime = runtimeRef.current!;
      const scene = createScene(size.width, size.height);
      await runtime.renderFromJSX(scene);
      const root = runtime.getRootWidget();
      const vp = findViewport(root);
      if (vp) {
        controllerRef.current = new MindmapController(runtime, vp, (s) => setZoom(s));
        setZoom(vp.scale);
      }
    })().catch((e) => console.error('Render mindmap failed:', e));

    return () => {
      controllerRef.current = null;
    };
  }, [canvasContainerId, size.width, size.height, background, backgroundAlpha]);

  useEffect(() => {
    const el = document.getElementById(canvasContainerId);
    if (!el) {
      return;
    }
    const onViewChange = (e: Event) => {
      const detail = (e as CustomEvent<{ scale: number; tx: number; ty: number }>).detail;
      const s = detail?.scale;
      if (typeof s === 'number') {
        setZoom(s);
      }
    };
    el.addEventListener('inkwell:viewchange', onViewChange as EventListener);
    return () => el.removeEventListener('inkwell:viewchange', onViewChange as EventListener);
  }, [canvasContainerId]);

  useEffect(() => {
    // 组件卸载时销毁 Runtime，释放资源
    return () => {
      try {
        runtimeRef.current?.destroy();
      } catch {
        void 0;
      }
      runtimeRef.current = null;
    };
  }, []);

  return (
    <ErrorBoundary>
      <div ref={hostRef} className={`mindmapHost ${className ?? ''}`} style={style}>
        <div id={canvasContainerId} className="canvasContainer" />
        <ZoomBar
          value={zoom}
          min={0.1}
          max={10}
          step={0.01}
          onChange={(s) => {
            setZoom(s);
            controllerRef.current?.zoomAt(s, size.width / 2, size.height / 2);
          }}
        />
        <DevTools />
      </div>
    </ErrorBoundary>
  );
}
