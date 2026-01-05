import React, { useEffect, useRef, useState } from 'react';

import Runtime from '@/runtime';
import { getCurrentThemeMode, Themes } from '@/styles/theme';

export interface InkwellCanvasProps {
  className?: string;
  style?: React.CSSProperties;
  background?: string;
  backgroundAlpha?: number;
  /**
   * Runtime 初始化完成并准备就绪时的回调。
   * 在此处调用 runApp() 或 renderTemplate()。
   */
  onRuntimeReady?: (runtime: Runtime) => void | Promise<void>;
  /**
   * 容器尺寸变化时的回调。
   * 如果需要手动触发布局更新或重新渲染时很有用，
   * 尽管如果设置正确，Runtime 通常会通过其自身机制处理此问题。
   */
  onResize?: (width: number, height: number, runtime: Runtime) => void;
  /**
   * Canvas 容器的可选 ID。如果未提供，将生成一个随机 ID。
   */
  id?: string;
}

export const InkwellCanvas: React.FC<InkwellCanvasProps> = ({
  className,
  style,
  background,
  backgroundAlpha = 1,
  onRuntimeReady,
  onResize,
  id,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const runtimeRef = useRef<Runtime | null>(null);
  const onRuntimeReadyRef = useRef(onRuntimeReady);
  onRuntimeReadyRef.current = onRuntimeReady;
  const onResizeRef = useRef(onResize);
  onResizeRef.current = onResize;

  const [containerId] = useState(
    () => id || `inkwell-canvas-${Math.random().toString(36).slice(2)}`,
  );

  useEffect(() => {
    const el = containerRef.current;
    if (!el) {
      return;
    }

    // 确保容器具有正确的 ID
    el.id = containerId;
    el.innerHTML = ''; // 清除任何先前的内容

    let isActive = true;

    const initRuntime = async () => {
      // 获取当前主题背景色
      const themeBg = Themes[getCurrentThemeMode()].background.base;
      const finalBackground = background || themeBg;

      const runtime = await Runtime.create(containerId, {
        renderer: 'canvas2d',
        background: finalBackground,
        backgroundAlpha,
      });

      if (!isActive) {
        runtime.destroy();
        return;
      }

      runtimeRef.current = runtime;

      if (onRuntimeReadyRef.current) {
        await onRuntimeReadyRef.current(runtime);
      }
    };

    initRuntime();

    return () => {
      isActive = false;
      if (runtimeRef.current) {
        runtimeRef.current.destroy();
        runtimeRef.current = null;
      }
      if (el) {
        el.innerHTML = '';
      }
    };
  }, [containerId, background, backgroundAlpha]); // 如果这些发生变化则重新创建

  useEffect(() => {
    const el = containerRef.current;
    if (!el) {
      return;
    }

    const ro = new ResizeObserver((entries) => {
      const entry = entries[0];
      const { width, height } = entry.contentRect;

      // 确保尺寸有效
      if (width === 0 || height === 0) {
        return;
      }

      if (runtimeRef.current && onResizeRef.current) {
        onResizeRef.current(width, height, runtimeRef.current);
      }
    });

    ro.observe(el);

    return () => {
      ro.disconnect();
    };
  }, []);

  return (
    <div
      ref={containerRef}
      className={className}
      style={{
        width: '100%',
        height: '100%',
        overflow: 'hidden',
        position: 'relative',
        ...style,
      }}
    />
  );
};
