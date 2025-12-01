import { DevTools } from '@/devtools/components/devtools';
import Runtime from '@/runtime';

import React, { useEffect, useMemo, useRef, useState } from 'react';

import { MindmapController } from '../../controller';
import { Viewport } from '../../custom-widget/viewport';
import ErrorBoundary from '../error-boundary';

import './index.modules.less';
import { createScene } from './scene';

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
      const candidate = root?.children?.find((w) => w.key === 'v');
      if (candidate && candidate instanceof Viewport) {
        controllerRef.current = new MindmapController(runtime, candidate);
      }
    })().catch((e) => console.error('Render mindmap failed:', e));

    return () => {
      controllerRef.current = null;
    };
  }, [canvasContainerId, size.width, size.height, background, backgroundAlpha]);

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
        <DevTools />
      </div>
    </ErrorBoundary>
  );
}
