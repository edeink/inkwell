import React, { useEffect, useMemo, useRef, useState } from 'react';

import { MindmapContext } from '../context';
import { MindmapController } from '../controller/index';
import { Viewport } from '../custom-widget/viewport';
import { runApp } from '../scene';

import ErrorBoundary from './error-boundary';
import Minimap from './minimap';
import Toolbar from './toolbar';
import ZoomBar from './zoom-bar';

import { findWidget } from '@/core/helper/widget-selector';
import { DevTools } from '@/devtools';
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
  const [controller, setController] = useState<MindmapController | null>(null);
  const [zoom, setZoom] = useState(1);

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
      runApp(runtime!, size);
      const root = runtime.getRootWidget();
      const vp = findWidget(root, 'Viewport') as Viewport | null;
      if (vp) {
        const ctrl = new MindmapController(runtime, vp, (s) => setZoom(s));
        setController(ctrl);
        setZoom(vp.scale);
      }
    })().catch((e) => console.error('Render mindmap failed:', e));

    return () => {
      setController(null);
    };
  }, [canvasContainerId, size, background, backgroundAlpha]);

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
      <MindmapContext.Provider value={controller}>
        <div ref={hostRef} className={`mindmapHost ${className ?? ''}`} style={style}>
          <div id={canvasContainerId} className="canvasContainer" />
          {runtimeRef.current && controller && (
            <>
              <Minimap />
              <ZoomBar />
              <Toolbar />
            </>
          )}
          <DevTools />
        </div>
      </MindmapContext.Provider>
    </ErrorBoundary>
  );
}
